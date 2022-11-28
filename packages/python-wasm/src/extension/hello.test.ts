import { syncPython } from "../node";
import { join } from "path";

// Test that it is possible to import a dynamic library
test("hello extension module loads and works", async () => {
  const { exec, repr } = await syncPython();
  const dist = join(__dirname, "..");
  exec(`import sys; sys.path.insert(0,'${dist}')`);
  exec("import hello");
  expect(parseInt(repr("hello.add389(10)"))).toBe(10 + 389);
});

// Test that it is not stupidly slow, which could happen if
// we are not sufficiently clever regarding how dynamic
// linking works.
test("not stupidly slow", async () => {
  const { exec, repr } = await syncPython();
  const dist = join(__dirname, "..");
  exec(`import sys; sys.path.insert(0,'${dist}')`);
  exec("import hello");
  const t = new Date().valueOf();
  repr("sum(hello.add389(10) for _ in range(10**5))");
  expect(new Date().valueOf() - t).toBeLessThan(1000);
});
