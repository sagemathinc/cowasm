/*
This is meant to illustrate and test some things involving writing a C program
that runs using cowasm.

To build and run under CoWasm:

   make run-misc.wasm

To build and run natively:

   make run-misc.exe

*/

#define _GNU_SOURCE

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>

unsigned long long sum(int n) {
  unsigned long long s = 0;
  for (int i = 0; i <= n; i++) {
    s += i;
  }
  return s;
}

#include <sys/time.h>

long long time0() {
  struct timeval te;
  gettimeofday(&te, NULL);  // get current time
  long long milliseconds =
      te.tv_sec * 1000LL + te.tv_usec / 1000;  // calculate milliseconds
  // printf("milliseconds: %lld\n", milliseconds);
  return milliseconds;
}

#include <sys/stat.h>
extern char* user_from_uid(uid_t uid, int nouser);

#include <limits.h>
#include <errno.h>

#ifdef __cowasm__
int chmod(const char* path, mode_t mode);
int fchmod(int fd, mode_t mode);
int fchmodat(int fd, const char* path, mode_t mode, int flag);
#endif

static void test_seek_to_zero_overwrite(void) {
  const char* path = "/tmp/seek-to-zero-overwrite";
  const char* initial = "Hello World";
  const char* replacement = "HELLO";
  char contents[12] = {0};

  int fd = open(path, O_RDWR | O_CREAT | O_TRUNC, 0600);
  if (fd == -1 || write(fd, initial, 11) != 11 || lseek(fd, 0, SEEK_SET) != 0 ||
      write(fd, replacement, 5) != 5 || lseek(fd, 0, SEEK_SET) != 0 ||
      read(fd, contents, 11) != 11 || close(fd) != 0) {
    perror("seek-to-zero overwrite");
    unlink(path);
    exit(1);
  }
  unlink(path);

  if (strcmp(contents, "HELLO World") != 0) {
    fprintf(stderr, "seek-to-zero overwrite produced '%s'\n", contents);
    exit(1);
  }
  printf("seek-to-zero overwrite: %s\n", contents);
}

static void fail_permission_test(const char* operation) {
  fprintf(stderr, "%s failed: errno=%d (%s)\n", operation, errno,
          strerror(errno));
  fflush(stderr);
  exit(1);
}

static void expect_directory_write_denied(const char* path) {
  char child[PATH_MAX];
  if (snprintf(child, sizeof(child), "%s/child", path) >= sizeof(child)) {
    errno = ENAMETOOLONG;
    fail_permission_test("construct chmod child path");
  }
  errno = 0;
  if (mkdir(child, 0700) != -1 || (errno != EACCES && errno != EPERM)) {
    if (errno == 0) errno = EACCES;
    fail_permission_test("write in mode-000 directory");
  }
}

static void test_chmod_permissions(void) {
  char path[PATH_MAX];
  if (snprintf(path, sizeof(path), "/tmp/cowasm-chmod-%ld", (long)getpid()) >=
      sizeof(path)) {
    errno = ENAMETOOLONG;
    fail_permission_test("construct chmod test path");
  }
  if (mkdir(path, 0700) != 0) fail_permission_test("mkdir chmod test");

  if (chmod(path, 0000) != 0) fail_permission_test("chmod 0000");
  expect_directory_write_denied(path);
  if (chmod(path, 0700) != 0) fail_permission_test("chmod 0700");

  int fd = open(path, O_RDONLY);
  if (fd == -1) fail_permission_test("open directory for fchmod");
  if (fchmod(fd, 0000) != 0) fail_permission_test("fchmod 0000");
  if (close(fd) != 0) fail_permission_test("close fchmod directory");
  expect_directory_write_denied(path);
  if (chmod(path, 0700) != 0) fail_permission_test("restore after fchmod");

  if (fchmodat(AT_FDCWD, path, 0000, 0) != 0)
    fail_permission_test("fchmodat 0000");
  expect_directory_write_denied(path);
  if (chmod(path, 0700) != 0) fail_permission_test("restore after fchmodat");

  errno = 0;
  int missing_result = chmod("/tmp/cowasm-chmod-missing", 0700);
  if (missing_result != -1 || errno != ENOENT) {
    printf("chmod missing returned %d with errno=%d, expected errno=%d\n",
           missing_result, errno, ENOENT);
    fail_permission_test("chmod missing path errno");
  }
  if (rmdir(path) != 0) fail_permission_test("rmdir chmod test");
  printf("chmod permission enforcement: OK\n");
}

int main(int argc, char** argv) {
#ifdef __cowasm__
  printf("PAGE_SIZE=%d\n", PAGE_SIZE);
#endif

  for (int i = 0; i < argc; i++) {
    printf("argv[%d]=%s\n", i, argv[i]);
  }
#ifdef __cowasm__
  printf("hi %s\n", user_from_uid(500, 0));
#endif

  const char* path = "/tmp/temporary-file";

  int fd = open(path, O_RDWR | O_CREAT);
  printf("opened '%s' with fd=%d usings flags=%d\n", path, fd, O_RDWR | O_CREAT);
  if (fd == -1) {
    fprintf(stderr, "file open failed!\n");
    exit(1);
  }
  close(fd);
  unlink(path);

  test_seek_to_zero_overwrite();
  test_chmod_permissions();

  int n = 10000000;
  if (argc > 1) {
    n = atoi(argv[1]);
  }
  if (n < 0) {
    fprintf(stderr, "n must be nonnegative\n");
    exit(1);
  }
  long long t0 = time0();
  unsigned long long s = sum(n);
  long long delta = time0() - t0;
  printf("sum up to %d = %lld in %lldms\n", n, s, delta);
  return 0;
}
