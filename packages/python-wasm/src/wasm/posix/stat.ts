export default function stats({ fs, process, recvString, wasi }) {
  return {
    chmod: (pathPtr: number, mode: number): -1 | 0 => {
      const path = recvString(pathPtr);
      fs.chmodSync(path, mode);
      return 0;
    },

    fchmod: (fd: number, mode: number): number => {
      const entry = wasi.FD_MAP.get(fd);
      if (!entry) {
        console.warn("bad file descriptor, fchmod");
        return -1;
      }
      fs.fchmodSync(entry.real, mode);
      return 0;
    },

    lchmod: (pathPtr: number, mode: number): -1 | 0 => {
      const path = recvString(pathPtr);
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
