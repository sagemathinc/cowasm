export default function unistd({ fs, process, recvString }) {
  return {
    chown: (pathPtr: number, uid: number, gid: number): -1 | 0 => {
      try {
        const path = recvString(pathPtr);
        fs.chownSync(path, uid, gid);
        return 0;
      } catch (err) {
        console.warn(err);
        return -1;
      }
    },

    getuid: () => process.getuid?.() ?? 0,
    getgid: () => process.getgid?.() ?? 0,
    geteuid: () => process.geteuid?.() ?? 0,
    getegid: () => process.getegid?.() ?? 0,
    getpid: () => process.pid ?? 1,
  };
}
