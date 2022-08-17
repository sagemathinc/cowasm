import posix from "./index";

test("statvfs returns something", () => {
  expect(posix.statvfs?.("/")?.f_namemax).toBeGreaterThan(0);
});
