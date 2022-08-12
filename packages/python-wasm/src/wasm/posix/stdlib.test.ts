/*
> a = require('.'); await a.init({debug:true}); const mkstemp = a.wasm.getFunction('mkstemp')
undefined
> mkstemp(a.wasm.stringToCharStar('fooXXXXXX'))
*/

import { init, wasm } from "../../python/node";

test("mkstemp system call with unionfs fs with both native and memfs", async () => {
  await init({ noWorker: true });
  if (wasm == null) throw Error("bug");
  const mkstemp = wasm.getFunction("mkstemp");
  if (mkstemp == null) throw Error("bug");
  const fd = mkstemp(wasm.stringToCharStar("fooXXXXXX"));
  expect(fd > 0);
  expect((wasm as any).wasi?.FD_MAP.get(fd).path.includes("foo"));
});
