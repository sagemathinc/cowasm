import { asyncPython, syncPython } from "../../node";

/*
>>> import socket; socket.gethostbyaddr('2001:4860:4860::8888')
('dns.google', ['8.8.8.8.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.6.8.4.0.6.8.4.1.0.0.2.ip6.arpa'], ['2001:4860:4860::8888'])
*/

test("gethostbyaddr for google's v4 ip -- consistency check", async () => {
  const { exec, repr } = await syncPython();
  exec("import socket");
  exec("s = socket.gethostbyaddr(socket.gethostbyname('google.com'))");
  // console.log(repr("s"));
  expect(repr("s[0].endswith('.net')")).toBe("True");
});

test("getaddrinfo remains usable after SSL context initialization", async () => {
  const { exec, repr } = await syncPython();
  exec(`
import socket
import ssl
ssl.create_default_context()
addrinfo = socket.getaddrinfo(
    "127.0.0.1", 443, socket.AF_INET, socket.SOCK_STREAM
)
`);
  expect(repr("addrinfo[0][4]")).toBe("('127.0.0.1', 443)");
});

test("default SSL context uses the Node root certificate store", async () => {
  const { exec, repr } = await syncPython();
  exec(`
import os
import ssl

verify_paths = ssl.get_default_verify_paths()
certificate_stats = ssl.create_default_context().cert_store_stats()
`);
  expect(repr("verify_paths.cafile == os.environ['SSL_CERT_FILE']")).toBe(
    "True"
  );
  expect(repr("os.path.isfile(verify_paths.cafile)")).toBe("True");
  expect(Number(repr("certificate_stats['x509_ca']"))).toBeGreaterThan(100);
});

test("explicit SSL_CERT_FILE overrides the Node root certificate store", async () => {
  const certificateFile = "/custom/trust-store.pem";
  const { kernel, repr } = await asyncPython({
    env: { SSL_CERT_FILE: certificateFile },
  });
  try {
    expect(await repr("__import__('os').environ['SSL_CERT_FILE']")).toBe(
      "'/custom/trust-store.pem'"
    );
  } finally {
    await kernel.terminate();
  }
});

test("connect maps native errno after SSL context initialization", async () => {
  const { exec, repr } = await syncPython();
  exec(`
import errno
import socket
import ssl
ssl.create_default_context()

probe = socket.socket()
probe.bind(("127.0.0.1", 0))
unused_port = probe.getsockname()[1]

client = socket.socket()
try:
    client.connect(("127.0.0.1", unused_port))
except OSError as error:
    connect_error = error
finally:
    client.close()
    probe.close()
`);
  expect(repr("type(connect_error).__name__")).toBe("'ConnectionRefusedError'");
  expect(repr("connect_error.errno == errno.ECONNREFUSED")).toBe("True");
});

// test("gethostbyaddr on a domain name should also work (it does in native cpython)", async () => {
//   await exec("s = socket.gethostbyaddr('google.com')");
//   expect(await repr("s[0].endswith('.net')")).toBe("True");
// });

// test("gethostbyaddr for google's v6 ip", async () => {
//   await exec("s = socket.gethostbyaddr('2001:4860:4860::8888')");
//   expect(
//     await repr("s[0] == 'dns.google' and s[-1] == ['2001:4860:4860::8888']")
//   ).toBe("True");
// });

// test("gethostbyname for google (not sure how stable output is)", async () => {
//   const ip = eval(await repr("socket.gethostbyname('google.com')"));
//   expect(ip).toMatch(/[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/g);
// });

// test("gethostbyaddr on google's ip doesn't fail", async () => {
//   await exec("google = socket.gethostbyname('google.com')");
//   expect(await repr("socket.gethostbyaddr(google)[-1][0] == google")).toBe(
//     "True"
//   );
// });

// test("getting an error code via a system call", async () => {
//   await exec(
//     "try: socket.getaddrinfo('google.com',-10)\nexcept Exception as e: the_error=e"
//   );
//   expect((await repr("the_error")).startsWith("gaierror")).toBe(true);
// });

// test("using getaddrinfo with a SOCK_STREAM", async () => {
//   expect(
//     await repr(
//       "socket.getaddrinfo('httpbin.org',80, socket.AF_INET, socket.SOCK_STREAM)"
//     )
//   ).toContain("AddressFamily.AF_INET");
// });
