export function notImplemented(name: string) {
  return () => {
    throw Error(`${name} is not implemented yet`);
  };
}
