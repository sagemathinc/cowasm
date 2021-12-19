/*
If there is anything from the PARI C library that you want to
use, then you have to look in the pari header files and copy
the relevant part here.  Why?  Because directly importing
pari/pari.h into zig **crashes the zig compiler** -- presumably that's
a bug/shortcoming in the Zig's cImport?
*/

#include <sys/types.h>  // size_t

typedef size_t sizet;
typedef unsigned long ulong;
typedef ulong pari_sp;
typedef long *GEN;
extern pari_sp avma;

GEN stoi(long x);
GEN gadd(GEN x, GEN y);
char *GENtostr(GEN x);  // malloc'd and YOU must free it.
GEN gp_read_str_multiline(const char *s, char *last);
long itos(GEN x);
void output(GEN x);
void pari_init(size_t parisize, ulong maxprime);

long rank(GEN x);
GEN zeromatcopy(long m, long n);
GEN stoi(long s);

GEN gmodulss(long x, long y);