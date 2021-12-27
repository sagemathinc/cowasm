import Integer, { init } from "./integer";
import ZZ from "./integer-ring";

beforeEach(async () => {
  await init();
});

test("check some primality", async () => {
  expect(Integer(101).isPseudoPrime()).toBe(2);
  expect(Integer("101").isPseudoPrime()).toBe(2);
  expect(Integer(2021).isPseudoPrime()).toBe(0);
  expect(Integer("2021").isPseudoPrime()).toBe(0);
});

test("Create integer object and do basic arithmetic", async () => {
  const n = Integer(15);
  const m = Integer(20);
  // toString not really implemented yet
  //expect(n.add(m).toString()).toBe("35");
  //expect(n.mul(m).toString()).toBe("300");
  expect(n.__add__(m).eql(Integer(35))).toBe(true);
  expect(n.__mul__(m).eql(Integer(300))).toBe(true);
  expect(n.__sub__(m).eql(Integer(-5))).toBe(true);
  expect(n.__pow__(20).eql(Integer("332525673007965087890625"))).toBe(true);
});

test("Find the next prime year", async () => {
  const n = Integer(2021);
  const m = n.nextPrime();
  expect(m.eql(Integer(2027))).toBe(true);
});

test("converting integer to string", async () => {
  const n = Integer(-17);
  expect(n.__repr__() == "-17");
  expect(JSON.stringify(n) == '{"type":"Integer","hex":"-11"}');
});

test("converting integer to string when bound is not sharp", async () => {
  const n = Integer(567);
  expect(n.ndigitsBound() == 4);
  const s = n.__repr__();
  expect(s == "567");
  expect(JSON.stringify(n) == '{"type":"Integer","hex":"237"}');
});

test("using the integer ring", async () => {
  expect(ZZ.element(-17).__repr__() == "-17");
  expect(ZZ.element("-11", 16).__repr__() == "-17");
});
