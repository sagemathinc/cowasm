import { exec, repr, init } from "../node";

beforeEach(async () => {
  await init({ debug: true });
});

// Test that it is possible to import a dynamic library
test("hello extension module loads and works", async () => {
  await exec("import hello");
  expect(parseInt(await repr("hello.add389(10)"))).toBe(10 + 389);
});
