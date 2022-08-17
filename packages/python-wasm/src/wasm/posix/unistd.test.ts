import { init, repr, exec } from "../../python/node";
import { hostname, userInfo } from "os";
import posix from "posix-zig";

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

test("test python's os.getpgrp returns a positive integer", async () => {
  await init({ debug: true });
  await exec("import os");
  expect(eval(await repr("os.getpgrp()"))).toBeGreaterThan(0);
});

test("test python's os.getgroups returns a list of positive integer", async () => {
  await init({ debug: true });
  await exec("import os");
  const v = eval(await repr("os.getgroups()"));
  for (const a of v) {
    expect(a).toBeGreaterThan(0);
  }
});

test("consistency check involving statvfs", async () => {
  await init({ debug: true });
  await exec("import os");
  const f_namemax = eval(await repr("os.statvfs('/').f_namemax"));
  expect(f_namemax).toBe(posix.statvfs("/").f_namemax);
});
