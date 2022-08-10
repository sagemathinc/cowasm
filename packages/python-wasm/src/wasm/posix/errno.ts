import cDefine, { Constant } from "./c-define";

export default function Errno(error: Constant) {
  // TODO! need to set it at the C level, etc.
  const errno = cDefine(error);
  return Error(`Error ${error}  (errno=${errno}).`);
}
