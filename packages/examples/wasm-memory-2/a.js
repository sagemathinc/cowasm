function deref_add1(ptr) {
  console.log("ptr=", ptr);
  const b = instance2.exports.ptr_add1(ptr);
  console.log("calling deref_in_b(ptr) returns ", b);
  return b;
}

function pointer_to_add10() {
  const ptr = instance2.exports.pointer_to_add10();
  console.log("pointer_to_add10 = ", ptr);
  return ptr;
}

const table = new WebAssembly.Table({ initial: 10, element: "anyfunc" });
function showTable(tbl) {
  v = [];
  for (let i = 0; i < tbl.length; i++) {
    v.push(tbl.get(i) != null ? 1 : 0);
  }
  console.log(v);
}

showTable(table);

const memory = new WebAssembly.Memory({ initial: 6, maximum: 100 });
const opts = {
  env: {
    deref_add1,
    pointer_to_add10,
    memory,
    __indirect_function_table: table,
  },
};

const typedArray = new Uint8Array(require("fs").readFileSync("a.wasm"));
const mod = new WebAssembly.Module(typedArray);
const instance = new WebAssembly.Instance(mod, opts);
console.log("instance.exports = ", instance.exports);
showTable(table);
console.log("table.get(1)(4) = ", table.get(1)(4));
console.log("instance.exports.a_xyz() =", instance.exports.a_xyz());

const typedArray2 = new Uint8Array(require("fs").readFileSync("b.wasm"));
const mod2 = new WebAssembly.Module(typedArray2);
opts.env = { ...instance.exports };
opts.env.memory = memory;
//const table2 = new WebAssembly.Table({ initial: 10, element: "anyfunc" });
opts.env.__indirect_function_table = table;

opts["GOT.mem"] = new Proxy({}, () => {
  throw Error("GOT!");
});
opts["GOT.func"] = new Proxy({}, () => {
  throw Error("GOT!");
});

const instance2 = new WebAssembly.Instance(mod2, opts);
console.log("instance2.exports = ", instance2.exports);
//table.set(0, instance2.exports.deref_in_b);

showTable(table);

// console.log("table.get(1)(4) = ", table.get(1)(4));
// console.log("table2.get(1)(4) = ", table2.get(1)(4));
// table.set(2, table2.get(1));
// table.set(3, table2.get(2));

console.log("instance.exports.add10(4) = ", instance.exports.add10(4));

console.log("instance.exports.a_xyz() =", instance.exports.a_xyz());
console.log("instance2.exports.b_xyz() =", instance2.exports.b_xyz());

module.exports = { mod, mod2, table, instance, instance2 };
