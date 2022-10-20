const wasm: any = {};
export { wasm };

export async function repr(code) {
  console.log("STUB: repr", code);
}

export async function exec(code) {
  console.log("STUB: exec", code);
}

export async function terminal(
  argv = [process.env.PROGRAM_NAME ?? "/usr/bin/python"]
): Promise<number> {
  console.log("STUB: terminal", argv);
  return 1;
}

export async function init(config?: any) {
  console.log("STUB: init", config);
}
