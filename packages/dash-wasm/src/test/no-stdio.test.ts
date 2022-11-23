/*
Test disabling using stdio in node.js.
*/

import { asyncDash } from "../node";
import { delay } from "awaiting";

test("use noStdio", async () => {
  const dash = await asyncDash({ noStdio: true });
  // capture stdout and stderr to a string.  Actual stdout/stderr is a Buffer.
  let stdout = "";
  dash.kernel.on("stdout", (data) => {
    stdout += data.toString();
  });

  dash.terminal();

  // send 389 + 5077
  await dash.kernel.writeToStdin("echo $((389+5077))\n");

  // output is buffered, so it can take a little while before it appears.
  const t0 = new Date().valueOf();
  while (
    new Date().valueOf() - t0 < 5000 &&
    !stdout.includes(`${389 + 5077}`)
  ) {
    await delay(50);
  }
  expect(stdout).toContain(`${389 + 5077}`);

  await dash.kernel.terminate();
});
