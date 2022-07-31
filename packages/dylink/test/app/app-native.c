// Used for testing natively (not under WASM)

#include <stdio.h>
#include <assert.h>

#include "app.c"

int main(void) {
  // do it
  printf("add10(2022) = %d\n", add10(2022));
  assert(add10(2022) == 2022 + 10);

  printf("add10b(2022) = %d\n", add10(2022));
  assert(add10b(2022) == 2022 + 10);

  printf("add389(2022) = %d\n", add389(2022));
  assert(add389(2022) == 2022 + 389);

  //printf("pynones_match() = %d\n", pynones_match());
  //assert(pynones_match()==1);

  printf("All tests passed!\n");
}
