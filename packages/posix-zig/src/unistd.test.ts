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
