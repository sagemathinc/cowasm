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
