const dateFormat = require("date-format");

export default function time({ child_process, getView, os }) {
  return {
    // int clock_settime(clockid_t clk_id, const struct timespec *tp);
    clock_settime(_clk_id: number, timespec: number): number {
      if (child_process.spawnSync == null) {
        throw Error("clock_settime is not supported on this platform");
      }
      // NOTE: We assume the clk_id is CLOCK_REALTIME without a check.

      const view = getView();
      const tv_sec = view.getUint32(timespec, true);
      // we ignore nanoseconds here; the date commands aren't that precise anyways.

      let cmd,
        cmd2 = "",
        args,
        args2 = [];

      switch (os.platform?.()) {
        case "darwin":
          // date -f "%s" "1660173350"  # <-- number of seconds.
          cmd = "date";
          args = ["-f", "%s", `${tv_sec}`];
          break;
        case "linux":
          // date --date='@2147483647' # <-- number of seconds
          cmd = "date";
          args = [`--set=@${tv_sec}`];
          break;
        case "win32":
          const dateTime = new Date(1000 * tv_sec);
          cmd = "date";
          args = [dateFormat("m/d/yyyy", dateTime)];
          cmd2 = "time";
          args = [dateFormat("HH:MM:ss", dateTime)];
          break;
        default:
          throw Error(
            `clock_settime not supported on platform  = ${os.platform?.()}`
          );
      }
      const { status, stderr } = child_process.spawnSync(cmd, args);
      if (status) {
        throw Error(`clock_settime failed - ${stderr}`);
      }
      if (cmd2) {
        const { status, stderr } = child_process.spawnSync(cmd2, args2);
        if (status) {
          throw Error(`clock_settime failed - ${stderr}`);
        }
      }
      return 0;
    },
  };
}
