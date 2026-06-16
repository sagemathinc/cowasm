#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <netdb.h>
#include <poll.h>
#include <stdarg.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/stat.h>
#include <sys/statvfs.h>
#include <termios.h>
#include <unistd.h>

#if __has_include(<net/if.h>)
#include <net/if.h>
#else
struct if_nameindex {
  unsigned int if_index;
  char *if_name;
};
#endif

#ifndef __wasi__
struct sched_param {
  int sched_priority;
};
#endif

#include "posix-wasm.h"

#ifdef COWASM_WASI_SDK_KERNEL
struct addrinfo {
  int ai_flags;
  int ai_family;
  int ai_socktype;
  int ai_protocol;
  socklen_t ai_addrlen;
  struct sockaddr *ai_addr;
  char *ai_canonname;
  struct addrinfo *ai_next;
};

#ifndef CBAUD
#define CBAUD 0010017
#endif

#ifndef IFNAMSIZ
#define IFNAMSIZ 16
#endif

#ifndef AI_V4MAPPED
#define AI_V4MAPPED 0x08
#endif
#ifndef AI_ALL
#define AI_ALL 0x10
#endif
#ifndef AI_ADDRCONFIG
#define AI_ADDRCONFIG 0x20
#endif
#ifndef EAI_BADFLAGS
#define EAI_BADFLAGS -1
#endif
#ifndef EAI_AGAIN
#define EAI_AGAIN -3
#endif
#ifndef EAI_FAIL
#define EAI_FAIL -4
#endif
#ifndef EAI_FAMILY
#define EAI_FAMILY -6
#endif
#ifndef EAI_SOCKTYPE
#define EAI_SOCKTYPE -7
#endif
#ifndef EAI_SERVICE
#define EAI_SERVICE -8
#endif
#ifndef EAI_MEMORY
#define EAI_MEMORY -10
#endif
#ifndef EAI_SYSTEM
#define EAI_SYSTEM -11
#endif
#ifndef EAI_OVERFLOW
#define EAI_OVERFLOW -12
#endif

#ifndef IGNBRK
#define IGNBRK 0000001
#endif
#ifndef BRKINT
#define BRKINT 0000002
#endif
#ifndef IGNPAR
#define IGNPAR 0000004
#endif
#ifndef PARMRK
#define PARMRK 0000010
#endif
#ifndef INPCK
#define INPCK 0000020
#endif
#ifndef ISTRIP
#define ISTRIP 0000040
#endif
#ifndef INLCR
#define INLCR 0000100
#endif
#ifndef IGNCR
#define IGNCR 0000200
#endif
#ifndef ICRNL
#define ICRNL 0000400
#endif
#ifndef IXON
#define IXON 0002000
#endif
#ifndef IXANY
#define IXANY 0004000
#endif
#ifndef IXOFF
#define IXOFF 0010000
#endif
#ifndef IMAXBEL
#define IMAXBEL 0020000
#endif
#ifndef IUTF8
#define IUTF8 0040000
#endif
#ifndef OPOST
#define OPOST 0000001
#endif
#ifndef ONLCR
#define ONLCR 0000004
#endif
#ifndef OCRNL
#define OCRNL 0000010
#endif
#ifndef ONOCR
#define ONOCR 0000020
#endif
#ifndef ONLRET
#define ONLRET 0000040
#endif
#ifndef OFILL
#define OFILL 0000100
#endif
#ifndef OFDEL
#define OFDEL 0000200
#endif
#ifndef CSIZE
#define CSIZE 0000060
#endif
#ifndef CS5
#define CS5 0000000
#endif
#ifndef CS6
#define CS6 0000020
#endif
#ifndef CS7
#define CS7 0000040
#endif
#ifndef CS8
#define CS8 0000060
#endif
#ifndef CSTOPB
#define CSTOPB 0000100
#endif
#ifndef CREAD
#define CREAD 0000200
#endif
#ifndef PARENB
#define PARENB 0000400
#endif
#ifndef PARODD
#define PARODD 0001000
#endif
#ifndef HUPCL
#define HUPCL 0002000
#endif
#ifndef CLOCAL
#define CLOCAL 0004000
#endif
#ifndef ISIG
#define ISIG 0000001
#endif
#ifndef ICANON
#define ICANON 0000002
#endif
#ifndef ECHO
#define ECHO 0000010
#endif
#ifndef ECHOE
#define ECHOE 0000020
#endif
#ifndef ECHOK
#define ECHOK 0000040
#endif
#ifndef ECHONL
#define ECHONL 0000100
#endif
#ifndef NOFLSH
#define NOFLSH 0000200
#endif
#ifndef TOSTOP
#define TOSTOP 0000400
#endif
#ifndef IEXTEN
#define IEXTEN 0100000
#endif
#endif

