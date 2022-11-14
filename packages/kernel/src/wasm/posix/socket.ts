/*
This is an implementation of POSIX Sockets.

Of course, much of the code for this is written in zig in the posix-node package
in  this file packages/posix-node/src/socket.zig


RELATED WORK:  I wrote most of this, then searched and found it is solving
a similar problem to emscripten's "Full POSIX Sockets over WebSocket Proxy Server":

  - https://emscripten.org/docs/porting/networking.html#full-posix-sockets-over-websocket-proxy-server
  - https://github.com/emscripten-core/emscripten/tree/main/tools/websocket_to_posix_proxy
  - https://github.com/emscripten-core/emscripten/pull/7670  (interesting discussion)


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
import { constants as wasi_constants, SOCKET_DEFAULT_RIGHTS } from "wasi-js";
import debug from "debug";

const log = debug("posix:socket");

export default function socket({
  callFunction,
  posix,
  recv,
  wasi,
  send,
  memory,
}) {
  function sendNativeSockaddr(sockaddr, ptr: number) {
    sendSockaddr(
      send,
      memory,
      ptr,
      nativeToWasmFamily(posix, sockaddr.sa_family),
      sockaddr.sa_len,
      sockaddr.sa_data
    );
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

  function native_fd(virtual_fd: number): number {
    const data = wasi.FD_MAP.get(virtual_fd);
    if (data == null) {
      return -1;
    }
    return data.real;
  }

  // Convert flags from wasi to native.  (Right now it looks
  // like only MSG_WAITALL is different.)
  function native_flags(wasi_flags: number): number {
    let flags = 0;
    for (const name of [
      "MSG_OOB",
      "MSG_PEEK",
      "MSG_WAITALL",
      "MSG_DONTROUTE",
    ]) {
      if (wasi_flags & constants[name]) {
        flags |= posix.constants[name];
      }
    }
    return flags;
  }

  function native_level(level: number): number {
    if (level == constants.SOL_SOCKET) {
      return posix.constants.SOL_SOCKET;
    }
    return level;
  }

  function native_option_name(option_name: number): number {
    for (const name in constants) {
      if (name.startsWith("SO_") && option_name == constants[name]) {
        const x = posix.constants[name];
        if (x == null) {
          throw Error(
            `unsupported option name "${name}" -- defined in WebAssembly but not natively`
          );
        }
        return x;
      }
    }
    throw Error(`unknown option name ${option_name}`);
  }

  function createWasiFd(native_fd: number): number {
    // TODO: I'm starting the socket fd's at value over 1000 entirely because
    // if wstart at the default smallest possible when doing
    // "python-wasm -m pip" it crashes, since the fd=4 gets assigned
    // to some socket for a moment, then freed and then 4 gets used
    // for a directory (maybe at the same time), and this somehow
    // confuses things.  Maybe there is a bug somewhere in WASI or Python.
    // For now we just workaround it by putting the socket fd's
    // way out of reach of the normal file fd's.
    const wasi_fd = wasi.getUnusedFileDescriptor(1000);
    wasi.FD_MAP.set(wasi_fd, {
      real: native_fd,
      rights: {
        base: SOCKET_DEFAULT_RIGHTS,
        inheriting: BigInt(0),
      },
      filetype: wasi_constants.WASI_FILETYPE_SOCKET_STREAM,
    });
    return wasi_fd;
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

      const native_fd = posix.socket(
        familyNative,
        socktypeNative,
        protocolNative
      );

      if (!inheritable) {
        posix.set_inheritable(native_fd, inheritable);
      }
      return createWasiFd(native_fd);
    },

    // int bind(int socket, const struct sockaddr *address, socklen_t address_len);
    bind(socket: number, sockaddrPtr: number, address_len: number): number {
      log("bind", socket);
      if (posix.bind == null) {
        throw Errno("ENOTSUP");
      }
      const sockaddr = getSockaddr(sockaddrPtr, address_len);
      log("bind: address", sockaddr);
      posix.bind(native_fd(socket), sockaddr);

      return 0;
    },

    connect(socket: number, sockaddrPtr: number, address_len: number): number {
      if (posix.connect == null) {
        throw Errno("ENOTSUP");
      }
      const sockaddr = getSockaddr(sockaddrPtr, address_len);
      log("connect", { socket, sockaddr, address_len });
      posix.connect(native_fd(socket), sockaddr);
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
      const sockaddr = posix.getsockname(native_fd(socket));
      sendNativeSockaddr(sockaddr, sockaddrPtr);
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
      const sockaddr = posix.getpeername(native_fd(socket));
      sendNativeSockaddr(sockaddr, sockaddrPtr);
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
      const bytesReceived = posix.recv(
        native_fd(socket),
        buffer,
        native_flags(flags)
      );
      //log("recv got ", { buffer, bytesReceived });
      send.buffer(buffer, bufPtr);
      return bytesReceived;
    },

    /*
    TODO:
    ssize_t
    recvfrom(int socket, void *buffer, size_t length, int flags,
             struct sockaddr *address, socklen_t *address_len);
    */
    recvfrom(
      socket: number,
      bufPtr: number,
      length: number,
      flags: number,
      sockaddrPtr: number,
      sockaddrLenPtr: number
    ): number {
      log("recvfrom", {
        socket,
        bufPtr,
        length,
        flags,
        sockaddrPtr,
        sockaddrLenPtr,
      });
      if (posix.recvfrom == null) {
        throw Errno("ENOTSUP");
      }
      const buffer = Buffer.alloc(length);
      const { bytesReceived, sockaddr } = posix.recvfrom(
        native_fd(socket),
        buffer,
        native_flags(flags)
      );
      log("recvfrom got ", { buffer, bytesReceived, sockaddr });
      send.buffer(buffer, bufPtr);
      sendNativeSockaddr(sockaddr, sockaddrPtr);
      send.u32(sockaddrLenPtr, sockaddr.sa_len);
      return bytesReceived;
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
      return posix.send(native_fd(socket), buffer, native_flags(flags));
    },

    /*
     TODO:

     ssize_t
     sendto(int socket, const void *buffer, size_t length, int flags,
         const struct sockaddr *dest_addr, socklen_t dest_len);
    */
    sendto(
      socket: number,
      bufPtr: number,
      length: number,
      flags: number,
      addressPtr: number,
      addressLen: number
    ): number {
      log("sendto", {
        socket,
        bufPtr,
        length,
        flags,
        addressPtr,
        addressLen,
      });
      if (posix.sendto == null) {
        throw Errno("ENOTSUP");
      }
      const buffer = Buffer.alloc(length);
      const destination = getSockaddr(addressPtr, addressLen);
      const bytesSent = posix.sendto(
        native_fd(socket),
        buffer,
        native_flags(flags),
        destination
      );

      log("sendto sent ", bytesSent);
      return bytesSent;
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
      posix.shutdown(native_fd(socket), real_how);
      return 0;
    },

    /*
    listen – listen for connections on a socket

    int listen(int socket, int backlog);
    */
    listen(socket: number, backlog: number): number {
      log("listen", { socket, backlog });
      if (posix.listen == null) {
        throw Errno("ENOTSUP");
      }
      return posix.listen(native_fd(socket), backlog);
    },

    /*
    accept – accept a connection on a socket
    int accept(int socket, struct sockaddr *address, socklen_t *address_len);
    */
    accept(socket: number, sockaddrPtr: number, socklenPtr: number): number {
      log("accept", { socket });
      if (posix.accept == null) {
        throw Errno("ENOTSUP");
      }
      const { fd, sockaddr } = posix.accept(native_fd(socket));
      sendNativeSockaddr(sockaddr, sockaddrPtr);
      send.u32(socklenPtr, sockaddr.sa_len);
      log("accept got back ", { fd, sockaddr });
      return createWasiFd(fd);
    },

    /*
    int getsockopt(int socket, int level, int option_name, void *option_value,
         socklen_t *option_len);
    */
    getsockopt(
      socket: number,
      level: number,
      option_name: number,
      option_value_ptr: number,
      option_len_ptr: number
    ): number {
      log("getsockopt", {
        socket,
        level,
        option_name,
        option_value_ptr,
        option_len_ptr,
      });
      if (posix.getsockopt == null) {
        throw Errno("ENOTSUP");
      }
      const option = posix.getsockopt(
        native_fd(socket),
        native_level(level),
        native_option_name(option_name),
        recv.i32(option_len_ptr)
      );
      send.buffer(option, option_value_ptr);
      send.i32(option_len_ptr, option.length);
      return 0;
    },

    /*
    int setsockopt(int socket, int level, int option_name, const void *option_value,
         socklen_t option_len);
    */
    setsockopt(
      socket: number,
      level: number,
      option_name: number,
      option_value_ptr: number,
      option_len: number
    ): number {
      log("setsockopt", {
        socket,
        level,
        option_name,
        option_value_ptr,
        option_len,
      });
      if (posix.setsockopt == null) {
        throw Errno("ENOTSUP");
      }

      const option = recv.buffer(option_value_ptr, option_len);
      posix.setsockopt(
        native_fd(socket),
        native_level(level),
        native_option_name(option_name),
        option
      );
      return 0;
    },

    pollSocket(
      socket: number,
      type: "read" | "write",
      timeout_ms: number
    ): number {
      log("pollForSocket", { socket, type, timeout_ms });
      if (posix.pollSocket == null) {
        return wasi_constants.WASI_ENOSYS;
      }
      posix.pollSocket(
        native_fd(socket),
        type == "read" ? constants.POLLIN : constants.POLLOUT,
        timeout_ms
      );
      return 0;
    },
  };
}
