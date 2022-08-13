/*
Functions from netdb. 

These are all very hard to implement with node, without just writing a node extension
module which is what I'll likely have to do.
*/

import { notImplemented } from "./util";

export default function netdb({}) {
  return {
    // struct hostent *gethostbyname(const char *name);
    gethostbyname: notImplemented("gethostbyname"),
    gethostbyaddr: notImplemented("gethostbyaddr"),
    getaddrinfo: notImplemented("getaddrinfo"),
    // struct protoent *getprotobyname(const char *name);
    getprotobyname: notImplemented("getprotobyname"),
    getservbyname: notImplemented("getservbyname"),
    getservbyport: notImplemented("getservbyport"),
    getnameinfo: notImplemented("getnameinfo"),
    getpeername: notImplemented("getpeername"),
  };
}
