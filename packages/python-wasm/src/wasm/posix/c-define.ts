const CONSTANTS = ["AT_FDCWD", "EBADF", "ENOENT"] as const;

export type Constant = typeof CONSTANTS[number];

const TABLE: { [name: string]: number } = {};

export function initDefine(cDefineZig: (name: Constant) => number) {
  for (const name of CONSTANTS) {
    TABLE[name] = cDefineZig(name as Constant);
    if (TABLE[name] == -2147483648) {
      throw Error(
        `BUG - You must add the constant ${name} to python-wasm/src/wasm/posix/c-define.zig`
      );
    }
  }
}

export default function cDefine(name: Constant): number {
  const n = TABLE[name];
  if (n == null) {
    throw Error(
      `WARNING: You must add the constant ${name} to python-wasm/src/wasm/posix/c-define.zig`
    );
  }
  return n;
}
