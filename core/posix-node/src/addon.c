#define _GNU_SOURCE

#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <grp.h>
#include <locale.h>
#include <net/if.h>
#include <netdb.h>
#include <node_api.h>
#include <poll.h>
#include <sched.h>
#include <signal.h>
#include <spawn.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <sys/statvfs.h>
#include <sys/types.h>
#include <sys/utsname.h>
#include <sys/wait.h>
#include <termios.h>
#include <unistd.h>
#include <utmp.h>
#include <uv.h>
#include <wchar.h>

extern char **environ;

static char buffer[4096];
static int sigint_state = 0;
static int raw_input_enabled = 0;

static void throw_error(napi_env env, const char *message) {
  napi_throw_error(env, NULL, message);
}

static void throw_errno(napi_env env, const char *message) {
  char code[32];
  snprintf(code, sizeof(code), "%d", errno);
  napi_throw_error(env, code, message);
}

static int get_args(napi_env env, napi_callback_info info, size_t n,
                    napi_value *argv) {
  size_t argc = n;
  if (napi_get_cb_info(env, info, &argc, argv, NULL, NULL) != napi_ok) {
    throw_error(env, "failed to parse arguments to function");
    return 0;
  }
  if (argc < n) {
    throw_error(env, "not enough arguments");
    return 0;
  }
  return 1;
}

static int get_i32(napi_env env, napi_value value, const char *name, int *out) {
  if (napi_get_value_int32(env, value, out) != napi_ok) {
    char message[160];
    snprintf(message, sizeof(message), "%s must be a number", name);
    throw_error(env, message);
    return 0;
  }
  return 1;
}

static int get_u32(napi_env env, napi_value value, const char *name,
                   uint32_t *out) {
  if (napi_get_value_uint32(env, value, out) != napi_ok) {
    char message[160];
    snprintf(message, sizeof(message), "%s must be a number", name);
    throw_error(env, message);
    return 0;
  }
  return 1;
}

static int get_bool(napi_env env, napi_value value, const char *name, bool *out) {
  if (napi_get_value_bool(env, value, out) != napi_ok) {
    char message[160];
    snprintf(message, sizeof(message), "%s must be bool", name);
    throw_error(env, message);
    return 0;
  }
  return 1;
}

static int get_i64_bigint(napi_env env, napi_value value, const char *name,
                          int64_t *out) {
  bool lossless = false;
  if (napi_get_value_bigint_int64(env, value, out, &lossless) != napi_ok) {
    char message[160];
    snprintf(message, sizeof(message), "%s must be a BigInt", name);
    throw_error(env, message);
    return 0;
  }
  return 1;
}

static int get_string_buf(napi_env env, napi_value value, const char *name,
                          char *out, size_t out_len) {
  size_t copied = 0;
  if (napi_get_value_string_utf8(env, value, out, out_len, &copied) != napi_ok) {
    char message[160];
    snprintf(message, sizeof(message), "%s must be a string", name);
    throw_error(env, message);
    return 0;
  }
  return 1;
}

static char *get_string_alloc(napi_env env, napi_value value, const char *name) {
  size_t len = 0;
  if (napi_get_value_string_utf8(env, value, NULL, 0, &len) != napi_ok) {
    char message[160];
    snprintf(message, sizeof(message), "%s must be a string", name);
    throw_error(env, message);
    return NULL;
  }
  char *result = malloc(len + 1);
  if (result == NULL) {
    throw_error(env, "out of memory");
    return NULL;
  }
  if (napi_get_value_string_utf8(env, value, result, len + 1, &len) != napi_ok) {
    free(result);
    char message[160];
    snprintf(message, sizeof(message), "%s must be a string", name);
    throw_error(env, message);
    return NULL;
  }
  return result;
}

static char **array_to_strings(napi_env env, napi_value value,
                               const char *name) {
  uint32_t len = 0;
  if (napi_get_array_length(env, value, &len) != napi_ok) {
    char message[180];
    snprintf(message, sizeof(message),
             "%s must be array of strings (failed to get length)", name);
    throw_error(env, message);
    return NULL;
  }
  char **result = calloc((size_t)len + 1, sizeof(char *));
  if (result == NULL) {
    throw_error(env, "out of memory");
    return NULL;
  }
  for (uint32_t i = 0; i < len; i++) {
    napi_value element;
    if (napi_get_element(env, value, i, &element) != napi_ok) {
      throw_error(env, "array element lookup failed");
      return result;
    }
    result[i] = get_string_alloc(env, element, name);
    if (result[i] == NULL) {
      return result;
    }
  }
  result[len] = NULL;
  return result;
}

static int *array_to_i32(napi_env env, napi_value value, const char *name,
                         uint32_t *len_out) {
  if (napi_get_array_length(env, value, len_out) != napi_ok) {
    char message[160];
    snprintf(message, sizeof(message), "%s must be array of ints", name);
    throw_error(env, message);
    return NULL;
  }
  int *result = malloc(sizeof(int) * (*len_out == 0 ? 1 : *len_out));
  if (result == NULL) {
    throw_error(env, "out of memory");
    return NULL;
  }
  for (uint32_t i = 0; i < *len_out; i++) {
    napi_value element;
    if (napi_get_element(env, value, i, &element) != napi_ok ||
        !get_i32(env, element, "element of array of ints", &result[i])) {
      return result;
    }
  }
  return result;
}

static void free_string_array(char **strings) {
  if (strings == NULL) {
    return;
  }
  for (size_t i = 0; strings[i] != NULL; i++) {
    free(strings[i]);
  }
  free(strings);
}

static napi_value make_i32(napi_env env, int32_t value) {
  napi_value result;
  napi_create_int32(env, value, &result);
  return result;
}

static napi_value make_u32(napi_env env, uint32_t value) {
  napi_value result;
  napi_create_uint32(env, value, &result);
  return result;
}

static napi_value make_bool(napi_env env, bool value) {
  napi_value result;
  napi_get_boolean(env, value, &result);
  return result;
}

static napi_value make_string(napi_env env, const char *value) {
  napi_value result;
  napi_create_string_utf8(env, value, NAPI_AUTO_LENGTH, &result);
  return result;
}

static napi_value make_buffer_copy(napi_env env, const void *data, size_t len) {
  napi_value result;
  napi_create_buffer_copy(env, len, data, NULL, &result);
  return result;
}

static void set_named(napi_env env, napi_value object, const char *name,
                      napi_value value) {
  napi_set_named_property(env, object, name, value);
}

static napi_value make_wait_result(napi_env env, int ret, int wstatus) {
  napi_value object;
  napi_create_object(env, &object);
  set_named(env, object, "wstatus", make_i32(env, wstatus));
  set_named(env, object, "ret", make_i32(env, ret));
  return object;
}

static int register_function(napi_env env, napi_value exports, const char *name,
                             napi_callback fn) {
  napi_value value;
  if (napi_create_function(env, NULL, 0, fn, NULL, &value) != napi_ok) {
    return 0;
  }
  return napi_set_named_property(env, exports, name, value) == napi_ok;
}

