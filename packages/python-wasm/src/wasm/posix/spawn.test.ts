import { init, wasm } from "../../python/node";

test("test that a few spawn related posix calls throw an error (rather than getting stubbed and silently failing)", async () => {
  await init({ noWorker: true });
  if (wasm?.posixEnv == null) throw Error("bug");
  expect(wasm.posixEnv["posix_spawn"]()).toBe(-1);
  expect(wasm.posixEnv["posix_spawnp"]()).toBe(-1);
  expect(wasm.posixEnv["posix_spawn_file_actions_init"]()).toBe(-1);
});
