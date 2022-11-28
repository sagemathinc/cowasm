import { syncPython } from "../node";

test("add 2+3", async () => {
  const { exec, repr } = await syncPython();
  exec("a = 2+3");
  expect(repr("a")).toBe("5");
});


test("Exec involving multiline statement", async () => {
  const { exec, repr } = await syncPython();
  exec(`
def double(n : int) -> int:
    return 2*n

def f(n : int) -> int:
    s = 0
    for i in range(1,n+1):
        s += i
    return double(s);
`);
  expect(repr("f(100)")).toBe(`${5050 * 2}`);
});

test("sys.platform is wasi", async () => {
  const { exec, repr } = await syncPython();
  exec("import sys");
  expect(repr("sys.platform")).toBe("'wasi'");
});

test("sleeping for a quarter of a second", async () => {
  const { exec } = await syncPython();
  const t0 = new Date().valueOf();
  exec("import time; time.sleep(0.25)");
  const t = new Date().valueOf() - t0;
  expect(t >= 240 && t <= 500).toBe(true);
});

test("that sys.executable is set to something", async () => {
  const { exec, repr } = await syncPython();
  exec("import sys");
  const executable = eval(repr("sys.executable"));
  expect(existsSync(executable)).toBe(true);
  expect(executable.length).toBeGreaterThan(0);
});

import { execFileSync } from "child_process";
import { existsSync } from "fs";
test("that sys.executable is set and exists -- when running python-wasm via command line", () => {
  const stdout = execFileSync("./bin/python-wasm", [
    "-c",
    "import sys; print(sys.executable)",
  ])
    .toString()
    .trim();
  expect(existsSync(stdout)).toBe(true);
});

test("test that getcwd works", async () => {
  const { exec, repr, kernel } = await syncPython();
  await exec("import os; os.chdir('/tmp')");
  const cwd = eval(repr('os.path.abspath(".")'));
  expect(cwd).toBe("/tmp");
  // this is the interesting call:
  expect(kernel.getcwd()).toBe("/tmp");
});

test("test that getcwd is fast", async () => {
  const { exec, repr, kernel } = await syncPython();
  await exec("import os; os.chdir('/tmp')");
  const t0 = new Date().valueOf();
  for (let i = 0; i < 10 ** 5; i++) {
    kernel.getcwd();
  }
  // Doing 10**6 of them takes about a second on my laptop,
  // so 2s should be safe for a test.
  expect(new Date().valueOf() - t0).toBeLessThan(2000);
  const cwd = eval(repr('os.path.abspath(".")'));
  expect(cwd).toBe("/tmp");
});

test("an annoying-to-real-mathematicians new 'feature' of Python can be disabled", async () => {
  // See https://discuss.python.org/t/int-str-conversions-broken-in-latest-python-bugfix-releases/18889/184
  const { exec, repr } = await syncPython();
  exec("import sys; sys.set_int_max_str_digits(0)");
  expect(repr("len(str(10**5000))")).toEqual("5001");
});
