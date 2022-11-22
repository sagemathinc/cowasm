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
//import { delay } from "awaiting";

test("use noStdio", async () => {
  const python = await asyncPython({ noStdio: true });
  // start the full interactive REPL running.  We don't await this or we
  // would be stuck until the REPL gets exited.
  //python.terminal();

  //   // capture stdout and stderr to a string.  Actual stdout/stderr is a Buffer.
  //   let stdout = "";
  //   python.kernel.on("stdout", (data) => (stdout += data.toString()));
  //   let stderr = "";
  //   python.kernel.on("stderr", (data) => (stderr += data.toString()));

  //   // send 389 + 5077
  //   await python.kernel.writeToStdin("389 + 5077\n");

  //   // output is buffered and it can take a little while before it is read and emitted.
  //   await delay(150);
  //   expect(stdout.includes(`${389 + 5077}`)).toBe(true);

  await python.kernel.terminate();
});
