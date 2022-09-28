import { isMainThread } from "node:worker_threads";

async function main() {
  const { init, terminal } = await import('./node.js');
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
