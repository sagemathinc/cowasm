const { WASI } = require("@wasmer/wasi");
const wasi = new WASI({
  args: process.argv,
  env: process.env,
});

const fs = require("fs");
const source = fs.readFileSync(`${__dirname}/integer-export.wasm`);
const typedArray = new Uint8Array(source);

const stub = (s) => () => console.log("stub", s);

const simple = {};

const env = {
  raise: stub("raise"),
  main: console.log,
};

const encoder = new TextEncoder();
function stringToU8(s) {
  const array = new Int8Array(
    simple.instance.exports.memory.buffer,
    0,
    s.length + 1
  );
  array.set(encoder.encode(s));
  array[s.length] = 0;
  return array;
}

WebAssembly.instantiate(typedArray, {
  env,
  wasi_snapshot_preview1: wasi.wasiImport,
}).then((result) => {
  wasi.start(result.instance);

  simple.instance = result.instance;

  result.instance.exports.init();

  //result.instance.exports.fromString(stringToU8("hello world"));

  exports.isPseudoPrime = (n) =>
    result.instance.exports.isPseudoPrime(stringToU8(`${n}`));
  exports.isPseudoPrimeInt = (n) => result.instance.exports.isPseudoPrimeInt(n);

  console.log("isPseudoPrime(2021) = ", exports.isPseudoPrime(2021));

  /*
  exports.createIntegerStr = (n) => {
    return result.instance.exports.createIntegerStr(stringToU8(`${n}`));
  };
  exports.createIntegerInt = (n) => {
    return result.instance.exports.createIntegerInt(n);
  };
  exports.printInteger = result.instance.exports.printInteger;
  exports.addIntegers = result.instance.exports.addIntegers;
  exports.mulIntegers = result.instance.exports.mulIntegers;
  exports.freeInteger = result.instance.exports.freeInteger;

  const n = exports.createIntegerStr(
    "1361129467683753853853498429727072845814"
  );
  console.log("n = ", n);
  const m = exports.createIntegerStr(
    "1361129467683753853853498429727072845824"
  );
  console.log("m = ", m);
  const p = exports.addIntegers(n, m);
  console.log("p = ", p);
  // should be 2722258935367507707706996859454145691638
  exports.printInteger(p);
  exports.freeInteger(p);
  const q = exports.mulIntegers(n, m);
  console.log("q = ", q);
  // should be 1852673427797059126777135760139006525638708459973411486092786359829339345780736
  exports.printInteger(q);

  exports.freeInteger(q);
  exports.freeInteger(n);
  exports.freeInteger(m);
  */
});
