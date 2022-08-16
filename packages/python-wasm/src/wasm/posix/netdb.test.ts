/*
>>> import socket; socket.gethostbyaddr('2001:4860:4860::8888')
('dns.google', ['8.8.8.8.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.6.8.4.0.6.8.4.1.0.0.2.ip6.arpa'], ['2001:4860:4860::8888'])
*/

import { init, repr, exec } from "../../python/node";

beforeEach(async () => {
  await init({ debug: true });
  await exec("import socket");
});

test("gethostbyaddr for google's v6 ip", async () => {
  await exec("s = socket.gethostbyaddr('2001:4860:4860::8888')");
  expect(
    await repr("s[0] == 'dns.google' and s[-1] == ['2001:4860:4860::8888']")
  ).toBe("True");
});

test("gethostbyname for google (not sure how stable output is)", async () => {
  const ip = eval(await repr("socket.gethostbyname('google.com')"));
  expect(ip).toMatch(/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/g);
});

test("gethostbyaddr on google's ip doesn't fail", async () => {
  await exec("google = socket.gethostbyname('google.com')");
  expect(await repr("socket.gethostbyaddr(google)[-1][0] == google")).toBe(
    "True"
  );
});
