// These are purely for typescript, and I can only update this (when the zig code changes)
// by just printing out the constants at runtime.
const CONSTANTS = [
  "AT_FDCWD",
  "EBADF",
  "ENOENT",
  "ENOSYS",
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

function recvJsonObject({ callFunction, recv }, name: string) {
  let ptr = callFunction(name);
  if (ptr == 0) {
    throw Error("unable to receive JSON object");
  }
  return JSON.parse(recv.string(ptr));
}

export function initConstants(context) {
  const { names, values } = recvJsonObject(context, "getConstants");
  for (let i = 0; i < names.length; i++) {
    constants[names[i]] = values[i];
  }
}
