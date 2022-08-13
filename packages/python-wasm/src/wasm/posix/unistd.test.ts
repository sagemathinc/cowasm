import { init, repr, exec } from "../../python/node";
import { hostname, userInfo } from "os";

test("test getting the hostname via python, which calls the gethostname system call", async () => {
  await init({ debug: true });
  await exec("import socket");
  expect(await repr("socket.gethostname()")).toEqual(`'${hostname()}'`);
});

test("test python's os.getlogin() which calls the getlogin systemcall", async () => {
  await init({ debug: true });
  await exec("import os");
  expect(await repr("os.getlogin()")).toEqual(`'${userInfo?.()?.username}'`);
});
