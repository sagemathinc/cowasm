import { exec, repr, init } from "./index";

test("add 2+3", async () => {
  await init();
  expect(repr("2+3").toBe("5"));
});
