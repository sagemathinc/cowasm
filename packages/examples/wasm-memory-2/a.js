function deref_add1(ptr) {
  console.log("ptr=", ptr);
  const b = instance2.exports.ptr_add1(ptr);
  console.log("calling deref_in_b(ptr) returns ", b);
  return b;
}
const table = new WebAssembly.Table({ initial: 10, element: "anyfunc" });
function showTable() {
  v = [];
  for (let i = 0; i < table.length; i++) {
    v.push(table.get(i) != null ? 1 : 0);
  }
  console.log(v);
}

showTable();

const memory = new WebAssembly.Memory({ initial: 10 });
const opts = { env: { deref_add1, memory, __indirect_function_table: table } };

const typedArray = new Uint8Array(require("fs").readFileSync("a.wasm"));
const mod = new WebAssembly.Module(typedArray);
const instance = new WebAssembly.Instance(mod, opts);
console.log("instance.exports = ", instance.exports);
showTable();
console.log("table.get(1)(4) = ", table.get(1)(4));


const typedArray2 = new Uint8Array(require("fs").readFileSync("b.wasm"));
const mod2 = new WebAssembly.Module(typedArray2);
opts.env = { ...instance.exports };
opts.env.memory = memory;
opts.env.__indirect_function_table = table;
opts.env.__table_base = 4;
const instance2 = new WebAssembly.Instance(mod2, opts);
console.log("instance2.exports = ", instance2.exports);
//table.set(0, instance2.exports.deref_in_b);

showTable();
console.log("table.get(1)(4) = ", table.get(1)(4));

module.exports = { instance, instance2 };

