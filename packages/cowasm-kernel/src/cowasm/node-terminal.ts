import { resolve } from "path";
import { syncKernel } from "./node";
import posix from "posix-node";

async function main() {
  // TODO: could get asyncKernel instead via command line option or env variable (?)
  const kernel = await syncKernel();
  if (process.argv.length <= 2) {
    console.error(`Usage: cowasm program [args ...]`);
    process.exit(1);
  }
  const program = resolve(process.argv[2]);
  const argv = [program].concat(process.argv.slice(3));
  try {
    posix.enableRawInput?.();
  } catch (_err) {
    // this will fail if stdin is not interactive; that's fine.
    try {
      posix.makeStdinNonblocking?.();
    } catch (_err) {}
  }
  const r = kernel.exec(argv);
  process.exit(r);
}

main();
