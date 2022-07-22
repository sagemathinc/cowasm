import { exec, repr } from "./node";

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
  expect(t >= 240 && t <= 300).toBe(true);
});
