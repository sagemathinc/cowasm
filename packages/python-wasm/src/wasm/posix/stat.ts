import { isAbsolute, join } from "path";
import constants from './constants.js';
import Errno from './errno.js';

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

  // because wasi's structs don't have sufficient info to deal with permissions, we make ALL of these
  // chmods into stubs, below, despite having implemented them!
  // This in particular totally broke libgit2 working at all.
  return {
    chmod: (pathPtr: number, mode: number): -1 | 0 => {
      return 0; // stubbed due to wasi shortcomings
      if (!mode) {
        // It is impossible for stat calls by wasi to return anything except 0 at present due to this bug:
        // See https://github.com/WebAssembly/wasi-filesystem/issues/34
        // Thus they will often then set the mode to 0, e.g., shutil.copy in python does this to all files.
        // In such cases, we silently make this a successful no-op instead of breaking everything horribly.
        // This comes up a lot with using Python as part of a build process.
        return 0;
      }
      const path = recv.string(pathPtr);
      fs.chmodSync(path, mode);
      return 0;
    },

    _fchmod: (fd: number, mode: number): number => {
      return 0; // stubbed due to wasi shortcomings
      if (!mode) {
        // see above.
        return 0;
      }
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
      return 0; // stubbed due to wasi shortcomings
      if (!mode) {
        // see above.
        return 0;
      }
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
      return 0; // stubbed due to wasi shortcomings
      if (!mode) {
        // see above.
        return 0;
      }
      const path = recv.string(pathPtr);
      fs.lchmodSync(path, mode);
      return 0;
    },

    // mode_t umask(mode_t mask);
    umask: (mask: number) => {
      // we return 18 when there's no process.umask function, since that's
      // like umask 022, i.e., it's a reasonable default.
      return process.umask?.(mask) ?? 18;
    },
  };
}
