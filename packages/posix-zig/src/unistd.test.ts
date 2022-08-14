import posix from "./index";

test("ttyname of stdin, stdout, stderr works and starts with /dev/", () => {
  for (const fd of [0, 1, 2]) {
    const ttyname = posix.ttyname?.(fd);
    expect(ttyname?.startsWith("/dev")).toBe(true);
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

test("getppid returns a positive integer", () => {
  expect(posix.getppid?.()).toBeGreaterThan(0);
});

test("getpgid returns a positive integer", () => {
  expect(posix.getpgid?.(1)).toBeGreaterThan(0);
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
