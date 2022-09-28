import Errno from './errno.js';
import { wasmToNativeFamily, wasmToNativeSocktype } from './netdb.js';
import constants from './constants.js';
import { constants as wasi_constants } from "wasi-js";
import { notImplemented } from './util.js';

export default function socket({ callFunction, posix, recv, wasi }) {
  return {
    socket(family: number, socktype: number, protocol: number): number {
      // ** NOTE ** -- we explicitly disable socket vi the "true" below
      // until everything is implemented.  Otherwise the test suite
      // and installing pip and many other things break half-way through.
      // Re-enable this when finsihing this up.
      if (true || posix.socket == null) {
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
      const sa_family = callFunction("recv_sockaddr_sa_family", sockaddrPtr);
      const sa_data = recv.buffer(
        callFunction("recv_sockaddr_sa_data", sockaddrPtr),
        address_len - 2
      );
      console.log({
        sa_family,
        sa_data: sa_data.toString(),
      });
      console.log("sa_data = ", new Uint8Array(sa_data));
      notImplemented("bind");
      return -1;
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

    connect(socket: number, sockaddrPtr: number, address_len: number): number {
      console.log("connect stub ", { socket, sockaddrPtr, address_len });
      notImplemented("connect");
      return -1;
    },
  };
}
