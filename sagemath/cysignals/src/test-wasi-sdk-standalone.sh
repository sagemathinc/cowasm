#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 6 ]; then
  echo "usage: test-wasi-sdk-standalone.sh BUILD_DIR DIST_DIR BIN_DIR CPYTHON_WASM PY_CYTHON POSIX_WASI_SDK" >&2
  exit 2
fi

build_dir="$(cd "$1" && pwd)"
dist_dir="$2"
bin_dir="$(cd "$3" && pwd)"
cpython_wasm="$(cd "$4" && pwd)"
py_cython="$(cd "$5" && pwd)"
posix_wasi_sdk="$(cd "$6" && pwd)"
src_dir="$(cd "$(dirname "$0")" && pwd)"
repo_dir="$(cd "$src_dir/../../.." && pwd)"

# shellcheck source=/dev/null
source "$repo_dir/core/build/src/test/clang-standalone-common.sh"

probe_dir="$(mktemp -d)"
trap 'rm -rf "$probe_dir"' EXIT

cowasm_standalone_probe "cysignals" wasi-sdk "$bin_dir" "$probe_dir"

python_include="$cpython_wasm/include/python3.14"
extension_suffix=".cpython-314-wasm32-wasi.so"
cysignals_src="$build_dir/src/cysignals"

rm -rf "$dist_dir"
mkdir -p "$dist_dir/cysignals" "$probe_dir/cysignals"

cd "$cysignals_src"

cat >cysignals_config.h <<'EOF'
#undef HAVE_BACKTRACE
#undef HAVE_FORK
#undef HAVE_KILL
#undef HAVE_SIGALTSTACK
#undef HAVE_SIGPROCMASK
#undef HAVE_SYS_MMAN_H
#undef HAVE_SYS_TIME_H
#undef HAVE_SYS_WAIT_H
#define ENABLE_DEBUG_CYSIGNALS 0
#define HAVE_EXECINFO_H 0
#define HAVE_SYS_MMAN_H 0
#define HAVE_SYS_PRCTL_H 0
#define HAVE_TIME_H 1
#define HAVE_SYS_TYPES_H 1
#define HAVE_SYS_TIME_H 0
#define HAVE_SYS_WAIT_H 0
#define HAVE_UNISTD_H 1
#define HAVE_WINDOWS_H 0
#define HAVE_FORK 0
#define HAVE_KILL 0
#define HAVE_SIGPROCMASK 0
#define HAVE_SIGALTSTACK 0
#define HAVE_BACKTRACE 0
#define HAVE_EMMS 0
#define CYSIGNALS_USE_SIGSETJMP 0
#define CYSIGNALS_C_ATOMIC 1
#define CYSIGNALS_C_ATOMIC_WITH_OPENMP 0
#define CYSIGNALS_CXX_ATOMIC 0
#define CYSIGNALS_CXX_ATOMIC_WITH_OPENMP 0
#define CYSIGNALS_STD_ATOMIC 0
#define CYSIGNALS_STD_ATOMIC_WITH_OPENMP 0
EOF
cp cysignals_config.h config.h

PYTHONPATH="$py_cython" python3 -m cython -3 --output-file signals.c signals.pyx

"$bin_dir/wasi-sdk-clang-next" -target wasm32-wasip1 \
  -O0 \
  -fPIC \
  -D_SCHED_H \
  -shared \
  -nostdlib \
  -Wl,--allow-undefined \
  -Wl,--no-entry \
  -Wl,--export=PyInit_signals \
  -I. \
  -I"$python_include" \
  -I"$posix_wasi_sdk" \
  signals.c \
  -o "$dist_dir/cysignals/signals$extension_suffix"

cp \
  __init__.py \
  cysignals.pc \
  cysignals-CSI-helper.py \
  memory.pxd \
  pysignals.pxd \
  signals.pxd \
  struct_signals.h \
  macros.h \
  cysignals_config.h \
  "$dist_dir/cysignals/"

"$bin_dir/wasi-sdk-llvm-objdump-next" -h "$dist_dir/cysignals/signals$extension_suffix" |
  grep 'dylink\.0'
"$bin_dir/wasi-sdk-llvm-nm-next" "$dist_dir/cysignals/signals$extension_suffix" |
  grep ' T PyInit_signals$'

PYTHONPATH="$dist_dir" "$bin_dir/python-wasm" - <<'PY'
import signal

import cysignals
import cysignals.signals
from cysignals.signals import (
    _pari_version,
    init_cysignals,
    set_debug_level,
    sig_print_exception,
    sig_on_reset,
)

