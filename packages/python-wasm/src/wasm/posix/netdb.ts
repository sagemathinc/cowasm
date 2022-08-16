/*
Functions from netdb.

These are all very hard to implement with node, without just writing a node extension
module which is what I'll likely have to do.
*/

import { notImplemented } from "./util";
import type { Hostent } from "posix-zig";
import cDefine from "./c-define";

export default function netdb({
  memory,
  posix,
  callFunction,
  recvString,
  sendString,
  malloc,
  free,
}) {
  const names =
    " getprotobyname getservbyname getservbyport getnameinfo getpeername";
  const netdb: any = {};
  for (const name of names.split(" ")) {
    netdb[name] = notImplemented(name);
  }

  // This can't properly be done using zig, since it
  // intensenly abuses the C data types...
  function sendSockaddr(sa_family, ai_addrlen, sa_data): number {
    const ptr = malloc(2 + ai_addrlen);
    const view = new DataView(memory.buffer);
    view.setUint16(ptr, sa_family, true);
    for (let i = 0; i < ai_addrlen; i++) {
      view.setUint8(ptr + 2 + i, sa_data[i]);
    }
    return ptr;
  }

  function recvHints(hintsPtr) {
    const view = new DataView(memory.buffer);
    const flags = view.getUint32(hintsPtr, true);
    hintsPtr += 4;
    let family = view.getUint32(hintsPtr, true);
    // TODO: massive todo here -- we need to translate the constants from WASI/libc to whatever the host OS is,
    // and it is VERY different on every single one!
    if (family == 1) {
      family = 2;
    } else if (family == 2) {
      family = 30;
    }
    hintsPtr += 4;
    const socktype = view.getUint32(hintsPtr, true);
    hintsPtr += 4;
    const protocol = view.getUint32(hintsPtr, true);
    return {
      flags,
      family,
      socktype,
      protocol,
    };
  }

  function sendPtr(address: number, ptr: number): void {
    const view = new DataView(memory.buffer);
    view.setUint32(address, ptr, true); // true = endianness
  }

  // this is null terminated.
  function sendArrayOfStrings(v: string[]): number {
    const ptr = malloc(4 * (v.length + 1));
    if (ptr == 0) {
      throw Error("out of memory");
    }
    for (let i = 0; i < v.length; i++) {
      const sPtr = sendString(v[i]);
      sendPtr(ptr + 4 * i, sPtr);
    }
    sendPtr(ptr + 4 * v.length, 0);
    return ptr;
  }

  function sendHostent(hostent: Hostent): number {
    const h_addrtype = cDefine(
      hostent.h_addrtype == posix.CONSTANTS.AF_INET ? "AF_INET" : "AF_INET6"
    );
    return callFunction(
      "sendHostent",
      sendString(hostent.h_name),
      sendArrayOfStrings(hostent.h_aliases),
      h_addrtype,
      hostent.h_length,
      sendArrayOfStrings(hostent.h_addr_list),
      hostent.h_addr_list.length
    );
  }

  // struct hostent *gethostbyname(const char *name);
  // struct hostent
  // {
  //     char *h_name;       /* Official domain name of host */
  //     char **h_aliases;   /* Null-terminated array of domain names */
  //     int h_addrtype;     /* Host address type (AF_INET) */
  //     int h_length;       /* Length of an address, in bytes */
  //     char **h_addr_list;     /* Null-terminated array of in_addr structs */
  // };
  // struct in_addr
  // {
  //     unsigned int s_addr; /* Network byte order (big-endian) */
  // };
  netdb.gethostbyname = (namePtr: number) => {
    console.log("gethostbyname", namePtr);
    if (posix.gethostbyname == null) {
      notImplemented("gethostbyname", 0);
    }
    const hostent = posix.gethostbyname(recvString(namePtr));
    console.log(hostent);
    return 0;
  };

  // struct hostent *gethostbyaddr(const void *addr,
  //                            socklen_t len, int type);
  netdb.gethostbyaddr = (addrPtr: number, len: number, type: number) => {
    try {
      console.log("gethostbyaddr", { addrPtr, len, type });
      if (posix.gethostbyaddr == null) {
        notImplemented("gethostbyaddr", 0);
      }
      let addrStringPtr;
      try {
        addrStringPtr = callFunction("recvAddr", addrPtr, type);
      } catch (_err) {
        return 0;
      }
      if (addrStringPtr == 0) {
        console.log("recvAddr failed");
        return 0;
      }
      const addrString = recvString(addrStringPtr);
      free(addrStringPtr);
      console.log("recvAddr got ", addrString);
      const hostent = posix.gethostbyaddr(addrString);
      console.log("hostent = ", hostent);
      const p = sendHostent(hostent);
      console.log("got Hostent = ", p);
    } catch (err) {
      err.ret = 0;
      throw err;
    }
  };

  /* int getaddrinfo(const char *restrict node,
                     const char *restrict service,
                     const struct addrinfo *restrict hints,
                     struct addrinfo **restrict res);

Since we are allocating this explicitly using malloc for the result,
it's critical to know precisely what this really is in 32-bit WebAssembly,
but nowhere else, which we due by grepping zig/lib/libc sources.

      struct addrinfo {
           int              ai_flags;
           int              ai_family;
           int              ai_socktype;
           int              ai_protocol;
           socklen_t        ai_addrlen;
           struct sockaddr *ai_addr;
           char            *ai_canonname;
           struct addrinfo *ai_next;
       }

       typedef unsigned socklen_t;

       struct sockaddr {
          _Alignas(max_align_t) sa_family_t sa_family;
          char sa_data[0];
       };

       typedef unsigned short sa_family_t;    // unsigned short is 2 bytes

That "char sa_data[0]" is scary but OK, since just a pointer; think of it as a char*.

  */
  netdb.getaddrinfo = (
    nodePtr: number,
    servicePtr: number,
    hintsPtr: number,
    resPtr: number
  ): number => {
    if (posix.getaddrinfo == null) {
      notImplemented("getaddrinfo");
      return -1;
    }
    const node = recvString(nodePtr);
    const service = recvString(servicePtr);
    const hints = recvHints(hintsPtr);
    const addrinfoArray = posix.getaddrinfo(node, service, hints);
    function mapConstants(info) {
      // TODO!!
      if (info.ai_family == 2) {
        info.ai_family = info.sa_family = 1;
      } else if (info.ai_family == 30) {
        info.ai_framily = info.sa_family = 2;
      }
    }

    let ai_next = 0;
    let addrinfo = 0;
    let n = addrinfoArray.length - 1;
    while (n >= 0) {
      const info = addrinfoArray[n];
      mapConstants(info);
      const ai_addr = sendSockaddr(
        info.sa_family,
        info.ai_addrlen,
        info.sa_data
      );
      if (!ai_addr) {
        throw Error("error creating sockaddr");
      }
      addrinfo = callFunction(
        "sendAddrinfo",
        info.ai_flags,
        info.ai_family,
        info.ai_socktype,
        info.ai_protocol,
        info.ai_addrlen,
        ai_addr,
        info.ai_canonname != null ? sendString(info.ai_canonname) : 0,
        ai_next
      );
      if (!addrinfo) {
        throw Error("error creating addrinfo structure");
      }
      ai_next = addrinfo;
      n -= 1;
    }
    if (!addrinfo) {
      throw Error("error creating addrinfo structure");
    }
    sendPtr(resPtr, addrinfo);
    return 0;
  };

  return netdb;
}
