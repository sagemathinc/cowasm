import { exec, init, repr } from './node.js';

beforeEach(async () => {
  await init({ noWorker: true });
});

test("that creating a directory works, and can get isting on new directory", async () => {
  const path = `/tmp/${Math.random()}`;
  try {
    await exec(`import os; os.makedirs('${path}')`);
    expect(await repr(`os.path.exists('${path}')`)).toBe("True");
    expect(await repr(`os.listdir('${path}')`)).toBe("[]");
  } finally {
    await exec(`os.unlink('${path}')`);
  }
});
