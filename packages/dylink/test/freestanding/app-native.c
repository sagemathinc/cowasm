/*

Used for testing natively (not under WASM).  This is the native C analogue of
app.js.

Building everything both for WebAssembly and native is extremely valuable, since
it helps ensure that we are getting our dlopen/dlsym semantics correct. There
are many arbitrary choices so it's good to have a robust way to check.

*/

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

  printf("add5077_using_lib_using_main(389) = %d\n",
         add5077_using_lib_using_main(389));
  assert(add5077_using_lib_using_main(389) == 5077 + 389);

  printf("pynones_match() = %d\n", pynones_match());
  assert(pynones_match() == 1);

  printf("All tests passed!\n");
}
