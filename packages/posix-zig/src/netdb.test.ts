import posix from "./index";

test("gethostbyname consistency checks", () => {
  const hostent = posix.gethostbyname?.("example.com");
  if (hostent == null) throw Error("fail");
  expect(hostent.h_name).toBe("example.com");
  expect(hostent.h_aliases.length).toBe(0);
  expect(hostent.h_addrtype).toBe(2);
  expect(hostent.h_length).toBe(4);
  expect(hostent.h_addr_list.length).toBeGreaterThan(0);
  expect(hostent.h_addr_list[0]).toContain(".");
});

/*
Example:

> require('.').gethostbyaddr("64.233.187.99")
{
  h_name: 'tj-in-f99.1e100.net',
  h_addrtype: 2,
  h_length: 4,
  h_addr_list: [ '64.233.187.99' ],
  h_aliases: [ '99.187.233.64.in-addr.arpa' ]
}
*/

test("gethostbyaddr check - v4", () => {
  const hostent = posix.gethostbyaddr?.("64.233.187.99");
  expect(hostent?.h_addr_list[0]).toContain(".");
  expect(hostent?.h_addrtype).toBe(posix.constants?.AF_INET);
});

test("gethostbyaddr check - v6", () => {
  const hostent = posix.gethostbyaddr?.("2001:4860:4860::8888");
  expect(hostent?.h_addr_list[0]).toContain(":");
  expect(hostent?.h_addrtype).toBe(posix.constants?.AF_INET6);
  // behavior depends on OS
  // expect(hostent?.h_aliases[0]).toContain("8.8.8.8");
});

test("getaddrinfo canonical name", () => {
  const addrinfo = posix.getaddrinfo?.("example.com", "http", { flags: 2 });
  if (addrinfo == null) throw Error("fail");
  expect(addrinfo[0]?.ai_canonname).toEqual("example.com");
});

test("getaddrinfo isn't random garbled nonsense", () => {
  const addrinfo = posix.getaddrinfo?.("example.com", "http", { flags: 2 });
  if (addrinfo == null) throw Error("fail");
  const addrinfo2 = posix.getaddrinfo?.("example.com", "http", { flags: 2 });
  if (addrinfo2 == null) throw Error("fail");
  expect(addrinfo).toEqual(addrinfo2);
});
