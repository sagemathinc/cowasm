// see sage/src/sage/misc/misc_c.pyx

function mul(a, b) {
  if (a.__mul__ != null) {
    return a.__mul__(b);
  }
  return a * b;
}

export default function prod(v: any[], z = undefined, recursionCutoff = 5) {
  if (!Array.isArray(v)) {
    throw Error("v must be an array");
  }
  const n = v.length;

  if (n == 0) {
    return z === undefined ? 1 : z;
  }

  let pr = balancedListProd(v, 0, n, recursionCutoff);
  if (z !== undefined) {
    pr = mul(pr, z);
  }
  return pr;
}

function balancedListProd(
  v: any[],
  offset: number,
  count: number,
  cutoff: number
) {
  if (count <= cutoff) {
    let pr = v[offset];
    for (let k = offset + 1; k < offset + count; k++) {
      pr = mul(pr, v[k]);
    }
    return pr;
  } else {
    const k = (1 + count) >> 1;
    return mul(
      balancedListProd(v, offset, k, cutoff),
      balancedListProd(v, offset + k, count - k, cutoff)
    );
  }
}
