const { readFileSync } = require("fs");
const assert = require('assert')

const table = new WebAssembly.Table({ initial: 10, element: "anyfunc" });
function showTable(tbl) {
  v = [];
  for (let i = 0; i < tbl.length; i++) {
    v.push(tbl.get(i) != null ? 1 : 0);
  }
  console.log(v);
}

// Global Offset Table
const GOT = {};
function GOTMemHandler(obj, symName) {
  let rtn = GOT[symName];
  if (!rtn) {
    rtn = GOT[symName] = new WebAssembly.Global(
      {
        value: "i32",
        mutable: true,
      },
      instance.exports[symName]
    );
  }
  return rtn;
}

let nextTablePos = 2;
const funcMap = {};
function GOTFuncHandler(obj, symName) {
  let rtn = GOT[symName];
  if (!rtn) {
    // place in the table
    funcMap[symName] = nextTablePos;
    rtn = GOT[symName] = new WebAssembly.Global(
      {
        value: "i32",
        mutable: true,
      },
      nextTablePos
    );
    nextTablePos += 1;
  }
  return rtn;
}

//
// Load the main non-dynamic WebAssembly instance
//
const memory = new WebAssembly.Memory({ initial: 50, maximum: 1000 });
const stack_pointer = new WebAssembly.Global(
  { value: "i32", mutable: true },
  65536
);
const opts = {
  env: {
    memory,
    __indirect_function_table: table,
    // TODO: simulating some of what dlopen/dlsym will give us here:
    pointer_to_add10: () => {
      return instance2.exports.pointer_to_add10();
    },
    pointer_to_add389: () => {
      return instance2.exports.pointer_to_add389();
    },
  },
};

const binary = new Uint8Array(readFileSync("dist/app.wasm"));
const mod = new WebAssembly.Module(binary);
const instance = new WebAssembly.Instance(mod, opts);
console.log("instance.exports = ", instance.exports);
showTable(table);

//
// Load the dynamic module
//

const binary2 = new Uint8Array(readFileSync("dist/dynamic-library.wasm.so"));
const mod2 = new WebAssembly.Module(binary2);
const stack_pointer2 = new WebAssembly.Global(
  { value: "i32", mutable: true },
  500000
);

const opts2 = {
  env: {
    memory,
    __indirect_function_table: table,
    __memory_base: 500000, // TODO: need to use malloc
    __table_base: 0,
    __stack_pointer: stack_pointer2, // TODO: no clue what the input of this is.
  },
  "GOT.mem": new Proxy(GOT, { get: GOTMemHandler }),
  "GOT.func": new Proxy(GOT, { get: GOTFuncHandler }),
};

const instance2 = new WebAssembly.Instance(mod2, opts2);
console.log("instance2.exports = ", instance2.exports);
for (const symName in funcMap) {
  console.log(`table: setting position ${funcMap[symName]} to ${symName}`);
  table.set(funcMap[symName], instance2.exports[symName]);
  delete funcMap[symName];
}

console.log("instance2.exports.add10(22) = ", instance2.exports.add10(22));
assert(instance2.exports.add10(22) == 32);

table.set(2, instance2.exports.add10);
showTable(table);

console.log("instance.exports.add10(22) =", instance.exports.add10(22));
assert(instance.exports.add10(22) == 32);
console.log("instance.exports.add389(22) =", instance.exports.add389(22));
assert(instance.exports.add389(22) == 389 + 22);

console.log("instance.exports.a_pynone() =", instance.exports.pynone_a());
console.log("instance2.exports.b_pynone() =", instance2.exports.pynone_b());
assert(instance.exports.pynone_a() == instance2.exports.pynone_b());

console.log("instance.exports.a_pysome() =", instance.exports.pysome_a());
console.log("instance2.exports.b_pysome() =", instance2.exports.pysome_b());
assert(instance.exports.pysome_a() == instance2.exports.pysome_b());

console.log(
  "instance2.exports.my_add10(2020) =",
  instance2.exports.my_add10(2020)
);
assert(instance2.exports.my_add10(2020) == 2030);

console.log("All assertions passed!");