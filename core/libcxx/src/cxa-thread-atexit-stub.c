int __cxa_thread_atexit_impl(void (*dtor)(void *), void *obj, void *dso_symbol) {
  (void)dtor;
  (void)obj;
  (void)dso_symbol;
  return 0;
}
