#ifndef COWASM_SIROCCO_FENV_COMPAT_H
#define COWASM_SIROCCO_FENV_COMPAT_H

#include <fenv.h>

/*
 * WASI exposes fenv operations as no-ops but does not define every directed
 * rounding macro. Sirocco's double interval code still compiles these paths,
 * so provide inert mode values for the standalone smoke.
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
