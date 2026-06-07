#!/usr/bin/env node

const { createServer } = require("http");
const { createReadStream, statSync } = require("fs");
const { join, resolve, extname } = require("path");

const root = resolve(__dirname, "..", "dist");
const port = parseInt(process.env.PORT ?? "8080", 10);
const host = process.env.HOST ?? "0.0.0.0";

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".wasm": "application/wasm",
  ".zip": "application/zip",
  ".xz": "application/x-xz",
  ".ico": "image/x-icon",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function send(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "same-origin",
  });
  res.end(body);
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch (_) {
    send(res, 400, "Bad request\n");
    return;
  }

  let path = resolve(join(root, pathname));
  if (!path.startsWith(root)) {
    send(res, 403, "Forbidden\n");
    return;
  }

  try {
    const stat = statSync(path);
    if (stat.isDirectory()) {
      path = join(path, "index.html");
    }
  } catch (_) {
    send(res, 404, "Not found\n");
    return;
  }

  res.writeHead(200, {
    "Content-Type": contentTypes[extname(path)] ?? "application/octet-stream",
    "Cache-Control": "no-store",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "same-origin",
  });
  createReadStream(path).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Serving ${root}`);
  console.log(`http://127.0.0.1:${port}/`);
  if (process.env.COCALC_PROJECT_ID) {
    console.log(`https://cocalc.com/${process.env.COCALC_PROJECT_ID}/port/${port}/`);
  }
});
