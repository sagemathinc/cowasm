import { init, wasm, exec } from "../../python/node";

test("test that a few spawn related posix calls throw an error (rather than getting stubbed and silently failing)", async () => {
  await init({ noWorker: true });
  if (wasm?.posixEnv == null) throw Error("bug");
  expect(wasm.posixEnv["posix_spawn"]()).toBe(-1);
  expect(wasm.posixEnv["posix_spawnp"]()).toBe(-1);
  expect(wasm.posixEnv["posix_spawn_file_actions_init"]()).toBe(-1);
});

test("spawn the sleep command and wait for it to finish and confirm the time", async () => {
  await init({ noWorker: true });
  const t0 = new Date().valueOf();
  await exec(
    "import os; os.waitpid(os.posix_spawn('/bin/sleep', ['/bin/sleep', '0.5'], {}), 0)"
  );
  const tm = new Date().valueOf() - t0;
  expect(tm > 400 && tm < 1000).toBe(true);
});
