/*
 * Copyright (C) 2021 William Stein <wstein@sagemath.com>
 * Copyright (C) 2015 Kovid Goyal <kovid at kovidgoyal.net>
 *
 * Distributed under terms of the BSD license
 */

import { basename, join } from "path";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import createCompiler from "./compiler";
import { colored } from "./utils";
import { deepEqual as origDeepEqual, AssertionError } from "assert";
import { tmpdir } from "os";
import { runInNewContext } from "vm";

const PyLang = createCompiler();

export default function (
  argv: { files: string[] },
  basePath,
  srcPath,
  libPath
) {
  // run all tests and exit
  const failures: string[] = [];
  let compilerDir = libPath;
  const testPath = join(basePath, "test");
  const baselib = readFileSync(
    join(libPath, "baselib-plain-pretty.js"),
    "utf-8"
  );

  const files =
    argv.files.length > 0
      ? argv.files.map((fname: string) =>
          fname.endsWith(".py") ? fname : fname + ".py"
        )
      : readdirSync(testPath)
          .filter((name) => /^[^_].*\.py$/.test(name))
          .map((name) => join(testPath, name));

  const t_start = new Date().valueOf();

  for (const filename of files) {
    const t0 = new Date().valueOf();
    let failed = false;
    let toplevel: any = undefined;
    try {
      const file = readFileSync(filename, "utf-8");
      if (file.toString().includes("# DISABLED")) {
        console.log(`Skipping ${filename}`);
        continue;
      }
      toplevel = PyLang.parse(file, {
        filename,
        toplevel: toplevel,
        basedir: testPath,
        libdir: join(srcPath, "lib"),
      });
    } catch (err) {
      failures.push(filename);
      failed = true;
      console.log(colored(filename, "red") + ": " + err + "\n\n");
      break;
    }

    // generate output
    const output = new PyLang.OutputStream({
      baselib_plain: baselib,
      beautify: true,
      keep_docstrings: true,
    });
    toplevel.print(output);

    // test that output performs correct JS operations
    const jsfile = join(tmpdir(), basename(filename) + ".js");
    const code = output.toString();
    const assrt = { ...require("assert"), deepEqual };

    // We save and restore the console attributes since some tests,
    // e.g., repl, have a side effect of stealing them, which means
    // we suddenly can't report results.
    const saveConsole = { ...console };
    const restoreConsole = () => {
      for (let name in saveConsole) {
        console[name] = saveConsole[name];
      }
    };
    try {
      runInNewContext(
        code,
        {
          assrt, // patched version
          __name__: jsfile,
          require: require,
          fs: require("fs"),
          PyLang,
          console,
          compiler_dir: compilerDir,
          test_path: testPath,
          Buffer,
        },
        { filename: jsfile }
      );
      restoreConsole();
    } catch (err) {
      restoreConsole();
      failures.push(filename);
      failed = true;
      writeFileSync(jsfile, code);
      console.error("Failed running: " + colored(jsfile, "red"));
      if (err.stack) {
        console.error(colored(filename, "red") + ":\n" + err.stack + "\n\n");
      } else {
        console.error(colored(filename, "red") + ": " + err + "\n\n");
      }
    }
    console.log(
      `${colored(filename, "green")}: test ${
        failed ? "FAILED" : "completed successfully"
      } (${new Date().valueOf() - t0}ms)`
    );
  }

  if (failures.length > 0) {
    console.log(
      colored("There were " + failures.length + " test failure(s):", "red")
    );
    console.log.apply(console, failures);
  } else {
    console.log(
      colored(
        `All tests passed! (${new Date().valueOf() - t_start}ms)`,
        "green"
      )
    );
  }
  process.exit(failures.length ? 1 : 0);
}

// Modified version of deepEqual test assertion that is more suitable
// for testing python code.
function deepEqual(a: any, b: any, message: any): void {
  if (Array.isArray(a) && Array.isArray(b)) {
    // Compare array objects that have extra properties as simple arrays
    if (a === b) return;
    if (a.length !== b.length)
      throw new AssertionError({
        actual: a,
        expected: b,
        operator: "deepEqual",
        stackStartFn: deepEqual,
      });
    for (let i = 0; i < a.length; i++) {
      deepEqual(a[i], b[i], message);
    }
  } else if (typeof a?.__eq__ === "function") {
    // Python operator overloading
    if (!a.__eq__(b))
      throw new AssertionError({
        actual: a,
        expected: b,
        operator: "deepEqual",
        stackStartFn: deepEqual,
      });
  } else {
    // Fallback to standard version in nodejs library.
    return origDeepEqual(a, b, message);
  }
}
