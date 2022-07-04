/*
 * Copyright (C) 2021 William Stein <wstein@sagemath.com>
 * Copyright (C) 2015 Kovid Goyal <kovid at kovidgoyal.net>
 *
 * Distributed under terms of the BSD license
 */

import { runInThisContext } from "vm";
import { Compiler } from "./compiler";

type Token = any;

export default function Completer(compiler: Compiler) {
  const allKeywords: string[] = compiler.ALL_KEYWORDS.split(" ");

  function globalNames(): string[] {
    try {
      const names: string[] = runInThisContext(
        "Object.getOwnPropertyNames((() => this)())"
      );
      return [...new Set(names.concat(allKeywords))].sort();
    } catch (e) {
      console.log(e.stack || e.toString());
    }
    return [];
  }

  function objectNames(obj: any, prefix: string): string[] {
    if (obj == null) return [];

    const names: string[] = [];

    function add(o): void {
      const items = Object.getOwnPropertyNames(o).filter((name) =>
        name.startsWith(prefix)
      );
      names.push(...items);
    }

    let p;
    if (typeof obj === "object" || typeof obj === "function") {
      add(obj);
      p = Object.getPrototypeOf(obj);
    } else {
      p = obj.constructor?.prototype;
    }

    // Walk the prototype chain
    try {
      // Circular refs possible? Let's guard against that.
      for (let sentinel = 0; sentinel < 5 && p != null; sentinel++) {
        add(p);
        p = Object.getPrototypeOf(p);
      }
    } catch (_err) {}

    // unique and sorted:
    return [...new Set(names)].sort();
  }

  function prefixMatches(prefix: string, items: string[]): string[] {
    return items.filter((item) => item.startsWith(prefix)).sort();
  }

  function findCompletions(line: string) {
    let t;
    try {
      t = compiler.tokenizer(line, "<repl>");
    } catch (_err) {
      return [];
    }
    const tokens: Token[] = [];
    let token: Token;
    while (true) {
      try {
        token = t();
      } catch (_err) {
        return [];
      }
      if (token.type === "eof") break;
      if (token.type === "punc" && "(){},;:".includes(token.value)) {
        // empties the tokens since we care about what's next only
        tokens.splice(0, tokens.length);
      }
      tokens.push(token);
    }
    if (tokens.length == 0) {
      // New line or trailing space
      return [globalNames(), ""];
    }
    let lastTok: any = tokens[tokens.length - 1];
    if (
      lastTok.value === "." ||
      (lastTok.type === "name" && compiler.IDENTIFIER_PAT.test(lastTok.value))
    ) {
      lastTok = lastTok.value;
      if (lastTok === ".") {
        tokens.push({ value: "" });
        lastTok = "";
      }
      if (tokens.length > 1 && tokens[tokens.length - 2].value === ".") {
        // A compound expression
        let prefix = "";
        let result;
        for (const tok of tokens.slice(0, tokens.length - 2)) {
          prefix += tok.value;
        }
        if (prefix) {
          try {
            result = runInThisContext(prefix);
          } catch (e) {
            return [];
          }
          return [objectNames(result, lastTok), lastTok];
        }
      } else {
        return [prefixMatches(lastTok, globalNames()), lastTok];
      }
    }
    return [];
  }

  return findCompletions;
}
