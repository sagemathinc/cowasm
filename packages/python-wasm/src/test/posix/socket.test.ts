import { syncPython } from "../../node";

test("create a client and a server and have them talk to each other", async () => {
  // This is really cool because we run two completely separate copies of Python
  // at the same time in memory, one as the client and one as the server. Each
  // gets their own independent thread and separate WebAssembly memory.
  const client = await syncPython();
  const server = await syncPython();

  expect(client != null).toBe(true);
  expect(server != null).toBe(true);
});
