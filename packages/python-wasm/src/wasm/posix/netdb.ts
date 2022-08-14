/*
Functions from netdb.

These are all very hard to implement with node, without just writing a node extension
module which is what I'll likely have to do.
*/

import { notImplemented } from "./util";

export default function netdb({ posix }) {
  const names =
    "gethostbyaddr getaddrinfo getprotobyname getservbyname getservbyport getnameinfo getpeername";
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
  return netdb;
}
