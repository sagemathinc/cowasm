#define EXPORTED_SYMBOL __attribute__ ((visibility ("default")))

extern int add1(int a);

EXPORTED_SYMBOL
int ptr_add1(const int* a) {
  int i = 0;
  while (i < 100000000) {
    add1(i);
    i += 1;
  }

  return add1(*a);
}

EXPORTED_SYMBOL
int add2(int a) { return a + 2; }

EXPORTED_SYMBOL
int add2_via_function_pointer(int a) {
  int (*fun_ptr)(int) = &add2;
  return (*fun_ptr)(a);
}