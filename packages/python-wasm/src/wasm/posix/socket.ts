import Errno from "./errno";
import { wasmToNativeFamily, wasmToNativeSocktype } from "./netdb";
import constants from "./constants";
import { constants as wasi_constants } from "wasi-js";

export default function socket({ posix, wasi }) {
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
  };
}
