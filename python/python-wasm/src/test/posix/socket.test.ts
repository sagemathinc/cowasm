import { asyncPython } from "../../node";

const CREATE_SERVER =
  "import socket; s = socket.create_server(('localhost', 0)); s.listen(1)";

// See also packages/python-wasm/data/socket for some python scripts
// you can run directly.

test("create a client and a server and have them send/recv strings", async () => {
  // It is really cool how easily we can do this test due to the
  // architecture of python-wasm!
  // We just run two completely separate copies of Python
  // at the same time in memory, one as the client and one as the server. Each
  // gets their own independent thread and separate WebAssembly memory, but this
  // is actually all happening inside one single operating system process.
  const client = await asyncPython();
  const server = await asyncPython();
  try {
    // We let Python assign an available port.
    await server.exec(CREATE_SERVER);
    // Get the port that Python assigned:
    const port = eval(await server.repr("s.getsockname()[1]"));
    expect(port).toBeGreaterThan(0);
    // Create a server that accepts one connection, sends "Hello",
    // then receives 6 bytes and saves them. Do not await this until the
    // client has connected, since accept blocks in the server worker.
    const serverExchange = server.exec(`
conn, addr = s.accept()
conn.send(b"Hello")
received = conn.recv(6)
conn.close()
  `);
    serverExchange.catch(() => {});
    // Make the client connect to the server.
    await client.exec(
      `import socket; conn = socket.create_connection(("localhost", ${port}))`
    );
    // Get Hello and confirm it worked.
    expect(await client.repr("conn.recv(5)")).toBe("b'Hello'");
    // Now send back "CoWasm" to the server
    await client.exec("conn.send(b'CoWasm')");
    await serverExchange;
    // Confirm that the server received CoWasm
    expect(await server.repr("received")).toBe("b'CoWasm'");
  } finally {
    await Promise.all([client.kernel.terminate(), server.kernel.terminate()]);
  }
});

// socket.settimeout is very commonly used on sockets and uses fd_fdstat_set_flags in WASI
// so we better test that it doesn't crash.

test("settimeout on a socket", async () => {
  const client = await asyncPython();
  const server = await asyncPython();
  try {
    await server.exec(CREATE_SERVER);
    const port = eval(await server.repr("s.getsockname()[1]"));
    expect(port).toBeGreaterThan(0);

    const serverExchange = server.exec(`
conn, addr = s.accept()
import time; time.sleep(0.25)
conn.send(b"Hello")
# never close conn and never send anything.
time.sleep(1)
  `);
    serverExchange.catch(() => {});
    await client.exec(
      `import socket; conn = socket.create_connection(("localhost", ${port}))`
    );
    // Set a timeout and see that reading still happens quickly.
    await client.exec("conn.settimeout(1000)");
    // Get Hello and confirm it worked.
    expect(await client.repr("conn.recv(5)")).toBe("b'Hello'");

    // Make timeout short, then confirm that recv raises the specific Python
    // timeout exception in approximately the requested interval.
    await client.exec(`
conn.settimeout(0.5)
import time
started = time.monotonic()
try:
    conn.recv(6)
except BaseException as timeout_error:
    timeout_type = type(timeout_error).__name__
    timeout_elapsed = time.monotonic() - started
`);
    expect(await client.repr("timeout_type")).toBe("'TimeoutError'");
    const timeoutElapsed = Number(await client.repr("timeout_elapsed"));
    expect(timeoutElapsed).toBeGreaterThan(0.4);
    expect(timeoutElapsed).toBeLessThan(1);
    await serverExchange;
  } finally {
    await Promise.all([client.kernel.terminate(), server.kernel.terminate()]);
  }
});
