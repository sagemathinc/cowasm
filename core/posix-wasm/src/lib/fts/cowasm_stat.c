/*
// On WASI it seems that we don't have blocks; we only have size.
// In the official wasi-filesystem GitHub repo, somebody suggests
// getting st_blocks by dividing st_size by 512.  This does seem to work!
// The stat struct in wasi does have space of st_blocks; it's just that
// the libc implementation doesn't use it, as explained in this open issue:
//  https://github.com/WebAssembly/wasi-filesystem/issues/21
// The info is not in here zig/lib/libc/include/wasm-wasi-musl/wasi/api.h
// so this is impossible to fix in wasi-js (i.e. the wasi implementation
// on top of libc).
    buf->st_blocks = buf->st_size / 512;


*/

#include <sys/stat.h>

void set_st_blocks(struct stat *buf) {
  if (buf) {
    buf->st_blocks = buf->st_size / 512;
  }
}

int cowasm_fstat(int fildes, struct stat *buf) {
  int ret = fstat(fildes, buf);
  set_st_blocks(buf);
  return ret;
}

int cowasm_lstat(const char *restrict path, struct stat *restrict buf) {
  int ret = lstat(path, buf);
  set_st_blocks(buf);
  return ret;
}

int cowasm_stat(const char *restrict path, struct stat *restrict buf) {
  int ret = stat(path, buf);
  set_st_blocks(buf);
  return ret;
}

int cowasm_fstatat(int fd, const char *path, struct stat *buf, int flag) {
  int ret = fstatat(fd, path, buf, flag);
  set_st_blocks(buf);
  return ret;
}