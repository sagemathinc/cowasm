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
const TEMPORARILY_DISABLED = true;

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
    */
    recv(
      socket: number,
      bufPtr: number,
      length: number,
      flags: number
    ): number {
      log("recv", { socket, bufPtr, length, flags });
      console.log("socket recv not implemented yet");
      return -1;
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
      console.log("socket send not implemented yet");
      return -1;
    },

    /*
    int shutdown(int socket, int how);
    */
    shutdown(socket: number, how: number): number {
      log("shutdown", { socket, how });
      console.log("socket shutdown not implemented yet");
      return -1;
    },
  };
}