#define WASM_EXPORT(name)                                                     \
  __attribute__((visibility("default"))) void *__WASM_EXPORT__##name(void) { \
    return &(name);                                                           \
  }

extern void wasmSetException(void);
extern int cowasm_vforkexec(char **argv, char *path);
extern uid_t _geteuid(void);
extern int _fchown(int fd, uid_t owner, gid_t group);
extern int _fchmod(int fd, mode_t mode);

void keepalive(void) {}
WASM_EXPORT(keepalive)

extern void __SIG_ERR(int signum);
WASM_EXPORT(__SIG_ERR)

int cowasm_exec(int argc, char **argv) {
  (void)argc;
  int ret = cowasm_vforkexec(argv, NULL);
  if (ret) {
    wasmSetException();
    fprintf(stderr, "error when starting %s\n", argv == NULL ? "" : argv[0]);
    return 1;
  }
  return ret;
}
WASM_EXPORT(cowasm_exec)

void _Py_CheckEmscriptenSignals(void) {}

void _Py_CheckEmscriptenSignalsPeriodically(void) {}

int emscripten_return_address(int unknown) {
  (void)unknown;
  return 0;
}

struct addrinfo *sendAddrinfo(int ai_flags, int ai_family, int ai_socktype,
                              int ai_protocol, socklen_t ai_addrlen,
                              struct sockaddr *ai_addr, char *ai_canonname,
                              struct addrinfo *ai_next) {
  struct addrinfo *addrinfo = malloc(sizeof(*addrinfo));
  if (addrinfo == NULL) {
    return NULL;
  }
  addrinfo->ai_flags = ai_flags;
  addrinfo->ai_family = ai_family;
  addrinfo->ai_socktype = ai_socktype;
  addrinfo->ai_protocol = ai_protocol;
  addrinfo->ai_addrlen = ai_addrlen;
  addrinfo->ai_addr = ai_addr;
  addrinfo->ai_canonname = ai_canonname;
  addrinfo->ai_next = ai_next;
  return addrinfo;
}
WASM_EXPORT(sendAddrinfo)

void freeaddrinfo(struct addrinfo *addrinfo) {
  if (addrinfo == NULL) {
    return;
  }
  if (addrinfo->ai_next != NULL) {
    freeaddrinfo(addrinfo->ai_next);
  }
  free(addrinfo->ai_canonname);
  free(addrinfo->ai_addr);
  free(addrinfo);
}

char *recvAddr(void *addr, int addrtype) {
  char *dst = malloc(40);
  if (dst == NULL) {
    return NULL;
  }
  if (inet_ntop(addrtype, addr, dst, 40) == NULL) {
    fprintf(stderr, "recvAddr -- failed to convert address to string via "
                    "inet_ntop\n");
    free(dst);
    return NULL;
  }
  return dst;
}
WASM_EXPORT(recvAddr)

static void free_null_terminated_string_array(char **v) {
  if (v == NULL) {
    return;
  }
  for (size_t i = 0; v[i] != NULL; i++) {
    free(v[i]);
  }
  free(v);
}

static char **convert_h_addr_list_to_binary_v4(char **h_addr_list, size_t len) {
  struct in_addr **binary = malloc(sizeof(*binary) * (len + 1));
  if (binary == NULL) {
    return NULL;
  }
  for (size_t i = 0; i < len; i++) {
    binary[i] = malloc(sizeof(**binary));
    if (binary[i] == NULL) {
      return NULL;
    }
    int ret = inet_pton(AF_INET, h_addr_list[i], binary[i]);
    if (ret != 1) {
      fprintf(stderr,
              "inet_pton failed when doing convert_h_addr_list_to_binary_v4 - "
              "h_addr_list[%zu]='%s', ret=%d\n",
              i, h_addr_list[i], ret);
      return NULL;
    }
  }
  binary[len] = NULL;
  return (char **)binary;
}

