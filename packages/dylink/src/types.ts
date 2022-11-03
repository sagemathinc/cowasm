export interface Library {
  path: string;
  handle: number;
  instance: WebAssembly.Instance;
  symToPtr: { [symName: string]: number };
  stack_alloc: number;
}

export interface Env {
  __indirect_function_table?: WebAssembly.Table;
  memory?: WebAssembly.Memory;
  dlopen?: (pathnamePtr: number, flags: number) => number;
  dlsym?: (handle: number, symbolPtr: number) => number;
  dlerror?: () => number; // basically a stub right now
  dladdr?: () => number; // still a stub for now
  dlclose?: (handle: number) => number; // basically a stub right now
}
