import { Integer, init, isPseudoPrime } from "./integer";

beforeEach(async () => {
  await init();
});

test("check some primality directly", async () => {
  expect(isPseudoPrime(101)).toBe(2);
  expect(isPseudoPrime("101")).toBe(2);
  expect(isPseudoPrime(2021)).toBe(0);
  expect(isPseudoPrime("2021")).toBe(0);
});

test("Create integer object and do basic arithmetic", async () => {
  const n = Integer(15);
  const m = Integer(20);
  // toString not really implemented yet
  //expect(n.add(m).toString()).toBe("35");
  //expect(n.mul(m).toString()).toBe("300");
  expect(n.add(m).eql(Integer(35))).toBe(true);
  expect(n.mul(m).eql(Integer(300))).toBe(true);
  expect(n.sub(m).eql(Integer(-5))).toBe(true);
});

test("Find the next prime year", async() => {
  const n = Integer(2021);
  const m = n.nextPrime();
  expect(m.eql(Integer(2027))).toBe(true);
});