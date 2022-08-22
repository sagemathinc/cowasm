import { exec, repr, init } from "../node";

beforeEach(async () => {
  await init({ debug: true });
});

test("use the sqlite module to do something", async () => {
  await exec(`
import sqlite3
con = sqlite3.connect(":memory:")
cur = con.cursor()
cur.execute("CREATE TABLE movie(title, year, score)")
res = cur.execute("SELECT name FROM sqlite_master")
`);
  expect(await repr("res.fetchone()")).toBe("('movie',)");
});
