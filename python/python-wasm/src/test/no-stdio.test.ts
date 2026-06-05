/*

Test disabling using stdio in node.js.

This is so a nodejs application can run full python
terminals in memory without touch process.stdin,
process.stdout, and process.stderr.  This is critical
for building an electron app with CoWasm running
under node.js.  It's also useful for automated
testing.
*/

import { asyncPython } from "../node";
import { delay } from "awaiting";

jest.setTimeout(20000);

async function waitUntil(predicate: () => boolean, timeoutMs = 5000) {
  const t = new Date().valueOf();
  while (new Date().valueOf() - t < timeoutMs && !predicate()) {
    await delay(50);
  }
}

test("use noStdio", async () => {
  const python = await asyncPython({ fs: "bundle", noStdio: true });
  // capture stdout and stderr to a string.  Actual stdout/stderr is a Buffer.
  let stdout = "";
  python.kernel.on("stdout", (data) => {
    stdout += data.toString();
  });
  let stderr = "";
  python.kernel.on("stderr", (data) => {
    stderr += data.toString();
  });
  // start the full interactive REPL running.  We don't await this at
  // the top level or we  would be stuck until the REPL gets exited.
  (async () => {
    try {
      await python.terminal();
    } catch (_) {}
  })();
  const t = new Date().valueOf();
  while (new Date().valueOf() - t < 5000 && !stdout.includes(">>>")) {
    await delay(50);
  }

  // send 389 + 5077
  await python.kernel.writeToStdin("389 + 5077\n");

  // output is buffered, so it can take a little while before it appears.
  const t0 = new Date().valueOf();
  while (
    new Date().valueOf() - t0 < 5000 &&
    !stdout.includes(`${389 + 5077}`)
  ) {
    await delay(50);
  }
  expect(stdout).toContain(`${389 + 5077}`);

  // send something to stderr
  await python.kernel.writeToStdin(
    "import sys; sys.stderr.write('cowasm'); sys.stderr.flush()\n"
  );
  const t1 = new Date().valueOf();
  while (new Date().valueOf() - t1 < 5000 && !stderr.includes("cowasm")) {
    await delay(50);
  }
  expect(stderr).toContain("cowasm");

  await python.kernel.terminate();
});

test("noStdio terminal supports multiline input and ctrl-c interrupt", async () => {
  const python = await asyncPython({ fs: "bundle", noStdio: true });
  let stdout = "";
  python.kernel.on("stdout", (data) => {
    stdout += data.toString();
  });
  let stderr = "";
  python.kernel.on("stderr", (data) => {
    stderr += data.toString();
  });

  try {
    (async () => {
      try {
        await python.terminal();
      } catch (_) {}
    })();

    await waitUntil(() => stdout.includes(">>>"));
    expect(stdout).toContain(">>>");

    let stdoutOffset = stdout.length;
    await python.kernel.writeToStdin("def cowasm_contract(x):\n");
    await waitUntil(() => stdout.slice(stdoutOffset).includes("..."));
    expect(stdout.slice(stdoutOffset)).toContain("...");

    stdoutOffset = stdout.length;
    await python.kernel.writeToStdin("    return x + 41\n\n");
    await waitUntil(() => stdout.slice(stdoutOffset).includes(">>>"));

    stdoutOffset = stdout.length;
    await python.kernel.writeToStdin("cowasm_contract(1)\n");
    await waitUntil(() => stdout.slice(stdoutOffset).includes("42"));
    expect(stdout.slice(stdoutOffset)).toContain("42");

    stdoutOffset = stdout.length;
    await python.kernel.writeToStdin("while True: pass\n");
    await waitUntil(() => stdout.slice(stdoutOffset).includes("..."));
    const stderrOffset = stderr.length;
    await python.kernel.writeToStdin("\u0003");
    await waitUntil(
      () => stderr.slice(stderrOffset).includes("KeyboardInterrupt"),
      7500
    );
    expect(stderr.slice(stderrOffset)).toContain("KeyboardInterrupt");
  } finally {
    await python.kernel.terminate();
  }
});
