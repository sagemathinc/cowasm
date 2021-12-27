import { EllipticCurve, init } from "./elliptic-curve";

beforeEach(async () => {
  await init();
});

test("sum of an coefficients up to 10000 for 11a", () => {
  // sage: sum(EllipticCurve('11a').anlist(10000))
  // 216
  const E = EllipticCurve("11a");
  const v = E.anlist(10000);
  expect(v.reduce((a, b) => a + b) == 212);
});

test("sum of an coefficients up to 10^5 for 5077a", () => {
  const E = EllipticCurve("5077a");
  const v = E.anlist(10 ^ 5);
  expect(v.reduce((a, b) => a + b) == 20905);
});

test("conductors of some curves", () => {
  expect(EllipticCurve("11a").conductor() == 11);
  expect(EllipticCurve("37a").conductor() == 37);
  expect(EllipticCurve("389a").conductor() == 389);
  expect(EllipticCurve("5077a").conductor() == 5077);
});

test("compute ap for a curve", () => {
  expect(EllipticCurve("389a").ap(2003) == 27);
});

test("root numbers of some curves", () => {
  expect(EllipticCurve("11a").rootNumber() == 1);
  expect(EllipticCurve("37a").rootNumber() == -1);
  expect(EllipticCurve("389a").rootNumber() == 1);
  expect(EllipticCurve("5077a").rootNumber() == -1);
  expect(EllipticCurve([1, -1, 0, -79, 289]).rootNumber() == 1);
});

test("analytic ranks of some curves", () => {
  expect(EllipticCurve("11a").analyticRank() == 0);
  expect(EllipticCurve("37a").analyticRank() == 1);
  expect(EllipticCurve("389a").analyticRank() == 2);
  expect(EllipticCurve("5077a").analyticRank() == 3);
  expect(EllipticCurve([1, -1, 0, -79, 289]).analyticRank() == 4);
});
