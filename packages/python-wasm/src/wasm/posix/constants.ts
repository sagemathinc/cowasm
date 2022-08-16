// These are purely for typescript, and I can only update this (when the zig code changes)
// by just printing out the constants at runtime.
const CONSTANTS = [
  "AT_FDCWD",
  "EBADF",
  "ENOENT",
  "SIG_BLOCK",
  "SIG_UNBLOCK",
  "SIG_SETMASK",
  "AF_INET",
  "AF_INET6",
] as const;

export type Constant = typeof CONSTANTS[number];

// export type Constant = string;

const constants: { [name: string]: number } = {};
export default constants;

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
  const { constants: names, values } = recvJsonObject(context, "getConstants");
  for (let i = 0; i < names.length; i++) {
    constants[names[i]] = values[i];
  }
}
