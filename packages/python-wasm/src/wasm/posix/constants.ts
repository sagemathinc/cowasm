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

const TABLE: { [name: string]: number } = {};

export function initConstants(getConstant: (name: Constant) => number) {
  for (const name of CONSTANTS) {
    TABLE[name] = getConstant(name as Constant);
    if (TABLE[name] == -2147483648) {
      throw Error(
        `BUG - You must add the constant ${name} to python-wasm/src/wasm/posix/constants.zig`
      );
    }
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
