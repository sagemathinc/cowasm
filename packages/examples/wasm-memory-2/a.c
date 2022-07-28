#define EXPORTED_SYMBOL __attribute__ ((visibility ("default")))

extern int deref_add1(const int* a);

int z = 0;

EXPORTED_SYMBOL
int next(int a) {
  z = a;
  return deref_add1(&z);
}

EXPORTED_SYMBOL
int add1(int a) { return a + 1; }

EXPORTED_SYMBOL
int add1_via_function_pointer(int a) {
  int (*fun_ptr)(int) = &add1;
  return (*fun_ptr)(a);
}

EXPORTED_SYMBOL
void callmany() {
  int i = 0;
  while (i < 100000000) {
    add1(i);
    i += 1;
  }
}

typedef int (*FUN_PTR)(int);
extern FUN_PTR pointer_to_add10();

EXPORTED_SYMBOL
int add10(int a) {
  FUN_PTR f = pointer_to_add10();
  return (*f)(a);
}