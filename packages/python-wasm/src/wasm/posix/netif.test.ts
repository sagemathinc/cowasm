// import socket; socket.if_indextoname(1)

import { init, repr, exec } from '../../python/node.js';

beforeEach(async () => {
  await init({ debug: true });
});

test("getting the first network interface works", async () => {
  await exec("import socket");
  const name = eval(await repr("socket.if_indextoname(1)"));
  expect(typeof name).toBe("string");
  expect(name.length).toBeGreaterThan(0);
});

test("going back and forth between interface and name works", async () => {
  await exec("import socket");
  const name = eval(await repr("socket.if_indextoname(1)"));
  expect(eval(await repr(`socket.if_nametoindex('${name}')`))).toBe(1);
});

test("going back and forth for all interfaces works", async () => {
  await exec("import json, socket");
  const ni = JSON.parse(eval(await repr("json.dumps(socket.if_nameindex())")));
  for (const [index, name] of ni) {
    expect(eval(await repr(`socket.if_indextoname(${index})`))).toBe(name);
    expect(eval(await repr(`socket.if_nametoindex("${name}")`))).toBe(index);
  }
});