static napi_value js_getConstants(napi_env env, napi_callback_info info) {
  (void)info;
  napi_value object;
  napi_create_object(env, &object);
#define SETC(name) set_named(env, object, #name, make_u32(env, (uint32_t)(name)))
  SETC(AF_UNSPEC);
  SETC(AF_UNIX);
  SETC(AF_INET);
  SETC(AF_INET6);
  SETC(AI_PASSIVE);
  SETC(AI_CANONNAME);
  SETC(AI_NUMERICHOST);
  SETC(AI_V4MAPPED);
  SETC(AI_ALL);
  SETC(AI_ADDRCONFIG);
  SETC(AI_NUMERICSERV);
  SETC(EAI_BADFLAGS);
  SETC(EAI_NONAME);
  SETC(EAI_AGAIN);
  SETC(EAI_FAIL);
  SETC(EAI_FAMILY);
  SETC(EAI_SOCKTYPE);
  SETC(EAI_SERVICE);
  SETC(EAI_MEMORY);
  SETC(EAI_SYSTEM);
  SETC(EAI_OVERFLOW);
  SETC(SOCK_STREAM);
  SETC(SOCK_DGRAM);
  SETC(SOCK_CLOEXEC);
  SETC(O_CLOEXEC);
  SETC(O_NONBLOCK);
  SETC(O_APPEND);
  SETC(O_ASYNC);
  SETC(F_ULOCK);
  SETC(F_LOCK);
  SETC(F_TLOCK);
  SETC(F_TEST);
  SETC(WNOHANG);
  SETC(WUNTRACED);
  SETC(WCONTINUED);
  SETC(SIGINT);
  SETC(EADDRINUSE);
  SETC(EADDRNOTAVAIL);
  SETC(EAFNOSUPPORT);
  SETC(EAGAIN);
  SETC(EALREADY);
  SETC(ECONNREFUSED);
  SETC(EFAULT);
  SETC(EHOSTUNREACH);
  SETC(EINPROGRESS);
  SETC(EISCONN);
  SETC(ENETDOWN);
  SETC(ENETUNREACH);
  SETC(ENOBUFS);
  SETC(ENOTSOCK);
  SETC(ENOPROTOOPT);
  SETC(EOPNOTSUPP);
  SETC(EPROTOTYPE);
  SETC(ETIMEDOUT);
  SETC(ECONNRESET);
  SETC(ELOOP);
  SETC(ENAMETOOLONG);
  SETC(SHUT_RD);
  SETC(SHUT_WR);
  SETC(SHUT_RDWR);
  SETC(MSG_OOB);
  SETC(MSG_PEEK);
  SETC(MSG_WAITALL);
  SETC(MSG_DONTROUTE);
  SETC(SO_ACCEPTCONN);
  SETC(SO_BROADCAST);
  SETC(SO_DEBUG);
  SETC(SO_DONTROUTE);
  SETC(SO_ERROR);
  SETC(SO_KEEPALIVE);
  SETC(SO_LINGER);
  SETC(SO_OOBINLINE);
  SETC(SO_RCVBUF);
  SETC(SO_RCVLOWAT);
  SETC(SO_RCVTIMEO);
  SETC(SO_REUSEADDR);
  SETC(SO_REUSEPORT);
  SETC(SO_SNDBUF);
  SETC(SO_SNDLOWAT);
  SETC(SO_SNDTIMEO);
  SETC(SO_TIMESTAMP);
  SETC(SO_TYPE);
  SETC(SOL_SOCKET);
  SETC(ENOTCONN);
  SETC(IGNBRK);
  SETC(BRKINT);
  SETC(IGNPAR);
  SETC(PARMRK);
  SETC(INPCK);
  SETC(ISTRIP);
  SETC(INLCR);
  SETC(IGNCR);
  SETC(ICRNL);
  SETC(IXON);
  SETC(IXANY);
  SETC(IXOFF);
  SETC(IMAXBEL);
  SETC(IUTF8);
  SETC(OPOST);
  SETC(ONLCR);
  SETC(OCRNL);
  SETC(ONOCR);
  SETC(ONLRET);
  SETC(OFILL);
  SETC(OFDEL);
  SETC(CSIZE);
  SETC(CS5);
  SETC(CS6);
  SETC(CS7);
  SETC(CS8);
  SETC(CSTOPB);
  SETC(CREAD);
  SETC(PARENB);
  SETC(PARODD);
  SETC(HUPCL);
  SETC(CLOCAL);
  SETC(ICANON);
  SETC(ISIG);
  SETC(ECHO);
  SETC(ECHOE);
  SETC(ECHOK);
  SETC(ECHONL);
  SETC(NOFLSH);
  SETC(TOSTOP);
  SETC(IEXTEN);
  SETC(TCOOFF);
  SETC(TCOON);
  SETC(TCIOFF);
  SETC(TCION);
  SETC(TCIFLUSH);
  SETC(TCOFLUSH);
  SETC(TCIOFLUSH);
  SETC(TCSANOW);
  SETC(TCSADRAIN);
  SETC(TCSAFLUSH);
  SETC(E2BIG);
  SETC(EACCES);
  SETC(EBADF);
  SETC(EBUSY);
  SETC(ECHILD);
  SETC(EDEADLK);
  SETC(EEXIST);
  SETC(EFBIG);
  SETC(EINTR);
  SETC(EINVAL);
  SETC(EIO);
  SETC(EISDIR);
  SETC(EMFILE);
  SETC(EMLINK);
  SETC(ENFILE);
  SETC(ENODEV);
  SETC(ENOENT);
  SETC(ENOEXEC);
  SETC(ENOMEM);
  SETC(ENOSPC);
  SETC(ENOTBLK);
  SETC(ENOTDIR);
  SETC(ENOTTY);
  SETC(ENXIO);
  SETC(EPERM);
  SETC(EPIPE);
  SETC(EROFS);
  SETC(ESPIPE);
  SETC(ESRCH);
  SETC(ETXTBSY);
  SETC(EXDEV);
#undef SETC
  return object;
}

static napi_value js_wait(napi_env env, napi_callback_info info) {
  (void)info;
  int wstatus = 0;
  int ret = wait(&wstatus);
  if (ret == -1) {
    throw_errno(env, "error calling wait.wait");
    return NULL;
  }
  return make_wait_result(env, ret, wstatus);
}

static napi_value js_wait3(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  if (!get_args(env, info, 1, argv)) {
    return NULL;
  }
  int options = 0;
  if (!get_i32(env, argv[0], "options", &options)) {
    return NULL;
  }
  int wstatus = 0;
  int ret = wait3(&wstatus, options, NULL);
  if (ret == -1) {
    throw_errno(env, "error calling wait.wait3");
    return NULL;
  }
  return make_wait_result(env, ret, wstatus);
}

static napi_value js_waitpid(napi_env env, napi_callback_info info) {
  napi_value argv[2];
  if (!get_args(env, info, 2, argv)) {
    return NULL;
  }
  int pid = 0;
  int options = 0;
  if (!get_i32(env, argv[0], "pid", &pid) ||
      !get_i32(env, argv[1], "options", &options)) {
    return NULL;
  }
  int wstatus = 0;
  int ret = waitpid(pid, &wstatus, options);
  if (ret == -1) {
    throw_errno(env, "error calling wait.waitpid");
    return NULL;
  }
  return make_wait_result(env, ret, wstatus);
}

static napi_value js_chroot(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  if (!get_args(env, info, 1, argv) ||
      !get_string_buf(env, argv[0], "path", buffer, sizeof(buffer))) {
    return NULL;
  }
  if (chroot(buffer) == -1) {
    throw_errno(env, "chroot failed");
  }
  return NULL;
}

static napi_value js_getegid(napi_env env, napi_callback_info info) {
  (void)info;
  return make_u32(env, getegid());
}

static napi_value js_geteuid(napi_env env, napi_callback_info info) {
  (void)info;
  return make_u32(env, geteuid());
}

static napi_value js_gethostname(napi_env env, napi_callback_info info) {
  (void)info;
  if (gethostname(buffer, sizeof(buffer)) == -1) {
    throw_errno(env, "error in gethostname");
    return NULL;
  }
  buffer[sizeof(buffer) - 1] = 0;
  return make_string(env, buffer);
}

static napi_value js_getpgid(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  int pid = 0;
  if (!get_args(env, info, 1, argv) || !get_i32(env, argv[0], "pid", &pid)) {
    return NULL;
  }
  int pgid = getpgid(pid);
  if (pgid == -1) {
    throw_errno(env, "error in getpgid");
    return NULL;
  }
  return make_i32(env, pgid);
}

static napi_value js_getpgrp(napi_env env, napi_callback_info info) {
  (void)info;
  return make_i32(env, getpgrp());
}

static napi_value js_getppid(napi_env env, napi_callback_info info) {
  (void)info;
  return make_i32(env, getppid());
}

static napi_value js_setegid(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  uint32_t gid = 0;
  if (!get_args(env, info, 1, argv) || !get_u32(env, argv[0], "gid", &gid)) {
    return NULL;
  }
  if (setegid(gid) == -1) {
    throw_errno(env, "error in setegid");
  }
  return NULL;
}

static napi_value js_seteuid(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  uint32_t uid = 0;
  if (!get_args(env, info, 1, argv) || !get_u32(env, argv[0], "uid", &uid)) {
    return NULL;
  }
  if (seteuid(uid) == -1) {
    throw_errno(env, "error in seteuid");
  }
  return NULL;
}

static napi_value js_sethostname(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  if (!get_args(env, info, 1, argv) ||
      !get_string_buf(env, argv[0], "name", buffer, sizeof(buffer))) {
    return NULL;
  }
  if (sethostname(buffer, strlen(buffer)) == -1) {
    throw_errno(env, "error setting host name");
  }
  return NULL;
}

static napi_value js_setpgid(napi_env env, napi_callback_info info) {
  napi_value argv[2];
  int pid = 0;
  int pgid = 0;
  if (!get_args(env, info, 2, argv) || !get_i32(env, argv[0], "pid", &pid) ||
      !get_i32(env, argv[1], "pgid", &pgid)) {
    return NULL;
  }
  if (setpgid(pid, pgid) == -1) {
    throw_errno(env, "error in setpgid");
  }
  return NULL;
}

static napi_value js_setregid(napi_env env, napi_callback_info info) {
  napi_value argv[2];
  uint32_t rgid = 0;
  uint32_t egid = 0;
  if (!get_args(env, info, 2, argv) ||
      !get_u32(env, argv[0], "rgid", &rgid) ||
      !get_u32(env, argv[1], "egid", &egid)) {
    return NULL;
  }
  if (setregid(rgid, egid) == -1) {
    throw_errno(env, "error in setregid");
  }
  return NULL;
}

static napi_value js_setreuid(napi_env env, napi_callback_info info) {
  napi_value argv[2];
  uint32_t ruid = 0;
  uint32_t euid = 0;
  if (!get_args(env, info, 2, argv) ||
      !get_u32(env, argv[0], "ruid", &ruid) ||
      !get_u32(env, argv[1], "euid", &euid)) {
    return NULL;
  }
  if (setreuid(ruid, euid) == -1) {
    throw_errno(env, "error in setreuid");
  }
  return NULL;
}

static napi_value js_setsid(napi_env env, napi_callback_info info) {
  (void)info;
  int pid = setsid();
  if (pid == -1) {
    throw_errno(env, "error in setsid");
    return NULL;
  }
  return make_i32(env, pid);
}

static napi_value js_ttyname(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  int fd = 0;
  if (!get_args(env, info, 1, argv) || !get_i32(env, argv[0], "fd", &fd)) {
    return NULL;
  }
  char *name = ttyname(fd);
  if (name == NULL) {
    throw_errno(env, "invalid file descriptor");
    return NULL;
  }
  return make_string(env, name);
}

static napi_value js_alarm(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  uint32_t seconds = 0;
  if (!get_args(env, info, 1, argv) ||
      !get_u32(env, argv[0], "seconds", &seconds)) {
    return NULL;
  }
  return make_u32(env, alarm(seconds));
}

static napi_value js_sleep(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  uint32_t seconds = 0;
  if (!get_args(env, info, 1, argv) ||
      !get_u32(env, argv[0], "seconds", &seconds)) {
    return NULL;
  }
  return make_u32(env, sleep(seconds));
}

