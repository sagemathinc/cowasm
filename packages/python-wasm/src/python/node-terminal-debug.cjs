async function main() {
  const { init, terminal } = await import('./node.js');
  await init({ noZip: true, noWorker: true });
  const r = await terminal(
    [process.env.PROGRAM_NAME ?? "/usr/bin/zython"].concat(process.argv.slice(2))
  );
  process.exit(r);
}

main();
