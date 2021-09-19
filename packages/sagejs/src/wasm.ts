import { WASI } from "@wasmer/wasi";
import { readFile as readFile0 } from "fs";
import { promisify } from "util";
import { dirname, join } from "path";
import callsite from "callsite";
import * as fs from "fs";
import * as nodeBindings from "@wasmer/wasi/lib/bindings/node";

const readFile = promisify(readFile0);

const STUBS =
  "main raise setjmp longjmp pclose popen getuid getpid getpwuid getpwnam geteuid system dlerror dlsym dlopen signal clock pthread_condattr_init pthread_condattr_setclock pthread_cond_init pthread_attr_init pthread_attr_setstacksize pthread_attr_destroy pthread_create pthread_detach pthread_self pthread_exit pthread_mutex_init pthread_cond_destroy pthread_mutex_destroy pthread_mutex_trylock pthread_mutex_lock pthread_cond_timedwait pthread_cond_wait pthread_mutex_unlock pthread_cond_signal pthread_key_create pthread_key_delete pthread_setspecific pthread_getspecific pthread_kill __SIG_IGN __SIG_ERR setitimer getitimer strsignal siginterrupt pause sigemptyset  sigaddset  ttyname_r  lchflags  chflags  fchmod  lchmod  fchmodat  chmod  fchown  lchown  fchownat  chown  ctermid  nice  getpriority  setpriority  copy_file_range  system  umask  times  execv  fexecve  execve  fork  sched_get_priority_max  sched_get_priority_min  sched_getparam  sched_getscheduler  sched_rr_get_interval  sched_setparam  sched_setscheduler  openpty  forkpty  getegid  geteuid  getgid  getgrouplist  getgroups alarm getpgrp getppid getlogin kill killpg plock setuid seteuid setreuid setgid setegid setregid setgroups initgroups getpgid setpgrp wait waitid waitpid getsid setsid setpgid tcgetpgrp tcsetpgrp fdwalk dup3 dup2 lockf preadv2 pwritev2 sendfile pipe2 pipe mkfifoat mkfifo mknodat mknod flockfile funlockfile sync fstatvfs statvfs getloadavg  setresuid setresgid getresuid getresgid memfd_create posix_spawn_file_actions_init posix_spawn_file_actions_addopen posix_spawn_file_actions_addclose posix_spawn_file_actions_adddup2 posix_spawnattr_init posix_spawnattr_setpgroup posix_spawnattr_setsigmask posix_spawnattr_setsigdefault posix_spawnattr_setschedpolicy posix_spawnattr_setschedparam posix_spawnattr_setflags posix_spawnp posix_spawn posix_spawnattr_destroy posix_spawn_file_actions_destroy pthread_sigmask sigpending sigwait sigwaitinfo sigtimedwait sigfillset sigismember getpwuid_r getpwnam_r setpwent getpwent endpwent clock_settime pthread_getcpuclockid getrusage clock gettext dgettext dcgettext textdomain bindtextdomain bind_textdomain_codeset sigaction sigaltstack getrlimit setrlimit dlsym dlopen dlerror realpath dup";

function stub(_name: string) {
  return function () {
    //console.log(`stub.${_name}`, arguments);
    return "0";
  };
}
const wasmEnv: { [name: string]: Function } = {};
for (const name of STUBS.split(" ")) {
  if (wasmEnv[name] != null) continue;
  wasmEnv[name] = stub(name);
}

const encoder = new TextEncoder();
export function stringToU8(s, buffer) {
  const array = new Int8Array(buffer, 0, s.length + 1);
  array.set(encoder.encode(s));
  array[s.length] = 0;
  return array;
}

export function string_cb(wasm, ptr, len) {
  const slice = wasm.memory.buffer.slice(ptr, ptr + len);
  const textDecoder = new TextDecoder();
  return textDecoder.decode(slice);
}

interface Options {
  noWasi?: boolean; // if true, include wasi
  noCache?: boolean;
  env?: object; // functions to include in the environment
  dir?: string | null; // WASI pre-opened directory; default is to preopen /, i.e., full filesystem; explicitly set as null to sandbox.
  traceSyscalls?: boolean;
}

// TODO: make this a weakref cache
// TODO: need to reuseInFlight importWasm
const cache: { [name: string]: any } = {};

export default async function wasmImport(name: string, options: Options = {}) {
  if (!options.noCache) {
    if (cache[name] != null) {
      return cache[name];
    }
  }
  const t = new Date().valueOf();
  if (!name.startsWith("/")) {
    name = join(dirname(callsite()[1]?.getFileName() ?? ""), name);
  }
  const pathToWasm = `${name}${name.endsWith(".wasm") ? "" : ".wasm"}`;

  wasmEnv.reportError = (ptr, len: number) => {
    // @ts-ignore
    const slice = result.instance.exports.memory.buffer.slice(ptr, ptr + len);
    const textDecoder = new TextDecoder();
    throw Error(textDecoder.decode(slice));
  };

  const wasmOpts: any = { env: { ...wasmEnv, ...options.env } };
  let wasi: any = undefined;
  if (!options?.noWasi) {
    const opts: any = {
      args: process.argv,
      env: process.env,
      traceSyscalls: options.traceSyscalls,
    };
    if (options.dir === null) {
      // sandbox -- don't give any fs access
    } else {
      opts.bindings = {
        ...(nodeBindings.default || nodeBindings),
        fs: fs,
      };
      if (options.dir !== undefined) {
        // something explicit
        opts.preopenDirectories = { [options.dir]: options.dir };
      } else {
        // just give full access; security of fs access isn't
        // really relevant for us at this point
        opts.preopenDirectories = { "/": "/" };
      }
    }
    wasi = new WASI(opts);
    wasmOpts.wasi_snapshot_preview1 = wasi.wasiImport;

    // It's very important that this actually work properly.
    // E.g., if you just return 0, then Python startup
    // hangs at py_getrandom in bootstrap_hash.c.
    // The wasmer code for random_get is broken in that it returns
    // 0 for success, but getrandom is supposed to return the number
    // of random bytes.  It does randomize the buffer though.
    // I couldn't find this reported upstream.
    wasmOpts.env.getrandom = (bufPtr, bufLen, _flags) => {
      //console.log("getrandom", bufPtr, bufLen, _flags);
      wasi.wasiImport.random_get(bufPtr, bufLen);
      return bufLen; // what we actually did!
    };
  }

  const source = await readFile(pathToWasm);
  const typedArray = new Uint8Array(source);
  const result = await WebAssembly.instantiate(typedArray, wasmOpts);
  if (wasi != null) {
    wasi.start(result.instance);
  }
  if (result.instance.exports.__wasm_call_ctors != null) {
    // We also **MUST** explicitly call the WASM constructors. This is
    // a library function that is part of the zig libc code.  We have
    // to call this because the wasm file is built using build-lib, so
    // there is no main that does this.  This call does things like
    // setup the filesystem mapping.    Yes, it took me **days**
    // to figure this out, including reading a lot of assembly code. :shrug:
    (result.instance.exports.__wasm_call_ctors as CallableFunction)();
  }

  if (!options.noCache) {
    cache[name] = result.instance.exports;
  }

  console.log(`imported ${name} in ${new Date().valueOf() - t}ms`);
  return result.instance.exports;
}
