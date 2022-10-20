#include "sha2.h"

#define SHA256_CTX SHA2_CTX

char *SHA256End(SHA2_CTX *, char *);
char *SHA256File(const char *, char *);
