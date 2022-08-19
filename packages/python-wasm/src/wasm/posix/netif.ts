/*
Functions from net/if.h
*/

import { notImplemented } from "./util";
import constants from "./constants";

export default function netif({ posix, send }) {
  return {
    // char *if_indextoname(unsigned int ifindex, char *ifname);
    if_indextoname: (ifindex: number, ifnamePtr: number): number => {
      const { if_indextoname } = posix;
      if (if_indextoname == null) {
        notImplemented("if_indextoname");
      }
      let ifname;
      try {
        ifname = if_indextoname(ifindex);
      } catch (err) {
        err.ret = 0; // return null pointer
        throw err;
      }
      send.string(ifname, {
        ptr: ifnamePtr,
        len: constants.IFNAMSIZ,
      });
      return ifnamePtr;
    },
  };
}
