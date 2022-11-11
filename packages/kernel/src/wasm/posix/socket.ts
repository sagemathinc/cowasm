/*
This is an implementation of POSIX Sockets.

Of course, much of the code for this is written in zig in the posix-node package
in  this file packages/posix-node/src/socket.zig


RELATED WORK:  I wrote most of this, then searched and found it is solving
a similar problem to emscripten's "Full POSIX Sockets over WebSocket Proxy Server":

  - https://emscripten.org/docs/porting/networking.html#full-posix-sockets-over-websocket-proxy-server
  - https://github.com/emscripten-core/emscripten/tree/main/tools/websocket_to_posix_proxy


Of course, the architecture of the CoWasm solution is massively different.
It looks like Emscripten's is a full multithreaded standalone C++ program
for proxying many network connections from (presumably) many clients.
In contrast, CoWasm's solution is partly written in zig as a node extension
and integrated with Javascript.  It can be used standalone with other Javascript
projects having nothing to do with cowasm, by using the posix-node package,
so there is potential for more community feedback and development.
We would likely have to have one Javascript worker/thread per client, but
this could be integrated with accessing other resources on the server.
It's also nice that CoWasm also can operate with exactly the same code
in a mode that doesn't involving proxying to a backend server, with
everything in the same process (which is all that is implemented here
right now!), since that should be fast and good for automated testing.
*/

import Errno from "./errno";
import {
  nativeToWasmFamily,
  wasmToNativeFamily,
  wasmToNativeSocktype,
  sendSockaddr,
} from "./netdb";
import constants from "./constants";
import { constants as wasi_constants } from "wasi-js";
import debug from "debug";

const log = debug("posix:socket");

// ** NOTE ** -- we explicitly disable socket via the "true" below
// until everything is implemented.  Otherwise the test suite
// and installing pip and many other things break half-way through.
// Re-enable this when finishing.
const TEMPORARILY_DISABLED = false;

