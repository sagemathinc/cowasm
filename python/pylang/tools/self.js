/*
 * self.js
 * Copyright (C) 2015 Kovid Goyal <kovid at kovidgoyal.net>
 *
 * Distributed under terms of the BSD license.
 */
"use strict"; /*jshint node:true */

var path = require("path");
var crypto = require("crypto");
var fs = require("fs");
var vm = require("vm");
var zlib = require("zlib");

function compile_baselib(PyLang, src_path) {
  var items = fs
    .readdirSync(path.join(src_path, "baselib"))
    .filter(function (name) {
      return name.endsWith(".py");
    });
  var ans = { pretty: "" };

  items.sort().forEach(function (fname) {
    var name = fname.slice(0, -3),
      ast;
    var raw = fs.readFileSync(path.join(src_path, "baselib", fname), "utf-8");
    try {
      ast = PyLang.parse(raw, {
        filename: fname,
        basedir: path.join(src_path, "baselib"),
      });
    } catch (e) {
      if (!(e instanceof PyLang.SyntaxError)) throw e;
      console.error(e.toString());
      process.exit(1);
    }
    var output = new PyLang.OutputStream({
      beautify: true,
      write_name: false,
      private_scope: false,
      omit_baselib: true,
    });
    ast.print(output);
    ans["pretty"] += output.get();
  });
  return ans;
}

function check_for_changes(base_path, src_path, signatures) {
  // Check if any of the files involved in the build process have changed,
  // as compared to the saved sha1 hashes from the last build
  var saved_hashes = {},
    hashes = {},
    sources = {};
  var compiler_changed = false,
    compiler_hash,
    source_hash;
  try {
    saved_hashes = JSON.parse(fs.readFileSync(signatures, "utf-8"));
  } catch (e) {
    if (e.code != "ENOENT") throw e;
  }

  var src_file_names = [];

  function process_dir(p) {
    fs.readdirSync(p).forEach(function (name) {
      var fp = path.join(p, name);
      if (name.endsWith(".py")) {
        src_file_names.push(path.relative(src_path, fp));
      } else if (name != "lib" && fs.statSync(fp).isDirectory()) {
        process_dir(fp);
      }
    });
  }
  process_dir(src_path);

  compiler_hash = crypto.createHash("sha1");
  source_hash = crypto.createHash("sha1");
  src_file_names.forEach(function (fname) {
    var src = path.join(src_path, fname);
    sources[src] = fs.readFileSync(src, "utf-8");
    compiler_hash.update(sources[src]);
    source_hash.update(sources[src]);
    var h = crypto.createHash("sha1");
    h.update(sources[src]);
    hashes[fname.split(".")[0]] = h.digest("hex");
  });
  var compiler_files = [
    module.filename,
    path.join(base_path, "tools", "compiler.ts"),
  ];
  compiler_files.forEach(function (fpath) {
    compiler_hash.update(fs.readFileSync(fpath, "utf-8"));
  });
  hashes["#compiler#"] = compiler_hash.digest("hex");
  hashes["#compiled_with#"] = saved_hashes["#compiler#"] || "unknown";
  source_hash = source_hash.digest("hex");
  if (hashes["#compiler#"] != saved_hashes["#compiler#"]) {
    console.log(
      "There are changes to the source files of the compiler, rebuilding"
    );
    compiler_changed = true;
  } else if (hashes["#compiled_with#"] != saved_hashes["#compiled_with#"]) {
    console.log("Re-building compiler with updated version of itself");
    compiler_changed = true;
  }

  return [source_hash, compiler_changed, sources, hashes];
}

import createCompiler from "./compiler";

function compile(src_path, lib_path, sources, source_hash, profile) {
  var file = path.join(src_path, "compiler.py");
  var t1 = new Date().getTime();
  var PyLang = createCompiler();
  var output_options, profiler, cpu_profile;
  var compiled_baselib = compile_baselib(PyLang, src_path);
  var out_path = lib_path;
  try {
    fs.mkdirSync(out_path);
  } catch (e) {
    if (e.code != "EEXIST") throw e;
  }
  output_options = { beautify: true, baselib_plain: compiled_baselib.pretty };

  var raw = sources[file],
    toplevel;

  function parse_file(code, file) {
    return PyLang.parse(code, {
      filename: file,
      basedir: path.dirname(file),
      libdir: path.join(src_path, "lib"),
    });
  }

  try {
    if (profile) {
      profiler = require("v8-profiler");
      profiler.startProfiling();
    }
    toplevel = parse_file(raw, file);
    if (profile) {
      cpu_profile = profiler.stopProfiling();
      fs.writeFileSync("self.cpuprofile", JSON.stringify(cpu_profile), "utf-8");
    }
  } catch (e) {
    if (!(e instanceof PyLang.SyntaxError)) throw e;
    console.error(e.toString());
    process.exit(1);
  }
  var output = new PyLang.OutputStream(output_options);
  toplevel.print(output);
  output = output.get().replace("__COMPILER_VERSION__", source_hash);
  fs.writeFileSync(path.join(out_path, "compiler.js"), output, "utf8");
  fs.writeFileSync(
    path.join(out_path, "baselib-plain-pretty.js"),
    compiled_baselib.pretty,
    "utf-8"
  );
  console.log(
    "Compiler built in",
    (new Date().getTime() - t1) / 1000,
    "seconds\n"
  );
  return output;
}

function run_single_compile(base_path, src_path, lib_path, profile) {
  var out_path = lib_path;
  var signatures = path.join(out_path, "signatures.json");
  var temp = check_for_changes(base_path, src_path, signatures);
  var source_hash = temp[0],
    compiler_changed = temp[1],
    sources = temp[2],
    hashes = temp[3];

  if (compiler_changed) {
    compile(src_path, lib_path, sources, source_hash, profile);
    fs.writeFileSync(signatures, JSON.stringify(hashes, null, 4));
  } else console.log("Compiler is built with the up-to-date version of itself");
  return compiler_changed;
}

module.exports = function compile_self(
  base_path,
  src_path,
  lib_path,
  complete,
  profile
) {
  var changed;
  do {
    changed = run_single_compile(base_path, src_path, lib_path, profile);
    lib_path = lib_path;
  } while (changed && complete);
};
