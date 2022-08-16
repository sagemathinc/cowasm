export type Constant = string;

const TABLE: { [name: string]: number } = {};

// function recvUint32(memory, ptr): number {
//   const view = new DataView(memory.buffer);
//   return view.getUint32(ptr, true);
// }

function recvJsonObject({ callFunction, recvString }, name: string) {
  let ptr = callFunction(name);
  if (ptr == 0) {
    throw Error("unable to receive JSON object");
  }
  return JSON.parse(recvString(ptr));
}

export function initConstants(context) {
  const { CONSTANTS, VALUES } = recvJsonObject(context, "getConstants");
  for (let i = 0; i < CONSTANTS.length; i++) {
    TABLE[CONSTANTS[i]] = VALUES[i];
  }
}

export default function constant(name: Constant): number {
  const n = TABLE[name];
  if (n == null) {
    throw Error(
      `WARNING: You must add the constant ${name} to python-wasm/src/wasm/posix/constants.zig`
    );
  }
  return n;
}
