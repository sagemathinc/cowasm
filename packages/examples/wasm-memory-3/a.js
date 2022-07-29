const table = new WebAssembly.Table({ initial: 10, element: "anyfunc" });
function showTable(tbl) {
  v = [];
  for (let i = 0; i < tbl.length; i++) {
    v.push(tbl.get(i) != null ? 1 : 0);
  }
  console.log(v);
}

const GOT = {
  xyz: new WebAssembly.Global({
    value: "i32",
    mutable: true,
  }),
  _Py_NoneStruct: new WebAssembly.Global({
    value: "i32",
    mutable: true,
  }, 389),
};

function GOTHandler(obj, symName) {
  const rtn = GOT[symName];
  if (!rtn) {
    rtn = GOT[symName] = new WebAssembly.Global({
      value: "i32",
      mutable: true,
    });
  }
  console.log("GOTHandler", { obj, symName, rtn });
  return rtn;
}

const memory = new WebAssembly.Memory({ initial: 50, maximum: 1000 });
const stack_pointer = new WebAssembly.Global(
  { value: "i32", mutable: true },
  65536
);
const opts = {
  env: {
    memory,
    __indirect_function_table: table,
    __memory_base: 65536,
    __table_base: 1,
    __stack_pointer: stack_pointer,
    pointer_to_add10: () => {
      return instance2.exports.pointer_to_add10();
    },
  },
  "GOT.mem": new Proxy(GOT, GOTHandler),
};

const typedArray = new Uint8Array(require("fs").readFileSync("a.wasm"));
const mod = new WebAssembly.Module(typedArray);
const instance = new WebAssembly.Instance(mod, opts);
console.log("instance.exports = ", instance.exports);
instance.exports.__wasm_call_ctors?.();
showTable(table);

const typedArray2 = new Uint8Array(require("fs").readFileSync("b.wasm"));
const mod2 = new WebAssembly.Module(typedArray2);
const stack_pointer2 = new WebAssembly.Global(
  { value: "i32", mutable: true },
  500000
);

GOT.add10 = new WebAssembly.Global(
  {
    value: "i32",
    mutable: true,
  },
  instance.exports.add10
);

const opts2 = {
  env: {
    memory,
    __indirect_function_table: table,
    __memory_base: 500000,
    __table_base: 3,
    __stack_pointer: stack_pointer2,
  },
  "GOT.mem": new Proxy(GOT, GOTHandler),
  "GOT.func": new Proxy(GOT, GOTHandler),
};

const instance2 = new WebAssembly.Instance(mod2, opts2);
instance2.exports.__wasm_call_ctors?.();
console.log("instance.exports.a_pynone() =", instance.exports.pynone_a());
console.log("instance2.exports.b_pynone() =", instance2.exports.pynone_b());
showTable(table);

console.log("instance.exports.add10(2020) =", instance.exports.add10(2020));

module.exports = { mod, mod2, table, instance, instance2 };
