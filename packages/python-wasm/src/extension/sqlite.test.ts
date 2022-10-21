import { syncPython } from "../node";

// TODO: note that non-in-memory sqlite currently definitely doesn't work at all... YET.
// That's clear even with the standalone binary.

test("use the sqlite module to do something", async () => {
  const { exec, repr } = await syncPython();
  exec(`
import sqlite3
con = sqlite3.connect(":memory:")
cur = con.cursor()
cur.execute("CREATE TABLE movies(title, year, score)")
cur.execute("INSERT INTO movies values('Red Dawn',1984,50)")
cur.execute("INSERT INTO movies values('Red Dawn',2012,15)")
res = cur.execute("SELECT * FROM movies")
`);
  expect(repr("list(res)")).toBe(
    "[('Red Dawn', 1984, 50), ('Red Dawn', 2012, 15)]"
  );
});
