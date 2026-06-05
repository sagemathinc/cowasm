import pythonWasm from "python-wasm";
import dashWasm from "dash-wasm";
import { PythonExec, PythonProjectFiles, PythonRepr } from "./project-files";
import { PythonCommandRunner, runPythonProjectWorkflow } from "./project-runner";

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

async function runDash(
  command: string,
  expectedOutput?: string
): Promise<string> {
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
    throw Error(`dash exited with ${code}: stdout=${stdout}; stderr=${stderr}`);
  }
  if (expectedOutput != null) {
    await waitUntil(() => stdout.includes(expectedOutput), 5000);
  }
  return stdout;
}

async function runProjectSubsetSmoke(exec: PythonExec, repr: PythonRepr, kernel) {
  const project = new PythonProjectFiles({ exec, repr });
  let rejectedUnsafePath = false;
  try {
    await project.loadFiles([{ path: "../escape.txt", content: "nope" }]);
  } catch (_) {
    rejectedUnsafePath = true;
  }
  if (!rejectedUnsafePath) {
    throw Error("project adapter accepted an unsafe path");
  }

  const quotaProject = new PythonProjectFiles({
    exec,
    repr,
    limits: { maxFiles: 1, maxFileBytes: 4, maxTotalBytes: 4 },
  });
  let rejectedQuota = false;
  try {
    await quotaProject.loadFiles([
      { path: "a.txt", content: "1234" },
      { path: "b.txt", content: "x" },
    ]);
  } catch (_) {
    rejectedQuota = true;
  }
  if (!rejectedQuota) {
    throw Error("project adapter accepted an over-quota import");
  }

  const files = [
    { path: "input.txt", content: "alpha\nbeta\nalpha\n" },
    { path: "data/blob.bin", content: new Uint8Array([0, 1, 65]) },
    {
      path: "script.py",
      content: String.raw`
import pathlib

root = pathlib.Path("/project")
text = (root / "input.txt").read_text()
lines = [line for line in text.splitlines() if line == "alpha"]
(root / "out.txt").write_text(f"alpha-count={len(lines)}\n")
blob = (root / "data" / "blob.bin").read_bytes()
(root / "bin").mkdir(exist_ok=True)
(root / "bin" / "out.bin").write_bytes(bytes([blob[0], 255, blob[-1]]))
print(f"wrote {len(lines)} matching lines")
`.replace(/^\n/, ""),
    },
  ];
  await project.loadFiles(files);
  let rejectedOutputQuota = false;
  try {
    await new PythonCommandRunner({
      exec,
      kernel,
      limits: { maxRuntimeMs: 5000, maxOutputBytes: 8 },
    }).run("print('x' * 1000)");
  } catch (_) {
    rejectedOutputQuota = true;
  }
  if (!rejectedOutputQuota) {
    throw Error("project command runner accepted over-quota output");
  }

  let rejectedRuntimeLimit = false;
  try {
    await new PythonCommandRunner({
      exec,
      kernel,
      limits: { maxRuntimeMs: 100, maxOutputBytes: 1024 },
    }).run("while True: pass");
  } catch (_) {
    rejectedRuntimeLimit = true;
  }
  if (!rejectedRuntimeLimit) {
    throw Error("project command runner accepted over-time command");
  }

  const result = await runPythonProjectWorkflow({
    exec,
    repr,
    kernel,
    files,
    code: "import runpy; runpy.run_path('/project/script.py', run_name='__main__')",
    commandLimits: { maxRuntimeMs: 5000, maxOutputBytes: 1024 },
  });
  if (!result.command.stdout.includes("wrote 2 matching lines")) {
    throw Error(`unexpected project command stdout: ${result.command.stdout}`);
  }
  const exportQuotaProject = new PythonProjectFiles({
    exec,
    repr,
    limits: { maxChangedBytes: 2 },
  });
  let rejectedExportQuota = false;
  try {
    await exportQuotaProject.changedFiles();
  } catch (_) {
    rejectedExportQuota = true;
  }
  if (!rejectedExportQuota) {
    throw Error("project adapter accepted an over-quota export");
  }

  const changes = result.changes;
  const byPath: { [path: string]: (typeof changes)[number] } = {};
  for (const change of changes) {
    byPath[change.path] = change;
  }
  if (
    changes.length != 2 ||
    byPath["out.txt"]?.baseSha256 != null ||
    byPath["out.txt"]?.size != "alpha-count=2\n".length ||
    byPath["out.txt"]?.text != "alpha-count=2\n" ||
    byPath["bin/out.bin"]?.baseSha256 != null ||
    byPath["bin/out.bin"]?.size != 3 ||
    byPath["bin/out.bin"]?.base64 != "AP9B" ||
    byPath["bin/out.bin"]?.text !== null
  ) {
    throw Error(`unexpected project changes: ${JSON.stringify(changes)}`);
  }
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
      stage = "project subset fixture";
      await runProjectSubsetSmoke(exec, repr, kernel);
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
      "mkdir -p /tmp; touch /tmp/dash-smoke; python -c \"open('/tmp/dash-python', 'w').write('42')\"; test -f /tmp/dash-smoke; test -f /tmp/dash-python"
    );
    await kernel.terminate();
    setStatus("pass", `${result}\n${dashOutput}`);
  } catch (err) {
    setStatus("fail", err instanceof Error ? err.stack ?? err.message : `${err}`);
  }
}

main();
