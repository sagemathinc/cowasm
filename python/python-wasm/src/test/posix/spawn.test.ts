import { syncPython } from "../../node";

test("test that a few spawn related posix calls throw an error (rather than getting stubbed and silently failing)", async () => {
  const { kernel } = await syncPython();
  const env: any = {};
  kernel.posixContext?.injectFunctions({ env, wasi_snapshot_preview1: {} });
  expect(env["posix_spawn"]()).toBe(-1);
  expect(env["posix_spawnp"]()).toBe(-1);
});

test("posix_spawn /bin/sleep and wait for it to finish and confirm the time", async () => {
  const { exec } = await syncPython();
  const t0 = new Date().valueOf();
  exec(
    "import os; os.waitpid(os.posix_spawn('/bin/sleep', ['/bin/sleep', '0.5'], {}), 0)"
  );
  const tm = new Date().valueOf() - t0;
  expect(tm > 400 && tm < 2000).toBe(true);
});

test("posix_spawnp sleep and wait for it to finish and confirm the time", async () => {
  const { exec } = await syncPython();
  const t0 = new Date().valueOf();
  await exec(
    "import os; os.waitpid(os.posix_spawnp('sleep', ['sleep', '0.5'], {}), 0)"
  );
  const tm = new Date().valueOf() - t0;
  expect(tm > 400 && tm < 2000).toBe(true);
});
