import { init, repr, exec } from "../../python/node.js";
import { hostname, userInfo } from "os";
import { posix } from "posix-node";

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
    expect(a).toBeGreaterThanOrEqual(0);
  }
});

test("consistency check involving statvfs", async () => {
  await init({ debug: true });
  await exec("import os");
  const f_namemax = eval(await repr("os.statvfs('/').f_namemax"));
  expect(f_namemax).toBe(posix.statvfs?.("/").f_namemax);
});

// can't do this during jest testing, though it works on the command line:
// test("consistency check involving fstatvfs", async () => {
//   await init({ debug: true });
//   await exec("import os");
//   const f_namemax = eval(await repr("os.fstatvfs(1).f_namemax"));
//   expect(f_namemax).toBe(posix.fstatvfs?.(1).f_namemax);
// });

test("using getresuid on Linux only", async () => {
  await exec("import os");
  if (process.platform == "linux") {
    const resuid = eval(
      "[" + (await repr("os.getresuid()")).slice(1, -1) + "]"
    );
    // should be a triple of numbers
    expect(resuid.length).toBe(3);
    for (const n of resuid) {
      expect(typeof n).toBe("number");
    }
  }
});

test("using getresgid on Linux only", async () => {
  await exec("import os");
  if (process.platform == "linux") {
    const resgid = eval(
      "[" + (await repr("os.getresgid()")).slice(1, -1) + "]"
    );
    // should be a triple of numbers
    expect(resgid.length).toBe(3);
    for (const n of resgid) {
      expect(typeof n).toBe("number");
    }
  }
});

// setresuid/setresgid can only be done as root, so we only test that they throw here

// test("setresuid throws", async () => {
//   await exec("import os");
//   expect(repr("os.setresuid(0,0,0)")).rejects.toThrow();
// });

//  >>> import os, posix; os.getgrouplist(os.getlogin(),0)
// [0, 12, 20, 61, 79, 80, 81, 98, 701, 33, 100, 204, 250, 395, 398, 399, 400]
test("getgrouplist returns a list of numbers", async () => {
  await exec("import os, posix");
  const v = eval(await repr("os.getgrouplist(os.getlogin(),0)"));
  expect(v.length).toBeGreaterThan(0);
  expect(typeof v[0]).toBe("number");
});
