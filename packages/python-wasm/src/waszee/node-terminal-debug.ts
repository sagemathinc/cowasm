import { resolve } from "path";
import { init, terminal } from "./node";

async function main() {
  await init({ debug: true });
  if (process.argv.length <= 2) {
    console.error(`Usage: waszee program [args ...]`);
    process.exit(1);
  }
  const program = resolve(process.argv[2]);
  const argv = [program].concat(process.argv.slice(3));
  const r = await terminal({ argv });
  process.exit(r);
}

main();
