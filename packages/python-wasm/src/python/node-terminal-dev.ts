import { isMainThread } from "node:worker_threads";
import { init, terminal } from "./node";

async function main() {
  await init({ noZip: true, noWorker: false });
  const r = await terminal(
    [process.env.PROGRAM_NAME ?? "/usr/bin/zython"].concat(process.argv.slice(2))
  );
  process.exit(r);
}

if (isMainThread) {
  main();
}
