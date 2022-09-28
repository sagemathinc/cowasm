import { exec, repr, init } from '../node.js';

beforeEach(async () => {
  await init({ debug: true });
});

test("use the sqlite module to do something", async () => {
  await exec(`
import sqlite3
con = sqlite3.connect(":memory:")
cur = con.cursor()
cur.execute("CREATE TABLE movies(title, year, score)")
cur.execute("INSERT INTO movies values('Red Dawn',1984,50)")
cur.execute("INSERT INTO movies values('Red Dawn',2012,15)")
res = cur.execute("SELECT * FROM movies")
`);
  expect(await repr("list(res)")).toBe("[('Red Dawn', 1984, 50), ('Red Dawn', 2012, 15)]");
});
