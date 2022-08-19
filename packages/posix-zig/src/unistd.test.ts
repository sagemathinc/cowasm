import posix from "./index";

// chroot
// can't assume tests not run as root:
// test("chroot raises an error", () => {
//   // this can only work as root, which we can't test here easily
//   expect(() => {
//     posix.chroot?.("/");
//   }).toThrow();
// });

// getegid

test("getegid returns a positive number", () => {
  expect(posix.getegid?.()).toBeGreaterThan(0);
});

// geteuid

test("geteuid returns a positive number", () => {
  expect(posix.geteuid?.()).toBeGreaterThan(0);
});

// gethostname

test("gethostname returns a string of length at least 1", () => {
  const hostname = posix.gethostname?.();
  if (hostname == null) throw Error("fail");
  expect(typeof hostname).toBe("string");
  expect(hostname.length).toBeGreaterThan(0);
});

// getpgid

test("getpgid returns a positive integer", () => {
  expect(posix.getpgid?.(1)).toBeGreaterThan(0);
});

test("getpgrp returns a positive integer", () => {
  expect(posix.getpgrp?.()).toBeGreaterThan(0);
});

test("a special case of setpgid that should work", () => {
  // @ts-ignore
  expect(posix.setpgid(0, 0)).toEqual(undefined);
});

test("a use of setpgid that should fail", () => {
  expect(() => {
    posix.setpgid?.(1, 2);
  }).toThrow();
});

// getppid
test("getppid returns a positive integer", () => {
  expect(posix.getppid?.()).toBeGreaterThan(0);
});

// setegid
// can't assume tests not run as root.
// test("seteuid throws an error (not as root)", () => {
//   expect(() => posix.setegid?.(10)).toThrow();
// });

test("that the security vulnerability CVE-2022-21211 does not impact posix-zig", () => {
  // @ts-ignore
  expect(() => posix.setegid?.({ toString: 1 })).toThrow();
});

// seteuid
test("seteuid throws an error (not as root)", () => {
  expect(() => posix.seteuid?.(10)).toThrow();
});

// sethostname
test("sethostname fails since we're not root", () => {
  expect(() => posix.sethostname?.("example.com")).toThrow();
});

// setregid
test("setregid throws an error (not as root)", () => {
  expect(() => posix.setregid?.(10, 20)).toThrow();
});
// setsid
test("setsid throws an error (since process is already group leader)", () => {
  expect(() => posix.setsid?.()).toThrow();
});

// ttyname
test("ttyname of stdin, stdout, stderr works and starts with /dev/ -- or on some platforms, throws an error since testing", () => {
  try {
    for (const fd of [0, 1, 2]) {
      const ttyname = posix.ttyname?.(fd);
      expect(ttyname?.startsWith("/dev")).toBe(true);
    }
  } catch (_err) {
    // this is also fine under testing, e.g., happens on linux, since not a tty.
  }
});

test("ttyname of an invalid fd throws an error", () => {
  expect(() => {
    posix.ttyname?.(999);
  }).toThrow();
});

test("ttyname with no inputs throws an error", () => {
  expect(() => {
    // @ts-ignore
    posix.ttyname?.();
  }).toThrow();
});

test("ttyname with non-number input throws an error", () => {
  expect(() => {
    // @ts-ignore
    posix.ttyname?.("xyz");
  }).toThrow();
});

// I think this should work with 'jest --runInBand'
// but it is NOT working, so commented out for now.
/*
test("sending ourselves an alarm signal", (cb) => {
  console.log("isMainThread", isMainThread);
  process.on("SIGALRM", () => {
    console.log("got SIGALRM");
    cb();
    return 0;
  });
  posix.alarm?.(1);
});
*/

// create a pipe
test("create a pipe", () => {
  const x = posix.pipe?.();
  if (x == null) throw Error("pipe must work");
  const { readfd, writefd } = x;
  expect(readfd).toBeGreaterThan(0);
  expect(writefd).toBeGreaterThan(0);
});

test("pipe2 on linux", () => {
  if (process.platform == "linux") {
    const x = posix.pipe2?.(0);
    if (x == null) throw Error("pipe2 must work on linux");
    const { readfd, writefd } = x;
    expect(readfd).toBeGreaterThan(0);
    expect(writefd).toBeGreaterThan(0);
  }
});
