interface MonoidElement {
  __mul__: Function;
}

export default function genericPower(a: MonoidElement, n: number) {
  if (n == 0) {
    throw Error("n must be positive");
  }
  // Find least significant set bit as starting point
  let apow = a;
  let m = n;
  while ((m & 1) == 0) {
    apow = apow.__mul__(apow);
    m >>= 1;
  }

  // Now multiply together the correct factors a^(2^i)
  let res = apow;
  m >>= 1;
  while (m != 0) {
    apow = apow.__mul__(apow);
    if ((m & 1) != 0) {
      res = apow.__mul__(res);
    }
    m >>= 1;
  }

  return res;
}