static napi_value js_usleep(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  uint32_t microseconds = 0;
  if (!get_args(env, info, 1, argv) ||
      !get_u32(env, argv[0], "microseconds", &microseconds)) {
    return NULL;
  }
  return make_i32(env, usleep(microseconds));
}

static int clear_cloexec(int fd) {
  int flags = fcntl(fd, F_GETFD, 0);
  if (flags < 0) {
    return flags;
  }
  return fcntl(fd, F_SETFD, flags & ~FD_CLOEXEC);
}

static napi_value js_execv(napi_env env, napi_callback_info info) {
  napi_value argv_js[2];
  if (!get_args(env, info, 2, argv_js)) {
    return NULL;
  }
  char *path = get_string_alloc(env, argv_js[0], "pathname");
  char **argv = array_to_strings(env, argv_js[1], "argv");
  if (path == NULL || argv == NULL) {
    free(path);
    free_string_array(argv);
    return NULL;
  }
  clear_cloexec(0);
  clear_cloexec(1);
  clear_cloexec(2);
  int ret = execv(path, argv);
  free(path);
  free_string_array(argv);
  if (ret == -1) {
    throw_errno(env, "error in execv");
    return NULL;
  }
  return make_i32(env, ret);
}

static napi_value js_execvp(napi_env env, napi_callback_info info) {
  napi_value argv_js[2];
  if (!get_args(env, info, 2, argv_js)) {
    return NULL;
  }
  char *file = get_string_alloc(env, argv_js[0], "file");
  char **argv = array_to_strings(env, argv_js[1], "argv");
  if (file == NULL || argv == NULL) {
    free(file);
    free_string_array(argv);
    return NULL;
  }
  clear_cloexec(0);
  clear_cloexec(1);
  clear_cloexec(2);
  int ret = execvp(file, argv);
  free(file);
  free_string_array(argv);
  if (ret == -1) {
    throw_errno(env, "error in execvp");
    return NULL;
  }
  return make_i32(env, ret);
}

static napi_value js_execve(napi_env env, napi_callback_info info) {
  napi_value argv_js[3];
  if (!get_args(env, info, 3, argv_js)) {
    return NULL;
  }
  char *path = get_string_alloc(env, argv_js[0], "pathname");
  char **argv = array_to_strings(env, argv_js[1], "argv");
  char **envp = array_to_strings(env, argv_js[2], "envp");
  if (path == NULL || argv == NULL || envp == NULL) {
    free(path);
    free_string_array(argv);
    free_string_array(envp);
    return NULL;
  }
  clear_cloexec(0);
  clear_cloexec(1);
  clear_cloexec(2);
  int ret = execve(path, argv, envp);
  free(path);
  free_string_array(argv);
  free_string_array(envp);
  if (ret == -1) {
    throw_errno(env, "error in execve");
    return NULL;
  }
  return make_i32(env, ret);
}

static napi_value js_fexecve(napi_env env, napi_callback_info info) {
  napi_value argv_js[3];
  int fd = 0;
  if (!get_args(env, info, 3, argv_js) || !get_i32(env, argv_js[0], "fd", &fd)) {
    return NULL;
  }
  char **argv = array_to_strings(env, argv_js[1], "argv");
  char **envp = array_to_strings(env, argv_js[2], "envp");
  if (argv == NULL || envp == NULL) {
    free_string_array(argv);
    free_string_array(envp);
    return NULL;
  }
  int ret = fexecve(fd, argv, envp);
  free_string_array(argv);
  free_string_array(envp);
  if (ret == -1) {
    throw_errno(env, "error in fexecve");
    return NULL;
  }
  return make_i32(env, ret);
}

static napi_value js_fork(napi_env env, napi_callback_info info) {
  (void)info;
  int pid = fork();
  if (pid == -1) {
    throw_errno(env, "error in fork");
    return NULL;
  }
  return make_i32(env, pid);
}

static napi_value js_close_event_loop(napi_env env, napi_callback_info info) {
  (void)info;
  uv_loop_t *loop = NULL;
  if (napi_get_uv_event_loop(env, &loop) != napi_ok || loop == NULL) {
    throw_error(env, "failed to close event loop");
    return NULL;
  }
  uv_loop_close(loop);
  return NULL;
}

static napi_value pipe_result(napi_env env, int pipefd[2]) {
  napi_value object;
  napi_create_object(env, &object);
  set_named(env, object, "readfd", make_i32(env, pipefd[0]));
  set_named(env, object, "writefd", make_i32(env, pipefd[1]));
  return object;
}

static napi_value js_pipe(napi_env env, napi_callback_info info) {
  (void)info;
  int pipefd[2];
  if (pipe(pipefd) == -1) {
    throw_errno(env, "error in pipe");
    return NULL;
  }
  return pipe_result(env, pipefd);
}

static napi_value js_pipe2(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  int flags = 0;
  if (!get_args(env, info, 1, argv) || !get_i32(env, argv[0], "flags", &flags)) {
    return NULL;
  }
  int pipefd[2];
  if (pipe2(pipefd, flags) == -1) {
    throw_errno(env, "error in pipe2");
    return NULL;
  }
  return pipe_result(env, pipefd);
}

static napi_value js_lockf(napi_env env, napi_callback_info info) {
  napi_value argv[3];
  int fd = 0;
  int cmd = 0;
  int64_t size = 0;
  if (!get_args(env, info, 3, argv) || !get_i32(env, argv[0], "fd", &fd) ||
      !get_i32(env, argv[1], "cmd", &cmd) ||
      !get_i64_bigint(env, argv[2], "size", &size)) {
    return NULL;
  }
  if (lockf(fd, cmd, (off_t)size) == -1) {
    throw_errno(env, "error in lockf");
  }
  return NULL;
}

static napi_value js_pause(napi_env env, napi_callback_info info) {
  (void)info;
  return make_i32(env, pause());
}

static napi_value js_getgrouplist(napi_env env, napi_callback_info info) {
  napi_value argv[2];
  uint32_t group = 0;
  if (!get_args(env, info, 2, argv) ||
      !get_string_buf(env, argv[0], "user", buffer, sizeof(buffer)) ||
      !get_u32(env, argv[1], "group", &group)) {
    return NULL;
  }
  int ngroups = 50;
  gid_t *groups = malloc(sizeof(gid_t) * ngroups);
  if (groups == NULL) {
    throw_error(env, "error allocating memory");
    return NULL;
  }
  int ret = getgrouplist(buffer, group, groups, &ngroups);
  if (ret == -1) {
    gid_t *larger = malloc(sizeof(gid_t) * ngroups);
    if (larger == NULL) {
      free(groups);
      throw_error(env, "error allocating memory");
      return NULL;
    }
    free(groups);
    groups = larger;
    if (getgrouplist(buffer, group, groups, &ngroups) == -1) {
      free(groups);
      throw_errno(env, "failed to get group list");
      return NULL;
    }
  }
  napi_value array;
  napi_create_array_with_length(env, ngroups, &array);
  for (int i = 0; i < ngroups; i++) {
    napi_set_element(env, array, i, make_u32(env, groups[i]));
  }
  free(groups);
  return array;
}

static napi_value js_dup(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  int oldfd = 0;
  if (!get_args(env, info, 1, argv) || !get_i32(env, argv[0], "oldfd", &oldfd)) {
    return NULL;
  }
  int newfd = dup(oldfd);
  if (newfd == -1) {
    throw_errno(env, "error in dup");
    return NULL;
  }
  return make_i32(env, newfd);
}

static napi_value js_dup2(napi_env env, napi_callback_info info) {
  napi_value argv[2];
  int oldfd = 0;
  int newfd = 0;
  if (!get_args(env, info, 2, argv) || !get_i32(env, argv[0], "oldfd", &oldfd) ||
      !get_i32(env, argv[1], "newfd", &newfd)) {
    return NULL;
  }
  int ret = dup2(oldfd, newfd);
  if (ret == -1) {
    throw_errno(env, "error in dup2");
    return NULL;
  }
  return make_i32(env, ret);
}

static napi_value js_chdir(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  if (!get_args(env, info, 1, argv) ||
      !get_string_buf(env, argv[0], "path", buffer, sizeof(buffer))) {
    return NULL;
  }
  if (chdir(buffer) == -1) {
    throw_errno(env, "chdir failed");
  }
  return NULL;
}

static napi_value js_getcwd(napi_env env, napi_callback_info info) {
  (void)info;
  if (getcwd(buffer, sizeof(buffer)) == NULL) {
    throw_errno(env, "unable to get current working directory");
    return NULL;
  }
  return make_string(env, buffer);
}

static napi_value js_getresuid(napi_env env, napi_callback_info info) {
  (void)info;
  uid_t ruid, euid, suid;
  if (getresuid(&ruid, &euid, &suid) == -1) {
    throw_errno(env, "getresuid failed");
    return NULL;
  }
  napi_value object;
  napi_create_object(env, &object);
  set_named(env, object, "ruid", make_u32(env, ruid));
  set_named(env, object, "euid", make_u32(env, euid));
  set_named(env, object, "suid", make_u32(env, suid));
  return object;
}

static napi_value js_getresgid(napi_env env, napi_callback_info info) {
  (void)info;
  gid_t rgid, egid, sgid;
  if (getresgid(&rgid, &egid, &sgid) == -1) {
    throw_errno(env, "getresgid failed");
    return NULL;
  }
  napi_value object;
  napi_create_object(env, &object);
  set_named(env, object, "rgid", make_u32(env, rgid));
  set_named(env, object, "egid", make_u32(env, egid));
  set_named(env, object, "sgid", make_u32(env, sgid));
  return object;
}

