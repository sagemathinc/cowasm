import { isAbsolute, join } from "path";
import constants from "./constants";
import Errno from "./errno";
import { notImplemented } from "./util";

export default function stats({ fs, process, recv, wasi }) {
  function calculateAt(
    dirfd: number,
    path: string,
    allowEmpty: boolean = false
  ) {
    if (isAbsolute(path)) {
      return path;
    }

    let dir: string;
    if (dirfd == constants.AT_FDCWD) {
      dir = process.cwd?.() ?? "/";
    } else {
      // it is a file descriptor
      const entry = wasi.FD_MAP.get(dirfd);
      if (!entry) {
        throw Errno("EBADF");
      }
      dir = entry.path;
    }
    if (path.length == 0) {
      if (!allowEmpty) {
        throw Errno("ENOENT");
      }
      return dir;
    }
    return join(dir, path);
  }

  // WASI preview 1 filestat structs do not expose permission bits, so stat(2)
  // reports the libc defaults (0600 for files and 0700 for directories).
  // Those defaults are nevertheless safe to pass back to chmod, and applying
  // explicit modes is essential for permission checks to have real semantics.
  return {
    chmod: (pathPtr: number, mode: number): -1 | 0 => {
      const path = recv.string(pathPtr);
      fs.chmodSync(path, mode);
      return 0;
    },

    _fchmod: (fd: number, mode: number): number => {
      const entry = wasi.FD_MAP.get(fd);
      if (!entry) {
        throw Errno("EBADF");
      }
      fs.fchmodSync(entry.real, mode);
      return 0;
    },

    // int fchmodat(int dirfd, const char *pathname, mode_t mode, int flags);
    fchmodat: (
      dirfd: number,
      pathPtr: number,
      mode: number,
      flags: number
    ): number => {
      if (flags != 0) {
        throw Errno("ENOTSUP");
      }
      const path = recv.string(pathPtr);
      const pathAt = calculateAt(dirfd, path);
      fs.chmodSync(pathAt, mode);
      return 0;
    },

    lchmod: (pathPtr: number, mode: number): -1 | 0 => {
      const path = recv.string(pathPtr);
      if (fs.lchmodSync == null) {
        throw Errno("ENOTSUP");
      }
      fs.lchmodSync(path, mode);
      return 0;
    },

    // mode_t umask(mode_t mask);
    umask: (mask: number) => {
      // we return 18 when there's no process.umask function, since that's
      // like umask 022, i.e., it's a reasonable default.
      return process.umask?.(mask) ?? 18;
    },

    // not in wasi and we haven't done it yet...
    mkfifo: () => {
      notImplemented("mkfifo");
    },

    mknod: () => {
      notImplemented("mknod");
    },
  };
}
