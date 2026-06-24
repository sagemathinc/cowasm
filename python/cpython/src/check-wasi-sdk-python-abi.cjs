const assert = require("assert");
const { readFileSync } = require("fs");

const [modulePath] = process.argv.slice(2);

if (modulePath == null) {
  console.error("usage: node check-wasi-sdk-python-abi.cjs PYTHON_WASM");
  process.exit(2);
}

function readUleb(bytes, offset) {
  let value = 0;
  let shift = 0;
  for (;;) {
    assert(offset < bytes.length, "unterminated LEB128");
    const byte = bytes[offset++];
    value |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      return { value, offset };
    }
    shift += 7;
  }
}

function firstSectionName(bytes) {
  assert.strictEqual(bytes.readUInt32LE(0), 0x6d736100, "wasm magic");
  assert.strictEqual(bytes.readUInt32LE(4), 1, "wasm version");
  assert.strictEqual(bytes[8], 0, "first section is custom");

  let decoded = readUleb(bytes, 9);
  const sectionEnd = decoded.offset + decoded.value;
  decoded = readUleb(bytes, decoded.offset);
  const nameEnd = decoded.offset + decoded.value;
  assert(nameEnd <= sectionEnd, "custom section name fits");
  return new TextDecoder().decode(bytes.subarray(decoded.offset, nameEnd));
}

function assertImport(module, moduleName, name, kind) {
  const match = WebAssembly.Module.imports(module).find(
    (entry) =>
      entry.module === moduleName && entry.name === name && entry.kind === kind
  );
  assert(match, `missing import ${moduleName}.${name}:${kind}`);
}

function assertExport(module, name, kind) {
  const match = WebAssembly.Module.exports(module).find(
    (entry) => entry.name === name && entry.kind === kind
  );
  assert(match, `missing export ${name}:${kind}`);
}

const bytes = readFileSync(modulePath);
const wasmModule = new WebAssembly.Module(bytes);

assert.strictEqual(firstSectionName(bytes), "dylink.0");
assertImport(wasmModule, "env", "wasmSendString", "function");
assertImport(wasmModule, "env", "_PyEM_TrampolineCall", "function");
assertExport(wasmModule, "cowasm_python_init", "function");
assertExport(wasmModule, "cowasm_python_terminal", "function");
assertExport(wasmModule, "__wasm_call_ctors", "function");
