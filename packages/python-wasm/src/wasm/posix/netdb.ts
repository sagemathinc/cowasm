/*
Functions from netdb. 

These are all very hard to implement with node, without just writing a node extension
module which is what I'll likely have to do.
*/

import { notImplemented } from "./util";

export default function netdb({}) {
  const names =
    "gethostbyname gethostbyaddr getaddrinfo getprotobyname getservbyname getservbyport getnameinfo getpeername";
  const netdb: any = {};
  for (const name of names.split(" ")) {
    netdb[name] = notImplemented(name);
  }
  return netdb;
}
