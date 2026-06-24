#include "app.h"

extern void pari_state_install_default_recover(void);
extern int pari_state_raise(long value);

EXPORTED_SYMBOL
int provider_installs_pari_recover_callback(void) {
  pari_state_install_default_recover();
  return pari_state_raise(23) == 123;
}
