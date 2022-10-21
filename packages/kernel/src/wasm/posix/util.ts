import debug from "debug";
const log = debug("posix");

export class NotImplementedError extends Error {
  ret: number;
  constructor(functionName: string, ret?: number) {
    super(`${functionName} is not implemented yet`);
    this.name = "NotImplementedError"; // name is a standard exception property.
    if (ret != null) {
      this.ret = ret;
    }
  }
}

export function notImplemented(functionName: string, ret: number = -1) {
  console.warn("WARNING: calling NOT IMPLEMENTED function", functionName);
  log("WARNING: calling NOT IMPLEMENTED function", functionName);
  throw new NotImplementedError(functionName, ret);
}
