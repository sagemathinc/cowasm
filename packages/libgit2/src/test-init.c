/*
A little test of libgit2 + cowasm.

Make a git repo from scratch.
*/

#include <stdio.h>
#include "git2.h"

int main(int argc, char** argv) {
  if (argc < 2) {
    fprintf(stderr, "usage: %s path\n", argv[0]);
    return 1;
  }
  if (git_libgit2_init() < 0) {
    fprintf(stderr, "ERROR in git_libgit2_init: %s\n", git_error_last()->message);
    return 1;
  }

  git_repository* repo = NULL;
  int status = git_repository_init(&repo, argv[1], 0);
  if (status < 0) {
    fprintf(stderr, "ERROR in git_libgit2_init: %s\n", git_error_last()->message);
    return 1;
  }
  printf("git init succeeded: %s\n", argv[1]);
  return 0;
}