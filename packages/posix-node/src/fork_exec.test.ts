import posix from "./index";

test("setting and checking inheritable", () => {
  if (posix.set_inheritable == null)
    throw Error("set_inheritable must be defined");
  if (posix.is_inheritable == null)
    throw Error("set_inheritable must be defined");

  posix.set_inheritable(2, false);
  expect(posix.is_inheritable(2)).toBe(false);
  posix.set_inheritable(2, true);
  expect(posix.is_inheritable(2)).toBe(true);
  posix.set_inheritable(2, false);
});
