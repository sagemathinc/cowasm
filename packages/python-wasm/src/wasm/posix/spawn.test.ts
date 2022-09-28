import { init, wasm, exec } from '../../python/node.js';

test("test that a few spawn related posix calls throw an error (rather than getting stubbed and silently failing)", async () => {
  await init({ noWorker: true });
  if (wasm?.posixEnv == null) throw Error("bug");
  expect(wasm.posixEnv["posix_spawn"]()).toBe(-1);
  expect(wasm.posixEnv["posix_spawnp"]()).toBe(-1);
});

test("posix_spawn /bin/sleep and wait for it to finish and confirm the time", async () => {
  await init({ noWorker: true });
  const t0 = new Date().valueOf();
  await exec(
    "import os; os.waitpid(os.posix_spawn('/bin/sleep', ['/bin/sleep', '0.5'], {}), 0)"
  );
  const tm = new Date().valueOf() - t0;
  expect(tm > 400 && tm < 1000).toBe(true);
});

test("posix_spawnp sleep and wait for it to finish and confirm the time", async () => {
  await init({ noWorker: true });
  const t0 = new Date().valueOf();
  await exec(
    "import os; os.waitpid(os.posix_spawnp('sleep', ['sleep', '0.5'], {}), 0)"
  );
  const tm = new Date().valueOf() - t0;
  expect(tm > 400 && tm < 1000).toBe(true);
});

// import os; os.posix_spawnp('sleep',['sleep','3'],{},file_actions=[(os.POSIX_SPAWN_DUP2, 1, 1)])
