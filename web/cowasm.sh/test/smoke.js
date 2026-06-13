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

async function evaluate(devtools, expression) {
  const result = await devtools.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    throw Error(JSON.stringify(result.exceptionDetails));
  }
  return result.result?.value;
}

async function waitForExpression(devtools, expression, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await evaluate(devtools, expression)) {
      return;
    }
    await delay(250);
  }
  const html = await evaluate(devtools, "document.body.outerHTML");
  throw Error(`timed out waiting for ${expression}: ${html}`);
}

function keyEventParams(char) {
  if (char == "\n") {
    return {
      key: "Enter",
      code: "Enter",
      text: "\r",
      unmodifiedText: "\r",
      windowsVirtualKeyCode: 13,
      nativeVirtualKeyCode: 13,
    };
  }
  if (char == " ") {
    return {
      key: " ",
      code: "Space",
      text: " ",
      unmodifiedText: " ",
      windowsVirtualKeyCode: 32,
      nativeVirtualKeyCode: 32,
    };
  }
  const upper = char.toUpperCase();
  const keyCode = upper.charCodeAt(0);
  return {
    key: char,
    code: /[a-z]/i.test(char) ? `Key${upper}` : undefined,
    text: char,
    unmodifiedText: char,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  };
}

async function typeText(devtools, text) {
  for (const char of text) {
    const params = keyEventParams(char);
    await devtools.send("Input.dispatchKeyEvent", {
      type: "rawKeyDown",
      ...params,
    });
    await devtools.send("Input.dispatchKeyEvent", {
      type: "char",
      ...params,
    });
    await devtools.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      ...params,
    });
  }
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

async function runKeyboardSmoke() {
  console.log("running real app keyboard smoke");
  const keyboardDebugPort = debugPort + 2;
  const webpackEnv = { ...process.env };
  delete webpackEnv.COCALC_PROJECT_ID;
  delete webpackEnv.COCALC_BROWSER_ID;
  delete webpackEnv.COWASM_SH_SMOKE;
  delete webpackEnv.COWASM_SH_TERMINAL_SMOKE;
  await run("pnpm", ["exec", "webpack"], {
    env: webpackEnv,
    stdio: "inherit",
  });

  const server = await startServer();
  const userDataDir = mkdtempSync(join(tmpdir(), "cowasm-sh-keyboard-"));
  const browser = spawn(chromium, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    `--remote-debugging-port=${keyboardDebugPort}`,
    `--user-data-dir=${userDataDir}`,
    `http://127.0.0.1:${port}/`,
  ]);
  const browserClosed = new Promise((resolve) => {
    browser.on("close", resolve);
  });
  try {
    const targets = await waitForJson(
      `http://127.0.0.1:${keyboardDebugPort}/json/list`
    );
    const page = targets.find((target) => target.type == "page");
    if (!page?.webSocketDebuggerUrl) {
      throw Error(`no Chromium page target found: ${JSON.stringify(targets)}`);
    }

    const devtools = connectDevtools(page.webSocketDebuggerUrl);
    try {
      await devtools.send("Runtime.enable");
      await devtools.send("Page.enable");
      await waitForExpression(
        devtools,
        "document.querySelector('.xterm-rows')?.textContent.includes('(cowasm)$ ')"
      );
      const promptCount = await evaluate(
        devtools,
        "(document.querySelector('.xterm-rows')?.textContent.match(/\\(cowasm\\)\\$ /g) || []).length"
      );
      if (promptCount != 1) {
        const text = await evaluate(
          devtools,
          "document.querySelector('.xterm-rows')?.textContent"
        );
        throw Error(`expected one startup prompt, saw ${promptCount}: ${text}`);
      }
      await evaluate(
        devtools,
        "window.term?.focus(); document.querySelector('.xterm-helper-textarea')?.focus(); true"
      );
      await typeText(devtools, "echo keyboardok\n");
      await waitForExpression(
        devtools,
        "document.querySelector('.xterm-rows')?.textContent.includes('keyboardok')"
      );
      await typeText(devtools, "python\n");
      await waitForExpression(
        devtools,
        "document.querySelector('.xterm-rows')?.textContent.includes('>>> ')"
      );
      await typeText(devtools, "987+654\n");
      await waitForExpression(
        devtools,
        "document.querySelector('.xterm-rows')?.textContent.includes('1641')"
      );
      const text = await evaluate(
        devtools,
        "document.querySelector('.xterm-rows')?.textContent"
      );
      if (text.includes("998877++665544")) {
        throw Error(`Python input was visually doubled: ${text}`);
      }
      console.log("keyboard input and Python echo ok");
    } finally {
      devtools.close();
    }
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
  await runKeyboardSmoke();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
