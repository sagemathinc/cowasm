static int pari_state_value = 0;
static void (*pari_recover_callback)(long) = 0;

static void default_pari_recover(long value) {
  pari_state_value = (int)value + 100;
}

void pari_state_install_default_recover(void) {
  pari_recover_callback = default_pari_recover;
}

int pari_state_callback_is_installed(void) {
  return pari_recover_callback != 0;
}

int pari_state_raise(long value) {
  pari_state_value = 0;
  if (!pari_recover_callback) {
    return -1;
  }
  pari_recover_callback(value);
  return pari_state_value;
}
