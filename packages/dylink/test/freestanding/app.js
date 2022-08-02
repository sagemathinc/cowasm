const importWebAssemblyDlopen = require("../../dist").default;
const { nonzeroPositions } = require("../../dist/util");
const { readFileSync } = require("fs");
const assert = require("assert");

function importWebAssemblySync(path, importObject) {
  const binary = new Uint8Array(readFileSync(path));
  const mod = new WebAssembly.Module(binary);
  return new WebAssembly.Instance(mod, importObject);
}

async function main() {
  const importObject = {
    env: {
      malloc: () => {
        console.log("TODO - WARNING: using fake malloc for testing.");
        return 100000; // TODO!!!!
      },
    },
  };
  const instance = await importWebAssemblyDlopen({
    path: "app.wasm",
    importWebAssemblySync,
    importObject,
  });
  //  console.log("instance.exports = ", instance.exports);

  // console.log("instance.exports.pynone_a()=", instance.exports.pynone_a());

  console.log("instance.exports.add10(2022) = ", instance.exports.add10(2022));
  assert(instance.exports.add10(2022) == 2022 + 10);

  console.log(
    "instance.exports.add10b(2022) = ",
    instance.exports.add10b(2022)
  );
  assert(instance.exports.add10b(2022) == 2022 + 10);

  console.log(
    "instance.exports.add389(2022) = ",
    instance.exports.add389(2022)
  );
  assert(instance.exports.add389(2022) == 2022 + 389);

  console.log(
    "add5077_using_lib_using_main(389) = ",
    instance.exports.add5077_using_lib_using_main(389)
  );
  assert(instance.exports.add5077_using_lib_using_main(389) == 389 + 5077);

  console.log(
    "nonzero table entries = ",
    nonzeroPositions(importObject.env.__indirect_function_table)
  );

  console.log("pynones_match = ", instance.exports.pynones_match());
  assert(instance.exports.pynones_match() == 1);

  exports.instance = instance;
  exports.importObject = importObject;

  console.log("All tests passed!");
}

main();
