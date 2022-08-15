/*
Functions from netdb.

These are all very hard to implement with node, without just writing a node extension
module which is what I'll likely have to do.
*/

import { notImplemented } from "./util";
//import cDefine from "./c-define";

export default function netdb({
  memory,
  posix,
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
  netdb.gethostbyname = (name: string) => {
    if (posix.gethostbyname == null) {
      notImplemented("gethostbyname");
      return;
    }
    const hostent = posix.gethostbyname(name);
    console.log(hostent);
    throw Error("TODO");
  };

  netdb.gethostbyaddr = (addr: string) => {
    if (posix.gethostbyaddr == null) {
      notImplemented("gethostbyaddr");
      return;
    }
    const hostent = posix.gethostbyaddr(addr);
    console.log(hostent);
    throw Error("TODO");
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
    console.log("here in getaddrinfo", posix.getaddrinfo);
    if (posix.getaddrinfo == null) {
      notImplemented("getaddrinfo");
      return -1;
    }
    const node = recvString(nodePtr);
    const service = recvString(servicePtr);
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
    hintsPtr += 4;
    console.log({
      node,
      service,
      hints: {
        flags,
        family,
        socktype,
        protocol,
      },
    });
    const addrinfoArray = posix.getaddrinfo(node, service, {
      flags,
      family,
      socktype,
      protocol,
    });
    console.log("got back: ", addrinfoArray);
    // We need to allocate memory for and create a linked list of
    // struct addrinfo objects from the array above.  This makes
    // my head hurt -- TODO: below, doing this directly like in wasi.ts,
    // rather than via some general function, is insane.
    const info = addrinfoArray[0];
    if (info.ai_family == 2) {
      info.ai_family = info.sa_family = 1;
    } else if (info.ai_family == 30) {
      info.ai_framily = info.sa_family = 2;
    }
    console.log("info = ", info);
    const ptrToAddrInfo = malloc(8 * 4); // 8 fields
    view.setUint32(resPtr, ptrToAddrInfo, true);
    let ptr = ptrToAddrInfo;
    view.setInt32(ptr, info.ai_flags, true);
    ptr += 4;
    view.setInt32(ptr, info.ai_family, true);
    ptr += 4;
    view.setInt32(ptr, info.ai_socktype, true);
    ptr += 4;
    view.setInt32(ptr, info.ai_protocol, true);
    ptr += 4;
    view.setUint32(ptr, info.ai_addrlen, true);
    ptr += 4;
    const ptrToAiAddr = malloc(2 + info.ai_addrlen);
    view.setUint16(ptrToAiAddr, info.sa_family, true);
    for (let i = 0; i < info.ai_addrlen; i++) {
      view.setUint8(ptrToAiAddr + 2 + i, info.sa_data[i]);
    }
    view.setUint32(ptr, ptrToAiAddr, true);
    ptr += 4;
    if (info.ai_canonname) {
      const ai_canonname_ptr = sendString(info.ai_canonname);
      view.setUint32(ptr, ai_canonname_ptr, true);
    } else {
      view.setUint32(ptr, 0, true);
    }
    ptr += 4;
    // nothing next (for now):
    view.setUint32(ptr, 0, true);
    return 0;
  };

  netdb.freeaddrinfo = (resPtr: number): void => {
    // tricky because has to navigate linked list and free stuff inside
    // each entry...
    console.log("TODO -- freeaddrinfo");
    free(resPtr); // wrong -- need to free components
  };

  return netdb;
}
