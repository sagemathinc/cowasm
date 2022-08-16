import constant, { Constant } from "./constants";

export default function Errno(error: Constant) {
  // TODO! need to set it at the C level, etc.
  const errno = constant(error);
  return Error(`Error ${error}  (errno=${errno}).`);
}
