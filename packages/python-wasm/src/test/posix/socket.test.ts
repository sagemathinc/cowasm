import { syncPython } from "../../node";

// disable until sockets are implemented more fully under node... which
// is a ton of hard work :-(

test("create a socket", async () => {
  const { exec } = await syncPython();
  exec("import _socket");
  /*
  await exec(
    `
import socket, _socket
res = socket.getaddrinfo('localhost', 80, socket.AF_INET, socket.SOCK_STREAM)[0]
family, socktype, proto, canonname, sa = res;
s = _socket.socket(family, socktype, proto, None);
`
  );
  const s = await repr("s");
  expect(s).toContain("family=1, type=6, proto=6>");
  */
});
