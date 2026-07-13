import { createPosixLocaleconv } from "./import";

test("localeconv exposes a stable wasm32 C-locale structure", () => {
  const memory = new WebAssembly.Memory({ initial: 1 });
  let allocations = 0;
  const localeconv = createPosixLocaleconv(memory, (bytes) => {
    allocations += 1;
    expect(bytes).toBe(59);
    return 128;
  });

  const localePtr = localeconv();
  expect(localeconv()).toBe(localePtr);
  expect(allocations).toBe(1);

  const view = new DataView(memory.buffer);
  const bytes = new Uint8Array(memory.buffer);
  const decimalPointPtr = view.getUint32(localePtr, true);
  const emptyStringPtr = view.getUint32(localePtr + 4, true);
  expect(bytes.slice(decimalPointPtr, decimalPointPtr + 2)).toEqual(
    new Uint8Array([".".charCodeAt(0), 0])
  );
  expect(bytes[emptyStringPtr]).toBe(0);
  for (let i = 1; i < 10; i += 1) {
    expect(view.getUint32(localePtr + 4 * i, true)).toBe(emptyStringPtr);
  }
  expect(bytes.slice(localePtr + 40, localePtr + 54)).toEqual(
    new Uint8Array(14).fill(127)
  );
});

test("localeconv retries when the wasm allocator initially fails", () => {
  const memory = new WebAssembly.Memory({ initial: 1 });
  let calls = 0;
  const localeconv = createPosixLocaleconv(memory, () => {
    calls += 1;
    return calls == 1 ? 0 : 256;
  });

  expect(localeconv()).toBe(0);
  expect(localeconv()).toBe(256);
  expect(calls).toBe(2);
});
