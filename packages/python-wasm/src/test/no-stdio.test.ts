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

test("use noStdio", async () => {
  const python = await asyncPython({ noStdio: true });
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
