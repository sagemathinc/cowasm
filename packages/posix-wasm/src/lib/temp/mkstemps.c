#define _BSD_SOURCE
#include <stdlib.h>

int __mkostemps(char *, int, int);
int mkstemps(char *template, int len)
{
	return __mkostemps(template, len, 0);
}

