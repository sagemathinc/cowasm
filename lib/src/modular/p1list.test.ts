import P1List, { init } from "./p1list";

beforeEach(async () => {
  await init();
});

test("number of elements of P1(11)", () => {
  expect(P1List(11).count()).toBe(12);
});

test("some computations with P1(100)", () => {
  const P100 = P1List(100);
  expect(P100.count()).toBe(180);
  expect(P100.normalize(3, 7)).toEqual([1, 69]);
  expect(P100.normalize_with_scalar(3, 7)).toEqual([1, 69, 3]);
  expect((3 * 69) % 100).toBe(7);
  expect(P100.index(1, 69)).toBe(70);
  expect(P100.index(3, 7)).toBe(70);
  expect(P100.index(0, 1)).toBe(0);
  expect(P100.index(1, 0)).toBe(1);
});
