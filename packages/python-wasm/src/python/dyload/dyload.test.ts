import { exec, init } from "../node";

beforeEach(async () => {
  await init({ noWorker: false });
});

// Test that it is possible to import a dynamic library
test("sqlite3 loads", async () => {
  // Ensure it is running.
  await exec("import sqlite3");
});
