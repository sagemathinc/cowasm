const { createReadStream, existsSync, mkdtempSync, rmSync } = require("fs");
const { createServer } = require("http");
const { extname, join, resolve } = require("path");
const { tmpdir } = require("os");
const { spawn } = require("child_process");

const root = resolve(__dirname, "..");
const dist = join(root, "dist");
const dashWasmRoot = resolve(root, "../../core/dash-wasm");
const port = Number(process.env.COWASM_SH_SMOKE_PORT ?? 8775);
const debugPort = Number(process.env.COWASM_SH_DEBUG_PORT ?? port + 1);
const chromium = process.env.CHROMIUM ?? "/usr/bin/chromium";

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (data) => {
      stdout += data.toString();
      if (options.stdio == "inherit") process.stdout.write(data);
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
      if (options.stdio == "inherit") process.stderr.write(data);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code) {
        reject(Error(`${command} ${args.join(" ")} failed with code ${code}\n${stderr}`));
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

function contentType(path) {
  switch (extname(path)) {
    case ".html":
      return "text/html";
    case ".js":
      return "text/javascript";
    case ".wasm":
      return "application/wasm";
    case ".zip":
      return "application/zip";
    case ".xz":
      return "application/x-xz";
    default:
      return "application/octet-stream";
  }
}

function startServer() {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
    const pathname = url.pathname == "/" ? "/index.html" : url.pathname;
    const file = join(dist, pathname);
    if (!file.startsWith(dist) || !existsSync(file)) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": contentType(file),
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Resource-Policy": "same-origin",
    });
    createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.json();
    } catch (_) {}
    await delay(100);
  }
  throw Error(`timed out waiting for ${url}`);
}

function connectDevtools(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();

  ws.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data.toString());
    if (message.id == null) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) {
      request.reject(Error(JSON.stringify(message.error)));
    } else {
      request.resolve(message.result);
    }
  });

  const opened = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  async function send(method, params = {}) {
    await opened;
    const requestId = ++id;
    ws.send(JSON.stringify({ id: requestId, method, params }));
    return await new Promise((resolve, reject) => {
      pending.set(requestId, { resolve, reject });
    });
  }

  return { send, close: () => ws.close() };
}

async function waitForSmokeResult(smokeDebugPort) {
  const targets = await waitForJson(
    `http://127.0.0.1:${smokeDebugPort}/json/list`
  );
  const page = targets.find((target) => target.type == "page");
  if (!page?.webSocketDebuggerUrl) {
    throw Error(`no Chromium page target found: ${JSON.stringify(targets)}`);
  }

  const devtools = connectDevtools(page.webSocketDebuggerUrl);
  try {
    const start = Date.now();
    while (Date.now() - start < 60000) {
      let status;
      try {
        status = await devtools.send("Runtime.evaluate", {
          expression: "document.body.dataset.cowasmSmoke || ''",
          returnByValue: true,
        });
      } catch (_) {
        await delay(250);
        continue;
      }
      const value = status.result?.value;
      if (value == "pass") {
        const details = await devtools.send("Runtime.evaluate", {
          expression:
            "document.body.dataset.cowasmSmokeDetails || document.body.textContent",
          returnByValue: true,
        });
        console.log(details.result?.value);
        return;
      }
      if (value == "fail") {
        const details = await devtools.send("Runtime.evaluate", {
          expression:
            "document.body.dataset.cowasmSmokeDetails || document.body.textContent",
          returnByValue: true,
        });
        throw Error(`cowasm.sh smoke test failed: ${details.result?.value}`);
      }
      await delay(250);
    }

    const details = await devtools.send("Runtime.evaluate", {
      expression: "document.body.outerHTML",
      returnByValue: true,
    });
    throw Error(`cowasm.sh smoke test timed out: ${details.result?.value}`);
  } finally {
    devtools.close();
  }
}

async function runSmoke(name, smokeEnv, debugPortOffset = 0) {
  console.log(`running ${name} smoke`);
  const smokeDebugPort = debugPort + debugPortOffset;
  const webpackEnv = { ...process.env, ...smokeEnv };
  delete webpackEnv.COCALC_PROJECT_ID;
  delete webpackEnv.COCALC_BROWSER_ID;
  await run("pnpm", ["exec", "webpack"], {
    env: webpackEnv,
    stdio: "inherit",
  });

  const server = await startServer();
  const userDataDir = mkdtempSync(join(tmpdir(), "cowasm-sh-smoke-"));
  const browser = spawn(chromium, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    `--remote-debugging-port=${smokeDebugPort}`,
    `--user-data-dir=${userDataDir}`,
    `http://127.0.0.1:${port}/`,
  ]);
  const browserClosed = new Promise((resolve) => {
    browser.on("close", resolve);
  });
  try {
    await waitForSmokeResult(smokeDebugPort);
  } finally {
    browser.kill();
    await Promise.race([browserClosed, delay(2000)]);
    server.close();
    rmSync(userDataDir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
}

async function main() {
  if (!existsSync(chromium)) {
    throw Error(`Chromium executable not found: ${chromium}`);
  }

  const dashWasmDist = join(dashWasmRoot, "dist");
  await run(
    "make",
    [join(dashWasmDist, ".built"), join(dashWasmDist, "fs.zip")],
    { cwd: dashWasmRoot, stdio: "inherit" }
  );

  await runSmoke("runtime", { COWASM_SH_SMOKE: "1" });
  await runSmoke("terminal", { COWASM_SH_TERMINAL_SMOKE: "1" }, 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
