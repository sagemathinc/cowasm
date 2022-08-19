import { init, repr, exec } from "../../python/node";

beforeEach(async () => {
  await init({ debug: true });
});

test("test ctermid", async () => {
  await exec("import os");
  expect(typeof (await repr("os.ctermid()"))).toBe("string");
});

test("bindtextdomain doesn't crash (it is still basically a stub)", async () => {
  await exec("import gettext");
  expect(eval(await repr("gettext.bindtextdomain('foo','/bar')"))).toBe("/bar");
});
