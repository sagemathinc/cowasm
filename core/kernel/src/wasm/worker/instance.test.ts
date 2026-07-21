import WasmInstanceSync from "./instance";

test("main function pointers remain stable after accessor state changes", () => {
  let accessorsValid = true;
  const bridge = jest.fn(() => 17);
  const malloc = jest.fn(() => 4096);
  const free = jest.fn();
  const directCMalloc = jest.fn(() => 8192);
  const directCFree = jest.fn();
  const functions = new Map<number, Function>([
    [1, bridge],
    [2, malloc],
    [3, free],
  ]);
  const table = {
    get: (ptr: number) => {
      const f = functions.get(ptr);
      if (f == null) throw new RangeError("not a function table address");
      return f;
    },
  } as unknown as WebAssembly.Table;
  const pointer = (ptr: number) => () => {
    if (!accessorsValid) {
      throw new WebAssembly.RuntimeError("function signature mismatch");
    }
    return ptr;
  };
  const wasm = new WasmInstanceSync(
    {
      exports: {
        __WASM_EXPORT__bridge: pointer(1),
        __WASM_EXPORT__malloc: pointer(2),
        __WASM_EXPORT__free: pointer(3),
        __WASM_EXPORT__data: pointer(1_000_000),
        c_malloc: directCMalloc,
        c_free: directCFree,
      },
      env: {},
    },
    new WebAssembly.Memory({ initial: 1 }),
    undefined,
    table
  );

  accessorsValid = false;

  expect(wasm.getFunction("bridge")?.()).toBe(17);
  expect(wasm.getFunction("c_malloc")?.(32)).toBe(4096);
  expect(wasm.getFunction("c_free")).toBe(free);
  expect(directCMalloc).not.toHaveBeenCalled();
  expect(directCFree).not.toHaveBeenCalled();
});
