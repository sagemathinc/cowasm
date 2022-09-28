import { isMainThread } from "node:worker_threads";
import { init, terminal } from './node.js';

async function main() {
  await init();
  const r = await terminal(
    [process.env.PROGRAM_NAME ?? "/usr/bin/zython"].concat(
      process.argv.slice(2)
    )
  );
  process.exit(r);
}

if (isMainThread) {
  main();
}
