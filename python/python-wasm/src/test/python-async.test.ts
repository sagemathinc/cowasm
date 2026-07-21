import { asyncPython } from "../node";

test("add 2+3 (async version)", async () => {
  const { exec, repr, kernel } = await asyncPython();
  try {
    await exec("a = 2+3");
    expect(await repr("a")).toBe("5");
  } finally {
    await kernel.terminate();
  }
});

test("sleeping for a quarter of a second (async version)", async () => {
  const { exec, kernel } = await asyncPython();
  try {
    const t0 = performance.now();
    await exec("import time; time.sleep(0.25)");
    const elapsed = performance.now() - t0;
    expect(elapsed).toBeGreaterThanOrEqual(240);
    expect(elapsed).toBeLessThanOrEqual(1000);
  } finally {
    await kernel.terminate();
  }
});
