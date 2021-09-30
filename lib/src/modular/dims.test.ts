import {
  dimensionCuspForms,
  dimensionEisensteinSeries,
  dimensionModularForms,
  init,
} from "./dims";

beforeEach(async () => {
  await init();
});

test("sum of dimensions of cusp form spaces up to level 10000", () => {
  const B = 10000;
  let s = 0;
  for (let N = 1; N <= B; N++) {
    s += dimensionCuspForms(N);
  }
  expect(s).toBe(6268440);
});

test("sum of dimensions of modular form spaces up to level 10000", () => {
  const B = 10000;
  let s = 0;
  for (let N = 1; N <= B; N++) {
    s += dimensionModularForms(N);
  }
  expect(s).toBe(6402996);
});

test("sum of dimensions of eisenstein series spaces up to level 10000", () => {
  const B = 10000;
  let s = 0;
  for (let N = 1; N <= B; N++) {
    s += dimensionEisensteinSeries(N);
  }
  expect(s).toBe(134556);
});
