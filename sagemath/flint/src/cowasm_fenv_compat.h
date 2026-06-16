#ifndef COWASM_FLINT_FENV_COMPAT_H
#define COWASM_FLINT_FENV_COMPAT_H

#include <fenv.h>

/*
 * WASI currently exposes fenv functions as no-ops without defining every
 * rounding-mode macro. FLINT's LLL code compiles these paths when fenv.h is
 * present, so provide inert mode values for unsupported modes.
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

int mkstemp(char *template);

#endif
