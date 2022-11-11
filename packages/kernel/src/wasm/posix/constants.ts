// These are purely for typescript, and I can only update this (when the zig code changes)
// by just printing out the constants at runtime.
const CONSTANTS = [
  "AT_FDCWD",
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
  "EADDRINUSE",
  "EADDRNOTAVAIL",
  "EAFNOSUPPORT",
  "EALREADY",
  "ECONNREFUSED",
  "EFAULT",
  "EHOSTUNREACH",
  "EINPROGRESS",
  "EISCONN",
  "ENETDOWN",
  "ENETUNREACH",
  "ENOBUFS",
  "ENOTSOCK",
  "EOPNOTSUPP",
  "EPROTOTYPE",
  "ETIMEDOUT",
  "ECONNRESET",
  "ELOOP",
  "ENAMETOOLONG",
  "SIG_BLOCK",
  "SIG_UNBLOCK",
  "SIG_SETMASK",
  "AF_INET",
  "AF_INET6",
  "F_ULOCK",
  "F_LOCK",
  "F_TLOCK",
  "F_TEST",
  "IFNAMSIZ",
  "ENOTSUP",
  "WNOHANG",
  "WUNTRACED",
  "MSG_OOB",
  "MSG_PEEK",
  "MSG_WAITALL",
  "MSG_DONTROUTE",
] as const;

export type Constant = typeof CONSTANTS[number];

const constants: { [name: string]: number } = {};
export default constants;

function recvJsonObject({ callFunction, recv }, name: string) {
  let ptr = callFunction(name);
  if (ptr == 0) {
    throw Error("unable to receive JSON object");
  }
  return JSON.parse(recv.string(ptr));
}

export function initConstants(context) {
  const { names, values } = recvJsonObject(context, "getConstants");
  for (let i = 0; i < names.length; i++) {
    constants[names[i]] = values[i];
  }
  // console.log(constants);
}
