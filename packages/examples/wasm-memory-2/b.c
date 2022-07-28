#define EXPORTED_SYMBOL __attribute__((visibility("default")))

int x = 5;
int y = 4;
int z = 1;

int add10(const int a) { return a + x + y + z; }

typedef int (*FUN_PTR)(int);

EXPORTED_SYMBOL
FUN_PTR pointer_to_add10() { return &add10; }

EXPORTED_SYMBOL
int b_xyz() {
return x + y + z;
}