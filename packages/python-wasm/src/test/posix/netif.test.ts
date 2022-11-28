import { syncPython} from "../../node";

test("getting the first network interface works", async () => {
  const { exec, repr } = await syncPython();
  exec("import socket");
  const name = eval(repr("socket.if_indextoname(1)"));
  expect(typeof name).toBe("string");
  expect(name.length).toBeGreaterThan(0);
});

test("going back and forth between interface and name works", async () => {
  const { exec, repr } = await syncPython();
  exec("import socket");
  const name = eval(repr("socket.if_indextoname(1)"));
  expect(eval(repr(`socket.if_nametoindex('${name}')`))).toBe(1);
});

test("going back and forth for all interfaces works", async () => {
  const { exec, repr } = await syncPython();
  exec("import json, socket");
  const ni = JSON.parse(eval(repr("json.dumps(socket.if_nameindex())")));
  for (const [index, name] of ni) {
    expect(eval(repr(`socket.if_indextoname(${index})`))).toBe(name);
    expect(eval(repr(`socket.if_nametoindex("${name}")`))).toBe(index);
  }
});
