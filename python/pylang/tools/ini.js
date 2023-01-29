/* vim:fileencoding=utf-8
 *
 * Copyright (C) 2015 Kovid Goyal <kovid at kovidgoyal.net>
 *
 * Distributed under terms of the BSD license
 */
"use strict"; /*jshint node:true */

var fs = require("fs");
var path = require("path");

function parse_ini_data(data) {
  // Based on MIT licensed code from:
  // https://github.com/shockie/node-iniparser/blob/master/lib/node-iniparser.js
  var ans = {},
    match;
  var lines = data.split(/\r\n|\r|\n/);
  var section = null;
  var section_pat = /^\s*\[\s*([^\]]*)\s*\]\s*$/;
  var param_pat = /^\s*([\w\.\-\_]+)\s*=\s*(.*?)\s*$/;
  var comment_pat = /^\s*;.*$/;

  lines.forEach(function (line) {
    if (comment_pat.test(line)) {
      return;
    } else if (param_pat.test(line)) {
      match = line.match(param_pat);
      if (section) {
        ans[section][match[1]] = match[2];
      } else {
        ans[match[1]] = match[2];
      }
    } else if (section_pat.test(line)) {
      match = line.match(section_pat);
      ans[match[1]] = {};
      section = match[1];
    } else if (line.length === 0 && section) {
      section = null;
    }
  });
  return ans;
}

function find_cfg_file(toplevel_dir) {
  var current_dir = toplevel_dir,
    previous_dir = toplevel_dir;
  do {
    try {
      return fs.readFileSync(path.join(current_dir, "setup.cfg"), "utf-8");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    previous_dir = current_dir;
    current_dir = path.dirname(current_dir);
  } while (current_dir != previous_dir && current_dir);

  return null;
}

function read_config(toplevel_dir) {
  var data = find_cfg_file(toplevel_dir);
  if (!data) return {};
  return parse_ini_data(data);
}

exports.read_config = read_config;
