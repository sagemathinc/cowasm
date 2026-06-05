import pythonWasm from "python-wasm";
import dashWasm from "dash-wasm";

declare global {
  interface Window {
    __cowasmBrowserSmoke?: { status: string; details?: string };
  }
}

function setStatus(status: string, details?: string) {
  window.__cowasmBrowserSmoke = { status, details };
  document.body.dataset.cowasmSmoke = status;
  document.body.textContent = details ?? status;
}

function decodeOutput(data: any): string {
  if (typeof data == "string") return data;
  return new TextDecoder().decode(data);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntil(predicate: () => boolean, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await delay(50);
  }
  throw Error("timed out waiting for browser smoke condition");
}

async function runDash(command: string): Promise<string> {
  const dash = await dashWasm();
  let stdout = "";
  let stderr = "";
  dash.kernel.on("stdout", (data) => {
    stdout += decodeOutput(data);
  });
  dash.kernel.on("stderr", (data) => {
    stderr += decodeOutput(data);
  });
  const code = await dash.terminal(["sh", "-c", command]);
  if (code != 0) {
    throw Error(`dash exited with ${code}: ${stderr}`);
  }
  return stdout;
}

async function main() {
  setStatus("running");
  try {
    const python = await pythonWasm({ noReadline: true });
    const { exec, repr, kernel } = python;
    let stdout = "";
    let stderr = "";
    kernel.on("stdout", (data) => {
      stdout += decodeOutput(data);
    });
    kernel.on("stderr", (data) => {
      stderr += decodeOutput(data);
    });

    let stage = "import sys";
    try {
      await exec("import sys");
      stage = "create /tmp";
      await exec("import os; os.makedirs('/tmp', exist_ok=True)");
      stage = "write file";
      await exec("open('/tmp/cowasm-browser-smoke.txt', 'w').write('browser')");
      stage = "read file";
      await exec("value = open('/tmp/cowasm-browser-smoke.txt').read()");
      stage = "stream stdout and stderr";
      await exec(
        "print('cowasm-browser-stdout'); sys.stderr.write('cowasm-browser-stderr\\n'); sys.stderr.flush()"
      );
      await waitUntil(
        () =>
          stdout.includes("cowasm-browser-stdout") &&
          stderr.includes("cowasm-browser-stderr")
      );
      stage = "interrupt long-running exec";
      let interrupted = false;
      const running = exec("while True: pass").catch(() => {
        interrupted = true;
      });
      await delay(100);
      kernel.signal(2);
      await waitUntil(() => interrupted, 5000);
      await running;
    } catch (err) {
      throw Error(
        `${stage} failed: ${err instanceof Error ? err.message : `${err}`}`
      );
    }
    const result = await repr("(sys.version_info[:2], value, 6 * 7)");
    if (!result.includes("browser") || !result.includes("42")) {
      throw Error(`unexpected Python result: ${result}`);
    }
    const dashOutput = await runDash(
      "echo cowasm-browser-dash; python -c \"print(6*7)\""
    );
    if (
      !dashOutput.includes("cowasm-browser-dash") ||
      !dashOutput.includes("42")
    ) {
      throw Error(`unexpected dash output: ${dashOutput}`);
    }
    await kernel.terminate();
    setStatus("pass", `${result}\n${dashOutput}`);
  } catch (err) {
    setStatus("fail", err instanceof Error ? err.stack ?? err.message : `${err}`);
  }
}

main();
