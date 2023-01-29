/*
 * Copyright (C) 2021 William Stein <wstein@sagemath.com>
 * Copyright (C) 2015 Kovid Goyal <kovid at kovidgoyal.net>
 *
 * Distributed under terms of the BSD license
 */

import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { runInThisContext } from "vm";
import {
  getImportDirs,
  colored,
  importPath,
  libraryPath,
  pathExists,
} from "./utils";
import Completer from "./completer";
import { clearLine, createInterface } from "readline";
import createCompiler from "./compiler";
import { arch } from "os";

const DEFAULT_HISTORY_SIZE = 1000;
const HOME =
  process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"] ?? "/tmp";

function expandUser(x: string): string {
  return x.replace("~", HOME);
}

const CACHEDIR = process.env.XDG_CACHE_HOME
  ? expandUser(process.env.XDG_CACHE_HOME)
  : join(HOME, ".cache");

export interface Options {
  input;
  output;
  show_js: boolean;
  ps1: string;
  ps2: string;
  console: Console;
  terminal: boolean;
  histfile: string;
  historySize: number;
  mockReadline?: Function; // for mocking readline (for testing only)
  jsage?: boolean; // sage-style preparsing
  tokens?: boolean; // show very verbose tokens as parsed
}

function replDefaults(options: Partial<Options>): Options {
  if (!options.input) {
    options.input = process.stdin;
  }
  if (!options.output) {
    options.output = process.stdout;
  }
  if (options.show_js == null) {
    options.show_js = true;
  }
  if (!options.ps1) {
    if (options.jsage) {
      options.ps1 = process.stdin.isTTY ? "jsage: " : "";
    } else {
      options.ps1 = process.stdin.isTTY ? ">>> " : "";
    }
  }
  if (!options.ps2) {
    options.ps2 = process.stdin.isTTY ? "... " : "";
  }
  if (!options.console) {
    options.console = console;
  }
  if (options.terminal == null) {
    options.terminal = !!options.output?.isTTY;
  }
  if (options.histfile == null) {
    const CACHE = join(CACHEDIR, "pylang");
    if (!pathExists(CACHE)) {
      mkdirSync(CACHE, { recursive: true });
    }
    options.histfile = join(CACHE, "history");
  }
  options.historySize = options.historySize ?? DEFAULT_HISTORY_SIZE;
  return options as Options;
}

function readHistory(options: Options): string[] {
  if (options.histfile) {
    if (!pathExists(options.histfile)) {
      return [];
    }
    try {
      return readFileSync(options.histfile, "utf-8").split("\n");
    } catch (err) {
      options.console.warn(`Error reading history file - ${err}`);
      return [];
    }
  }
  return [];
}

function writeHistory(options: Options, history: string[]): void {
  if (options.histfile) {
    try {
      return writeFileSync(options.histfile, history.join("\n"), "utf-8");
    } catch (err) {
      options.console.warn(`Error writing history file - ${err}`);
    }
  }
}

function createReadlineInterface(options: Options, PyLang) {
  // See https://nodejs.org/api/readline.html#readline_readline_createinterface_options
  const completer = Completer(PyLang);
  const history = options.terminal ? readHistory(options) : [];
  const readline = (options.mockReadline ?? createInterface)({
    input: options.input,
    output: options.output,
    completer,
    terminal: options.terminal,
    history,
    historySize: options.historySize,
    tabSize: 4,
  });
  // @ts-ignore -- needed for older node.js
  readline.history = history;
  return readline;
}

