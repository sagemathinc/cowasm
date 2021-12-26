/*
If there is anything from the PARI C library that you want to
use, then you have to look in the pari header files and copy
the relevant part here.  Why?  Because directly importing
pari/pari.h into zig **crashes the zig compiler** -- presumably that's
a bug/shortcoming in the Zig's cImport?

---

We will probably need to *automate* copying this from pari header files,
if we get serious, since things like enums, etc. could change and cause
subtle bugs.
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
GEN  ker(GEN x);
long lgcols(GEN x); // number of columns of t_MAT with at least one column
long nbrows(GEN x); // number of columns of t_MAT with at least one column

GEN lift(GEN x);
long itos(GEN x); // x must be of type t_INT,

GEN matsize(GEN x);

GEN cgetg(long x, long y);

GEN zeromatcopy(long m, long n);
GEN stoi(long s);

GEN gmodulss(long x, long y);

GEN ellinit(GEN x, GEN D, long prec);
GEN ellap(GEN E, GEN p);
GEN ellan(GEN e, long n);
GEN ellanalyticrank(GEN e, GEN eps, long prec);
GEN ellanalyticrank_bitprec(GEN e, GEN eps, long bitprec);
GEN ellQ_get_N(GEN e);

enum { t_ELL_Rg = 0, t_ELL_Q, t_ELL_Qp, t_ELL_Fp, t_ELL_Fq, t_ELL_NF };

// These are copied from pari's headers/parigen.h, which says they are SUBJECT TO CHANGE.
// So watch out!
enum {
  t_INT    =  1,
  t_REAL   =  2,
  t_INTMOD =  3,
  t_FRAC   =  4,
  t_FFELT  =  5,
  t_COMPLEX=  6,
  t_PADIC  =  7,
  t_QUAD   =  8,
  t_POLMOD =  9,
  t_POL    =  10,
  t_SER    =  11,
  t_RFRAC  =  13,
  t_QFR    =  15,
  t_QFI    =  16,
  t_VEC    =  17,
  t_COL    =  18,
  t_MAT    =  19,
  t_LIST   =  20,
  t_STR    =  21,
  t_VECSMALL= 22,
  t_CLOSURE = 23,
  t_ERROR   = 24,
  t_INFINITY= 25
};
