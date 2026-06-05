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

type PythonExec = (code: string) => Promise<void>;
type PythonRepr = (code: string) => Promise<string>;

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

async function runProjectSubsetSmoke(exec: PythonExec, repr: PythonRepr) {
  await exec(String.raw`
import hashlib, json, os, pathlib, runpy

root = pathlib.Path("/project")
root.mkdir(exist_ok=True)
project_files = {
    "input.txt": "alpha\nbeta\nalpha\n",
    "script.py": """
import pathlib

root = pathlib.Path("/project")
text = (root / "input.txt").read_text()
lines = [line for line in text.splitlines() if line == "alpha"]
(root / "out.txt").write_text(f"alpha-count={len(lines)}\\n")
print(f"wrote {len(lines)} matching lines")
""".lstrip(),
}

for name, content in project_files.items():
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

base_hashes = {
    path.name: digest(path)
    for path in root.iterdir()
    if path.is_file()
}

runpy.run_path(str(root / "script.py"), run_name="__main__")

changed_files = {}
for path in root.iterdir():
    if not path.is_file():
        continue
    current_hash = digest(path)
    base_hash = base_hashes.get(path.name)
    if base_hash != current_hash:
        changed_files[path.name] = {
            "base": base_hash,
            "sha256": current_hash,
            "text": path.read_text(),
        }

assert changed_files == {
    "out.txt": {
        "base": None,
        "sha256": changed_files["out.txt"]["sha256"],
        "text": "alpha-count=2\n",
    }
}
project_subset_summary = json.dumps({
    "mount": str(root),
    "imported": sorted(project_files),
    "changed": sorted(changed_files),
    "out": changed_files["out.txt"]["text"],
})
`);
  const summary = await repr("project_subset_summary");
  if (
    !summary.includes("/project") ||
    !summary.includes("out.txt") ||
    !summary.includes("alpha-count=2")
  ) {
    throw Error(`unexpected project subset summary: ${summary}`);
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
      await runProjectSubsetSmoke(exec, repr);
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
