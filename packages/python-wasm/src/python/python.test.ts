import { exec, init, repr } from "./node";
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

test("that sys.executable is set and exists -- when running python-wasm-debug via command line", () => {
  // pw-d -c "import sys; print(sys.executable)"
  const stdout = execFileSync("../../bin/python-wasm-debug", [
    "-c",
    "import sys; print(sys.executable)",
  ])
    .toString()
    .trim();
  expect(existsSync(stdout)).toBe(true);
});