export default async function Repl(options0: Partial<Options>): Promise<void> {
  const options = replDefaults(options0);
  const PyLang = createCompiler({
    console: options.console,
  });
  const readline = createReadlineInterface(options, PyLang);
  const colorize = options.mockReadline
    ? (string, _color?, _bold?) => string
    : colored;
  const ps1 = colorize(options.ps1, "blue");
  const ps2 = colorize(options.ps2, "green");

  // We capture input *during* initialization, so it
  // doesn't get lost, since initContext is async.
  let initLines: string[] = [];
  function duringInit(line: string) {
    initLines.push(line);
  }
  readline.on("line", duringInit);
  await initContext();
  readline.off("line", duringInit);

  const buffer: string[] = [];
  let more: boolean = false;
  const LINE_CONTINUATION_CHARS = ":\\";
  let toplevel;
  var importDirs = getImportDirs();

  /*
  Python 3.11.0 (main, Nov 29 2022, 20:26:05) [Clang 15.0.3 (git@github.com:ziglang/zig-bootstrap.git 0ce789d0f7a4d89fdc4d9571 on wasi
  */
  if (process.stdin.isTTY) {
    options.console.log(
      colorize(
        `Welcome to PyLang (${(new Date()).toLocaleString()}) [Node.js ${
          process.version
        } on ${arch()}].  ${
          options.jsage ? "\nType dir(jsage) for available functions." : ""
        }`,
        "green",
        true
      )
    );
  }

  function printAST(ast, keepBaselib?: boolean) {
    const output = new PyLang.OutputStream({
      omit_baselib: !keepBaselib,
      write_name: false,
      private_scope: false,
      beautify: true,
      keep_docstrings: true,
      baselib_plain: keepBaselib
        ? readFileSync(join(libraryPath, "baselib-plain-pretty.js"), "utf-8")
        : undefined,
    });
    ast.print(output);
    return output.get();
  }

  async function initContext() {
    // @ts-ignore
    global.require = require;

    // and get all the code and name.
    runInThisContext(printAST(PyLang.parse("(def ():\n yield 1\n)"), true));
    runInThisContext('var __name__ = "__repl__"; show_js=false;');
    if (options.jsage) {
      const BLOCK = true;
      if (BLOCK) {
        //const t = new Date().valueOf();
        // console.log("Initializing jsage...");
        const jsage = require("@jsage/lib");
        await jsage.init();
        //console.log(new Date().valueOf() - t);
      }
      runInThisContext("jsage = require('@jsage/lib');");
      runInThisContext("for(const x in jsage) { global[x] = jsage[x]; }");
    }
  }

  function resetBuffer() {
    buffer.splice(0, buffer.length);
  }

  function prompt(): void {
    let leadingWhitespace = "";
    if (more && buffer.length) {
      let prev_line = buffer[buffer.length - 1];
      if (prev_line.trimRight().slice(-1) == ":") {
        leadingWhitespace = "    ";
      }
      // Add to leadingWhitespace all the blank space at the beginning of prev_line, if any.
      const match = prev_line.match(/^\s+/);
      if (match) {
        leadingWhitespace += match[0];
      }
    }
    readline.setPrompt(more ? ps2 : ps1);
    readline.prompt();
    if (leadingWhitespace) {
      readline.write(leadingWhitespace);
    }
  }

  function runJS(js: string, noPrint: boolean): void {
    if (runInThisContext("show_js")) {
      options.console.log(
        colorize("---------- Compiled JavaScript ---------", "green", true)
      );
      options.console.log(js);
      options.console.log(
        colorize("---------- Running JavaScript ---------", "green", true)
      );
    }
    let result;
    try {
      global.console = options.console;
      result = runInThisContext(js);
    } catch (err) {
      if (err?.stack) {
        options.console.error(err?.stack);
      } else {
        options.console.error(err);
      }
    }

    if (!noPrint && result != null && global.ρσ_print != null) {
      // We just print out the last result using normal Python printing.
      try {
        global.ρσ_print(result);
      } catch (err) {
        if (err?.stack) {
          options.console.error(err?.stack);
        } else {
          options.console.error(err);
        }
      }
    }
  }

  // returns true if incomplete
  function compileAndRun(source: string): boolean {
    let time: number | undefined = undefined;
    if (source.startsWith("%time ") || source.startsWith("time ")) {
      time = 0;
      source = source.slice(5).trimLeft();
    }
    const classes = toplevel?.classes;
    const scoped_flags = toplevel?.scoped_flags;
    try {
      toplevel = PyLang.parse(source, {
        filename: "<repl>",
        basedir: process.cwd(),
        libdir: importPath,
        import_dirs: importDirs,
        classes,
        scoped_flags,
        jsage: options.jsage,
        tokens: options.tokens,
      });
    } catch (err) {
      if (err.is_eof && err.line == buffer.length && err.col > 0) {
        return true;
      }
      if (err.message && err.line !== undefined) {
        options.console.log(err.line + ":" + err.col + ":" + err.message);
      } else {
        options.console.log(err.stack || err);
      }
      return false;
    }
    const output = printAST(toplevel);
    if (classes) {
      const exports: { [name: string]: boolean } = {};
      for (const name in toplevel.exports) {
        exports[name] = true;
      }
      for (const name in classes) {
        if (!exports[name] && !toplevel.classes[name]) {
          toplevel.classes[name] = classes[name];
        }
      }
    }
    const noPrint = source.trimRight().endsWith(";");
    if (time != null) {
      time = new Date().valueOf();
    }
    runJS(output, noPrint);
    if (time) {
      console.log(`Wall time: ${new Date().valueOf() - time}ms`);
    }
    return false;
  }

  // returns true if incomplete
  function push(line: string): boolean {
    buffer.push(line);
    const trimmedLine = line.trimRight();
    if (
      trimmedLine &&
      LINE_CONTINUATION_CHARS.includes(trimmedLine.slice(-1))
    ) {
      // ends in continuation character after trimming whitespace
      return true;
    }
    const source = buffer.join("\n");
    if (!source.trim()) {
      // all whitespace
      resetBuffer();
      return false;
    }
    const isIncomplete = compileAndRun(source);
    if (!isIncomplete) {
      resetBuffer();
    }
    return isIncomplete;
  }

  function readLine(line: string) {
    if (more) {
      // We are in a block
      const lineIsEmpty = !line.trimLeft();
      if (lineIsEmpty && buffer.length > 0) {
        // We have an empty lines, so evaluate the block:
        more = push(line.trimLeft());
      } else {
        buffer.push(line);
      }
    } else {
      // Not in a block, evaluate line
      more = push(line);
    }
    prompt();
  }
  // Run code we received during initialization.
  for (const line of initLines) {
    readLine(line);
  }

  readline.on("line", readLine);

  readline.on("history", (history) => {
    // Note -- this only exists in node >15.x.
    if (options.terminal) {
      writeHistory(options, history);
    }
  });

  readline.on("close", () => {
    const { history } = readline as any; //  deprecated in node 15...
    if (history) {
      writeHistory(options, history);
    }
    options.console.log();
    process.exit(0);
  });

  readline.on("SIGINT", () => {
    clearLine(options.output, 0);
    options.console.log("Keyboard Interrupt");
    resetBuffer();
    more = false;
    prompt();
  });

  readline.on("SIGCONT", prompt);

  prompt();
}