static napi_value js_setresuid(napi_env env, napi_callback_info info) {
  napi_value argv[3];
  uint32_t ruid, euid, suid;
  if (!get_args(env, info, 3, argv) || !get_u32(env, argv[0], "ruid", &ruid) ||
      !get_u32(env, argv[1], "euid", &euid) ||
      !get_u32(env, argv[2], "suid", &suid)) {
    return NULL;
  }
  if (setresuid(ruid, euid, suid) == -1) {
    throw_errno(env, "error in setresuid");
  }
  return NULL;
}

static napi_value js_setresgid(napi_env env, napi_callback_info info) {
  napi_value argv[3];
  uint32_t rgid, egid, sgid;
  if (!get_args(env, info, 3, argv) || !get_u32(env, argv[0], "rgid", &rgid) ||
      !get_u32(env, argv[1], "egid", &egid) ||
      !get_u32(env, argv[2], "sgid", &sgid)) {
    return NULL;
  }
  if (setresgid(rgid, egid, sgid) == -1) {
    throw_errno(env, "error in setresgid");
  }
  return NULL;
}

static napi_value js_if_indextoname(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  uint32_t ifindex = 0;
  if (!get_args(env, info, 1, argv) ||
      !get_u32(env, argv[0], "ifindex", &ifindex)) {
    return NULL;
  }
  char ifname[IFNAMSIZ];
  if (if_indextoname(ifindex, ifname) == NULL) {
    throw_error(env, "invalid index");
    return NULL;
  }
  return make_string(env, ifname);
}

static napi_value js_if_nametoindex(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  char ifname[IFNAMSIZ];
  if (!get_args(env, info, 1, argv) ||
      !get_string_buf(env, argv[0], "ifname", ifname, sizeof(ifname))) {
    return NULL;
  }
  unsigned int ifindex = if_nametoindex(ifname);
  if (ifindex == 0) {
    throw_error(env, "interface ifname does not exist");
    return NULL;
  }
  return make_u32(env, ifindex);
}

static napi_value js_if_nameindex(napi_env env, napi_callback_info info) {
  (void)info;
  struct if_nameindex *nameindex = if_nameindex();
  if (nameindex == NULL) {
    throw_errno(env, "if_nameindex failed");
    return NULL;
  }
  uint32_t len = 0;
  while (nameindex[len].if_index != 0) {
    len++;
  }
  napi_value array;
  napi_create_array_with_length(env, len, &array);
  for (uint32_t i = 0; i < len; i++) {
    napi_value entry;
    napi_create_array_with_length(env, 2, &entry);
    napi_set_element(env, entry, 0, make_u32(env, nameindex[i].if_index));
    napi_set_element(env, entry, 1, make_string(env, nameindex[i].if_name));
    napi_set_element(env, array, i, entry);
  }
  if_freenameindex(nameindex);
  return array;
}

static void handle_sigint(int sig) {
  (void)sig;
  sigint_state = 1;
}

static napi_value js_watchForSignal(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  int which = 0;
  if (!get_args(env, info, 1, argv) ||
      !get_i32(env, argv[0], "signal", &which)) {
    return NULL;
  }
  if (which != SIGINT) {
    throw_errno(env, "only SIGINT is currently supported");
    return NULL;
  }
  signal(SIGINT, handle_sigint);
  return NULL;
}

static napi_value js_getSignalState(napi_env env, napi_callback_info info) {
  (void)info;
  napi_value state = make_bool(env, sigint_state != 0);
  sigint_state = 0;
  return state;
}

static napi_value create_hostent(napi_env env, struct hostent *hostent) {
  napi_value object;
  napi_create_object(env, &object);
  set_named(env, object, "h_name", make_string(env, hostent->h_name));
  set_named(env, object, "h_addrtype", make_i32(env, hostent->h_addrtype));
  set_named(env, object, "h_length", make_i32(env, hostent->h_length));

  uint32_t aliases_len = 0;
  while (hostent->h_aliases != NULL && hostent->h_aliases[aliases_len] != NULL) {
    aliases_len++;
  }
  napi_value aliases;
  napi_create_array_with_length(env, aliases_len, &aliases);
  for (uint32_t i = 0; i < aliases_len; i++) {
    napi_set_element(env, aliases, i, make_string(env, hostent->h_aliases[i]));
  }
  set_named(env, object, "h_aliases", aliases);

  uint32_t addr_len = 0;
  while (hostent->h_addr_list != NULL && hostent->h_addr_list[addr_len] != NULL) {
    addr_len++;
  }
  napi_value addrs;
  napi_create_array_with_length(env, addr_len, &addrs);
  for (uint32_t i = 0; i < addr_len; i++) {
    char dst[INET6_ADDRSTRLEN];
    const char *converted =
        inet_ntop(hostent->h_addrtype, hostent->h_addr_list[i], dst, sizeof(dst));
    napi_set_element(env, addrs, i, make_string(env, converted ? converted : ""));
  }
  set_named(env, object, "h_addr_list", addrs);
  return object;
}

static napi_value js_gethostbyname(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  if (!get_args(env, info, 1, argv) ||
      !get_string_buf(env, argv[0], "name", buffer, sizeof(buffer))) {
    return NULL;
  }
  struct hostent *hostent = gethostbyname(buffer);
  if (hostent == NULL) {
    throw_error(env, "error calling gethostbyname");
    return NULL;
  }
  return create_hostent(env, hostent);
}

static napi_value js_gethostbyaddr(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  if (!get_args(env, info, 1, argv) ||
      !get_string_buf(env, argv[0], "addr", buffer, sizeof(buffer))) {
    return NULL;
  }
  unsigned char addr[sizeof(struct in6_addr)];
  int family = strchr(buffer, ':') ? AF_INET6 : AF_INET;
  size_t len = family == AF_INET ? sizeof(struct in_addr) : sizeof(struct in6_addr);
  if (inet_pton(family, buffer, addr) != 1) {
    throw_error(env, "error parsing address");
    return NULL;
  }
  struct hostent *hostent = gethostbyaddr(addr, len, family);
  if (hostent == NULL) {
    throw_error(env, "error calling gethostbyaddr");
    return NULL;
  }
  return create_hostent(env, hostent);
}

static napi_value sockaddr_to_object(napi_env env, struct sockaddr *addr,
                                     socklen_t addrlen) {
  napi_value object;
  napi_create_object(env, &object);
  set_named(env, object, "sa_len", make_u32(env, addrlen));
  set_named(env, object, "sa_family", make_i32(env, addr->sa_family));
  const char *raw = (const char *)addr;
  size_t data_len = addrlen > 2 ? addrlen - 2 : 0;
  set_named(env, object, "sa_data", make_buffer_copy(env, raw + 2, data_len));
  return object;
}

static napi_value create_addrinfo(napi_env env, struct addrinfo *addrinfo) {
  napi_value object = sockaddr_to_object(env, addrinfo->ai_addr, addrinfo->ai_addrlen);
  set_named(env, object, "ai_flags", make_i32(env, addrinfo->ai_flags));
  set_named(env, object, "ai_family", make_i32(env, addrinfo->ai_family));
  set_named(env, object, "ai_socktype", make_i32(env, addrinfo->ai_socktype));
  set_named(env, object, "ai_protocol", make_i32(env, addrinfo->ai_protocol));
  set_named(env, object, "ai_addrlen", make_u32(env, addrinfo->ai_addrlen));
  if (addrinfo->ai_canonname != NULL) {
    set_named(env, object, "ai_canonname", make_string(env, addrinfo->ai_canonname));
  }
  return object;
}

static napi_value js_getaddrinfo(napi_env env, napi_callback_info info) {
  napi_value argv[6];
  if (!get_args(env, info, 6, argv)) {
    return NULL;
  }
  char *node = get_string_alloc(env, argv[0], "node");
  char *service = get_string_alloc(env, argv[1], "service");
  int flags, family, socktype, protocol;
  if (node == NULL || service == NULL ||
      !get_i32(env, argv[2], "flags", &flags) ||
      !get_i32(env, argv[3], "family", &family) ||
      !get_i32(env, argv[4], "socktype", &socktype) ||
      !get_i32(env, argv[5], "protocol", &protocol)) {
    free(node);
    free(service);
    return NULL;
  }
  struct addrinfo hints;
  memset(&hints, 0, sizeof(hints));
  hints.ai_flags = flags;
  hints.ai_family = family;
  hints.ai_socktype = socktype;
  hints.ai_protocol = protocol;
  struct addrinfo *res = NULL;
  int ret = getaddrinfo(node, service, &hints, &res);
  free(node);
  free(service);
  if (ret != 0) {
    char code[32];
    snprintf(code, sizeof(code), "%d", ret);
    napi_throw_error(env, code, "error calling getaddrinfo");
    return NULL;
  }
  uint32_t len = 0;
  for (struct addrinfo *p = res; p != NULL; p = p->ai_next) {
    len++;
  }
  napi_value array;
  napi_create_array_with_length(env, len, &array);
  uint32_t i = 0;
  for (struct addrinfo *p = res; p != NULL; p = p->ai_next) {
    napi_set_element(env, array, i++, create_addrinfo(env, p));
  }
  freeaddrinfo(res);
  return array;
}

static napi_value js_gai_strerror(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  int errcode = 0;
  if (!get_args(env, info, 1, argv) ||
      !get_i32(env, argv[0], "errcode", &errcode)) {
    return NULL;
  }
  if (errcode == 0) {
    return make_string(env, "Unknown error");
  }
  return make_string(env, gai_strerror(errcode));
}

