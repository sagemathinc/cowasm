// import socket; socket.if_indextoname(1)

import { init, repr, exec } from "../../python/node";

beforeEach(async () => {
  await init({ debug: true });
});

test("getting the first network interface works", async () => {
  await exec("import socket");
  const name = eval(await repr("socket.if_indextoname(1)"));
  expect(typeof name).toBe("string");
  expect(name.length).toBeGreaterThan(0);
});
