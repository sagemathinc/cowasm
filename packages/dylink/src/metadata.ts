/*
This is inspired by emscripten's MIT-licensed src/library_dylink.js.
*/

interface Metadata {
  neededDynlibs: string[];
  tlsExports: Set<string>;
  weakImports: Set<string>;
  memorySize?: number;
  memoryAlign?: number;
  tableSize?: number;
  tableAlign?: number;
}

export default function getMetadata(binary: Uint8Array): Metadata {
  let offset = 0;
  let end = 0;

  function getU8() {
    return binary[offset++];
  }

  function getLEB() {
    let ret = 0;
    let mul = 1;
    while (1) {
      const byte = binary[offset++];
      ret += (byte & 0x7f) * mul;
      mul *= 0x80;
      if (!(byte & 0x80)) break;
    }
    return ret;
  }

  function getString() {
    const len = getLEB();
    offset += len;
    return UTF8ArrayToString(binary, offset - len, len);
  }

  function failIf(condition: boolean, message: string): void {
    if (condition) throw new Error(message);
  }

  let name = "dylink.0";
  const int32View = new Uint32Array(
    new Uint8Array(binary.subarray(0, 24)).buffer
  );
  const magicNumberFound = int32View[0] == 0x6d736100;
  failIf(!magicNumberFound, "need to see wasm magic number"); // \0asm
  // we should see the dylink custom section right after the magic number and wasm version
  failIf(binary[8] !== 0, "need the dylink section to be first");
  offset = 9;
  const section_size = getLEB(); //section size
  end = offset + section_size;
  name = getString();

  const customSection: Partial<Metadata> = {
    neededDynlibs: [],
    tlsExports: new Set(),
    weakImports: new Set(),
  };
  if (customSection.neededDynlibs == null) throw Error("bug: typescript");
  if (customSection.tlsExports == null) throw Error("bug: typescript");
  if (customSection.weakImports == null) throw Error("bug: typescript");

  if (name == "dylink") {
    customSection.memorySize = getLEB();
    customSection.memoryAlign = getLEB();
    customSection.tableSize = getLEB();
    customSection.tableAlign = getLEB();
    // shared libraries this module needs. We need to load them first, so that
    // current module could resolve its imports. (see tools/shared.py
    // WebAssembly.make_shared_library() for "dylink" section extension format)
    let neededDynlibsCount = getLEB();
    for (let i = 0; i < neededDynlibsCount; ++i) {
      const libname = getString();
      customSection.neededDynlibs.push(libname);
    }
  } else {
    failIf(
      name !== "dylink.0",
      "invalid format -- name must be dylink.0 or dylink"
    );
    const WASM_DYLINK_MEM_INFO = 0x1;
    const WASM_DYLINK_NEEDED = 0x2;
    const WASM_DYLINK_EXPORT_INFO = 0x3;
    const WASM_DYLINK_IMPORT_INFO = 0x4;
    const WASM_SYMBOL_TLS = 0x100;
    const WASM_SYMBOL_BINDING_MASK = 0x3;
    const WASM_SYMBOL_BINDING_WEAK = 0x1;
    while (offset < end) {
      const subsectionType = getU8();
      const subsectionSize = getLEB();
      if (subsectionType === WASM_DYLINK_MEM_INFO) {
        customSection.memorySize = getLEB();
        customSection.memoryAlign = getLEB();
        customSection.tableSize = getLEB();
        customSection.tableAlign = getLEB();
      } else if (subsectionType === WASM_DYLINK_NEEDED) {
        const neededDynlibsCount = getLEB();
        for (let i = 0; i < neededDynlibsCount; ++i) {
          const libname = getString();
          customSection.neededDynlibs.push(libname);
        }
      } else if (subsectionType === WASM_DYLINK_EXPORT_INFO) {
        let count = getLEB();
        while (count--) {
          const symname = getString();
          const flags = getLEB();
          if (flags & WASM_SYMBOL_TLS) {
            customSection.tlsExports.add(symname);
          }
        }
      } else if (subsectionType === WASM_DYLINK_IMPORT_INFO) {
        let count = getLEB();
        while (count--) {
          getString(); //  module name -- not used, but have to read to get offset right.
          const symname = getString();
          const flags = getLEB();
          if ((flags & WASM_SYMBOL_BINDING_MASK) == WASM_SYMBOL_BINDING_WEAK) {
            customSection.weakImports.add(symname);
          }
        }
      } else {
        // unknown subsection
        offset += subsectionSize;
      }
    }
  }
  return customSection as Metadata;
}

// Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the given array
// that contains uint8 values, returns a copy of that string as a Javascript
// string object.
const UTF8Decoder = new TextDecoder();
function UTF8ArrayToString(
  binary: Uint8Array,
  ptr: number,
  maxBytesToRead: number
): string {
  const endIdx = ptr + maxBytesToRead;
  let endPtr = ptr;
  while (binary[endPtr] && endPtr < endIdx) {
    endPtr++;
  }
  const slice = binary.slice(ptr, endPtr);
  return UTF8Decoder.decode(slice);
}
