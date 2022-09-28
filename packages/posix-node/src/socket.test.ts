import { posix } from "./index.js";

test("create a socket", () => {
  if (posix.socket == null) {
    throw Error("socket must be defined");
  }
  if (posix.constants == null) {
    throw Error("constants must be defined");
  }

  const fd = posix.socket(
    posix.constants.AF_UNIX,
    posix.constants.SOCK_STREAM,
    0
  );
  expect(fd).toBeGreaterThan(0);
});
