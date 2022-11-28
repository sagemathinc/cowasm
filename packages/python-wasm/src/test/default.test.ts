import { asyncPython, syncPython } from "../node";

test("that the default syncPython import works", async () => {
  const { exec, repr } = await syncPython();
  exec("a = 2+3");
  expect(repr("a")).toBe("5");
});

test("that the default asyncPython import works", async () => {
  const { exec, repr, kernel } = await asyncPython();
  await exec("a = 2+3");
  expect(await repr("a")).toBe("5");
  await kernel.terminate();
});
