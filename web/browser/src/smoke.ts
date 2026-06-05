import pythonWasm from "python-wasm";

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

async function main() {
  setStatus("running");
  try {
    const python = await pythonWasm({ noReadline: true });
    const { exec, repr, kernel } = python;
    let stage = "import sys";
    try {
      await exec("import sys");
      stage = "create /tmp";
      await exec("import os; os.makedirs('/tmp', exist_ok=True)");
      stage = "write file";
      await exec("open('/tmp/cowasm-browser-smoke.txt', 'w').write('browser')");
      stage = "read file";
      await exec("value = open('/tmp/cowasm-browser-smoke.txt').read()");
    } catch (err) {
      throw Error(
        `${stage} failed: ${err instanceof Error ? err.message : `${err}`}`
      );
    }
    const result = await repr("(sys.version_info[:2], value, 6 * 7)");
    if (!result.includes("browser") || !result.includes("42")) {
      throw Error(`unexpected Python result: ${result}`);
    }
    await kernel.terminate();
    setStatus("pass", result);
  } catch (err) {
    setStatus("fail", err instanceof Error ? err.stack ?? err.message : `${err}`);
  }
}

main();
