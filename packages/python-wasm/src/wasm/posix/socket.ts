import Errno from "./errno";

export default function socket({}) {
  return {
    socket(_domain: number, _type: number, _protocol: number): number {
      // console.log("socket stub", { domain, type, protocol });
      throw Errno("ENOTSUP");
    },
  };
}