static char **convert_h_addr_list_to_binary_v6(char **h_addr_list, size_t len) {
  struct in6_addr **binary = malloc(sizeof(*binary) * (len + 1));
  if (binary == NULL) {
    return NULL;
  }
  for (size_t i = 0; i < len; i++) {
    binary[i] = malloc(sizeof(**binary));
    if (binary[i] == NULL) {
      return NULL;
    }
    int ret = inet_pton(AF_INET6, h_addr_list[i], binary[i]);
    if (ret != 1) {
      fprintf(stderr,
              "inet_pton failed when doing convert_h_addr_list_to_binary_v6 - "
              "h_addr_list[%zu]='%s', ret=%d\n",
              i, h_addr_list[i], ret);
      return NULL;
    }
  }
  binary[len] = NULL;
  return (char **)binary;
}

struct hostent *sendHostent(char *h_name, char **h_aliases, int h_addrtype,
                            int h_length, char **h_addr_list,
                            size_t h_addr_list_len) {
  struct hostent *hostent = malloc(sizeof(*hostent));
  if (hostent == NULL) {
    return NULL;
  }
  hostent->h_name = h_name;
  hostent->h_aliases = h_aliases;
  hostent->h_addrtype = h_addrtype;
  hostent->h_length = h_length;
  hostent->h_addr_list =
      h_addrtype == AF_INET
          ? convert_h_addr_list_to_binary_v4(h_addr_list, h_addr_list_len)
          : convert_h_addr_list_to_binary_v6(h_addr_list, h_addr_list_len);
  if (hostent->h_addr_list == NULL) {
    free(hostent);
    return NULL;
  }
  free_null_terminated_string_array(h_addr_list);
  return hostent;
}
WASM_EXPORT(sendHostent)

struct if_nameindex *createNameIndexArray(size_t len) {
  struct if_nameindex *ni = malloc((len + 1) * sizeof(*ni));
  if (ni == NULL) {
    return NULL;
  }
  ni[len].if_index = 0;
  ni[len].if_name = NULL;
  return ni;
}
WASM_EXPORT(createNameIndexArray)

void setNameIndexElement(struct if_nameindex *ni, size_t i,
                         unsigned int if_index, char *if_name) {
  ni[i].if_index = if_index;
  ni[i].if_name = if_name;
}
WASM_EXPORT(setNameIndexElement)

void freeNameIndexArray(struct if_nameindex *ni) {
  if (ni == NULL) {
    return;
  }
  for (size_t i = 0; ni[i].if_index != 0; i++) {
    free(ni[i].if_name);
  }
  free(ni);
}
WASM_EXPORT(freeNameIndexArray)

void __stack_chk_fail(void) {
  fprintf(stderr, "A stack overflow has been detected.\n");
  exit(1);
}

int strunvis(char *dst, const char *src) {
  size_t i = 0;
  while (src[i] != 0) {
    dst[i] = src[i];
    i++;
  }
  dst[i] = 0;
  return (int)i;
}

int strvis(char *dst, const char *src, int flag) {
  (void)flag;
  size_t i = 0;
  while (src[i] != 0) {
    dst[i] = src[i];
    i++;
  }
  dst[i] = 0;
  return (int)i;
}

int strnvis(char *dst, size_t size, const char *src, int flag) {
  (void)flag;
  size_t i = 0;
  if (size != 0) {
    while (src[i] != 0 && i < size - 1) {
      dst[i] = src[i];
      i++;
    }
    dst[i] = 0;
  }
  while (src[i] != 0) {
    i++;
  }
  return (int)i;
}

char *textdomain(char *domainname) { return domainname; }

char *gettext(const char *msgid) { return (char *)msgid; }

char *dgettext(const char *domainname, const char *msgid) {
  (void)domainname;
  return (char *)msgid;
}

char *dcgettext(const char *domainname, const char *msgid, int category) {
  (void)domainname;
  (void)category;
  return (char *)msgid;
}

char *bindtextdomain(const char *domainname, const char *dirname) {
  (void)domainname;
  return (char *)dirname;
}

void set_statvfs(struct statvfs *buf, unsigned long f_bsize,
                 unsigned long f_frsize, fsblkcnt_t f_blocks,
                 fsblkcnt_t f_bfree, fsblkcnt_t f_bavail,
                 fsfilcnt_t f_files, fsfilcnt_t f_ffree,
                 fsfilcnt_t f_favail, unsigned long f_fsid,
                 unsigned long f_flag, unsigned long f_namemax) {
  buf->f_bsize = f_bsize;
  buf->f_frsize = f_frsize;
  buf->f_blocks = f_blocks;
  buf->f_bfree = f_bfree;
  buf->f_bavail = f_bavail;
  buf->f_files = f_files;
  buf->f_ffree = f_ffree;
  buf->f_favail = f_favail;
  buf->f_fsid = f_fsid;
  buf->f_flag = f_flag;
  buf->f_namemax = f_namemax;
}
WASM_EXPORT(set_statvfs)

