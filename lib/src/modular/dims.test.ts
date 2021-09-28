import { dimensionCuspForms, init } from "./dims";

beforeEach(async () => {
  await init();
});

test("sum of dimensions of spaces up to level 10000", () => {
  const B = 10000;
  let s = 0;
  for (let N = 1; N <= B; N++) {
    s += dimensionCuspForms(N);
  }
  expect(s).toBe(6268440);
});
