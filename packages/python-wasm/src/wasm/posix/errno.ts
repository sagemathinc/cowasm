import constants, { Constant } from "./constants";

export default function Errno(error: Constant) {
  const errno = constants[error];
  const err = Error(`Error ${error}  (errno=${errno}).`);
  (err as any).wasiErrno = errno;
  return err;
}

// Return map from standard native error codes to
// WASM error codes.  These can be *very* different
// and have to be translated.
export function nativeToWasm(posix) {
  const names = [
    "E2BIG",
    "EACCES",
    "EBADF",
    "EBUSY",
    "ECHILD",
    "EDEADLK",
    "EEXIST",
    "EFAULT",
    "EFBIG",
    "EINTR",
    "EINVAL",
    "EIO",
    "EISDIR",
    "EMFILE",
    "EMLINK",
    "ENFILE",
    "ENODEV",
    "ENOENT",
    "ENOEXEC",
    "ENOMEM",
    "ENOSPC",
    "ENOTDIR",
    "ENOTTY",
    "ENXIO",
    "EPERM",
    "EPIPE",
    "EROFS",
    "ESPIPE",
    "ESRCH",
    "ETXTBSY",
    "EXDEV",
  ];
  const map: { [native: number]: number } = {};
  for (const name of names) {
    const eNative = posix.constants?.[name];
    if (!eNative) {
      throw Error(`posix constant ${name} not known`);
    }
    const eWasm = constants[name];
    if (!eWasm) {
      throw Error(`wasm constant ${name} not known`);
    }
    map[eNative] = eWasm;
  }
  return map;
}
