/*
zcc -I${DIST_WASM}/include ${DIST_WASM}/lib/libgit2.a test.c -o test -lwasi-emulated-mman
*/

#include <stdio.h>
#include <stdbool.h>
#include "git2.h"

int main(int argc, char *argv[]) {
  git_libgit2_init();

  git_repository *repo = NULL;
  /* With working directory: */
  int error = git_repository_init(&repo, "/tmp/__testlibgit__", false);
  if (error < 0) {
    printf("error %d\n", error);
    const git_error *e = git_error_last();
    if (e) {
      printf("Error %p\n", e);
    }
    exit(error);
  }
  git_libgit2_shutdown();
}