int getpagesize(void) { return PAGE_SIZE; }

int get_posix_spawnattr_schedparam_sched_priority(
    const struct sched_param *schedparam) {
  return schedparam->sched_priority;
}
WASM_EXPORT(get_posix_spawnattr_schedparam_sched_priority)

void set_posix_spawnattr_schedparam_sched_priority(
    struct sched_param *schedparam, int sched_priority) {
  schedparam->sched_priority = sched_priority;
}
WASM_EXPORT(set_posix_spawnattr_schedparam_sched_priority)

int fchmod(int fd, mode_t mode) { return _fchmod(fd, mode); }

void flockfile(FILE *filehandle) { (void)filehandle; }

int ftrylockfile(FILE *filehandle) {
  (void)filehandle;
  return 0;
}

void funlockfile(FILE *filehandle) { (void)filehandle; }

char *secure_getenv(const char *name) { return getenv(name); }

long double strtold_l(const char *s, char **p, void *l) {
  (void)l;
  return strtold(s, p);
}

int cfsetospeed(struct termios *tio, speed_t speed) {
  if ((speed & ~CBAUD) != 0) {
    errno = EINVAL;
    return -1;
  }
  tio->c_cflag &= ~CBAUD;
  tio->c_cflag |= speed;
  return 0;
}

int cfsetispeed(struct termios *tio, speed_t speed) {
  return speed != 0 ? cfsetospeed(tio, speed) : 0;
}

speed_t cfgetispeed(const struct termios *tio) { return tio->c_cflag & CBAUD; }

speed_t cfgetospeed(const struct termios *tio) { return cfgetispeed(tio); }

uid_t geteuid(void) { return _geteuid(); }

int fchown(int fd, uid_t owner, gid_t group) {
  return _fchown(fd, owner, group);
}

struct cowasm_sockaddr {
  uint16_t sa_family;
  char sa_data[14];
};

uint16_t recv_sockaddr_sa_family(struct sockaddr *sockaddr) {
  return ((struct cowasm_sockaddr *)sockaddr)->sa_family;
}
WASM_EXPORT(recv_sockaddr_sa_family)

char *recv_sockaddr_sa_data(struct sockaddr *sockaddr) {
  return ((struct cowasm_sockaddr *)sockaddr)->sa_data;
}
WASM_EXPORT(recv_sockaddr_sa_data)

struct constant_entry {
  const char *name;
  int value;
};

#define CONSTANT(name) {#name, (int)(name)}
#define CVAL(name, value) {name, (int)(value)}

