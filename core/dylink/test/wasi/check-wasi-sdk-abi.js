const assert = require("assert");
const { readFileSync } = require("fs");

const [appPath, sidePath] = process.argv.slice(2);

if (appPath == null || sidePath == null) {
  console.error("usage: node check-wasi-sdk-abi.js APP_WASM SIDE_MODULE");
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

function firstSectionName(path) {
  const bytes = readFileSync(path);
  assert.strictEqual(bytes.readUInt32LE(0), 0x6d736100, `${path}: wasm magic`);
  assert.strictEqual(bytes.readUInt32LE(4), 1, `${path}: wasm version`);
  assert.strictEqual(bytes[8], 0, `${path}: first section is custom`);

  let decoded = readUleb(bytes, 9);
  const sectionEnd = decoded.offset + decoded.value;
  decoded = readUleb(bytes, decoded.offset);
  const nameEnd = decoded.offset + decoded.value;
  assert(nameEnd <= sectionEnd, `${path}: custom section name fits`);
  return new TextDecoder().decode(bytes.subarray(decoded.offset, nameEnd));
}

function wasmModule(path) {
  return new WebAssembly.Module(readFileSync(path));
}

function assertImport(module, moduleName, name, kind) {
  const match = WebAssembly.Module.imports(module).find(
    (entry) =>
      entry.module === moduleName && entry.name === name && entry.kind === kind
  );
  assert(
    match,
    `missing import ${moduleName}.${name}:${kind}`
  );
}

function assertNoImportModule(module, moduleName) {
  const match = WebAssembly.Module.imports(module).find(
    (entry) => entry.module === moduleName
  );
  assert(!match, `unexpected import module ${moduleName}`);
}

function assertExport(module, name, kind) {
  const match = WebAssembly.Module.exports(module).find(
    (entry) => entry.name === name && entry.kind === kind
  );
  assert(match, `missing export ${name}:${kind}`);
}

const app = wasmModule(appPath);
const side = wasmModule(sidePath);

assert.strictEqual(firstSectionName(sidePath), "dylink.0");

assertImport(app, "env", "memory", "memory");
assertImport(app, "env", "__indirect_function_table", "table");
assertImport(app, "env", "dlopen", "function");
assertImport(app, "env", "dlsym", "function");
assertExport(app, "malloc", "function");
assertExport(app, "free", "function");
assertExport(app, "printf", "function");
assertExport(app, "add5077", "function");
assertExport(app, "__WASM_EXPORT___Py_NoneStruct", "function");

assertImport(side, "env", "memory", "memory");
assertImport(side, "env", "__indirect_function_table", "table");
assertImport(side, "env", "__stack_pointer", "global");
assertImport(side, "env", "__memory_base", "global");
assertImport(side, "env", "__table_base", "global");
assertImport(side, "env", "printf", "function");
assertImport(side, "env", "malloc", "function");
assertImport(side, "env", "free", "function");
assertImport(side, "env", "add5077", "function");
assertImport(side, "GOT.mem", "_Py_NoneStruct", "global");
assertImport(side, "GOT.func", "add10", "global");
assertNoImportModule(side, "wasi_snapshot_preview1");
assertExport(side, "pynone_b", "function");
assertExport(side, "add10", "function");
assertExport(side, "pointer_to_add10", "function");
assertExport(side, "add389", "function");
assertExport(side, "add5077_using_func_from_main", "function");
