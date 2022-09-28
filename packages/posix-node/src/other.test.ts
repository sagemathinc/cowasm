import posix from "./index.js";

test("statvfs returns something", () => {
  expect(posix.statvfs?.("/")?.f_namemax).toBeGreaterThan(0);
});
