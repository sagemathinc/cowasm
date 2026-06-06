/*
Test disabling using stdio in node.js.
*/

import { asyncDash } from "../node";
import { delay } from "awaiting";

async function waitUntil(f: () => boolean, timeout = 5000): Promise<void> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout && !f()) {
    await delay(50);
  }
}

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

test("interrupt busy Python", async () => {
  const dash = await asyncDash({ noStdio: true });
  let stdout = "";
  let stderr = "";
  dash.kernel.on("stdout", (data) => {
    stdout += data.toString();
  });
  dash.kernel.on("stderr", (data) => {
    stderr += data.toString();
  });

  try {
    dash.terminal();
    await dash.kernel.writeToStdin("python\n");
    await waitUntil(() => stdout.includes(">>> "), 10000);
    expect(stdout).toContain(">>> ");

    await dash.kernel.writeToStdin("while True:\n    pass\n\n");
    await delay(500);
    await dash.kernel.writeToStdin("\u0003");

    await waitUntil(
      () => stderr.includes("KeyboardInterrupt") && stdout.endsWith(">>> "),
      10000
    );
    expect(stderr).toContain("KeyboardInterrupt");
    expect(stdout).toMatch(/>>> $/);
  } finally {
    await dash.kernel.terminate();
  }
});
