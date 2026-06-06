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

async function main() {
  setStatus("running");
  try {
    const output = await runDash(
      "rm -f /tmp/cowasm-sh-plot.png; " +
        "python -c \"import matplotlib; matplotlib.use('Agg'); " +
        "import matplotlib.pyplot as plt; " +
        "plt.plot([1, 2, 3], [1, 4, 9]); " +
        "plt.savefig('/tmp/cowasm-sh-plot.png')\"; " +
        "test -s /tmp/cowasm-sh-plot.png; " +
        "python -c \"import sys; sys.exit(0 if open('/tmp/cowasm-sh-plot.png', 'rb').read(8) == b'\\\\x89PNG\\\\r\\\\n\\\\x1a\\\\n' else 1)\""
    );
    setStatus("pass", output || "matplotlib savefig ok");
  } catch (err) {
    setStatus("fail", err instanceof Error ? err.stack ?? err.message : `${err}`);
  }
}

main();
