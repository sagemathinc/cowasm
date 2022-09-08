import constants, { Constant } from "./constants";

export default function Errno(error: Constant) {
  const errno = constants[error];
  const err = Error(`Error ${error}  (errno=${errno}).`);
  (err as any).wasiErrno = errno;
  return err;
}
