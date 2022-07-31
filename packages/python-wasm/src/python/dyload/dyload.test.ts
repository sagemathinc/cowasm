export {};
test("nothing", () => {});
/*
DISABLED FOR NOW, until this is implemented
import { exec, init } from "../node";

beforeEach(async () => {
  await init({ noWorker: true });
});

// Test that it is possible to import a dynamic library
test("sqlite3 loads", async () => {
  // Ensure it is running.
  await exec("import sqlite3");
});
*/
