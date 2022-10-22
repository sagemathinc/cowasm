import * as debug from "debug";
const log = debug("browser:index");

import kernel from "./kernel";

async function main() {
  log("kernel:");
  await kernel();

  /*
  log("call python init");
  // noReadline saves a tiny amount of space; no terminal here so no need for readline
  const python = await asyncPython({ noReadline: true });
  (window as any).python = python;
  log("Loaded python");
  //const { exec, repr } = python;
  //log(await repr("2+3"));

  const element = document.createElement("pre");

  // load something nontrivial (a dynamic library) from the standard library:
  exec("import sqlite3");
  log(repr("sqlite3"));

  // Run some code in Python that defines variables n and s.
  exec("from random import randint; n = randint(0,10**6)");
  log("computed n = ", await repr("n"));
  exec("s = sum(range(n))");
  exec("import sys");
  // Use repr to get their string representation:
  element.innerHTML = `${await repr(
    "sys.version"
  )}\n\nLet's do some math!\n\n1 + 2 + 3 + ... + ${await repr("n")} = ${repr(
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
  exec(sql);
  element.innerHTML += `<br/><pre>\nHow about some SQL?\n${sql}</pre><br/>${await repr(
    "list(res)"
  )}`;
  document.body.appendChild(element);
*/
}

main();
