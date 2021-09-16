#include <sys/types.h>  // size_t


typedef size_t sizet;
typedef unsigned long ulong;
typedef ulong pari_sp;
typedef long *GEN;
extern pari_sp avma;

GEN stoi(long x);
GEN gadd(GEN x, GEN y);
char *GENtostr(GEN x); // malloc'd and YOU must free it.
GEN gp_read_str_multiline(const char *s, char *last);
long itos(GEN x);
void output(GEN x);
void pari_init(size_t parisize, ulong maxprime);
