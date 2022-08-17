interface ErrorWithReturn extends Error {
  ret?: number;
}

export function notImplemented(name: string, ret?: number) {
  const err: ErrorWithReturn = Error(`${name} is not implemented yet`);
  if (ret != null) {
    err.ret = ret;
  }
  throw err;
}
