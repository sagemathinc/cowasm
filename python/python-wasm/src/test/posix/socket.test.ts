// This breaks randomly, due to probably threading issues, since this is the error:
//    "ENOENT: no such file or directory, uv_cwd"
// Hence we have to skip it for now.

import { asyncPython } from "../../node";

const CREATE_SERVER =
  "import socket; s = socket.create_server(('localhost', 0)); s.listen(1)";

// See also packages/python-wasm/data/socket for some python scripts
// you can run directly.

test.skip("create a client and a server and have them send/recv strings", async () => {
  // It is really cool how easily we can do this test due to the
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

test.skip("settimeout on a socket", async () => {
  const client = await asyncPython();
  const server = await asyncPython();
  await server.exec(CREATE_SERVER);
  const port = eval(await server.repr("s.getsockname()[1]"));
  expect(port).toBeGreaterThan(0);

  (async () => {
    try {
      // We wrap this since it is supposed to throw when we terminate the server.
      await server.exec(`
conn, addr = s.accept()
import time; time.sleep(0.25)
conn.send(b"Hello")
# never close conn and never send anything.
time.sleep(1)
  `);
    } catch (err) {}
  })();
  await client.exec(
    `import socket; conn = socket.create_connection(("localhost", ${port}))`
  );
  // Set a timeout and see that reading still happens quickly.
  await client.exec("conn.settimeout(1000)");
  // Get Hello and confirm it worked.
  expect(await client.repr("conn.recv(5)")).toBe("b'Hello'");

  // Make timeout short:
  await client.exec("conn.settimeout(0.5)");
  // Try to get more and confirm it stopped trying
  // quickly a bit after the timeout, showing the timeout
  // actually works.
  const start = new Date().valueOf();
  try {
    await client.repr("conn.recv(6)");
  } catch (err) {}
  expect(new Date().valueOf() - start).toBeLessThan(1000); // less than 1 second.
  expect(new Date().valueOf() - start).toBeGreaterThan(400);

  client.kernel.terminate();
  server.kernel.terminate();
});