static napi_value js_hstrerror(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  int errcode = 0;
  if (!get_args(env, info, 1, argv) ||
      !get_i32(env, argv[0], "errcode", &errcode)) {
    return NULL;
  }
  return make_string(env, hstrerror(errcode));
}

static void fill_sockaddr(struct sockaddr_storage *storage, int sa_family,
                          const void *sa_data, size_t sa_data_len) {
  memset(storage, 0, sizeof(*storage));
  struct sockaddr *addr = (struct sockaddr *)storage;
  addr->sa_family = (sa_family_t)sa_family;
  size_t copy_len = sa_data_len > sizeof(*storage) - 2 ? sizeof(*storage) - 2
                                                        : sa_data_len;
  memcpy(((char *)addr) + 2, sa_data, copy_len);
}

static napi_value js_socket(napi_env env, napi_callback_info info) {
  napi_value argv[3];
  int family, socktype, protocol;
  if (!get_args(env, info, 3, argv) ||
      !get_i32(env, argv[0], "family", &family) ||
      !get_i32(env, argv[1], "socktype", &socktype) ||
      !get_i32(env, argv[2], "protocol", &protocol)) {
    return NULL;
  }
  int fd = socket(family, socktype, protocol);
  if (fd == -1) {
    throw_errno(env, "error creating socket");
    return NULL;
  }
  return make_i32(env, fd);
}

static napi_value js_bind(napi_env env, napi_callback_info info) {
  napi_value argv[4];
  int socket_fd, sa_len, sa_family;
  void *data = NULL;
  size_t data_len = 0;
  if (!get_args(env, info, 4, argv) ||
      !get_i32(env, argv[0], "socket", &socket_fd) ||
      !get_i32(env, argv[1], "sa_len", &sa_len) ||
      !get_i32(env, argv[2], "sa_family", &sa_family) ||
      napi_get_buffer_info(env, argv[3], &data, &data_len) != napi_ok) {
    throw_errno(env, "error reading sa_data");
    return NULL;
  }
  struct sockaddr_storage storage;
  fill_sockaddr(&storage, sa_family, data, data_len);
  if (bind(socket_fd, (struct sockaddr *)&storage, (socklen_t)sa_len) == -1) {
    throw_errno(env, "error calling bind");
    return NULL;
  }
  return NULL;
}

static napi_value js_connect(napi_env env, napi_callback_info info) {
  napi_value argv[4];
  int socket_fd, sa_len, sa_family;
  void *data = NULL;
  size_t data_len = 0;
  if (!get_args(env, info, 4, argv) ||
      !get_i32(env, argv[0], "socket", &socket_fd) ||
      !get_i32(env, argv[1], "sa_len", &sa_len) ||
      !get_i32(env, argv[2], "sa_family", &sa_family) ||
      napi_get_buffer_info(env, argv[3], &data, &data_len) != napi_ok) {
    throw_errno(env, "error reading sa_data");
    return NULL;
  }
  struct sockaddr_storage storage;
  fill_sockaddr(&storage, sa_family, data, data_len);
  if (connect(socket_fd, (struct sockaddr *)&storage, (socklen_t)sa_len) == -1) {
    throw_errno(env, "error calling connect");
    return NULL;
  }
  return NULL;
}

static napi_value js_getsockname(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  int socket_fd = 0;
  if (!get_args(env, info, 1, argv) ||
      !get_i32(env, argv[0], "socket", &socket_fd)) {
    return NULL;
  }
  struct sockaddr_storage storage;
  socklen_t addrlen = sizeof(storage);
  if (getsockname(socket_fd, (struct sockaddr *)&storage, &addrlen) != 0) {
    throw_errno(env, "error calling getsockname");
    return NULL;
  }
  return sockaddr_to_object(env, (struct sockaddr *)&storage, addrlen);
}

static napi_value js_getpeername(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  int socket_fd = 0;
  if (!get_args(env, info, 1, argv) ||
      !get_i32(env, argv[0], "socket", &socket_fd)) {
    return NULL;
  }
  struct sockaddr_storage storage;
  socklen_t addrlen = sizeof(storage);
  if (getpeername(socket_fd, (struct sockaddr *)&storage, &addrlen) != 0) {
    throw_errno(env, "error calling getpeername");
    return NULL;
  }
  return sockaddr_to_object(env, (struct sockaddr *)&storage, addrlen);
}

static napi_value js_recv(napi_env env, napi_callback_info info) {
  napi_value argv[3];
  int socket_fd, flags;
  void *data = NULL;
  size_t len = 0;
  if (!get_args(env, info, 3, argv) ||
      !get_i32(env, argv[0], "socket_fd", &socket_fd) ||
      napi_get_buffer_info(env, argv[1], &data, &len) != napi_ok ||
      !get_i32(env, argv[2], "flags", &flags)) {
    throw_errno(env, "error reading buffer");
    return NULL;
  }
  ssize_t ret = recv(socket_fd, data, len, flags);
  if (ret < 0) {
    throw_errno(env, "error receiving data from socket");
    return NULL;
  }
  return make_i32(env, (int32_t)ret);
}

static napi_value js_send(napi_env env, napi_callback_info info) {
  napi_value argv[3];
  int socket_fd, flags;
  void *data = NULL;
  size_t len = 0;
  if (!get_args(env, info, 3, argv) ||
      !get_i32(env, argv[0], "socket_fd", &socket_fd) ||
      napi_get_buffer_info(env, argv[1], &data, &len) != napi_ok ||
      !get_i32(env, argv[2], "flags", &flags)) {
    throw_errno(env, "error reading buffer");
    return NULL;
  }
  ssize_t ret = send(socket_fd, data, len, flags);
  if (ret < 0) {
    throw_errno(env, "error sending data to socket");
    return NULL;
  }
  return make_i32(env, (int32_t)ret);
}

static napi_value js_shutdown(napi_env env, napi_callback_info info) {
  napi_value argv[2];
  int socket_fd, how;
  if (!get_args(env, info, 2, argv) ||
      !get_i32(env, argv[0], "socket_fd", &socket_fd) ||
      !get_i32(env, argv[1], "how", &how)) {
    return NULL;
  }
  if (shutdown(socket_fd, how) != 0) {
    throw_errno(env, "error calling shutdown on network socket");
  }
  return NULL;
}

static napi_value js_listen(napi_env env, napi_callback_info info) {
  napi_value argv[2];
  int socket_fd, backlog;
  if (!get_args(env, info, 2, argv) ||
      !get_i32(env, argv[0], "socket_fd", &socket_fd) ||
      !get_i32(env, argv[1], "backlog", &backlog)) {
    return NULL;
  }
  if (listen(socket_fd, backlog) != 0) {
    throw_errno(env, "error calling listen on network socket");
  }
  return NULL;
}

static napi_value js_accept(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  int socket_fd = 0;
  if (!get_args(env, info, 1, argv) ||
      !get_i32(env, argv[0], "socket_fd", &socket_fd)) {
    return NULL;
  }
  struct sockaddr_storage storage;
  socklen_t addrlen = sizeof(storage);
  int fd = accept(socket_fd, (struct sockaddr *)&storage, &addrlen);
  if (fd == -1) {
    throw_errno(env, "error calling accept on network socket");
    return NULL;
  }
  napi_value object;
  napi_create_object(env, &object);
  set_named(env, object, "sockaddr",
            sockaddr_to_object(env, (struct sockaddr *)&storage, addrlen));
  set_named(env, object, "fd", make_i32(env, fd));
  return object;
}

static napi_value js_getsockopt(napi_env env, napi_callback_info info) {
  napi_value argv[4];
  int socket_fd, level, option_name;
  uint32_t option_len_u32;
  if (!get_args(env, info, 4, argv) ||
      !get_i32(env, argv[0], "socket_fd", &socket_fd) ||
      !get_i32(env, argv[1], "level", &level) ||
      !get_i32(env, argv[2], "option_name", &option_name) ||
      !get_u32(env, argv[3], "option_len", &option_len_u32)) {
    return NULL;
  }
  socklen_t option_len = option_len_u32;
  void *option_value = malloc(option_len);
  if (option_value == NULL) {
    throw_error(env, "error allocating memory");
    return NULL;
  }
  if (getsockopt(socket_fd, level, option_name, option_value, &option_len) == -1) {
    free(option_value);
    throw_errno(env, "error calling getsockopt on network socket");
    return NULL;
  }
  napi_value result = make_buffer_copy(env, option_value, option_len);
  free(option_value);
  return result;
}

static napi_value js_setsockopt(napi_env env, napi_callback_info info) {
  napi_value argv[4];
  int socket_fd, level, option_name;
  void *option_value = NULL;
  size_t option_len = 0;
  if (!get_args(env, info, 4, argv) ||
      !get_i32(env, argv[0], "socket_fd", &socket_fd) ||
      !get_i32(env, argv[1], "level", &level) ||
      !get_i32(env, argv[2], "option_name", &option_name) ||
      napi_get_buffer_info(env, argv[3], &option_value, &option_len) != napi_ok) {
    throw_errno(env, "error reading buffer");
    return NULL;
  }
  if (setsockopt(socket_fd, level, option_name, option_value,
                 (socklen_t)option_len) == -1) {
    throw_errno(env, "error calling setsockopt on network socket");
    return NULL;
  }
  return NULL;
}

static napi_value js_pollSocket(napi_env env, napi_callback_info info) {
  napi_value argv[3];
  int socket_fd, events, timeout_ms;
  if (!get_args(env, info, 3, argv) ||
      !get_i32(env, argv[0], "socket_fd", &socket_fd) ||
      !get_i32(env, argv[1], "events", &events) ||
      !get_i32(env, argv[2], "timeout_ms", &timeout_ms)) {
    return NULL;
  }
  struct pollfd fds[1];
  fds[0].fd = socket_fd;
  fds[0].events = (short)events;
  fds[0].revents = 0;
  if (poll(fds, 1, timeout_ms) == -1) {
    throw_errno(env, "error polling for a socket");
    return NULL;
  }
  return NULL;
}

