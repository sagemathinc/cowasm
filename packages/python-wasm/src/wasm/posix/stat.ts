export default function stats({ fs, recvString, wasi }) {
  return {
    chmod: (pathPtr: number, mode: number): -1 | 0 => {
      try {
        const path = recvString(pathPtr);
        fs.chmodSync(path, mode);
        return 0;
      } catch (err) {
        // On error, -1 is returned, and errno is set to indicate the error.
        // TODO: how should we set errno?
        console.warn(err);
        return -1;
      }
    },

    fchmod: (fd: number, mode: number): number => {
      const entry = wasi.FD_MAP.get(fd);
      if (!entry) {
        console.warn("bad file descriptor, fchmod");
        return -1;
      }
      try {
        fs.fchmodSync(entry.real, mode);
        return 0;
      } catch (err) {
        // On error, -1 is returned, and errno is set to indicate the error.
        // TODO: how should we set errno?
        console.warn(err);
        return -1;
      }
    },
  };
}
