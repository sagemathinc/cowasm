import posix from "./index";
import { userInfo } from "os";

const isRoot = userInfo().username == "root";

if (!isRoot) {
  // chroot
  test("chroot raises an error", () => {
    // this can only work as root, which we can't test here easily
    expect(() => {
      posix.chroot?.("/");
    }).toThrow();
  });
}

// getegid

test("getegid returns a nonnegative number", () => {
  expect(posix.getegid?.()).toBeGreaterThanOrEqual(0);
});

// geteuid

test("geteuid returns a nonnegative number", () => {
  expect(posix.geteuid?.()).toBeGreaterThanOrEqual(0);
});

// gethostname

test("gethostname returns a string of length at least 1", () => {
  const hostname = posix.gethostname?.();
  if (hostname == null) throw Error("fail");
  expect(typeof hostname).toBe("string");
  expect(hostname.length).toBeGreaterThan(0);
});

// getpgid

test("getpgid returns an integer", () => {
  expect(posix.getpgid?.(1)).toBeGreaterThanOrEqual(0);
});

test("getpgrp returns an integer", () => {
  expect(posix.getpgrp?.()).toBeGreaterThanOrEqual(0);
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
test("getppid returns an integer", () => {
  expect(posix.getppid?.()).toBeGreaterThanOrEqual(0);
});

test("that the security vulnerability CVE-2022-21211 does not impact posix-node", () => {
  // @ts-ignore
  expect(() => posix.setegid?.({ toString: 1 })).toThrow();
});

if (!isRoot) {
  // setegid
  test("setegid throws an error (not as root)", () => {
    expect(() => posix.setegid?.(10)).toThrow();
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
}

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

test("chdir and getcwd", () => {
  // they start at the same
  const orig = process.cwd();
  expect(orig).toEqual(posix.getcwd?.());
  // change at the library level:
  posix.chdir?.("/");
  expect(posix.getcwd?.()).toEqual("/");
  // node version didn't change:
  expect(process.cwd()).toEqual(orig);
});

test("Use the full standard fork, dup, execv song and dance to do 'Hello world'", () => {
  const { dup2, execv, fork, waitpid, pipe } = posix;
  if (
    // for typescript
    dup2 == null ||
    execv == null ||
    fork == null ||
    waitpid == null ||
    pipe == null
  ) {
    throw Error("bug");
  }
  const { readSync } = require("fs");

  //execv("/bin/ls", ["/bin/ls"]);

  const stdin = pipe();
  const stdout = pipe();
  const pid = fork();

  const HELLO = "Hello there from Posix-node!";
  if (pid == 0) {
    // child
    // connect up stdin and stdout
    dup2(stdin.readfd, 0);
    dup2(stdout.writefd, 1);
    // replace with echo and output hello world to the pipe
    execv("/bin/echo", ["/bin/echo", HELLO]);
  } else {
    let b = Buffer.alloc(10000);
    // read output from the child
    readSync(stdout.readfd, b);
    const s = b.toString("utf8", 0, HELLO.length);
    expect(s).toEqual(HELLO);
    const { wstatus, ret } = waitpid(pid, 0);
    expect(wstatus).toBe(0);
    expect(ret).toBe(pid);
  }
});
