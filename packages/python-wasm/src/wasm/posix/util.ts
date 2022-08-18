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

export function notImplemented(functionName: string, ret?: number) {
  throw new NotImplementedError(functionName, ret);
}
