import Errno from "./errno";
import { wasmToNativeFamily, wasmToNativeSocktype } from "./netdb";
import constants from "./constants";
import { constants as wasi_constants } from "wasi-js";
import { notImplemented } from "./util";

// ** NOTE ** -- we explicitly disable socket via the "true" below
// until everything is implemented.  Otherwise the test suite
// and installing pip and many other things break half-way through.
// Re-enable this when finishing.
const TEMPORARILY_DISABLED = true;

export default function socket({ callFunction, posix, recv, wasi }) {
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
      14
    );
    console.log("sa_len = ", sa_len);
    for (let i = sa_len; i < 14; i++) {
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
      console.log(inheritable);

      const socktypeNative = wasmToNativeSocktype(posix, socktype);

      // TODO? I don't know how to translate this or if it is necessary.
      const protocolNative = protocol;

      const real_fd = posix.socket(
        familyNative,
        socktypeNative,
        protocolNative
      );

      //       if (!inheritable) {
      //         posix.set_inheritable(real_fd, inheritable);
      //       }
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
      console.log("bind stub ", { socket, sockaddrPtr, address_len });
      const sockaddr = getSockaddr(sockaddrPtr, address_len);
      console.log("bind", sockaddr);
      console.log("sa_data.toString() = ", sockaddr.sa_data.toString());
      //console.log("sa_data = ", new Uint8Array(sa_data));
      posix.bind(real_fd(socket), sockaddr);
      return 0;
    },

    connect(socket: number, sockaddrPtr: number, address_len: number): number {
      const sockaddr = getSockaddr(sockaddrPtr, address_len);
      console.log("connect", sockaddr, "address_len", address_len);
      console.log(
        "sa_data as uint32array = ",
        new Uint32Array(sockaddr.sa_data)
      );
      //console.log("sa_data = ", new Uint8Array(sa_data));
      try {
        posix.connect(real_fd(socket), sockaddr);
      } catch (err) {
        console.log("FAIL", err);
        throw err;
      }
      return 0;
    },

    /*
    int getsockname(int socket, struct sockaddr *address,
         socklen_t *address_len);
    */
    getsockname(
      socket: number,
      sockaddrPtr: number,
      addressLenPtr: number
    ): number {
      console.log("getsockname stub ", { socket, sockaddrPtr, addressLenPtr });
      notImplemented("getsockname");
      return -1;
    },
  };
}