static napi_value js_login_tty(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  int fd = 0;
  if (!get_args(env, info, 1, argv) || !get_i32(env, argv[0], "fd", &fd)) {
    return NULL;
  }
  if (login_tty(fd) == -1) {
    throw_errno(env, "error in login_tty");
  }
  return NULL;
}

static char *statvfs_json(const struct statvfs *buf) {
  char *json = malloc(512);
  if (json == NULL) {
    return NULL;
  }
  snprintf(json, 512,
           "{\"f_bsize\":%lu,\"f_frsize\":%lu,\"f_blocks\":%lu,"
           "\"f_bfree\":%lu,\"f_bavail\":%lu,\"f_files\":%lu,"
           "\"f_ffree\":%lu,\"f_favail\":%lu,\"f_fsid\":%lu,"
           "\"f_flag\":%lu,\"f_namemax\":%lu}",
           (unsigned long)buf->f_bsize, (unsigned long)buf->f_frsize,
           (unsigned long)buf->f_blocks, (unsigned long)buf->f_bfree,
           (unsigned long)buf->f_bavail, (unsigned long)buf->f_files,
           (unsigned long)buf->f_ffree, (unsigned long)buf->f_favail,
           (unsigned long)buf->f_fsid, (unsigned long)buf->f_flag,
           (unsigned long)buf->f_namemax);
  return json;
}

static napi_value js_statvfs(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  if (!get_args(env, info, 1, argv) ||
      !get_string_buf(env, argv[0], "path", buffer, sizeof(buffer))) {
    return NULL;
  }
  struct statvfs buf;
  if (statvfs(buffer, &buf) == -1) {
    throw_errno(env, "statsvfs failed -- invalid input");
    return NULL;
  }
  char *json = statvfs_json(&buf);
  if (json == NULL) {
    throw_error(env, "statsvfs failed -- problem converting output");
    return NULL;
  }
  napi_value result = make_string(env, json);
  free(json);
  return result;
}

static napi_value js_fstatvfs(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  int fd = 0;
  if (!get_args(env, info, 1, argv) || !get_i32(env, argv[0], "fd", &fd)) {
    return NULL;
  }
  struct statvfs buf;
  if (fstatvfs(fd, &buf) == -1) {
    throw_errno(env, "fstatsvfs failed -- invalid input");
    return NULL;
  }
  char *json = statvfs_json(&buf);
  if (json == NULL) {
    throw_error(env, "fstatsvfs failed -- problem converting output");
    return NULL;
  }
  napi_value result = make_string(env, json);
  free(json);
  return result;
}

static napi_value js_ctermid(napi_env env, napi_callback_info info) {
  (void)info;
  char *s = ctermid(NULL);
  if (s == NULL) {
    throw_error(env, "failed to get ctermid");
    return NULL;
  }
  return make_string(env, s);
}

static napi_value js_tcgetattr(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  int fd = 0;
  if (!get_args(env, info, 1, argv) || !get_i32(env, argv[0], "fd", &fd)) {
    return NULL;
  }
  struct termios tio;
  if (tcgetattr(fd, &tio) != 0) {
    throw_errno(env, "tcgetattr - failed");
    return NULL;
  }
  napi_value object;
  napi_create_object(env, &object);
  set_named(env, object, "c_iflag", make_u32(env, tio.c_iflag));
  set_named(env, object, "c_oflag", make_u32(env, tio.c_oflag));
  set_named(env, object, "c_cflag", make_u32(env, tio.c_cflag));
  set_named(env, object, "c_lflag", make_u32(env, tio.c_lflag));
  return object;
}

static int get_u32_prop(napi_env env, napi_value object, const char *name,
                        uint32_t *out) {
  napi_value value;
  if (napi_get_named_property(env, object, name, &value) != napi_ok) {
    throw_error(env, "required property missing");
    return 0;
  }
  return get_u32(env, value, name, out);
}

static napi_value js_tcsetattr(napi_env env, napi_callback_info info) {
  napi_value argv[3];
  int fd = 0;
  int optional_actions = 0;
  if (!get_args(env, info, 3, argv) || !get_i32(env, argv[0], "fd", &fd) ||
      !get_i32(env, argv[1], "optional_actions", &optional_actions)) {
    return NULL;
  }
  struct termios tio;
  if (tcgetattr(fd, &tio) != 0) {
    throw_errno(env, "tcgetattr - failed");
    return NULL;
  }
  uint32_t v;
  if (!get_u32_prop(env, argv[2], "c_iflag", &v)) return NULL;
  tio.c_iflag = v;
  if (!get_u32_prop(env, argv[2], "c_oflag", &v)) return NULL;
  tio.c_oflag = v;
  if (!get_u32_prop(env, argv[2], "c_cflag", &v)) return NULL;
  tio.c_cflag = v;
  if (!get_u32_prop(env, argv[2], "c_lflag", &v)) return NULL;
  tio.c_lflag = v;
  if (tcsetattr(fd, optional_actions, &tio) != 0) {
    throw_errno(env, "tcsetattr - failed");
  }
  return NULL;
}

static napi_value js_fcntlSetFlags(napi_env env, napi_callback_info info) {
  napi_value argv[2];
  int fd = 0;
  int flags = 0;
  if (!get_args(env, info, 2, argv) || !get_i32(env, argv[0], "fd", &fd) ||
      !get_i32(env, argv[1], "flags", &flags)) {
    return NULL;
  }
  if (fcntl(fd, F_SETFL, flags) < 0) {
    throw_errno(env, "fcntlSetFlags - failed");
  }
  return NULL;
}

static napi_value js_fcntlGetFlags(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  int fd = 0;
  if (!get_args(env, info, 1, argv) || !get_i32(env, argv[0], "fd", &fd)) {
    return NULL;
  }
  int flags = fcntl(fd, F_GETFL, 0);
  if (flags < 0) {
    throw_errno(env, "fcntlGetFlags - failed");
    return NULL;
  }
  return make_i32(env, flags);
}

static int make_stdin_blocking(void) {
  int flags = fcntl(STDIN_FILENO, F_GETFL, 0);
  if (flags < 0) return -1;
  return fcntl(STDIN_FILENO, F_SETFL, flags & ~O_NONBLOCK);
}

static int enable_raw_input(void) {
  if (raw_input_enabled) return 0;
  if (make_stdin_blocking() < 0) return -1;
  struct termios raw;
  if (tcgetattr(STDIN_FILENO, &raw) != 0) return -1;
  raw.c_lflag &= ~ICANON;
  if (tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw) != 0) return -1;
  if (setlocale(LC_ALL, "C.UTF-8") == NULL && setlocale(LC_ALL, "") == NULL) {
    return -1;
  }
  raw_input_enabled = 1;
  return 0;
}

static napi_value js_makeStdinBlocking(napi_env env, napi_callback_info info) {
  (void)info;
  if (make_stdin_blocking() < 0) {
    throw_errno(env, "makeStdinBlocking - failed");
  }
  return NULL;
}

static napi_value js_enableRawInput(napi_env env, napi_callback_info info) {
  (void)info;
  if (enable_raw_input() < 0) {
    throw_errno(env, "enableRawInput - failed");
  }
  return NULL;
}

static napi_value js_setEcho(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  bool enable = false;
  if (!get_args(env, info, 1, argv) ||
      !get_bool(env, argv[0], "missing true or false argument", &enable)) {
    return NULL;
  }
  struct termios raw;
  if (tcgetattr(STDIN_FILENO, &raw) != 0) {
    throw_errno(env, "setEcho - tcgetattr failed");
    return NULL;
  }
  if (enable) {
    raw.c_lflag |= ECHO;
  } else {
    raw.c_lflag &= ~ECHO;
  }
  if (tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw) != 0) {
    throw_errno(env, "setEcho - tcsetattr failed");
  }
  return NULL;
}

static napi_value js_getChar(napi_env env, napi_callback_info info) {
  (void)info;
  if (enable_raw_input() < 0) {
    throw_errno(env, "getChar - failed to enable raw mode");
    return NULL;
  }
  char buf[10];
  wint_t w = getwchar();
  if (w == WEOF) {
    throw_errno(env, "EOF");
    return NULL;
  }
  wchar_t w2[2] = {(wchar_t)w, 0};
  size_t bytes = wcstombs(buf, w2, sizeof(buf));
  if (bytes == (size_t)-1) {
    throw_errno(env, "failed to convert wide string to bytes");
    return NULL;
  }
  napi_value result;
  napi_create_string_utf8(env, buf, bytes, &result);
  return result;
}

static int has_named(napi_env env, napi_value object, const char *name) {
  bool result = false;
  napi_has_named_property(env, object, name, &result);
  return result;
}

static int get_i32_prop(napi_env env, napi_value object, const char *name,
                        int *out) {
  napi_value value;
  if (napi_get_named_property(env, object, name, &value) != napi_ok) {
    throw_error(env, "required property missing");
    return 0;
  }
  return get_i32(env, value, name, out);
}

static int sigset_from_array(napi_env env, napi_value array, sigset_t *set) {
  if (sigemptyset(set) != 0) {
    throw_error(env, "failed to init signal set");
    return 0;
  }
  uint32_t len = 0;
  if (napi_get_array_length(env, array, &len) != napi_ok) {
    throw_error(env, "sigset must be an array");
    return 0;
  }
  for (uint32_t i = 0; i < len; i++) {
    napi_value value;
    int signum = 0;
    if (napi_get_element(env, array, i, &value) != napi_ok ||
        !get_i32(env, value, "signum", &signum) || sigaddset(set, signum) != 0) {
      throw_error(env, "failed to add a signal to the set");
      return 0;
    }
  }
  return 1;
}

