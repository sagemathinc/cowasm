import { isMainThread } from "node:worker_threads";
import { init, terminal } from "./node";

async function main() {
  await init({ debug: false });
  const r = await terminal({
    argv: [process.env.PROGRAM_NAME ?? "/bin/zash", "-V"].concat(
      process.argv.slice(2)
    ),
  });
  process.exit(r);
}

if (isMainThread) {
  main();
}
