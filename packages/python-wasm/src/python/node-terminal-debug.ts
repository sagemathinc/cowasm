import { isMainThread } from "node:worker_threads";
import { init, terminal } from "./node";

async function main() {
  await init({ noZip: true, noWorker: true });
  const r = await terminal(
    [process.env.PROGRAM_NAME ?? "/usr/bin/python-wasm"].concat(process.argv.slice(2))
  );
  process.exit(r);
}

if (isMainThread) {
  main();
}
