import { EllipticCurve, init } from "./elliptic-curve";

beforeEach(async () => {
  await init();
});

test("sum of an coefficients up to 10000 for 11a", () => {
  // sage: sum(EllipticCurve('11a').anlist(10000))
  // 216
  const E = EllipticCurve([0, -1, 1, -10, -20]);
  const v = E.anlist(10000);
  expect(v.reduce((a,b)=>a+b) == 212);
});
