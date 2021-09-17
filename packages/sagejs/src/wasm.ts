import { WASI } from "@wasmer/wasi";
import { readFile as readFile0 } from "fs";
import { promisify } from "util";
import { dirname, join } from "path";
import callsite from "callsite";

const readFile = promisify(readFile0);

const STUBS =
  "main raise setjmp longjmp pclose popen getuid getpid getpwuid getpwnam geteuid system dlerror dlsym dlopen signal clock pthread_condattr_init pthread_condattr_setclock pthread_cond_init pthread_attr_init pthread_attr_setstacksize pthread_attr_destroy pthread_create pthread_detach pthread_self pthread_exit pthread_mutex_init pthread_cond_destroy pthread_mutex_destroy pthread_mutex_trylock pthread_mutex_lock pthread_cond_timedwait pthread_cond_wait pthread_mutex_unlock pthread_cond_signal pthread_key_create pthread_key_delete pthread_setspecific pthread_getspecific pthread_kill __SIG_IGN __SIG_ERR setitimer getitimer strsignal siginterrupt pause sigemptyset  sigaddset  ttyname_r  lchflags  chflags  fchmod  lchmod  fchmodat  chmod  fchown  lchown  fchownat  chown  ctermid  nice  getpriority  setpriority  copy_file_range  system  umask  times  execv  fexecve  execve  fork  sched_get_priority_max  sched_get_priority_min  sched_getparam  sched_getscheduler  sched_rr_get_interval  sched_setparam  sched_setscheduler  openpty  forkpty  getegid  geteuid  getgid  getgrouplist  getgroups alarm getpgrp getppid getlogin kill killpg plock setuid seteuid setreuid setgid setegid setregid setgroups initgroups getpgid setpgrp wait waitid waitpid getsid setsid setpgid tcgetpgrp tcsetpgrp fdwalk dup3 dup2 lockf preadv2 pwritev2 sendfile pipe2 pipe mkfifoat mkfifo mknodat mknod flockfile funlockfile sync fstatvfs statvfs getloadavg getrandom setresuid setresgid getresuid getresgid memfd_create posix_spawn_file_actions_init posix_spawn_file_actions_addopen posix_spawn_file_actions_addclose posix_spawn_file_actions_adddup2 posix_spawnattr_init posix_spawnattr_setpgroup posix_spawnattr_setsigmask posix_spawnattr_setsigdefault posix_spawnattr_setschedpolicy posix_spawnattr_setschedparam posix_spawnattr_setflags posix_spawnp posix_spawn posix_spawnattr_destroy posix_spawn_file_actions_destroy pthread_sigmask sigpending sigwait sigwaitinfo sigtimedwait sigfillset sigismember getpwuid_r getpwnam_r setpwent getpwent endpwent clock_settime pthread_getcpuclockid getrusage clock gettext dgettext dcgettext textdomain bindtextdomain bind_textdomain_codeset sigaction sigaltstack getrlimit setrlimit dlsym dlopen dlerror realpath dup";

function stub(name: string) {
  return function () {
    console.log(`stub.${name}`, arguments);
    return "0";
  };
}
const wasmEnv: { [name: string]: Function } = {};
for (const name of STUBS.split(" ")) {
  if (wasmEnv[name] != null) continue;
  wasmEnv[name] = stub(name);
}

wasmEnv.getrandom = () => {
  return 0;
};

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
  const pathToWasm = join(
    dirname(callsite()[1]?.getFileName() ?? ""),
    `${name}.wasm`
  );

  wasmEnv.reportError = (ptr, len: number) => {
    // @ts-ignore
    const slice = result.instance.exports.memory.buffer.slice(ptr, ptr + len);
    const textDecoder = new TextDecoder();
    throw Error(textDecoder.decode(slice));
  };

  const wasmOpts: any = { env: { ...wasmEnv, ...options.env } };
  let wasi: any = undefined;
  if (!options?.noWasi) {
    wasi = new WASI({
      args: process.argv,
      env: process.env,
    });
    wasmOpts.wasi_snapshot_preview1 = wasi.wasiImport;
  }

  const source = await readFile(pathToWasm);
  const typedArray = new Uint8Array(source);
  const result = await WebAssembly.instantiate(typedArray, wasmOpts);
  if (wasi != null) {
    wasi.start(result.instance);
  }

  if (!options.noCache) {
    cache[name] = result.instance.exports;
  }

  console.log(`imported ${name} in ${new Date().valueOf() - t}ms`);
  return result.instance.exports;
}
