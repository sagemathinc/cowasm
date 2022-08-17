import { init, repr, exec } from "../../python/node";

beforeEach(async () => {
  await init({ debug: true });
});

test("test ctermid", async () => {
  await exec("import os");
  expect(typeof (await repr("os.ctermid()"))).toBe("string");
});
