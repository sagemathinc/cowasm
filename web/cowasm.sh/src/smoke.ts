import dashWasm from "dash-wasm";

declare global {
  interface Window {
    __cowasmShSmoke?: { status: string; details?: string };
  }
}

function setStatus(status: string, details?: string) {
  window.__cowasmShSmoke = { status, details };
  document.body.dataset.cowasmSmoke = status;
  document.body.textContent = details ?? status;
}

function decodeOutput(data: any): string {
  if (typeof data == "string") return data;
  return new TextDecoder().decode(data);
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntil(f: () => boolean, timeout = 10000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout && !f()) {
    await delay(50);
  }
}

async function runDash(command: string, expectedOutput?: string): Promise<string> {
  const dash = await dashWasm();
  let stdout = "";
  let stderr = "";
  dash.kernel.on("stdout", (data) => {
    stdout += decodeOutput(data);
  });
  dash.kernel.on("stderr", (data) => {
    stderr += decodeOutput(data);
  });
  try {
    const code = await dash.terminal(["sh", "-c", command]);
    await delay(50);
    if (code != 0) {
      throw Error(`dash exited with ${code}: stdout=${stdout}; stderr=${stderr}`);
    }
    if (expectedOutput != null && !stdout.includes(expectedOutput)) {
      throw Error(`expected ${expectedOutput}, got stdout=${stdout}; stderr=${stderr}`);
    }
    return stdout;
  } finally {
    dash.kernel.terminate();
  }
}

async function runInteractiveDash(
  command: string,
  expectedOutput: string
): Promise<void> {
  const dash = await dashWasm({ env: { HOME: "/home/user" } });
  let stdout = "";
  let stderr = "";
  dash.kernel.on("stdout", (data) => {
    stdout += decodeOutput(data);
  });
  dash.kernel.on("stderr", (data) => {
    stderr += decodeOutput(data);
  });

  try {
    const output = () => stdout + stderr;
    dash.terminal();
    await waitUntil(() => output().includes("(cowasm)$ "));
    if (!output().includes("(cowasm)$ ")) {
      throw Error(`dash prompt did not appear: stdout=${stdout}; stderr=${stderr}`);
    }
    await dash.kernel.writeToStdin(`${command}\n`);
    await waitUntil(() => output().includes(expectedOutput));
    if (!output().includes(expectedOutput)) {
      throw Error(`expected ${expectedOutput}, got stdout=${stdout}; stderr=${stderr}`);
    }
  } finally {
    dash.kernel.terminate();
  }
}

async function runPythonInterruptSmoke(): Promise<void> {
  const dash = await dashWasm();
  let stdout = "";
  let stderr = "";
  dash.kernel.on("stdout", (data) => {
    stdout += decodeOutput(data);
  });
  dash.kernel.on("stderr", (data) => {
    stderr += decodeOutput(data);
  });

  try {
    dash.terminal();
    await dash.kernel.writeToStdin("python\n");
    await waitUntil(() => stdout.includes(">>> "));
    if (!stdout.includes(">>> ")) {
      throw Error(`python prompt did not appear: stdout=${stdout}; stderr=${stderr}`);
    }

    await dash.kernel.writeToStdin("while True:\n    pass\n\n");
    await delay(500);
    await dash.kernel.writeToStdin("\u0003");
    await waitUntil(
      () => stderr.includes("KeyboardInterrupt") && stdout.endsWith(">>> ")
    );
    if (!stderr.includes("KeyboardInterrupt") || !stdout.endsWith(">>> ")) {
      throw Error(`python did not interrupt: stdout=${stdout}; stderr=${stderr}`);
    }
  } finally {
    dash.kernel.terminate();
  }
}

async function main() {
  setStatus("running");
  try {
    await runInteractiveDash("cd; pwd", "/home/user");
    await runInteractiveDash('echo "hi" | wc -l', "1");
    await runDash(
      "rm -f /tmp/cowasm-sh-plot.png; " +
        "python -c \"import matplotlib; matplotlib.use('Agg'); " +
        "import matplotlib.pyplot as plt; " +
        "plt.plot([1, 2, 3], [1, 4, 9]); " +
        "plt.savefig('/tmp/cowasm-sh-plot.png')\"; " +
        "test -s /tmp/cowasm-sh-plot.png; " +
        "python -c \"import sys; sys.exit(0 if open('/tmp/cowasm-sh-plot.png', 'rb').read(8) == b'\\\\x89PNG\\\\r\\\\n\\\\x1a\\\\n' else 1)\""
    );
    await runPythonInterruptSmoke();
    setStatus("pass", "pipe, matplotlib savefig and python interrupt ok");
  } catch (err) {
    setStatus("fail", err instanceof Error ? err.stack ?? err.message : `${err}`);
  }
}

main();
