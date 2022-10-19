test("nothing", () => {});
export {}

/*
TEMPORARILY DEPRECATED

import { exec, init, repr, wasm } from "./node";
import { existsSync } from "fs";
import { execFileSync } from "child_process";

beforeEach(async () => {
  await init({ noWorker: true });
});


test("add 2+3", async () => {
  await exec("a = 2+3");
  expect(await repr("a")).toBe("5");
});

test("Exec involving multiline statement", async () => {
  await exec(`
def double(n : int) -> int:
    return 2*n

def f(n : int) -> int:
    s = 0
    for i in range(1,n+1):
        s += i
    return double(s);
`);
  expect(await repr("f(100)")).toBe(`${5050 * 2}`);
});

test("sys.platform is wasi", async () => {
  await exec("import sys");
  expect(await repr("sys.platform")).toBe("'wasi'");
});

test("sleeping for a quarter of a second", async () => {
  const t0 = new Date().valueOf();
  await exec("import time; time.sleep(0.25)");
  const t = new Date().valueOf() - t0;
  expect(t >= 240 && t <= 500).toBe(true);
});

test("that sys.executable is set to something", async () => {
  await exec("import sys");
  const executable = eval(await repr("sys.executable"));
  expect(executable.length).toBeGreaterThan(0);
});

test("that sys.executable is set and exists -- when running zython via command line", () => {
  // pw-d -c "import sys; print(sys.executable)"
  const stdout = execFileSync("../../bin/zython", [
    "-c",
    "import sys; print(sys.executable)",
  ])
    .toString()
    .trim();
  expect(existsSync(stdout)).toBe(true);
});

test("that sys.executable is set and exists -- when running python-wasm via command line", () => {
  // pw-d -c "import sys; print(sys.executable)"
  const stdout = execFileSync("../../bin/python-wasm", [
    "-c",
    "import sys; print(sys.executable)",
  ])
    .toString()
    .trim();
  expect(existsSync(stdout)).toBe(true);
});

test("test that getcwd works", async () => {
  if (wasm == null) throw Error("wasm must be defined");
  await exec("import os; os.chdir('/tmp')");
  const cwd = eval(await repr('os.path.abspath(".")'));
  expect(cwd).toBe("/tmp");
  // this is the interesting call:
  expect(wasm.getcwd()).toBe("/tmp");
});

test("test that getcwd is fast", async () => {
  if (wasm == null) throw Error("wasm must be defined");
  await exec("import os; os.chdir('/tmp')");
  const t0 = new Date().valueOf();
  for (let i = 0; i < 10 ** 5; i++) {
    wasm.getcwd();
  }
  // Doing 10**6 of them takes about a second on my laptop, so 2s should be safe for a test.
  expect(new Date().valueOf() - t0).toBeLessThan(2000);
});

test("an annoying-to-mathematicians new 'feature' of Python can be disabled", async () => {
  // See https://discuss.python.org/t/int-str-conversions-broken-in-latest-python-bugfix-releases/18889/184
  await exec("import sys; sys.set_int_max_str_digits(0)");
  expect(await repr("len(str(10**5000))")).toEqual("5001");
});

*/