static napi_value js_posix_spawn(napi_env env, napi_callback_info info) {
  napi_value args[6];
  if (!get_args(env, info, 6, args)) {
    return NULL;
  }
  char *path = get_string_alloc(env, args[0], "path");
  if (path == NULL) return NULL;

  posix_spawn_file_actions_t file_actions;
  if (posix_spawn_file_actions_init(&file_actions) != 0) {
    free(path);
    throw_errno(env, "error in posix_spawn calling posix_spawn_file_actions_init");
    return NULL;
  }

  uint32_t actions_len = 0;
  napi_get_array_length(env, args[1], &actions_len);
  for (uint32_t i = 0; i < actions_len; i++) {
    napi_value action_array, action_name_value;
    char action_name[32];
    napi_get_element(env, args[1], i, &action_array);
    napi_get_element(env, action_array, 0, &action_name_value);
    if (!get_string_buf(env, action_name_value, "fileAction[0]", action_name,
                        sizeof(action_name))) {
      free(path);
      return NULL;
    }
    if (strcmp(action_name, "addclose") == 0) {
      napi_value fd_value;
      int fd = 0;
      napi_get_element(env, action_array, 1, &fd_value);
      if (!get_i32(env, fd_value, "fd", &fd)) {
        free(path);
        return NULL;
      }
      if (posix_spawn_file_actions_addclose(&file_actions, fd) != 0) {
        free(path);
        throw_error(env, "call to posix_spawn_file_actions_addclose failed");
        return NULL;
      }
    } else if (strcmp(action_name, "addopen") == 0) {
      napi_value fd_value, path_value, oflag_value, mode_value;
      int fd = 0, oflag = 0;
      uint32_t mode = 0;
      char open_path[1024];
      napi_get_element(env, action_array, 1, &fd_value);
      napi_get_element(env, action_array, 2, &path_value);
      napi_get_element(env, action_array, 3, &oflag_value);
      napi_get_element(env, action_array, 4, &mode_value);
      if (!get_i32(env, fd_value, "fd", &fd) ||
          !get_string_buf(env, path_value, "path", open_path, sizeof(open_path)) ||
          !get_i32(env, oflag_value, "oflag", &oflag) ||
          !get_u32(env, mode_value, "mode", &mode)) {
        free(path);
        return NULL;
      }
      if (posix_spawn_file_actions_addopen(&file_actions, fd, open_path, oflag,
                                           (mode_t)mode) != 0) {
        free(path);
        throw_error(env, "call to posix_spawn_file_actions_addopen failed");
        return NULL;
      }
    } else if (strcmp(action_name, "adddup2") == 0) {
      napi_value fd_value, new_fd_value;
      int fd = 0, new_fd = 0;
      napi_get_element(env, action_array, 1, &fd_value);
      napi_get_element(env, action_array, 2, &new_fd_value);
      if (!get_i32(env, fd_value, "fd", &fd) ||
          !get_i32(env, new_fd_value, "new_fd", &new_fd)) {
        free(path);
        return NULL;
      }
      if (posix_spawn_file_actions_adddup2(&file_actions, fd, new_fd) != 0) {
        free(path);
        throw_error(env, "call to posix_spawn_file_actions_adddup2 failed");
        return NULL;
      }
    } else {
      free(path);
      throw_error(env, "invalid fileAction");
      return NULL;
    }
  }

  posix_spawnattr_t attr;
  if (posix_spawnattr_init(&attr) != 0) {
    free(path);
    throw_errno(env, "error in posix_spawn calling posix_spawnattr_init");
    return NULL;
  }

  if (has_named(env, args[2], "sched_priority")) {
    int sched_priority = 0;
    if (!get_i32_prop(env, args[2], "sched_priority", &sched_priority)) {
      free(path);
      return NULL;
    }
    struct sched_param schedparam;
    memset(&schedparam, 0, sizeof(schedparam));
    schedparam.sched_priority = sched_priority;
    if (posix_spawnattr_setschedparam(&attr, &schedparam) != 0) {
      free(path);
      throw_error(env, "call to posix_spawnattr_setpgroup failed");
      return NULL;
    }
  }
  if (has_named(env, args[2], "schedpolicy")) {
    int schedpolicy = 0;
    if (!get_i32_prop(env, args[2], "schedpolicy", &schedpolicy)) {
      free(path);
      return NULL;
    }
    if (posix_spawnattr_setschedpolicy(&attr, schedpolicy) != 0) {
      free(path);
      throw_error(env, "call to posix_spawnattr_setschedpolicy failed");
      return NULL;
    }
  }
  if (has_named(env, args[2], "flags")) {
    int flags = 0;
    if (!get_i32_prop(env, args[2], "flags", &flags)) {
      free(path);
      return NULL;
    }
    if (posix_spawnattr_setflags(&attr, (short)flags) != 0) {
      free(path);
      throw_error(env, "call to posix_spawnattr_setflags failed");
      return NULL;
    }
  }
  if (has_named(env, args[2], "pgroup")) {
    int pgroup = 0;
    if (!get_i32_prop(env, args[2], "pgroup", &pgroup)) {
      free(path);
      return NULL;
    }
    if (posix_spawnattr_setpgroup(&attr, pgroup) != 0) {
      free(path);
      throw_error(env, "call to posix_spawnattr_setpgroup failed");
      return NULL;
    }
  }
  if (has_named(env, args[2], "sigmask")) {
    napi_value sigmask;
    sigset_t sigset;
    napi_get_named_property(env, args[2], "sigmask", &sigmask);
    if (!sigset_from_array(env, sigmask, &sigset) ||
        posix_spawnattr_setsigmask(&attr, &sigset) != 0) {
      free(path);
      throw_error(env, "call to posix_spawnattr_setsigmask failed");
      return NULL;
    }
  }
  if (has_named(env, args[2], "sigdefault")) {
    napi_value sigdefault;
    sigset_t sigset;
    napi_get_named_property(env, args[2], "sigdefault", &sigdefault);
    if (!sigset_from_array(env, sigdefault, &sigset) ||
        posix_spawnattr_setsigdefault(&attr, &sigset) != 0) {
      free(path);
      throw_error(env, "call to posix_spawnattr_setsigdefault failed");
      return NULL;
    }
  }

  char **argv = array_to_strings(env, args[3], "argv");
  char **envp = array_to_strings(env, args[4], "envp");
  bool use_path = false;
  if (argv == NULL || envp == NULL || !get_bool(env, args[5], "p", &use_path)) {
    free(path);
    free_string_array(argv);
    free_string_array(envp);
    return NULL;
  }

  pid_t pid;
  int ret = use_path ? posix_spawnp(&pid, path, &file_actions, &attr, argv, envp)
                     : posix_spawn(&pid, path, &file_actions, &attr, argv, envp);
  free(path);
  free_string_array(argv);
  free_string_array(envp);
  posix_spawn_file_actions_destroy(&file_actions);
  posix_spawnattr_destroy(&attr);
  if (ret != 0) {
    errno = ret;
    throw_errno(env, "error in posix_spawn calling posix_spawn");
    return NULL;
  }
  return make_i32(env, pid);
}

static int i32_prop(napi_env env, napi_value object, const char *name) {
  int result = 0;
  napi_value value;
  if (napi_get_named_property(env, object, name, &value) != napi_ok ||
      !get_i32(env, value, name, &result)) {
    return 0;
  }
  return result;
}

static int set_inheritable_fd(int fd, int inheritable) {
  int flags = fcntl(fd, F_GETFD, 0);
  if (flags < 0) return -1;
  if (inheritable) {
    flags &= ~FD_CLOEXEC;
  } else {
    flags |= FD_CLOEXEC;
  }
  return fcntl(fd, F_SETFD, flags);
}

static napi_value js_set_inheritable(napi_env env, napi_callback_info info) {
  napi_value argv[2];
  int fd = 0;
  bool inheritable = false;
  if (!get_args(env, info, 2, argv) || !get_i32(env, argv[0], "fd", &fd) ||
      !get_bool(env, argv[1], "inheritable", &inheritable)) {
    return NULL;
  }
  if (set_inheritable_fd(fd, inheritable) == -1) {
    throw_errno(env, "set_inheritable call failed");
  }
  return NULL;
}

static napi_value js_is_inheritable(napi_env env, napi_callback_info info) {
  napi_value argv[1];
  int fd = 0;
  if (!get_args(env, info, 1, argv) || !get_i32(env, argv[0], "fd", &fd)) {
    return NULL;
  }
  int flags = fcntl(fd, F_GETFD, 0);
  if (flags < 0) {
    throw_errno(env, "is_inheritable call failed");
    return NULL;
  }
  return make_bool(env, (flags & FD_CLOEXEC) == 0);
}

static int is_in_list(int fd, int *fds, uint32_t len) {
  for (uint32_t i = 0; i < len; i++) {
    if (fds[i] == fd) return 1;
  }
  return 0;
}

static void close_open_fds(int start_fd, int errpipe_write, int *fds_to_keep,
                           uint32_t fds_to_keep_len) {
  for (int fd = start_fd; fd < 256; fd++) {
    if (fd == errpipe_write) continue;
    if (!is_in_list(fd, fds_to_keep, fds_to_keep_len)) {
      close(fd);
    }
  }
}

