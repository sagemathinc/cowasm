import { syncPython } from "../../node";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const WASI_SUBPROCESS_FIXTURE = Buffer.from(
  "AGFzbQEAAAABEANgBH9/f38Bf2ABfwBgAAACRgIWd2FzaV9zbmFwc2hvdF9wcmV2aWV3MQhmZF93cml0ZQAAFndhc2lfc25hcHNob3RfcHJldmlldzEJcHJvY19leGl0AAEDAgECBQMBAAEHEwIGbWVtb3J5AgAGX3N0YXJ0AAIKPAE6AEEAQcAANgIAQQRBDzYCAEEBQQBBAUEgEAAaQQhB4AA2AgBBDEEPNgIAQQJBCEEBQSQQABpBFxABCwsrAgBBwAALD3dhc20tY2hpbGQtb3V0CgBB4AALD3dhc20tY2hpbGQtZXJyCg==",
  "base64"
);

const WASI_SUBPROCESS_LARGE_OUTPUT_FIXTURE = Buffer.from(
  "AGFzbQEAAAABGwVgBH9/f38Bf2ABfwBgAABgAAF/YAN/f38BfwJGAhZ3YXNpX3NuYXBzaG90X3ByZXZpZXcxCGZkX3dyaXRlAAAWd2FzaV9zbmFwc2hvdF9wcmV2aWV3MQlwcm9jX2V4aXQAAQMKCQICAwQAAQICAgQFAXABAQEFAwEAAgYNAn8BQYCABAt/AEEACwcTAgZtZW1vcnkCAAZfc3RhcnQAAwrcBAkCAAtXAQF/AkACQCOBgICAAEGYgISAAGooAgANACOBgICAAEGYgISAAGpBATYCABCIgICAABCCgICAABCEgICAACEAEIqAgIAAIAANAQ8LAAsgABCHgICAAAALeQECfyOAgICAAEGAIGsiACSAgICAACAAQfgAQYAg/AsAQSEhAQJAAkADQCABQX9qIgFFDQFBASAAQYAgEIWAgIAAQYAgRg0AC0ECIQEMAQtBEUEDQQJBgICEgABBEBCFgICAAEEQRhshAQsgAEGAIGokgICAgAAgAQtwAQF/I4CAgIAAQRBrIgMkgICAgAAgAyACNgIMIAMgATYCCAJAAkAgACADQQhqQQEgA0EEahCGgICAACICRQ0AQQBBCCACIAJBzABGGzYCnICEgABBfyECDAELIAMoAgQhAgsgA0EQaiSAgICAACACCxUAIAAgASACIAMQgICAgABB//8DcQsLACAAEIGAgIAAAAvfAQECf0EAQaSAhIAANgKkgISAAEGAgISAACEAAkACQEGAgISAAEUNAEGAgISAAEGAgICAAGshAQwBCyOAgICAACEBQZCBhIAAQZCBhIAAa0GAgISAACABQYCAhIAASyIAGyEBQZCBhIAAQYCAhIAAIAAbIQALQThBADYCpICEgABBNCABNgKkgISAAEEwIAA2AqSAhIAAQQhBpICEgAA2AqSAhIAAQQRBpICEgAA2AqSAhIAAQQxBACgCoICEgAA2AqSAhIAAQQAgAUGAgIAEIAFBgICABEkbNgKUgISAAAsCAAsOABCJgICAABCJgICAAAsLJAIAQYCABAsRbGFyZ2Utb3V0cHV0LW9rCgAAQZSABAsEAAACAA==",
  "base64"
);

const WASI_SUBPROCESS_STDIN_ECHO_FIXTURE = Buffer.from(
  "AGFzbQEAAAABDAJgBH9/f38Bf2AAAAJEAhZ3YXNpX3NuYXBzaG90X3ByZXZpZXcxB2ZkX3JlYWQAABZ3YXNpX3NuYXBzaG90X3ByZXZpZXcxCGZkX3dyaXRlAAADAgEBBQMBAAEHEwIGbWVtb3J5AgAGX3N0YXJ0AAIKMwExAEEAQRA2AgBBBEHAADYCAEEAQQBBAUEIEAAaQQRBCCgCADYCAEEBQQBBAUEMEAEaCw==",
  "base64"
);

