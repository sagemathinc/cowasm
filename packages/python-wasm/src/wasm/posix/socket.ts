import Errno from "./errno";

export default function socket({}) {
  return {
    socket(domain: number, type: number, protocol: number): number {
      console.log("socket stub", { domain, type, protocol });
      throw Errno("ENOTSUP");
    },
  };
}
