import { init, terminal } from "./node";

async function main() {
  await init({ debug: true });
  const r = await terminal({
    argv: [process.env.PROGRAM_NAME ?? "/bin/zash", "-V"].concat(
      process.argv.slice(2)
    ),
  });
  process.exit(r);
}

main();
