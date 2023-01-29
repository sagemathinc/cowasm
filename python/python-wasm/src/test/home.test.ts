import { asyncPython, syncPython } from "../node";

test("that the default syncPython has the PYTHONHOME", async () => {
  const { exec, repr } = await syncPython();
  exec("import os");
  expect(repr("os.environ.get('PYTHONHOME')")).toBe("'/usr'");
});

test("that the default asyncPython has the PYTHONHOME", async () => {
  const { exec, repr, kernel } = await asyncPython();
  await exec("import os");
  expect(await repr("os.environ.get('PYTHONHOME')")).toBe("'/usr'");
  await kernel.terminate();
});

test("also confirm that some interesting packages are installed", async () => {
  const { exec } = await syncPython();
  exec("import pandas, sympy");
}, 15000);
