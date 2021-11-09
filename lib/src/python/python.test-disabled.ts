import { exec, repr, init } from "./index";

beforeEach(async () => {
  await init();
});

test("add 2+3", async () => {
  exec("a = 2+3");
  expect(repr("a")).toBe("5");
});

test("Exec involving multiple statements", async () => {
  exec(`
def f(n):
    s = 0
    for i in range(1,n+1):
        s += i
    return s
`);
  expect(repr("f(100)")).toBe("5050");
});
