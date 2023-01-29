/*
 * Copyright (C) 2021 William Stein <wstein@sagemath.com>
 * Copyright (C) 2015 Kovid Goyal <kovid at kovidgoyal.net>
 *
 * Distributed under terms of the BSD license
 */

import { statSync } from "fs";
import { delimiter } from "path";
import { createHash } from "crypto";
import { EventEmitter } from "events";
import { promisify } from "util";
import { normalize, join, dirname } from "path";

export const basePath = normalize(join(dirname(module.filename), "..", ".."));
export const importPath = join(basePath, "src", "lib");
export const libraryPath = join(basePath, "dist", "compiler");

export const comment_contents =
  /\/\*!?(?:\@preserve)?[ \t]*(?:\r\n|\n)([\s\S]*?)(?:\r\n|\n)[ \t]*\*\//;
const colors = ["red", "green", "yellow", "blue", "magenta", "cyan", "white"];

function ansi(code: number): string {
  code = code || 0;
  return String.fromCharCode(27) + "[" + code + "m";
}

export function pathExists(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch (e) {
    if (e.code != "ENOENT") {
      throw e;
    }
  }
  return false;
}

export function colored(
  string: string,
  color?: string,
  bold?: boolean
): string {
  if (!SUPPORTS_COLOR) {
    return string;
  }
  const prefix: string[] = [];
  if (bold) {
    prefix.push(ansi(1));
  }
  if (color) {
    prefix.push(ansi(colors.indexOf(color) + 31));
  }
  return prefix.join("") + string + ansi(0);
}

function supports_color(): boolean {
  const stdout = process.stdout;
  if (!stdout.isTTY) {
    return false;
  }

  if (process.platform === "win32") {
    return false;
  }

  if ("COLORTERM" in process.env) {
    return true;
  }

  if (process.env.TERM === "dumb") {
    return false;
  }

  if (
    process.env.TERM &&
    /^screen|^xterm|^vt100|color|ansi|cygwin|linux/i.test(process.env.TERM)
  ) {
    return true;
  }

  return false;
}

const SUPPORTS_COLOR: boolean = supports_color();

export function repeat(str: string, num: number): string {
  return new Array(num + 1).join(str);
}

export function generators_available(): boolean {
  var gen;
  try {
    eval("gen = function *(){}"); // jshint ignore:line
    return (
      typeof gen === "function" && gen.constructor.name == "GeneratorFunction"
    );
  } catch (e) {
    return false;
  }
}

export function wrap(lines: string[], width: number): string[] {
  const ans: string[] = [];
  let prev = "";
  for (let line of lines) {
    line = prev + line;
    prev = "";
    if (line.length > width) {
      prev = line.slice(width);
      if (prev) {
        prev += " ";
      }
      line = line.slice(0, width - 1);
      if (line.slice(-1) !== " ") {
        line += "-";
      }
    }
    ans.push(line);
  }
  if (prev) {
    return ans.concat(wrap([prev], width));
  }
  return ans;
}

export function merge(): any {
  // Simple merge of properties from all objects
  const ans = {};
  Array.prototype.slice.call(arguments).forEach((arg) => {
    Object.keys(arg).forEach(function (key) {
      ans[key] = arg[key];
    });
  });
  return ans;
}

export function getImportDirs(paths_string?: string, ignore_env?: boolean) {
  const paths: string[] = [];
  function merge(new_path: string) {
    if (!paths.includes(new_path)) {
      paths.push(new_path);
    }
  }
  if (!ignore_env && process?.env?.PYLANGPATH) {
    process.env.PYLANGPATH.split(delimiter).forEach(merge);
  }
  if (paths_string) {
    paths_string.split(delimiter).forEach(merge);
  }
  return paths;
}

export function sha1sum(data) {
  var h = createHash("sha1");
  h.update(data);
  return h.digest("hex");
}

export async function once(obj: EventEmitter, event: string): Promise<any> {
  if (!(obj instanceof EventEmitter)) {
    // just in case typescript doesn't catch something:
    throw Error("obj must be an EventEmitter");
  }
  function wait(cb: Function): void {
    obj.once(event, (...args) => {
      cb(undefined, args);
    });
  }
  return await promisify(wait)();
}
