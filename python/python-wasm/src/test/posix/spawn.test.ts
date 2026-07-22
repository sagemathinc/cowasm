import { syncPython } from "../../node";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const WASI_SUBPROCESS_FIXTURE = Buffer.from(
  "AGFzbQEAAAABEANgBH9/f38Bf2ABfwBgAAACRgIWd2FzaV9zbmFwc2hvdF9wcmV2aWV3MQhmZF93cml0ZQAAFndhc2lfc25hcHNob3RfcHJldmlldzEJcHJvY19leGl0AAEDAgECBQMBAAEHEwIGbWVtb3J5AgAGX3N0YXJ0AAIKPAE6AEEAQcAANgIAQQRBDzYCAEEBQQBBAUEgEAAaQQhB4AA2AgBBDEEPNgIAQQJBCEEBQSQQABpBFxABCwsrAgBBwAALD3dhc20tY2hpbGQtb3V0CgBB4AALD3dhc20tY2hpbGQtZXJyCg==",
  "base64"
);

let python: Awaited<ReturnType<typeof syncPython>>;

beforeAll(async () => {
  python = await syncPython();
});

test("test that a few spawn related posix calls throw an error (rather than getting stubbed and silently failing)", async () => {
  const { kernel } = python;
  const env: any = {};
  kernel.posixContext?.injectFunctions({ env, wasi_snapshot_preview1: {} });
  expect(env["posix_spawn"]()).toBe(-1);
  expect(env["posix_spawnp"]()).toBe(-1);
});

test("posix_spawn /bin/sleep and wait for it to finish and confirm the time", async () => {
  const { exec } = python;
  const t0 = new Date().valueOf();
  exec(
    "import os; os.waitpid(os.posix_spawn('/bin/sleep', ['/bin/sleep', '0.5'], {}), 0)"
  );
  const tm = new Date().valueOf() - t0;
  expect(tm > 400 && tm < 2000).toBe(true);
});

test("posix_spawnp sleep and wait for it to finish and confirm the time", async () => {
  const { exec } = python;
  const t0 = new Date().valueOf();
  await exec(
    "import os; os.waitpid(os.posix_spawnp('sleep', ['sleep', '0.5'], {}), 0)"
  );
  const tm = new Date().valueOf() - t0;
  expect(tm > 400 && tm < 2000).toBe(true);
});

test("subprocess runs a raw WASI command with pipes and wait status", async () => {
  const fixtureDir = mkdtempSync(join(tmpdir(), "cowasm-wasi-subprocess-"));
  const fixture = join(fixtureDir, "child.wasm");
  try {
    writeFileSync(fixture, WASI_SUBPROCESS_FIXTURE);
    chmodSync(fixture, 0o755);

    const { exec, repr } = python;
    exec(`
import subprocess
wasm_child = subprocess.run(
    [${JSON.stringify(fixture)}],
    text=True,
    capture_output=True,
)
`);
    expect(
      repr("(wasm_child.returncode, wasm_child.stdout, wasm_child.stderr)")
    ).toBe("(23, 'wasm-child-out\\n', 'wasm-child-err\\n')");
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});
