#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#ifdef COWASM_WASI_SDK_TEST
#include <setjmp.h>
#endif
//#include <assert.h>
#include "app.h"

static int x = 388;
int y = 1;
static int* y_ptr = &y;
extern int main_value;
static int* main_value_ptr = &main_value;
static int ctor_counter = 0;
extern size_t __memory_size(void);

__attribute__((constructor))
static void dynamic_library_ctor(void) {
  ctor_counter += 1;
}

static int compare_ints(const void* a, const void* b) {
  int left = *(const int*)a;
  int right = *(const int*)b;
  return (left > right) - (left < right);
}

EXPORTED_SYMBOL
PyObject* pynone_b() { return PyNone; }

EXPORTED_SYMBOL
int add10(const int a) { return a + 10; }

EXPORTED_SYMBOL
FUN_PTR pointer_to_add10() { return &add10; }

EXPORTED_SYMBOL
int add389(const int a) { return a + x + y; }

EXPORTED_SYMBOL
int add_side_data_relocation(const int a) { return a + *y_ptr; }

EXPORTED_SYMBOL
int add_main_data_relocation(const int a) { return a + *main_value_ptr; }

EXPORTED_SYMBOL
int ctor_count(const int unused) { return ctor_counter + unused * 0; }

EXPORTED_SYMBOL
int side_memory_size_is_positive(void) { return __memory_size() > 0; }

EXPORTED_SYMBOL
int side_realloc_preserves_prefix(void) {
  unsigned char* bytes = malloc(4);
  if (!bytes) {
    return 0;
  }
  for (size_t i = 0; i < 4; i++) {
    bytes[i] = (unsigned char)(0xa0 + i);
  }
  bytes = realloc(bytes, 16);
  if (!bytes) {
    return 0;
  }
  for (size_t i = 0; i < 4; i++) {
    if (bytes[i] != (unsigned char)(0xa0 + i)) {
      free(bytes);
      return 0;
    }
  }
  free(bytes);
  return 1;
}

EXPORTED_SYMBOL
int sorted_with_qsort(void) {
  int values[] = {5, -1, 8, 0, 3, 3, -4};
  int expected[] = {-4, -1, 0, 3, 3, 5, 8};
  size_t n = sizeof(values) / sizeof(values[0]);
  qsort(values, n, sizeof(values[0]), compare_ints);
  for (size_t i = 0; i < n; i++) {
    if (values[i] != expected[i]) {
      return 0;
    }
  }
  return 1;
}

#ifdef COWASM_WASI_SDK_TEST
static jmp_buf side_jmp;
extern int archive_callback_probe(long value);

static void jump_back_to_side_setjmp(void) {
  longjmp(side_jmp, 7);
}

EXPORTED_SYMBOL
int side_setjmp_recovery(void) {
  int status = setjmp(side_jmp);
  if (status == 0) {
    jump_back_to_side_setjmp();
    return 0;
  }
  return status == 7;
}

EXPORTED_SYMBOL
int archive_callback_from_pic_archive(void) {
  return archive_callback_probe(25) == 42;
}
#endif

// This illustrates calling a function that is
// defined in the main app.c.
extern int add5077(int a);

EXPORTED_SYMBOL
int add5077_using_func_from_main(int a) {
  // This uses WASI!
  printf("Print from dynamic-library! add5077_using_func_from_main a=%d\n", a);
  void* mem = malloc(32);
  printf("I got some memory here: %p\n", mem);
  free(mem);
  int n = add5077(a - strlen("four") + 4);
  // doesn't work due to issue with __assert_fail not being defined:
  // assert(n == a + 5077);
  return n;
}
