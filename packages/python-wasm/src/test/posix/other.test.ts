import { syncPython } from "../../node";

test("test ctermid", async () => {
  const { exec, repr } = await syncPython();
  exec("import os");
  expect(typeof repr("os.ctermid()")).toBe("string");
});

test("bindtextdomain doesn't crash (it is still basically a stub)", async () => {
  const { exec, repr } = await syncPython();
  exec("import gettext");
  expect(eval(repr("gettext.bindtextdomain('foo','/bar')"))).toBe("/bar");
});
