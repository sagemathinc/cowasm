/*
 * Copyright (C) 2021 William Stein <wstein@sagemath.com>
 * Copyright (C) 2015 Kovid Goyal <kovid at kovidgoyal.net>
 *
 * Distributed under terms of the BSD license
 */

import { dirname, join, normalize, resolve } from "path";
import { mkdirSync, writeFileSync, readFileSync } from "fs";
import { readFile } from "fs/promises";
import { runInThisContext } from "vm";
import { getImportDirs, once } from "./utils";
import createCompiler from "./compiler";

const PyLang = createCompiler();

// TODO
type Parsed = any;

// Async because also capable of reading to EOF from stdin.
async function readWholeFile(filename?: string): Promise<string> {
  if (filename) {
    return (await readFile(filename)).toString();
  }

  const chunks: string[] = [];
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (data) => {
    chunks.push(data.toString());
  });
  process.openStdin();
  await once(process.stdin, "end");
  return chunks.join("");
}

function process_cache_dir(dir: string): string {
  dir = resolve(normalize(dir));
  mkdirSync(dir, { recursive: true });
  return dir;
}

interface OutputOptions {
  beautify?: boolean;
  private_scope?: boolean;
  omit_baselib?: boolean;
  keep_docstrings?: boolean;
  discard_asserts?: boolean;
  module_cache_dir?: string;
  comments?: Function | boolean;
  baselib_plain?: string;
  sage?: boolean; // sage-style preparsing
}

export default async function Compile({
  argv,
  src_path,
  lib_path,
}: {
  argv: {
    cache_dir?: string;
    bare?: boolean;
    omit_baselib?: boolean;
    keep_docstrings?: boolean;
    discard_asserts?: boolean;
    files: string[];
    import_path: string;
    output?: string;
    execute?: boolean;
    stats?: boolean;
    filename_for_stdin?: string;
    comments?: string;
    sage?: boolean;
  };
  src_path: string;
  lib_path: string;
}): Promise<void> {
  // configure settings for the output
  const module_cache_dir = argv.cache_dir
    ? process_cache_dir(argv.cache_dir)
    : "";
  const outputOptions = {
    beautify: true,
    private_scope: !argv.bare,
    omit_baselib: argv.omit_baselib,
    keep_docstrings: argv.keep_docstrings,
    discard_asserts: argv.discard_asserts,
    module_cache_dir,
  } as OutputOptions;

  const files: string[] = argv.files.slice();
  const stats: { [name: string]: number } = {};
  const count = files.length || 1;

  function parseFile(code: string, filename: string): Parsed {
    return PyLang.parse(code, {
      filename,
      basedir: filename !== "<stdin>" ? dirname(filename) : undefined,
      libdir: join(src_path, "lib"),
      import_dirs: getImportDirs(argv.import_path),
      discard_asserts: argv.discard_asserts,
      module_cache_dir,
      sage: argv.sage,
    });
  }

  function writeOutput(output) {
    if (argv.output) {
      if (argv.output == "/dev/stdout") {
        // Node's filesystem module doesn't write directly to /dev/stdout
        console.log(output);
      } else if (argv.output == "/dev/stderr") {
        console.error(output);
      } else {
        writeFileSync(argv.output, output, "utf8");
      }
    } else if (!argv.execute) {
      console.log(output);
    }
    if (argv.execute) {
      // @ts-ignore
      global.require = require;
      runInThisContext(output);
    }
  }

  function timeIt(name: string, f: () => void): void {
    var t1 = new Date().getTime();
    f();
    if (argv.stats) {
      var spent = new Date().getTime() - t1;
      if (stats[name]) {
        stats[name] += spent;
      } else {
        stats[name] = spent;
      }
    }
  }

  async function compileSingleFile(code: string): Promise<void> {
    let topLevel;
    timeIt("parse", () => {
      const filename = files[0] || argv.filename_for_stdin || "<stdin>";
      try {
        topLevel = parseFile(code, filename);
      } catch (err) {
        if (!(err instanceof PyLang.SyntaxError)) {
          throw err;
        }
        console.error(err.toString());
        process.exit(1);
      }
    });

    let output;
    try {
      output = new PyLang.OutputStream(outputOptions);
    } catch (err) {
      if (err instanceof PyLang.DefaultsError) {
        console.error(err.message);
        process.exit(1);
      }
      throw err;
    }

    timeIt("generate", () => {
      topLevel.print(output);
    });

    output = output.get();
    writeOutput(output);
  }

  if (argv.comments) {
    if (/^\//.test(argv.comments)) {
      outputOptions.comments = new Function("return(" + argv.comments + ")")();
    } else if (argv.comments == "all") {
      outputOptions.comments = true;
    } else {
      outputOptions.comments = (_, comment) => {
        const { value } = comment;
        const { type } = comment;
        if (type == "comment2") {
          // multiline comment
          return /@preserve|@license|@cc_on/i.test(value);
        }
      };
    }
  }

  if (!argv.omit_baselib) {
    outputOptions.baselib_plain = readFileSync(
      join(lib_path, "baselib-plain-pretty.js"),
      "utf-8"
    );
  }

  if (files.filter((el) => el == "-").length > 1) {
    console.error(
      "ERROR: Can only read a single file from STDIN (two or more dashes specified)"
    );
    process.exit(1);
  }

  if (files.length > 0) {
    for (const filename of files) {
      await compileSingleFile(await readWholeFile(filename));
    }
  } else {
    await compileSingleFile(await readWholeFile());
  }

  if (argv.stats) {
    console.error(`Timing information (compressed ${count} files):`);
    for (const name in stats)
      console.error(`- ${name}: ${(stats[name] / 1000).toFixed(3)}s`);
  }
}