assert cysignals.SignalError.__module__ == "cysignals.signals"
assert cysignals.signals.AlarmInterrupt is cysignals.AlarmInterrupt
assert cysignals.signals.SignalError is cysignals.SignalError
assert signal.getsignal(signal.SIGINT) is cysignals.signals.python_check_interrupt
old_handler = init_cysignals()
assert old_handler is cysignals.signals.python_check_interrupt
assert signal.getsignal(signal.SIGINT) is cysignals.signals.python_check_interrupt
assert _pari_version() is None
assert set_debug_level(0) == 0
try:
    set_debug_level(1)
except RuntimeError as err:
    assert str(err) == "cysignals is compiled without debugging, recompile with --enable-debug"
else:
    raise AssertionError("set_debug_level(1) unexpectedly succeeded")
assert sig_on_reset() == 0
sig_print_exception(signal.SIGFPE)
PY

cat >"$probe_dir/cysignals_guard_probe.pyx" <<'PYX'
from cpython.exc cimport PyErr_SetString
from cysignals.memory cimport (
    check_allocarray,
    check_calloc,
    check_malloc,
    check_realloc,
    check_reallocarray,
    sig_free,
)
from cysignals.signals cimport (
    add_custom_signals,
    cython_check_exception,
    sig_raise_exception,
    sig_block,
    sig_check,
    sig_check_no_except,
    sig_on_no_except,
    sig_str,
    sig_str_no_except,
    sig_occurred,
    sig_off,
    sig_on,
    sig_unblock,
)
from libc.signal cimport SIGALRM, SIGFPE, SIGINT, SIGSEGV
from libc.stdint cimport uint32_t

from cysignals.signals import AlarmInterrupt, SignalError


cdef int custom_signal_is_blocked() noexcept:
    return 0


cdef void custom_signal_unblock() noexcept:
    pass


cdef void custom_set_pending_signal(int sig) noexcept:
    pass


cdef bint raises_exception(int sig, bytes message, object expected_type,
                           object expected_text=None):
    cdef const char* raw_message = NULL

    if message is not None:
        raw_message = message

    try:
        sig_raise_exception(sig, raw_message)
    except expected_type as err:
        if expected_text is not None and str(err) != expected_text:
            raise AssertionError(
                "unexpected signal exception text: %r" % (str(err),)
            )
        return True

    return False


def guarded_sum(unsigned int n):
    cdef unsigned int i
    cdef unsigned long total = 0

    sig_on()
    sig_block()
    sig_unblock()
    for i in range(n):
        total += i
        sig_check()
    sig_off()

    if sig_occurred() != NULL:
        raise AssertionError("unexpected cysignals exception state")

    return total


def nested_guard_cleanup():
    sig_on()
    sig_on()
    sig_off()
    sig_off()

    return sig_occurred() == NULL


def guarded_python_exception_cleanup():
    cdef bint cleaned = False

    try:
        sig_on()
        try:
            raise ValueError("guarded failure")
        finally:
            sig_off()
    except ValueError as err:
        if str(err) != "guarded failure":
            raise
        cleaned = sig_occurred() == NULL

    return cleaned


def no_except_guard_cleanup():
    if not sig_on_no_except():
        raise AssertionError("unexpected sig_on_no_except failure")
    sig_off()

    if not sig_str_no_except("wasi no-except guard"):
        raise AssertionError("unexpected sig_str_no_except failure")
    if not sig_check_no_except():
        raise AssertionError("unexpected sig_check_no_except failure")
    sig_off()

    return sig_occurred() == NULL


def string_guard_cleanup():
    sig_str("wasi string guard")
    sig_check()
    sig_off()

    return sig_occurred() == NULL


def mapped_signal_exceptions():
    ok = raises_exception(SIGFPE, None, FloatingPointError,
                          "Floating point exception")
    ok = ok and raises_exception(SIGFPE, b"domain error",
                                 FloatingPointError, "domain error")
    ok = ok and raises_exception(SIGSEGV, b"bad pointer",
                                 SignalError, "bad pointer")
    ok = ok and raises_exception(SIGALRM, None, AlarmInterrupt)
    ok = ok and raises_exception(SIGINT, None, KeyboardInterrupt)
    ok = ok and raises_exception(0, None, SystemError,
                                 "unknown signal number 0")

    return ok and sig_occurred() == NULL


def custom_handler_registration_limit():
    cdef int i

    for i in range(16):
        add_custom_signals(custom_signal_is_blocked,
                           custom_signal_unblock,
                           custom_set_pending_signal)

    try:
        add_custom_signals(custom_signal_is_blocked,
                           custom_signal_unblock,
                           custom_set_pending_signal)
    except IndexError as err:
        if str(err) != "maximal number of custom handlers exceeded":
            raise
        return sig_occurred() == NULL

    return False


