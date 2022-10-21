const wasm: any = {};

async function repr(code) {
  console.log("STUB: repr", code);
}

async function exec(code) {
  console.log("STUB: exec", code);
}

async function init(config?:any) {
  console.log("STUB: init", config);
}

const python = { repr, exec, wasm, init };
export default python;
