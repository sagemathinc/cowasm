import { resolve } from "path";
import createKernel from "./node";
import posix from "posix-node";

async function main() {
  const kernel = await createKernel();
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
  const r = await kernel.exec(argv);
  process.exit(r);
}

main();