def sig_on_reset_after_unbalanced_guard():
    from cysignals.signals import sig_on_reset

    sig_on()
    if sig_on_reset() != 1:
        raise AssertionError("sig_on_reset did not report the open guard")

    return sig_on_reset() == 0


def cython_check_exception_probe():
    cdef bint ok = False

    PyErr_SetString(RuntimeError, "pending no-except check")
    try:
        cython_check_exception()
    except RuntimeError as err:
        ok = str(err) == "pending no-except check"

    if not ok:
        return False

    return sig_occurred() == NULL


def memory_allocator_roundtrip():
    cdef unsigned char* raw = NULL
    cdef unsigned char* grown = NULL
    cdef uint32_t* zeroed = NULL
    cdef uint32_t* array = NULL
    cdef int i
    cdef unsigned int total = 0

    try:
        raw = <unsigned char*>check_malloc(4)
        for i in range(4):
            raw[i] = i + 1

        grown = <unsigned char*>check_realloc(raw, 8)
        raw = NULL
        for i in range(4, 8):
            grown[i] = i + 1
        for i in range(8):
            total += grown[i]

        zeroed = <uint32_t*>check_calloc(3, sizeof(uint32_t))
        for i in range(3):
            total += zeroed[i]
            zeroed[i] = 10 + i

        array = <uint32_t*>check_allocarray(2, sizeof(uint32_t))
        array[0] = zeroed[0]
        array[1] = zeroed[1]
        array = <uint32_t*>check_reallocarray(array, 4, sizeof(uint32_t))
        array[2] = zeroed[2]
        array[3] = 99
        total += array[0] + array[1] + array[2] + array[3]

        array = <uint32_t*>check_reallocarray(array, 0, sizeof(uint32_t))
        if array != NULL:
            raise AssertionError("zero-sized realloc did not return NULL")

        return total == 36 + 10 + 11 + 12 + 99 and sig_occurred() == NULL
    finally:
        if raw != NULL:
            sig_free(raw)
        if grown != NULL:
            sig_free(grown)
        if zeroed != NULL:
            sig_free(zeroed)
        if array != NULL:
            sig_free(array)


def memory_allocator_failure():
    try:
        check_allocarray(2, (<size_t>-1) // 2 + 1)
    except MemoryError as err:
        return str(err).startswith("failed to allocate 2 * ")

    return False
PYX

PYTHONPATH="$dist_dir:$py_cython" python3 -m cython -3 \
  --output-file "$probe_dir/cysignals_guard_probe.c" \
  "$probe_dir/cysignals_guard_probe.pyx"

"$bin_dir/wasi-sdk-clang-next" -target wasm32-wasip1 \
  -O0 \
  -fPIC \
  -D_SCHED_H \
  -shared \
  -nostdlib \
  -Wl,--allow-undefined \
  -Wl,--no-entry \
  -Wl,--export=PyInit_cysignals_guard_probe \
  -I"$python_include" \
  -I"$dist_dir" \
  -I"$dist_dir/cysignals" \
  -I"$posix_wasi_sdk" \
  "$probe_dir/cysignals_guard_probe.c" \
  -o "$probe_dir/cysignals_guard_probe$extension_suffix"

"$bin_dir/wasi-sdk-llvm-objdump-next" -h "$probe_dir/cysignals_guard_probe$extension_suffix" |
  grep 'dylink\.0'
"$bin_dir/wasi-sdk-llvm-nm-next" "$probe_dir/cysignals_guard_probe$extension_suffix" |
  grep ' T PyInit_cysignals_guard_probe$'

PYTHONPATH="$probe_dir:$dist_dir" "$bin_dir/python-wasm" - <<'PY'
import cysignals
import cysignals.signals
import cysignals_guard_probe

assert cysignals.SignalError.__module__ == "cysignals.signals"
assert cysignals_guard_probe.guarded_sum(8) == 28
assert cysignals_guard_probe.nested_guard_cleanup()
assert cysignals_guard_probe.guarded_python_exception_cleanup()
assert cysignals_guard_probe.no_except_guard_cleanup()
assert cysignals_guard_probe.string_guard_cleanup()
assert cysignals_guard_probe.mapped_signal_exceptions()
assert cysignals_guard_probe.custom_handler_registration_limit()
assert cysignals_guard_probe.sig_on_reset_after_unbalanced_guard()
assert cysignals_guard_probe.cython_check_exception_probe()
assert cysignals_guard_probe.memory_allocator_roundtrip()
assert cysignals_guard_probe.memory_allocator_failure()
PY

echo "cysignals-ok signals-extension import init-api guarded-cython-module guard-cleanup no-except-guards string-guards signal-exceptions custom-handlers reset-check exception-check memory-helpers"
