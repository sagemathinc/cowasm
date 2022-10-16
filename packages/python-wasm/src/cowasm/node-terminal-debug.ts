import { resolve } from "path";
import { init, terminal } from "./node";
import posix from "posix-node";

async function main() {
  await init({ debug: true });
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
  }
  const r = await terminal({ argv });
  process.exit(r);
}

main();
