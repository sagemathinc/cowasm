#include "app.h"

extern int pari_state_callback_is_installed(void);
extern void pari_state_install_default_recover(void);
extern int pari_state_raise(long value);

EXPORTED_SYMBOL
int consumer_does_not_share_provider_pari_state(void) {
  return !pari_state_callback_is_installed() && pari_state_raise(23) == -1;
}

EXPORTED_SYMBOL
int consumer_installs_local_pari_recover_callback(void) {
  pari_state_install_default_recover();
  return pari_state_callback_is_installed() && pari_state_raise(24) == 124;
}
