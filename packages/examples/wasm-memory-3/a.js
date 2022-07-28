
const table = new WebAssembly.Table({ initial: 10, element: "anyfunc" });
function showTable(tbl) {
  v = [];
  for (let i = 0; i < tbl.length; i++) {
    v.push(tbl.get(i) != null ? 1 : 0);
  }
  console.log(v);
}

const memory = new WebAssembly.Memory({ initial: 6, maximum: 100 });
const opts = {
  env: {
    memory,
    __indirect_function_table: table,
  },
};

const typedArray = new Uint8Array(require("fs").readFileSync("a.wasm"));
const mod = new WebAssembly.Module(typedArray);
const instance = new WebAssembly.Instance(mod, opts);
console.log("instance.exports = ", instance.exports);
showTable(table);
console.log("instance.exports.a_pynone() =", instance.exports.pynone_a());

const typedArray2 = new Uint8Array(require("fs").readFileSync("b.wasm"));
const mod2 = new WebAssembly.Module(typedArray2);
opts.env = { ...instance.exports };
opts.env.memory = memory;
const table2 = new WebAssembly.Table({ initial: 10, element: "anyfunc" });
opts.env.__indirect_function_table = table2;

const instance2 = new WebAssembly.Instance(mod2, opts);
console.log("instance2.exports.b_pynone() =", instance2.exports.pynone_b());



module.exports = { mod, mod2, table, table2, instance, instance2 };
