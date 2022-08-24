import { isAbsolute, join } from "path";
import constants from "./constants";
import Errno from "./errno";

export default function stats({ fs, process, recv, wasi }) {
  function calculateAt(
    dirfd: number,
    path: string,
    allowEmpty: boolean = false
  ) {
    if (isAbsolute("path")) {
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

  return {
    chmod: (pathPtr: number, mode: number): -1 | 0 => {
      const path = recv.string(pathPtr);
      fs.chmodSync(path, mode);
      return 0;
    },

    _fchmod: (fd: number, mode: number): number => {
      const entry = wasi.FD_MAP.get(fd);
      if (!entry) {
        console.warn("bad file descriptor, fchmod");
        return -1;
      }
      fs.fchmodSync(entry.real, mode);
      return 0;
    },

    // int fchmodat(int dirfd, const char *pathname, mode_t mode, int flags);
    fchmodat: (
      dirfd: number,
      pathPtr: number,
      mode: number,
      _flags: number
    ): number => {
      /* "The fchmodat() system call operates in exactly the same way as chmod(2), except... If the
      pathname given in pathname is relative, then it is interpreted relative to the directory referred
      to by the file descriptor dirfd (rather than relative to the current working directory of the
      calling process, as is done by chmod(2) for a relative pathname).  If pathname is relative and
      dirfd is the special value AT_FDCWD, then pathname is interpreted relative to the current
      working directory of the calling process (like chmod(2)). If pathname is absolute, then dirfd
      is ignored.  This flag is not currently implemented."
     */
      const path = recv.string(pathPtr);
      const pathAt = calculateAt(dirfd, path);
      fs.chmodSync(pathAt, mode);
      return 0;
    },

    lchmod: (pathPtr: number, mode: number): -1 | 0 => {
      const path = recv.string(pathPtr);
      fs.lchmodSync(path, mode);
      return 0;
    },

    // mode_t umask(mode_t mask);
    umask: (mask: number) => {
      // we return 18 when there's no process.umask function, since that's like umask 022, i.e., it's a reasonable default.
      return process.umask?.(mask) ?? 18;
    },
  };
}
