#define EXPORTED_SYMBOL __attribute__((visibility("default")))


int add10(const int a) { return a + 10; }

typedef int (*FUN_PTR)(int);

EXPORTED_SYMBOL
FUN_PTR pointer_to_add10() { return &add10; }

