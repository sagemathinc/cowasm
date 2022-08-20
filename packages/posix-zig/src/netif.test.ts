import posix from "./index";

test("get name of internet interface 1 and verify it has length at least 1", () => {
  expect(posix.if_indextoname?.(1)?.length).toBeGreaterThan(0);
});

test("getting invalid interface indexes throws", () => {
  expect(() => {
    posix.if_indextoname?.(0);
  }).toThrow();
  expect(() => {
    posix.if_indextoname?.(99999);
  }).toThrow();
});

test("go back and forth between interface 1 representations", () => {
  const ifname1 = posix.if_indextoname?.(1);
  if (ifname1 == null) {
    throw Error("bug");
  }
  expect(posix.if_nametoindex?.(ifname1)).toBe(1);
});

test("getting invalid interface names throws", () => {
  expect(() => {
    posix.if_nametoindex?.("FUBAR");
  }).toThrow();
  expect(() => {
    posix.if_nametoindex?.("");
  }).toThrow();
});

test("get all of the interfaces, and do a consistency check", () => {
  const ni = posix.if_nameindex?.();
  if (ni == null) {
    throw Error("bug");
  }
  for (const x of ni) {
    expect(posix.if_indextoname?.(x[0])).toBe(x[1]);
    expect(posix.if_nametoindex?.(x[1])).toBe(x[0]);
  }
});
