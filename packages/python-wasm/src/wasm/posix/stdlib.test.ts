import { init, wasm, exec, repr } from "../../python/node";

test("mkstemp system call -- hitting memfs", async () => {
  await init({ noWorker: true });
  if (wasm == null) throw Error("bug");
  const mkstemp = wasm.getFunction("mkstemp");
  if (mkstemp == null) throw Error("bug");
  const fd = mkstemp(wasm.send.string("/usr/lib/python3.11/fooXXXXXX"));
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
  const fd = mkstemp(wasm.send.string("/tmp/fooXXXXXX"));
  expect(fd).toBeGreaterThan(0);
  const path = wasm.wasi?.FD_MAP.get(fd)?.path;
  expect(path?.startsWith("/tmp/foo")).toBe(true);
  wasm.fs?.unlinkSync(path);
});

// >>> import os; os.getloadavg()
// (6.1474609375, 4.72021484375, 4.55126953125)
test("getting load average works", async () => {
  await init({ debug: true });
  await exec("import os");
  const v = eval(await repr("list(os.getloadavg())"));
  expect(v.length).toBe(3);
  expect(typeof v[0]).toBe("number");
});
