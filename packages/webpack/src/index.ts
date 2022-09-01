import python from "python-wasm";

async function demo() {
  const log = console.log;
  const t0 = new Date();
  (window as any).python = python;

  // change to noWorker:true to not use a webworker, i.e., everything in the main thread.
  // Note that if noWorker =true, then dynamic library loading can't work.
  log("call python init");
  // noReadline saves a tiny amount of space; no terminal here so no need for readline
  await python.init({ noReadline: true });
  log(`Loaded python in ${new Date().valueOf() - t0.valueOf()}ms.`);

  const element = document.createElement("pre");
  log(await python.repr("2+3"));

  // load something nontrivial (a dynamic library) from the standard library:
  await python.exec("import sqlite3");
  log(await python.repr("sqlite3"));
  // Run some code in Python that defines variables n and s.
  await python.exec("from random import randint; n = randint(0,10**6)");
  log("computed n = ", await python.repr("n"));
  await python.exec("s = sum(range(n))");
  await python.exec("import sys");
  // Use python.repr to get their string representation:
  element.innerHTML = `${await python.repr(
    "sys.version"
  )}\n\nLet's do some math!\n\n1 + 2 + 3 + ... + ${await python.repr("n")} = ${await python.repr(
    "s"
  )}`;

  // do something with a little in memory table:
  const sql = `
import sqlite3
con = sqlite3.connect(":memory:")
cur = con.cursor()
cur.execute("CREATE TABLE movies(title, year, score)")
cur.execute("INSERT INTO movies values('Red Dawn',1984,50)")
cur.execute("INSERT INTO movies values('Red Dawn',2012,15)")
res = cur.execute("SELECT * FROM movies")
`;
  await python.exec(sql);
  element.innerHTML += `<br/><pre>\nHow about some SQL?\n${sql}</pre><br/>${await python.repr(
    "list(res)"
  )}`;

  document.body.appendChild(element);
}

demo();