static int do_exec_child(char **exec_array, char **argv, char **envp, char *cwd,
                         int p2cread, int p2cwrite, int c2pread, int c2pwrite_in,
                         int errread, int errwrite_in, int errpipe_read,
                         int errpipe_write, int close_fds, int *fds_to_keep,
                         uint32_t fds_to_keep_len, char *wasi_fd_info) {
  if (envp[0] == NULL && setenv("WASI_FD_INFO", wasi_fd_info, 1) == -1) {
    return -2;
  }
  for (uint32_t i = 0; i < fds_to_keep_len; i++) {
    if (fds_to_keep[i] != errpipe_write) {
      set_inheritable_fd(fds_to_keep[i], 1);
    }
  }
  if (p2cwrite != -1) close(p2cwrite);
  if (c2pread != -1) close(c2pread);
  if (errread != -1) close(errread);
  close(errpipe_read);

  int c2pwrite = c2pwrite_in;
  if (c2pwrite == 0) {
    c2pwrite = dup(c2pwrite);
    set_inheritable_fd(c2pwrite, 0);
  }
  int errwrite = errwrite_in;
  while (errwrite == 0 || errwrite == 1) {
    errwrite = dup(errwrite);
    set_inheritable_fd(errwrite, 0);
  }
  if (p2cread == 0) {
    set_inheritable_fd(p2cread, 1);
  } else if (p2cread != -1 && dup2(p2cread, 0) == -1) {
    return -3;
  }
  if (c2pwrite == 1) {
    set_inheritable_fd(c2pwrite, 1);
  } else if (c2pwrite != -1 && dup2(c2pwrite, 1) == -1) {
    return -3;
  }
  if (errwrite == 2) {
    set_inheritable_fd(errwrite, 1);
  } else if (errwrite != -1 && dup2(errwrite, 2) == -1) {
    return -3;
  }
  if (strlen(cwd) > 0 && chdir(cwd) != 0) {
    return -4;
  }
  if (close_fds != 0) {
    close_open_fds(3, errpipe_write, fds_to_keep, fds_to_keep_len);
  }
  set_inheritable_fd(errpipe_write, 0);
  for (size_t i = 0; exec_array[i] != NULL; i++) {
    if (envp[0] != NULL) {
      execve(exec_array[i], argv, envp);
    } else {
      execv(exec_array[i], argv);
    }
  }
  return -5;
}

static napi_value js_fork_exec(napi_env env, napi_callback_info info) {
  napi_value args[1];
  if (!get_args(env, info, 1, args)) {
    return NULL;
  }
  napi_value opts = args[0];
  napi_value exec_array_v, argv_v, envp_v, cwd_v, wasi_fd_info_v, fds_keep_v,
      err_map_v;
  if (napi_get_named_property(env, opts, "exec_array", &exec_array_v) != napi_ok ||
      napi_get_named_property(env, opts, "argv", &argv_v) != napi_ok ||
      napi_get_named_property(env, opts, "envp", &envp_v) != napi_ok ||
      napi_get_named_property(env, opts, "cwd", &cwd_v) != napi_ok ||
      napi_get_named_property(env, opts, "WASI_FD_INFO", &wasi_fd_info_v) != napi_ok ||
      napi_get_named_property(env, opts, "fds_to_keep", &fds_keep_v) != napi_ok ||
      napi_get_named_property(env, opts, "err_map", &err_map_v) != napi_ok) {
    throw_error(env, "fork_exec option missing");
    return NULL;
  }
  char **exec_array = array_to_strings(env, exec_array_v, "exec_array");
  char **argv = array_to_strings(env, argv_v, "argv");
  char **envp = array_to_strings(env, envp_v, "envp");
  char *cwd = get_string_alloc(env, cwd_v, "current working directory");
  char *wasi_fd_info = get_string_alloc(env, wasi_fd_info_v, "WASI_FD_INFO field");
  uint32_t fds_to_keep_len = 0, err_map_len = 0;
  int *fds_to_keep =
      array_to_i32(env, fds_keep_v, "fds_to_keep", &fds_to_keep_len);
  int *err_map = array_to_i32(env, err_map_v, "err_map", &err_map_len);

  int p2cread = i32_prop(env, opts, "p2cread");
  int p2cwrite = i32_prop(env, opts, "p2cwrite");
  int c2pread = i32_prop(env, opts, "c2pread");
  int c2pwrite = i32_prop(env, opts, "c2pwrite");
  int errread = i32_prop(env, opts, "errread");
  int errwrite = i32_prop(env, opts, "errwrite");
  int errpipe_read = i32_prop(env, opts, "errpipe_read");
  int errpipe_write = i32_prop(env, opts, "errpipe_write");
  int close_fds = i32_prop(env, opts, "close_fds");

  if (!exec_array || !argv || !envp || !cwd || !wasi_fd_info || !fds_to_keep ||
      !err_map) {
    free_string_array(exec_array);
    free_string_array(argv);
    free_string_array(envp);
    free(cwd);
    free(wasi_fd_info);
    free(fds_to_keep);
    free(err_map);
    return NULL;
  }

  pid_t pid = fork();
  if (pid == -1) {
    throw_errno(env, "fork system call failed");
    return NULL;
  }
  if (pid != 0) {
    free_string_array(exec_array);
    free_string_array(argv);
    free_string_array(envp);
    free(cwd);
    free(wasi_fd_info);
    free(fds_to_keep);
    free(err_map);
    return make_i32(env, pid);
  }

  int child_errno = 0;
  int child_result = do_exec_child(
      exec_array, argv, envp, cwd, p2cread, p2cwrite, c2pread, c2pwrite, errread,
      errwrite, errpipe_read, errpipe_write, close_fds, fds_to_keep,
      fds_to_keep_len, wasi_fd_info);
  child_errno = errno;
  int wasm_errno =
      child_errno >= 0 && (uint32_t)child_errno < err_map_len ? err_map[child_errno]
                                                              : -1;
  char message[128];
  snprintf(message, sizeof(message), "OSError:%x:%s", wasm_errno,
           child_result == -5 ? "exec" : "noexec");
  ssize_t ignored = write(errpipe_write, message, strlen(message));
  (void)ignored;
  _exit(0);
}

static const struct {
  const char *name;
  napi_callback fn;
} functions[] = {
    {"getConstants", js_getConstants},
    {"wait", js_wait},
    {"wait3", js_wait3},
    {"waitpid", js_waitpid},
    {"chroot", js_chroot},
    {"getegid", js_getegid},
    {"geteuid", js_geteuid},
    {"gethostname", js_gethostname},
    {"getpgid", js_getpgid},
    {"getpgrp", js_getpgrp},
    {"getppid", js_getppid},
    {"setpgid", js_setpgid},
    {"setegid", js_setegid},
    {"seteuid", js_seteuid},
    {"sethostname", js_sethostname},
    {"setregid", js_setregid},
    {"setreuid", js_setreuid},
    {"setsid", js_setsid},
    {"ttyname", js_ttyname},
    {"alarm", js_alarm},
    {"sleep", js_sleep},
    {"usleep", js_usleep},
    {"execv", js_execv},
    {"execvp", js_execvp},
    {"_execve", js_execve},
    {"_fexecve", js_fexecve},
    {"fork", js_fork},
    {"close_event_loop", js_close_event_loop},
    {"pipe", js_pipe},
    {"pipe2", js_pipe2},
    {"lockf", js_lockf},
    {"pause", js_pause},
    {"getgrouplist", js_getgrouplist},
    {"dup", js_dup},
    {"dup2", js_dup2},
    {"chdir", js_chdir},
    {"getcwd", js_getcwd},
    {"getresuid", js_getresuid},
    {"getresgid", js_getresgid},
    {"setresuid", js_setresuid},
    {"setresgid", js_setresgid},
    {"if_indextoname", js_if_indextoname},
    {"if_nametoindex", js_if_nametoindex},
    {"if_nameindex", js_if_nameindex},
    {"watchForSignal", js_watchForSignal},
    {"getSignalState", js_getSignalState},
    {"gethostbyname", js_gethostbyname},
    {"gethostbyaddr", js_gethostbyaddr},
    {"_getaddrinfo", js_getaddrinfo},
    {"gai_strerror", js_gai_strerror},
    {"hstrerror", js_hstrerror},
    {"socket", js_socket},
    {"_bind", js_bind},
    {"_connect", js_connect},
    {"getsockname", js_getsockname},
    {"getpeername", js_getpeername},
    {"listen", js_listen},
    {"recv", js_recv},
    {"send", js_send},
    {"shutdown", js_shutdown},
    {"accept", js_accept},
    {"getsockopt", js_getsockopt},
    {"setsockopt", js_setsockopt},
    {"pollSocket", js_pollSocket},
    {"login_tty", js_login_tty},
    {"_statvfs", js_statvfs},
    {"_fstatvfs", js_fstatvfs},
    {"ctermid", js_ctermid},
    {"tcgetattr", js_tcgetattr},
    {"tcsetattr", js_tcsetattr},
    {"fcntlSetFlags", js_fcntlSetFlags},
    {"fcntlGetFlags", js_fcntlGetFlags},
    {"makeStdinBlocking", js_makeStdinBlocking},
    {"enableRawInput", js_enableRawInput},
    {"setEcho", js_setEcho},
    {"getChar", js_getChar},
    {"_posix_spawn", js_posix_spawn},
    {"fork_exec", js_fork_exec},
    {"set_inheritable", js_set_inheritable},
    {"is_inheritable", js_is_inheritable},
};

__attribute__((visibility("default"))) napi_value
napi_register_module_v1(napi_env env, napi_value exports) {
  for (size_t i = 0; i < sizeof(functions) / sizeof(functions[0]); i++) {
    if (!register_function(env, exports, functions[i].name, functions[i].fn)) {
      return NULL;
    }
  }
  return exports;
}