export default function socket({
  callFunction,
  posix,
  recv,
  wasi,
  send,
  memory,
}) {
  if (TEMPORARILY_DISABLED) {
    posix = {};
  }

  function getSockaddr(sockaddrPtr: number, address_len: number) {
    const sa_family = wasmToNativeFamily(
      posix,
      callFunction("recv_sockaddr_sa_family", sockaddrPtr)
    );
    const sa_len = address_len - 2;
    const sa_data = recv.buffer(
      callFunction("recv_sockaddr_sa_data", sockaddrPtr),
      sa_len
    );
    for (let i = sa_len; i < sa_len; i++) {
      sa_data[i] = 0;
    }
    return { sa_family, sa_len, sa_data };
  }

  function real_fd(virtual_fd: number): number {
    const data = wasi.FD_MAP.get(virtual_fd);
    if (data == null) {
      return -1;
    }
    return data.real;
  }

  return {
    socket(family: number, socktype: number, protocol: number): number {
      if (posix.socket == null) {
        throw Errno("ENOTSUP");
      }
      log("socket", { family, socktype, protocol });

      const familyNative = wasmToNativeFamily(posix, family);

      let inheritable;
      if (constants.SOCK_CLOEXEC & socktype) {
        // SOCK_CLOEXEC is defined on Linux and WASI (weirdly) but not MacOS,
        // so we manually implement it to avoid weird hacks in C code.
        socktype &= ~constants.SOCK_CLOEXEC; // remove it
        inheritable = false; // below we will do what SOCK_CLOEXEC would do manually.
      } else {
        inheritable = true;
      }

      const socktypeNative = wasmToNativeSocktype(posix, socktype);

      // TODO? I don't know how to translate this or if it is necessary.
      const protocolNative = protocol;

      const real_fd = posix.socket(
        familyNative,
        socktypeNative,
        protocolNative
      );

      if (!inheritable) {
        posix.set_inheritable(real_fd, inheritable);
      }
      const wasi_fd = wasi.getUnusedFileDescriptor();
      const STDIN = wasi.FD_MAP.get(0);
      wasi.FD_MAP.set(wasi_fd, {
        real: real_fd,
        rights: STDIN.rights, // TODO: just use rights for stdin???
        filetype: wasi_constants.WASI_FILETYPE_SOCKET_STREAM,
      });

      return wasi_fd;
    },

    // int bind(int socket, const struct sockaddr *address, socklen_t address_len);
    bind(socket: number, sockaddrPtr: number, address_len: number): number {
      log("bind", socket);
      if (posix.bind == null) {
        throw Errno("ENOTSUP");
      }
      const sockaddr = getSockaddr(sockaddrPtr, address_len);
      log("bind: address", sockaddr);
      posix.bind(real_fd(socket), sockaddr);

      return 0;
    },

    connect(socket: number, sockaddrPtr: number, address_len: number): number {
      if (posix.connect == null) {
        throw Errno("ENOTSUP");
      }
      const sockaddr = getSockaddr(sockaddrPtr, address_len);
      log("connect", { socket, sockaddr, address_len });
      posix.connect(real_fd(socket), sockaddr);
      return 0;
    },

    /*
    int getsockname(int sockfd, struct sockaddr* addr, socklen_t* addrlen);
    */
    getsockname(
      socket: number,
      sockaddrPtr: number,
      addressLenPtr: number
    ): number {
      if (posix.getsockname == null) {
        throw Errno("ENOTSUP");
      }
      log("getsockname", socket);
      const sockaddr = posix.getsockname(real_fd(socket));
      sendSockaddr(
        send,
        memory,
        sockaddrPtr,
        nativeToWasmFamily(posix, sockaddr.sa_family),
        sockaddr.sa_len,
        sockaddr.sa_data
      );
      send.u32(addressLenPtr, sockaddr.sa_len);
      return 0;
    },

    /*
    int getpeername(int sockfd, struct sockaddr* addr, socklen_t* addrlen);
    */
    getpeername(
      socket: number,
      sockaddrPtr: number,
      addressLenPtr: number
    ): number {
      log("getpeername", socket);
      const sockaddr = posix.getpeername(real_fd(socket));
      sendSockaddr(
        send,
        memory,
        sockaddrPtr,
        nativeToWasmFamily(posix, sockaddr.sa_family),
        sockaddr.sa_len,
        sockaddr.sa_data
      );
      send.u32(addressLenPtr, sockaddr.sa_len);
      return 0;
    },

    /*
     ssize_t recv(int socket, void *buffer, size_t length, int flags);

     NOTE: send and recv are less efficient than they might otherwise
     be due to a lot of extra copying of data to/from dynamically allocated
     Buffers.  Probably the cost of calling to Javascript at all exceeds
     this though.
    */
    recv(
      socket: number,
      bufPtr: number,
      length: number,
      flags: number
    ): number {
      log("recv", { socket, bufPtr, length, flags });
      if (posix.recv == null) {
        throw Errno("ENOTSUP");
      }
      const buffer = Buffer.alloc(length);
      const bytes_received = posix.recv(real_fd(socket), buffer, flags);
      //log("recv got ", { buffer, bytes_received });
      send.buffer(buffer, bufPtr);
      return bytes_received;
    },

    /*
     ssize_t send(int socket, const void *buffer, size_t length, int flags);
    */
    send(
      socket: number,
      bufPtr: number,
      length: number,
      flags: number
    ): number {
      log("send", { socket, bufPtr, length, flags });
      if (posix.send == null) {
        throw Errno("ENOTSUP");
      }
      const buffer = recv.buffer(bufPtr, length);
      return posix.send(real_fd(socket), buffer, flags);
    },

    /*
    int shutdown(int socket, int how);
    */
    shutdown(socket: number, how: number): number {
      log("shutdown", { socket, how });
      if (posix.shutdown == null) {
        throw Errno("ENOTSUP");
      }
      let real_how = -1;
      for (const name of ["SHUT_RD", "SHUT_WR", "SHUT_RDWR"]) {
        if (how == constants[name]) {
          real_how = posix.constants[name];
          break;
        }
      }
      if (real_how == -1) {
        throw Errno("EINVAL");
      }
      posix.shutdown(real_fd(socket), real_how);
      return 0;
    },
  };
}
