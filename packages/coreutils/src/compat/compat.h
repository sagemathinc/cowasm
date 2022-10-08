/*
 * compat.h
 * Local prototype definitions for functions put together in this library.
 * We don't have the full OpenBSD system headers, so use this header file
 * to be a placeholder.
 */

/*
 * Reference from Apple's archived OS X (now macOS documentation
 * we need to import this else we are going to get a "declaration expected at line
 * 29"
 *
 * including types.h allows us to fix erros in the mget declaration
 *
 */

/* Reference from Apple's archived OS X (now macOS documentation
we need to import this else we are going to get a "declaration expected at line
42" */
#if defined __APPLE__
#include "headers/simpleq.h"
#include "headers/mthio.h"
#define user_from_uid user_from_uid_orig
#define group_from_gid group_from_gid_orig
#include <grp.h>
#include <pwd.h>
#undef  user_from_uid
#undef group_from_gid
#else
#include <unistd.h>
#include <string.h>
#include <stddef.h>
#include <sys/types.h>
#include <sys/stat.h>
#endif


/* setmode.c */
mode_t getmode(const void *, mode_t);
void *setmode(const char *);

/* strtonum.c */
long long strtonum(const char *, long long, long long, const char **);

/* strmode.c */
void strmode(int, char *);

/* pwcache.c */
/* Darwin (OSX/macOS) requires the nouser and nogroup
to be added */

#if defined __APPLE__
const char *user_from_uid(uid_t, int nouser);
const char *group_from_gid(gid_t, int nogroup);
int uid_from_user(const char *, uid_t *);
int gid_from_group(const char *, gid_t *);
#else
const char *user_from_uid(uid_t, int);
const char *group_from_gid(gid_t, int);
int uid_from_user(const char *, uid_t *);
int gid_from_group(const char *, gid_t *);
#endif

/* logwtmp.c */
void logwtmp(const char *, const char *, const char *);

/* fmt_scaled.c */
int scan_scaled(char *, long long *);
int fmt_scaled(long long, char *);

/* getbsize.c */
char *getbsize(int *, long *);

/* devname.c */
char *devname(dev_t, mode_t);

/* merge.c */
int mergesort(void *, size_t, size_t, int (*)(const void *, const void *));

/* heapsort.c */
int heapsort(void *, size_t, size_t, int (*)(const void *, const void *));

/* recallocarray.c */
void *recallocarray(void *, size_t, size_t, size_t);

/* reallocarray.c */
#if defined __APPLE__
void *reallocarray(void *ptr, size_t nmemb, size_t size);
#endif

/* strlcat.c */
#if defined __linux
size_t strlcat(char *, const char *, size_t);
#endif

/* strlcpy.c */
#if defined __linux__
size_t strlcpy(char *, const char *, size_t);
#endif


/*
 * MAXBSIZE does not exist on Linux  however, since Darwin is an OS
 * that derives from FreesBD this does exist on Darwin, so we dont
 * need to get oursevels, an extra warning for redefining a macro,
 * however this is the explainaition for Linux because filesystem block size
 * limits are per filesystem and not consistently enforced across
 * the different filesystems.  If you look at e2fsprogs and its
 * header files, you'll see the max block size is defined as 65536
 * via (1 << EXT2_MAX_BLOCK_LOG_SIZE) where EXT2_MAX_BLOCK_LOG_SIZE
 * is 16.  On OpenBSD, MAXBSIZE is simply (64 * 1024), which is
 * 65536.  So we'll just define that here so as to avoid having
 * bsdutils depend on e2fsprogs to compile.
 */
#if !defined __APPLE__
#define MAXBSIZE (64 * 1024)
#endif

/*
 * fmt_scaled(3) specific flags.
 * This comes from lib/libutil/util.h in the OpenBSD source.
 */
#define FMT_SCALED_STRSIZE 7 /* minus sign, 4 digits, suffix, null byte */

/* Buffer sizes */
#define _PW_BUF_LEN sysconf(_SC_GETPW_R_SIZE_MAX)
#define _GR_BUF_LEN sysconf(_SC_GETGR_R_SIZE_MAX)

/* Linux spelling differences */
#if defined __linux__
#define S_ISTXT S_ISVTX
#endif

#include "posix-wasm.h"
// The following constants are all copied from grepping the musl/wasi headers.
#define TIOCGWINSZ       0x5413
#define S_ISTXT         S_ISVTX
#define LINE_MAX 4096