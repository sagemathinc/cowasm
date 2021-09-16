#include <sys/types.h> // size_t

typedef unsigned long ulong;
typedef ulong pari_sp;
typedef long *GEN;
GEN stoi(long x);
GEN gadd(GEN x, GEN y);
long itos(GEN x);
extern pari_sp avma;

void pari_init(size_t parisize, ulong maxprime);
GEN gp_read_str_multiline(const char *s, char *last);
void output(GEN x);
