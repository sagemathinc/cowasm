pub fn keepalive() void {}
const posix_wasm = @cImport(@cInclude("posix-wasm.h"));

// Defined in posix-wasm.h, since it's disabled in wasi:
// struct sched_param
// {
//   int sched_priority;
// };

export fn get_posix_spawnattr_schedparam_sched_priority(schedparam: *const posix_wasm.sched_param) c_int {
    return schedparam.sched_priority;
}

export fn set_posix_spawnattr_schedparam_sched_priority(schedparam: *posix_wasm.sched_param, sched_priority: c_int) void {
    schedparam.sched_priority = sched_priority;
}
