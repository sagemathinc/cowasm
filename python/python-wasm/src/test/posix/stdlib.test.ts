import { syncPython } from "../../node";

test("mkstemp system call -- hitting the memfs filesystem", async () => {
  const { kernel } = await syncPython({ fs: "everything" });
  const fd = kernel.callWithString("mkstemp", "/usr/lib/python3.11/fooXXXXXX");
  expect(fd).toBeGreaterThan(0);
  const path = kernel.wasi?.FD_MAP.get(fd)?.path;
  if (path == null) throw Error("bug");
  expect(path.startsWith("/usr/lib/python3.11/foo")).toBe(true);
  kernel.fs?.unlinkSync(path);
});

test("mkstemp system call -- hitting native fs (this tests that fs.constants is mapped properly on non-linux at least)", async () => {
  const { kernel } = await syncPython();
  const mkstemp = kernel.getFunction("mkstemp");
  if (mkstemp == null) throw Error("bug");
  const fd = mkstemp(kernel.send.string("/tmp/fooXXXXXX"));
  expect(fd).toBeGreaterThan(0);
  const path = kernel.wasi?.FD_MAP.get(fd)?.path;
  if (path == null) throw Error("bug");
  expect(path.startsWith("/tmp/foo")).toBe(true);
  kernel.fs?.unlinkSync(path);
});

// >>> import os; os.getloadavg()
// (6.1474609375, 4.72021484375, 4.55126953125)
test("getting load average works", async () => {
  const { exec, repr } = await syncPython();
  exec("import os");
  const v = eval(repr("list(os.getloadavg())"));
  expect(v.length).toBe(3);
  expect(typeof v[0]).toBe("number");
});
