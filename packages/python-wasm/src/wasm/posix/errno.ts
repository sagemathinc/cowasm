import constants, { Constant } from "./constants";

export default function Errno(error: Constant) {
  // TODO! need to set it at the C level, etc.
  const errno = constants[error];
  return Error(`Error ${error}  (errno=${errno}).`);
}
