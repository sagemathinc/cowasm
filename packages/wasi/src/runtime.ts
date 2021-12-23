import { WASI } from "./index";
import nodeBindings from "./bindings/node";

import { readFile as readFile0 } from "fs";
import { promisify } from "util";
import fs from "fs";

const readFile = promisify(readFile0);

const STUBS =
  "main raise setjmp longjmp pclose popen getuid getpid getpwuid getpwnam geteuid system dlerror dlsym dlopen signal clock pthread_condattr_init pthread_condattr_setclock pthread_cond_init pthread_attr_init pthread_attr_setstacksize pthread_attr_destroy pthread_create pthread_detach pthread_self pthread_exit pthread_mutex_init pthread_cond_destroy pthread_mutex_destroy pthread_mutex_trylock pthread_mutex_lock pthread_cond_timedwait pthread_cond_wait pthread_mutex_unlock pthread_cond_signal pthread_key_create pthread_key_delete pthread_setspecific pthread_getspecific pthread_kill __SIG_IGN __SIG_ERR setitimer getitimer strsignal siginterrupt pause sigemptyset  sigaddset  ttyname_r  lchflags  chflags  fchmod  lchmod  fchmodat  chmod  fchown  lchown  fchownat  chown  ctermid  nice  getpriority  setpriority  copy_file_range  system  umask  times  execv  fexecve  execve  fork  sched_get_priority_max  sched_get_priority_min  sched_getparam  sched_getscheduler  sched_rr_get_interval  sched_setparam  sched_setscheduler  openpty  forkpty  getegid  geteuid  getgid  getgrouplist  getgroups alarm getpgrp getppid getlogin kill killpg plock setuid seteuid setreuid setgid setegid setregid setgroups initgroups getpgid setpgrp wait waitid waitpid getsid setsid setpgid tcgetpgrp tcsetpgrp fdwalk dup3 dup2 lockf preadv2 pwritev2 sendfile pipe2 pipe mkfifoat mkfifo mknodat mknod flockfile funlockfile sync fstatvfs statvfs getloadavg  setresuid setresgid getresuid getresgid memfd_create posix_spawn_file_actions_init posix_spawn_file_actions_addopen posix_spawn_file_actions_addclose posix_spawn_file_actions_adddup2 posix_spawnattr_init posix_spawnattr_setpgroup posix_spawnattr_setsigmask posix_spawnattr_setsigdefault posix_spawnattr_setschedpolicy posix_spawnattr_setschedparam posix_spawnattr_setflags posix_spawnp posix_spawn posix_spawnattr_destroy posix_spawn_file_actions_destroy pthread_sigmask sigpending sigwait sigwaitinfo sigtimedwait sigfillset sigismember getpwuid_r getpwnam_r setpwent getpwent endpwent clock_settime pthread_getcpuclockid getrusage clock gettext dgettext dcgettext textdomain bindtextdomain bind_textdomain_codeset sigaction sigaltstack getrlimit setrlimit dlsym dlopen dlerror realpath dup";

function stub(_name: string) {
  return function () {
    // console.log(`stub.${_name}`, arguments);
    return "0";
  };
}

export const wasmEnv: { [name: string]: Function } = {};
for (const name of STUBS.split(" ")) {
  if (wasmEnv[name] != null) continue;
  wasmEnv[name] = stub(name);
}

interface Options {
  noWasi?: boolean; // if true, include wasi
  env?: object; // functions to include in the environment
  dir?: string | null; // WASI pre-opened directory; default is to preopen /, i.e., full filesystem; explicitly set as null to sandbox.
  traceSyscalls?: boolean;
  time?: boolean;
}

async function wasmImport(name: string, options: Options = {}): Promise<void> {
  const pathToWasm = `${name}${name.endsWith(".wasm") ? "" : ".wasm"}`;

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
        ...nodeBindings,
        fs,
      };
      // just give full access; security of fs access isn't
      // really relevant for us at this point
      opts.preopenDirectories = { "/": "/" };
    }
    wasi = new WASI(opts);
    wasmOpts.wasi_snapshot_preview1 = wasi.wasiImport;
  }

  //console.log(`reading ${pathToWasm}`);
  const source = await readFile(pathToWasm);
  const typedArray = new Uint8Array(source);
  const result = await WebAssembly.instantiate(typedArray, wasmOpts);
  if (wasi != null) {
    wasi.start(result.instance);
  }
}

export async function run(name: string, options: Options = {}): Promise<void> {
  await wasmImport(name, options);
}
