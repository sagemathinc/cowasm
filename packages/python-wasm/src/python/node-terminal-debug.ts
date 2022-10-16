import { isMainThread } from "node:worker_threads";
import { init, terminal } from "./node";
import posix from "posix-node";

async function main() {
  await init({ noZip: true, noWorker: true });
  const r = await terminal(
    [process.env.PROGRAM_NAME ?? "/usr/bin/zython"].concat(
      process.argv.slice(2)
    )
  );
  process.exit(r);
}

if (isMainThread) {
  try {
    // node script [extra args]
    // node has a really simple model for whether or not
    // input is interactive
    if (process.argv.length > 2) {
      // input is NOT interactive shell; in this case we only
      // set stdin nonblocking; this keeps buffering
      posix.makeStdinNonblocking?.();
    } else {
      // input is interactive shell; we also disable buffering
      posix.enableRawInput?.();
    }
  } catch (_err) {}
  main();
}
