extern char cowasm_const_char_typeinfo[] __asm__("_ZTIPKc");

__attribute__((visibility("default"))) int c_add(int n) { return n + 11; }

__attribute__((visibility("default"))) int const_char_typeinfo_imported(void) {
  volatile char value = cowasm_const_char_typeinfo[0];
  (void)value;
  return 1;
}