static const struct constant_entry constants[] = {
    CONSTANT(E2BIG),
    CONSTANT(EACCES),
    CONSTANT(EBADF),
    CONSTANT(EBUSY),
    CONSTANT(ECHILD),
    CONSTANT(EDEADLK),
    CONSTANT(EEXIST),
    CONSTANT(EFAULT),
    CONSTANT(EFBIG),
    CONSTANT(EINTR),
    CONSTANT(EINVAL),
    CONSTANT(EIO),
    CONSTANT(EISDIR),
    CONSTANT(EMFILE),
    CONSTANT(EMLINK),
    CONSTANT(ENFILE),
    CONSTANT(ENODEV),
    CONSTANT(ENOENT),
    CONSTANT(ENOEXEC),
    CONSTANT(ENOMEM),
    CONSTANT(ENOSPC),
    CONSTANT(ENOTDIR),
    CONSTANT(ENOTTY),
    CONSTANT(ENXIO),
    CONSTANT(EPERM),
    CONSTANT(EPIPE),
    CONSTANT(EROFS),
    CONSTANT(ESPIPE),
    CONSTANT(ESRCH),
    CONSTANT(ETXTBSY),
    CONSTANT(EXDEV),
    CONSTANT(ENOTSUP),
    CONSTANT(EADDRINUSE),
    CONSTANT(EADDRNOTAVAIL),
    CONSTANT(EAFNOSUPPORT),
    CONSTANT(EAGAIN),
    CONSTANT(EALREADY),
    CONSTANT(ECONNREFUSED),
    CONSTANT(EFAULT),
    CONSTANT(EHOSTUNREACH),
    CONSTANT(EINPROGRESS),
    CONSTANT(EISCONN),
    CONSTANT(ENETDOWN),
    CONSTANT(ENETUNREACH),
    CONSTANT(ENOBUFS),
    CONSTANT(ENOTSOCK),
    CONSTANT(ENOPROTOOPT),
    CONSTANT(EOPNOTSUPP),
    CONSTANT(EPROTOTYPE),
    CONSTANT(ETIMEDOUT),
    CONSTANT(ECONNRESET),
    CONSTANT(ELOOP),
    CONSTANT(ENAMETOOLONG),
    CONSTANT(ENOTCONN),
    CONSTANT(AF_UNSPEC),
    CONSTANT(AF_UNIX),
    CONSTANT(AF_INET),
    CONSTANT(AF_INET6),
    CONSTANT(AI_PASSIVE),
    CONSTANT(AI_CANONNAME),
    CONSTANT(AI_NUMERICHOST),
    CONSTANT(AI_V4MAPPED),
    CONSTANT(AI_ALL),
    CONSTANT(AI_ADDRCONFIG),
    CONSTANT(AI_NUMERICSERV),
    CONSTANT(EAI_BADFLAGS),
    CONSTANT(EAI_NONAME),
    CONSTANT(EAI_AGAIN),
    CONSTANT(EAI_FAIL),
    CONSTANT(EAI_FAMILY),
    CONSTANT(EAI_SOCKTYPE),
    CONSTANT(EAI_SERVICE),
    CONSTANT(EAI_MEMORY),
    CONSTANT(EAI_SYSTEM),
    CONSTANT(EAI_OVERFLOW),
    CONSTANT(SOCK_STREAM),
    CONSTANT(SOCK_DGRAM),
    CONSTANT(SOCK_CLOEXEC),
    CONSTANT(IFNAMSIZ),
    CONSTANT(SIG_BLOCK),
    CONSTANT(SIG_UNBLOCK),
    CONSTANT(SIG_SETMASK),
    CVAL("MSG_OOB", 0x0001),
    CVAL("MSG_PEEK", 0x0002),
    CVAL("MSG_WAITALL", 0x0100),
    CVAL("MSG_DONTROUTE", 0x0004),
    CVAL("SO_ACCEPTCONN", 30),
    CVAL("SO_ATTACH_BPF", 50),
    CVAL("SO_ATTACH_FILTER", 26),
    CVAL("SO_ATTACH_REUSEPORT_CBPF", 51),
    CVAL("SO_ATTACH_REUSEPORT_EBPF", 52),
    CVAL("SO_BINDTODEVICE", 25),
    CVAL("SO_BINDTOIFINDEX", 62),
    CVAL("SO_BPF_EXTENSIONS", 48),
    CVAL("SO_BROADCAST", 6),
    CVAL("SO_BSDCOMPAT", 14),
    CVAL("SO_BUSY_POLL", 46),
    CVAL("SO_CNX_ADVICE", 53),
    CVAL("SO_COOKIE", 57),
    CVAL("SO_DEBUG", 1),
    CVAL("SO_DETACH_BPF", 27),
    CVAL("SO_DETACH_FILTER", 27),
    CVAL("SO_DETACH_REUSEPORT_BPF", 68),
    CVAL("SO_DOMAIN", 39),
    CVAL("SO_DONTROUTE", 5),
    CVAL("SO_ERROR", 4),
    CVAL("SO_GET_FILTER", 26),
    CVAL("SO_INCOMING_CPU", 49),
    CVAL("SO_INCOMING_NAPI_ID", 56),
    CVAL("SO_KEEPALIVE", 9),
    CVAL("SO_LINGER", 13),
    CVAL("SO_LOCK_FILTER", 44),
    CVAL("SO_MARK", 36),
    CVAL("SO_MAX_PACING_RATE", 47),
    CVAL("SO_MEMINFO", 55),
    CVAL("SO_NOFCS", 43),
    CVAL("SO_NO_CHECK", 11),
    CVAL("SO_OOBINLINE", 10),
    CVAL("SO_PASSCRED", 16),
    CVAL("SO_PASSSEC", 34),
    CVAL("SO_PEEK_OFF", 42),
    CVAL("SO_PEERCRED", 17),
    CVAL("SO_PEERGROUPS", 59),
    CVAL("SO_PEERNAME", 28),
    CVAL("SO_PEERSEC", 31),
    CVAL("SO_PRIORITY", 12),
    CVAL("SO_PROTOCOL", 38),
    CVAL("SO_RCVBUF", 8),
    CVAL("SO_RCVBUFFORCE", 33),
    CVAL("SO_RCVLOWAT", 18),
    CVAL("SO_RCVTIMEO", 20),
    CVAL("SO_REUSEADDR", 2),
    CVAL("SO_REUSEPORT", 15),
    CVAL("SO_RXQ_OVFL", 40),
    CVAL("SO_SECURITY_AUTHENTICATION", 22),
    CVAL("SO_SECURITY_ENCRYPTION_NETWORK", 24),
    CVAL("SO_SECURITY_ENCRYPTION_TRANSPORT", 23),
    CVAL("SO_SELECT_ERR_QUEUE", 45),
    CVAL("SO_SNDBUF", 7),
    CVAL("SO_SNDBUFFORCE", 32),
    CVAL("SO_SNDLOWAT", 19),
    CVAL("SO_SNDTIMEO", 21),
    CVAL("SO_TIMESTAMP", 29),
    CVAL("SO_TIMESTAMPING", 37),
    CVAL("SO_TIMESTAMPNS", 35),
    CVAL("SO_TXTIME", 61),
    CVAL("SO_TYPE", 3),
    CVAL("SO_WIFI_STATUS", 41),
    CVAL("SO_ZEROCOPY", 60),
    CONSTANT(IGNBRK),
    CONSTANT(BRKINT),
    CONSTANT(IGNPAR),
    CONSTANT(PARMRK),
    CONSTANT(INPCK),
    CONSTANT(ISTRIP),
    CONSTANT(INLCR),
    CONSTANT(IGNCR),
    CONSTANT(ICRNL),
    CONSTANT(IXON),
    CONSTANT(IXANY),
    CONSTANT(IXOFF),
    CONSTANT(IMAXBEL),
    CONSTANT(IUTF8),
    CONSTANT(OPOST),
    CONSTANT(ONLCR),
    CONSTANT(OCRNL),
    CONSTANT(ONOCR),
    CONSTANT(ONLRET),
    CONSTANT(OFILL),
    CONSTANT(OFDEL),
    CONSTANT(CSIZE),
    CONSTANT(CS5),
    CONSTANT(CS6),
    CONSTANT(CS7),
    CONSTANT(CS8),
    CONSTANT(CSTOPB),
    CONSTANT(CREAD),
    CONSTANT(PARENB),
    CONSTANT(PARODD),
    CONSTANT(HUPCL),
    CONSTANT(CLOCAL),
    CONSTANT(ICANON),
    CONSTANT(ISIG),
    CONSTANT(ECHO),
    CONSTANT(ECHOE),
    CONSTANT(ECHOK),
    CONSTANT(ECHONL),
    CONSTANT(NOFLSH),
    CONSTANT(TOSTOP),
    CONSTANT(IEXTEN),
    CONSTANT(O_CLOEXEC),
    CONSTANT(O_NONBLOCK),
    CONSTANT(O_APPEND),
    CONSTANT(F_ULOCK),
    CONSTANT(F_LOCK),
    CONSTANT(F_TLOCK),
    CONSTANT(F_TEST),
    CONSTANT(POLLIN),
    CONSTANT(POLLOUT),
    CONSTANT(SOL_SOCKET),
    CONSTANT(SHUT_RD),
    CONSTANT(SHUT_WR),
    CONSTANT(SHUT_RDWR),
    CONSTANT(WNOHANG),
    CONSTANT(WUNTRACED),
};

char *getConstants(void) {
  const size_t count = sizeof(constants) / sizeof(constants[0]);
  size_t size = strlen("{\"names\":[],\"values\":[]}") + 1;
  for (size_t i = 0; i < count; i++) {
    size += strlen(constants[i].name) + 16;
  }

  char *json = malloc(size);
  if (json == NULL) {
    return NULL;
  }

  char *p = json;
  p += sprintf(p, "{\"names\":[");
  for (size_t i = 0; i < count; i++) {
    p += sprintf(p, "%s\"%s\"", i == 0 ? "" : ",", constants[i].name);
  }
  p += sprintf(p, "],\"values\":[");
  for (size_t i = 0; i < count; i++) {
    p += sprintf(p, "%s%d", i == 0 ? "" : ",", constants[i].value);
  }
  sprintf(p, "]}");
  return json;
}
WASM_EXPORT(getConstants)
