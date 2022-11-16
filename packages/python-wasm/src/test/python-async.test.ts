import { asyncPython } from "../node";

test("add 2+3 (async version)", async () => {
  const { exec, repr, kernel } = await asyncPython();
  await exec("a = 2+3");
  expect(await repr("a")).toBe("5");
  kernel.terminate();
});

// TODO: I have seen this test randoml fail sometimes, where
// it hangs.  Not sure why.
test("sleeping for a quarter of a second (async version)", async () => {
  const { exec, kernel } = await asyncPython();
  const t0 = new Date().valueOf();
  await exec("import time; time.sleep(0.25)");
  const t = new Date().valueOf() - t0;
  expect(t >= 240 && t <= 1000).toBe(true);
  kernel.terminate();
});

