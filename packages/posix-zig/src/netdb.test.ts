import posix from "./index";

test("gethostbyname consistency checks", () => {
  const hostent = posix.gethostbyname?.("example.com");
  if (hostent == null) throw Error("fail");
  expect(hostent.h_name).toBe("example.com");
  expect(hostent.h_aliases.length).toBe(0);
  expect(hostent.h_addrtype).toBe(2);
  expect(hostent.h_length).toBe(4);
  expect(hostent.h_addr_list.length).toBeGreaterThan(0);
  expect(typeof hostent.h_addr_list[0]).toEqual("number");
});
