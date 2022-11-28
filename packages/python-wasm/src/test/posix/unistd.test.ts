import { syncPython } from "../../node";
import { hostname, userInfo } from "os";

test("test getting the hostname via python, which calls the gethostname system call", async () => {
  const { exec, repr } = await syncPython();
  exec("import socket");
  expect(repr("socket.gethostname()")).toEqual(`'${hostname()}'`);
});

test("test python's os.getlogin() which calls the getlogin systemcall", async () => {
  const { exec, repr } = await syncPython();
  exec("import os");
  expect(repr("os.getlogin()")).toEqual(`'${userInfo?.()?.username}'`);
});

test("test python's os.getpgrp returns a positive integer", async () => {
  const { exec, repr } = await syncPython();
  exec("import os");
  expect(eval(repr("os.getpgrp()"))).toBeGreaterThan(0);
});

test("test python's os.getgroups returns a list of positive integer", async () => {
  const { exec, repr } = await syncPython();
  exec("import os");
  const v = eval(repr("os.getgroups()"));
  for (const a of v) {
    expect(a).toBeGreaterThanOrEqual(0);
  }
});

test("consistency check involving statvfs", async () => {
  const { exec, repr } = await syncPython();
  exec("import os");
  const f_namemax = eval(repr("os.statvfs('/').f_namemax"));
  // it's 255 on some linux and macos, so we'll just do a consistency check,
  // and not have to add another dependency on posix-node.
  // import posix from "posix-node";
  //expect(f_namemax).toBe(posix.statvfs?.("/").f_namemax);
  expect(f_namemax >= 128 && f_namemax <= 1024).toBe(true);
});

// can't do this during jest testing, though it works on the command line:
// test("consistency check involving fstatvfs", async () => {
//   await init({ debug: true });
//   await exec("import os");
//   const f_namemax = eval(await repr("os.fstatvfs(1).f_namemax"));
//   expect(f_namemax).toBe(posix.fstatvfs?.(1).f_namemax);
// });

test("using getresuid on Linux only", async () => {
  const { exec, repr } = await syncPython();
  exec("import os");
  if (process.platform == "linux") {
    const resuid = eval("[" + repr("os.getresuid()").slice(1, -1) + "]");
    // should be a triple of numbers
    expect(resuid.length).toBe(3);
    for (const n of resuid) {
      expect(typeof n).toBe("number");
    }
  }
});

test("using getresgid on Linux only", async () => {
  const { exec, repr } = await syncPython();
  exec("import os");
  if (process.platform == "linux") {
    const resgid = eval("[" + repr("os.getresgid()").slice(1, -1) + "]");
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
  const { exec, repr } = await syncPython();
  exec("import os, posix");
  const v = eval(repr("os.getgrouplist(os.getlogin(),0)"));
  expect(v.length).toBeGreaterThan(0);
  expect(typeof v[0]).toBe("number");
});

// wasi doesn't have fchdir, so I implemented it and I'm testing it here via python.
test("fchdir works", async () => {
  // This is complicated, since e.g., on macos if you do "cd /tmp" you
  // end up in /private/tmp", etc.  It's weird.
  const { exec, repr } = await syncPython();
  exec("import tempfile; td = tempfile.TemporaryDirectory()");
  exec("import os; fd = os.open(td.name, os.O_RDONLY)");
  exec("os.fchdir(fd)");
  const actual = eval(repr("os.getcwd()"));
  exec("os.mkdir('abc')");
  exec("fd2 = os.open('abc', os.O_RDONLY)");
  exec("os.fchdir(fd2)");
  expect(eval(repr("os.getcwd()"))).toBe(actual + "/abc");
  // it doesn't seem to always get removed (which is weird)
  exec("import shutil; shutil.rmtree(td.name)");
});
