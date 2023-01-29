// Load Python kernel in the browser

import pythonWasm from "python-wasm";
import debug from "debug";
const log = debug("browser:python");

export default async function main() {
  log("call python init");
  // noReadline saves a tiny amount of space; no terminal here so no need for readline
  const t0 = new Date().valueOf();
  const python = await pythonWasm({ noReadline: true });
  const tm = new Date().valueOf() - t0;
  log("loaded python");
  (window as any).python = python;
  console.log("set window.python");
  const { exec, repr } = python;
  log(await repr("2+3"));

  const element = document.createElement("pre");

  // load something nontrivial (a dynamic library) from the standard library:
  await exec("import sqlite3");
  log(await repr("sqlite3"));

  // Run some code in Python that defines variables n and s.
  await exec("from random import randint; n = randint(0,10**6)");
  log("computed n = ", await repr("n"));
  await exec("s = sum(range(n))");
  await exec("import sys");
  // Use repr to get their string representation:
  element.innerHTML = `Load/startup time: ${tm}ms\n\n${await repr(
    "sys.version"
  )}\n\nLet's do some math!\n\n1 + 2 + 3 + ... + ${await repr(
    "n"
  )} = ${await repr("s")}`;

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
  await exec(sql);
  element.innerHTML += `<br/><pre>\nHow about some SQL?\n${sql}</pre><br/>${await repr(
    "list(res)"
  )}`;
  document.body.appendChild(element);
}
