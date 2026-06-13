export const PYTHON_LIB = "/usr/lib/python3.14";
export const PYTHONEXECUTABLE = "/usr/lib/python.wasm";

export function pythonLibPath(name: string): string {
  return `${PYTHON_LIB}/${name}`;
}
