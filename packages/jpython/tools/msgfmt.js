/* vim:fileencoding=utf-8
 *
 * Copyright (C) 2015 Kovid Goyal <kovid at kovidgoyal.net>
 *
 * Distributed under terms of the BSD license
 */
"use strict"; /*jshint node:true */

function unesc(string) {
  return string
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");
}

function parse(data, on_error) {
  // Parse a PO file using a state machine (does not work for POT files). Also only extracts data useful
  // for JSON output.
  var plural_forms = null;
  var lines = data.split("\n");
  var entries = [];
  var current_entry = create_entry();
  var lnum = 0;
  var nplurals = null;
  var language = null;

  function fatal() {
    var msg = Array.prototype.slice.call(arguments).join(" ");
    if (on_error) {
      on_error(msg);
      return;
    }
    console.error(msg);
    process.exit(1);
  }

  function create_entry() {
    return {
      msgid: null,
      fuzzy: false,
      msgstr: [],
      msgid_plural: null,
      lnum: null,
    };
  }

  function parse_header() {
    var raw = current_entry.msgstr[0];
    if (raw === undefined) fatal("Header has no msgstr");
    raw.split("\n").forEach(function (line) {
      if (line.startsWith("Plural-Forms:")) {
        plural_forms = line.slice("Plural-Forms:".length).trim();
        var match = /^nplurals\s*=\s*(\d+)\s*;/.exec(plural_forms);
        if (!match || match[1] === undefined)
          fatal("Invalid Plural-Forms header:", plural_forms);
        nplurals = parseInt(match[1]);
      } else if (line.startsWith("Language:")) {
        language = line.slice("Language:".length).trim();
      }
    });
  }

  function commit_entry() {
    if (current_entry.msgid) {
      if (current_entry.msgid_plural !== null) {
        if (nplurals === null) fatal("Plural-Forms header missing");
        for (var i = 0; i < nplurals; i++) {
          if (current_entry.msgstr[i] === undefined)
            fatal("Missing plural form for entry at line number:", lnum);
        }
      }
      entries.push(current_entry);
    } else if (current_entry.msgid === "") parse_header();
    current_entry = create_entry();
  }

  function read_string(line) {
    line = line.trim();
    if (!line || line[0] !== '"' || line[line.length - 1] !== '"') {
      fatal("Expecting a string at line number:", lnum);
    }
    return unesc(line.slice(1, -1));
  }

  function continuation(line, lines, append, after) {
    if (line[0] === '"') append(read_string(line));
    else {
      state = after;
      after(line, lines);
    }
  }

  function start(line, lines) {
    if (line[0] === "#") {
      if (line[1] === ",") {
        line
          .slice(2)
          .trimLeft()
          .split(",")
          .forEach(function (flag) {
            if (flag.trim().toLowerCase() === "fuzzy")
              current_entry.fuzzy = true;
          });
      }
    } else if (line.startsWith("msgid ")) {
      current_entry.msgid = read_string(line.slice("msgid ".length));
      current_entry.lnum = lnum;
      state = function (line, lines) {
        continuation(
          line,
          lines,
          function (x) {
            current_entry.msgid += x;
          },
          after_msgid
        );
      };
    } else {
      fatal("Expecting msgid at line number:", lnum);
    }
  }

  function after_msgid(line, lines) {
    if (line.startsWith("msgid_plural ")) {
      current_entry.msgid_plural = read_string(
        line.slice("msgid_plural ".length)
      );
      state = function (line, lines) {
        continuation(
          line,
          lines,
          function (x) {
            current_entry.msgid_plural += x;
          },
          msgstr
        );
      };
    } else if (line.startsWith("msgstr ") || line.startsWith("msgstr[")) {
      state = msgstr;
      msgstr(line, lines);
    } else
      fatal("Expecting either msgstr or msgid_plural at line number:", lnum);
  }

  function msgstr(line, lines) {
    if (line.startsWith("msgstr ")) {
      if (current_entry.msgid_plural !== null)
        fatal("Expecting msgstr[0] at line number:", lnum);
      current_entry.msgstr.push(read_string(line.slice("msgstr ".length)));
      state = function (line, lines) {
        continuation(
          line,
          lines,
          function (x) {
            current_entry.msgstr[current_entry.msgstr.length - 1] += x;
          },
          msgstr
        );
      };
    } else if (line[0] === "#" || line.startsWith("msgid ")) {
      if (!current_entry.msgstr.length)
        fatal("Expecting msgstr at line number:", lnum);
      commit_entry();
      state = start;
      start(line, lines);
    } else if (line.startsWith("msgstr[")) {
      if (current_entry.msgid_plural === null)
        fatal("Expecting non-plural msgstr at line number:", lnum);
      var pnum = /^msgstr\[(\d+)\] /.exec(line);
      if (!pnum || pnum[1] === undefined)
        fatal("Malformed msgstr at line number:", lnum);
      var idx = parseInt(pnum[1]);
      current_entry.msgstr[idx] = read_string(line.slice(pnum[0].length));
      state = function (line, lines) {
        continuation(
          line,
          lines,
          function (x) {
            current_entry.msgstr[idx] += x;
          },
          msgstr
        );
      };
    } else fatal("Expecting msgstr or msgid at line number:", lnum);
  }

  var state = start;

  while (lines.length) {
    var line = lines.shift().trim();
    lnum += 1;
    if (!line) continue;
    state(line, lines);
  }
  commit_entry();
  if (language === null)
    fatal("No language specified in the header of this po file");
  return {
    entries: entries,
    plural_forms: plural_forms,
    nplurals: nplurals,
    language: language,
  };
}

function read_stdin(cont) {
  var chunks = [];
  process.stdin.setEncoding("utf8");

  process.stdin.on("readable", function () {
    var chunk = process.stdin.read();
    if (chunk) chunks.push(chunk);
  });

  process.stdin.on("end", function () {
    cont(chunks.join(""));
  });
}

function serialize_catalog(catalog, options) {
  if (!options.use_fuzzy)
    catalog.entries = catalog.entries.filter(function (e) {
      return !e.fuzzy;
    });
  var entries = {};
  catalog.entries.forEach(function (entry) {
    entries[entry.msgid] = entry.msgstr;
  });
  return JSON.stringify({
    plural_forms: catalog.plural_forms,
    entries: entries,
    language: catalog.language,
  });
}

module.exports.cli = function (argv, base_path, src_path, lib_path) {
  read_stdin(function process(data) {
    var catalog = parse(data);
    console.log(serialize_catalog(catalog, argv));
  });
};

module.exports.parse = parse;
module.exports.build = function (data, options) {
  return serialize_catalog(parse(data), options);
};
