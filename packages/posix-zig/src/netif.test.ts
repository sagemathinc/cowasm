import posix from "./index";

test("get name of internet interface 1 and verify it has length at least 1", () => {
  expect(posix.if_indextoname?.(1)?.length).toBeGreaterThan(0);
});
