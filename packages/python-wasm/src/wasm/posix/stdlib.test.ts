import { init, wasm } from "../../python/node";

test("mkstemp system call -- hitting memfs", async () => {
  await init({ noWorker: true });
  if (wasm == null) throw Error("bug");
  const mkstemp = wasm.getFunction("mkstemp");
  if (mkstemp == null) throw Error("bug");
  const fd = mkstemp(wasm.sendString("/usr/lib/python3.11/fooXXXXXX"));
  expect(fd).toBeGreaterThan(0);
  const path = wasm.wasi?.FD_MAP.get(fd)?.path;
  expect(path?.startsWith("/usr/lib/python3.11/foo")).toBe(true);
  wasm.fs?.unlinkSync(path);
});

test("mkstemp system call -- hitting native fs (this tests that fs.constants is mapped properly on non-linux at least)", async () => {
  await init({ noWorker: true });
  if (wasm == null) throw Error("bug");
  const mkstemp = wasm.getFunction("mkstemp");
  if (mkstemp == null) throw Error("bug");
  const fd = mkstemp(wasm.sendString("/tmp/fooXXXXXX"));
  expect(fd).toBeGreaterThan(0);
  const path = wasm.wasi?.FD_MAP.get(fd)?.path;
  expect(path?.startsWith("/tmp/foo")).toBe(true);
  wasm.fs?.unlinkSync(path);
});
