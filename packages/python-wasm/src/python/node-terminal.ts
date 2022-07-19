import { isMainThread } from "node:worker_threads";
import { terminal } from "./node";

async function main() {
  await terminal();
  process.exit(0); // todo -- exit code?
}

if (isMainThread) {
  main();
}
