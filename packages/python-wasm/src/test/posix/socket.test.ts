import { asyncPython } from "../../node";

const CREATE_SERVER =
  "import socket; s = socket.create_server(('localhost', 0)); s.listen(1)";

// See also packages/python-wasm/data/socket for some python scripts
// you can run directly.

test("create a client and a server and have them send/recv strings", async () => {
  // It is really cool how easily wwe can do this test due to the
  // architecture of python-wasm!
  // We just run two completely separate copies of Python
  // at the same time in memory, one as the client and one as the server. Each
  // gets their own independent thread and separate WebAssembly memory, but this
  // is actually all happening inside one single operating system process.
  const client = await asyncPython();
  const server = await asyncPython();

  // We let Python assign an available port.
  await server.exec(CREATE_SERVER);
  // Get the port that Python assigned:
  const port = eval(await server.repr("s.getsockname()[1]"));
  expect(port).toBeGreaterThan(0);
  // Create a server that accepts one connection, sends "Hello",
  // then receives 6 bytes and saves them.  We do not await
  // this call since this blocks until after server one client.
  server.exec(`
conn, addr = s.accept()
conn.send(b"Hello")
received = conn.recv(6)
conn.close()
  `);
  // Make the client connect to the server.
  await client.exec(
    `import socket; conn = socket.create_connection(("localhost", ${port}))`
  );
  // Get Hello and confirm it worked.
  expect(await client.repr("conn.recv(5)")).toBe("b'Hello'");
  // Now send back "CoWasm" to the server
  await client.exec("conn.send(b'CoWasm')");
  // Confirm that the server received CoWasm
  expect(await server.repr("received")).toBe("b'CoWasm'");

  client.kernel.terminate();
  server.kernel.terminate();
});

// socket.settimeout is very commonly used on sockets and uses fd_fdstat_set_flags in WASI
// so we better test that it doesn't crash.
test("settimeout on a socket", async () => {
  const client = await asyncPython();
  const server = await asyncPython();

  await server.exec(CREATE_SERVER);
  const port = eval(await server.repr("s.getsockname()[1]"));
  await client.exec(
    `import socket; conn = socket.create_connection(("localhost", ${port}));`
  );
  // TODO: this now doesn't fail due to fd_fdstat_set_flags being implemented.
  // However it also doesn't actually work, i.e., no timeout is actually
  // enforced.  This may be due to further missing wasi functionality or
  // something just not being implemented correctly.
  // TODO: add a test that fails properly due to the timeout and also get it to
  // work correctly in general.  Not important for today though.
  await client.exec("conn.settimeout(1)");
  // that the above didn't crash is success.
  client.kernel.terminate();
  server.kernel.terminate();
});
