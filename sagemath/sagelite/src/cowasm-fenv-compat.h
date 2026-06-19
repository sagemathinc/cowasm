#ifndef COWASM_SAGELITE_FENV_COMPAT_H
#define COWASM_SAGELITE_FENV_COMPAT_H

#include <fenv.h>

/*
 * WASI exposes fenv calls as no-ops, but its headers do not define every
 * directed rounding macro that Sagelite Cython sources declare from fenv.h.
 */
#ifndef FE_TONEAREST
#define FE_TONEAREST 0
#endif

#ifndef FE_DOWNWARD
#define FE_DOWNWARD FE_TONEAREST
#endif

#ifndef FE_UPWARD
#define FE_UPWARD FE_TONEAREST
#endif

#endif