// Writes lines forever until its stdout reader closes the pipe. This catches
// regressions where fork/exec runs a raw WASI child to completion before
// returning its synthetic pid to Popen.
const WASI_SUBPROCESS_STREAM_FIXTURE = Buffer.from(
  "AGFzbQEAAAABEANgBH9/f38Bf2ABfwBgAAACRgIWd2FzaV9zbmFwc2hvdF9wcmV2aWV3MQhmZF93cml0ZQAAFndhc2lfc25hcHNob3RfcHJldmlldzEJcHJvY19leGl0AAEDAgECBQMBAAEHEwIGbWVtb3J5AgAGX3N0YXJ0AAIKLgEsAQF/QQBBEDYCAEEEQQw2AgADQEEBQQBBAUEIEAAhACAABEBBABABCwwACwsLEgEAQRALDHN0cmVhbS1saW5lCg==",
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

test("subprocess captures raw WASI output larger than a host pipe", async () => {
  const fixtureDir = mkdtempSync(join(tmpdir(), "cowasm-wasi-subprocess-"));
  const fixture = join(fixtureDir, "large-output.wasm");
  try {
    writeFileSync(fixture, WASI_SUBPROCESS_LARGE_OUTPUT_FIXTURE);
    chmodSync(fixture, 0o755);

    const { exec, repr } = python;
    exec(`
import subprocess
wasm_large_output = subprocess.run(
    [${JSON.stringify(fixture)}],
    text=True,
    capture_output=True,
)
`);
    expect(
      repr(
        "(wasm_large_output.returncode, len(wasm_large_output.stdout), wasm_large_output.stdout[:1], wasm_large_output.stdout[-1:], wasm_large_output.stderr)"
      )
    ).toBe("(17, 131072, 'x', 'x', 'large-output-ok\\n')");
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("subprocess passes regular-file stdin to a raw WASI command", async () => {
  const fixtureDir = mkdtempSync(join(tmpdir(), "cowasm-wasi-subprocess-"));
  const fixture = join(fixtureDir, "stdin-echo.wasm");
  const input = join(fixtureDir, "input.txt");
  try {
    writeFileSync(fixture, WASI_SUBPROCESS_STDIN_ECHO_FIXTURE);
    writeFileSync(input, "file-stdin\n");
    chmodSync(fixture, 0o755);

    const { exec, repr } = python;
    exec(`
import subprocess
with open(${JSON.stringify(input)}) as wasm_stdin:
    wasm_file_stdin = subprocess.run(
        [${JSON.stringify(fixture)}],
        stdin=wasm_stdin,
        text=True,
        capture_output=True,
    )
`);
    expect(
      repr(
        "(wasm_file_stdin.returncode, wasm_file_stdin.stdout, wasm_file_stdin.stderr)"
      )
    ).toBe("(0, 'file-stdin\\n', '')");
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("subprocess passes piped stdin to a raw WASI command", async () => {
  const fixtureDir = mkdtempSync(join(tmpdir(), "cowasm-wasi-subprocess-"));
  const fixture = join(fixtureDir, "stdin-echo.wasm");
  try {
    writeFileSync(fixture, WASI_SUBPROCESS_STDIN_ECHO_FIXTURE);
    chmodSync(fixture, 0o755);

    const { exec, repr } = python;
    exec(`
import subprocess
wasm_pipe_stdin = subprocess.Popen(
    [${JSON.stringify(fixture)}],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
)
wasm_pipe_stdout, wasm_pipe_stderr = wasm_pipe_stdin.communicate("pipe-stdin\\n")
`);
    expect(
      repr(
        "(wasm_pipe_stdin.returncode, wasm_pipe_stdout, wasm_pipe_stderr)"
      )
    ).toBe("(0, 'pipe-stdin\\n', '')");
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("subprocess streams raw WASI output before process exit", async () => {
  const fixtureDir = mkdtempSync(join(tmpdir(), "cowasm-wasi-subprocess-"));
  const fixture = join(fixtureDir, "stream.wasm");
  try {
    writeFileSync(fixture, WASI_SUBPROCESS_STREAM_FIXTURE);
    chmodSync(fixture, 0o755);

    const { exec, repr } = python;
    exec(`
import subprocess
wasm_stream = subprocess.Popen(
    [${JSON.stringify(fixture)}],
    text=True,
    stdout=subprocess.PIPE,
)
wasm_stream_first = wasm_stream.stdout.readline()
wasm_stream_running = wasm_stream.poll() is None
wasm_stream.stdout.close()
wasm_stream_returncode = wasm_stream.wait()
`);
    expect(
      repr(
        "(wasm_stream_first, wasm_stream_running, wasm_stream_returncode)"
      )
    ).toBe("('stream-line\\n', True, 0)");
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test("subprocess terminates a streaming raw WASI command", async () => {
  const fixtureDir = mkdtempSync(join(tmpdir(), "cowasm-wasi-subprocess-"));
  const fixture = join(fixtureDir, "stream.wasm");
  try {
    writeFileSync(fixture, WASI_SUBPROCESS_STREAM_FIXTURE);
    chmodSync(fixture, 0o755);

    const { exec, repr } = python;
    exec(`
import signal
import subprocess
wasm_terminated = subprocess.Popen(
    [${JSON.stringify(fixture)}],
    text=True,
    stdout=subprocess.PIPE,
)
wasm_terminated_first = wasm_terminated.stdout.readline()
wasm_terminated.terminate()
wasm_terminated_returncode = wasm_terminated.wait()
wasm_terminated.stdout.close()
`);
    expect(
      repr("(wasm_terminated_first, wasm_terminated_returncode)")
    ).toBe("('stream-line\\n', -15)");
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});
