import { exec, init } from "./index";

beforeEach(async () => {
  await init();
});

test("add 2+3", async () => {
  expect(exec("2+3")).toBe("5");
});

test("sum integers up to 100", async () => {
  expect(
    exec(`{s=0;
for(i=1,100,
   s += i
);
s}`)
  ).toBe("5050");
});

test("factor this year", async () => {
  expect(exec("factor(2021)")).toBe("\n[43 1]\n\n[47 1]\n");
});
