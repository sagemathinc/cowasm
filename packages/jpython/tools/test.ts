/*
 * Copyright (C) 2021 William Stein <wstein@sagemath.com>
 * Copyright (C) 2015 Kovid Goyal <kovid at kovidgoyal.net>
 *
 * Distributed under terms of the BSD license
 */

import { join } from "path";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import createCompiler from "./compiler";
import { colored, pathExists } from "./utils";
import { deepEqual as origDeepEqual, AssertionError } from "assert";
import { tmpdir } from "os";
import { runInNewContext } from "vm";

const JPython = createCompiler();

export default function (
  argv: { files: string[] },
  basePath,
  srcPath,
  libPath
) {
  // run all tests and exit
  const failures: string[] = [];
  let compilerDir = join(basePath, "dev");
  if (!pathExists(join(compilerDir, "compiler.js"))) {
    compilerDir = join(basePath, "release");
  }
  const testPath = join(basePath, "test");
  const baselib = readFileSync(
    join(libPath, "baselib-plain-pretty.js"),
    "utf-8"
  );

  const files =
    argv.files.length > 0
      ? argv.files.map((fname: string) => fname + ".py")
      : readdirSync(testPath).filter((name) => /^[^_].*\.py$/.test(name));

  const t_start = new Date().valueOf();

  for (const filename of files) {
    const t0 = new Date().valueOf();
    let failed = false;
    let toplevel: any = undefined;
    try {
      toplevel = JPython.parse(
        readFileSync(join(testPath, filename), "utf-8"),
        {
          filename,
          toplevel: toplevel,
          basedir: testPath,
          libdir: join(srcPath, "lib"),
        }
      );
    } catch (err) {
      failures.push(filename);
      failed = true;
      console.log(colored(filename, "red") + ": " + err + "\n\n");
      return;
    }

    // generate output
    const output = new JPython.OutputStream({
      baselib_plain: baselib,
      beautify: true,
      keep_docstrings: true,
    });
    toplevel.print(output);

    // test that output performs correct JS operations
    const jsfile = join(tmpdir(), filename + ".js");
    const code = output.toString();
    const assrt = { ...require("assert"), deepEqual };
    try {
      runInNewContext(
        code,
        {
          assrt, // patched version
          __name__: jsfile,
          require: require,
          fs: require("fs"),
          RapydScript: JPython, // todo...
          JPython,
          console,
          compiler_dir: compilerDir,
          test_path: testPath,
          Buffer,
        },
        { filename: jsfile }
      );
    } catch (err) {
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
