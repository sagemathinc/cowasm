/* vim:fileencoding=utf-8
 *
 * Copyright (C) 2016 Kovid Goyal <kovid at kovidgoyal.net>
 *
 * Distributed under terms of the BSD license
 */
"use strict"; /*jshint node:true */

var has_prop = Object.prototype.hasOwnProperty.call.bind(
  Object.prototype.hasOwnProperty
);

module.exports = function (compiler, baselib, runjs, name) {
  var LINE_CONTINUATION_CHARS = ":\\";
  runjs = runjs || eval;
  runjs(print_ast(compiler.parse(""), true));
  runjs('var __name__ = "' + (name || "__embedded__") + '";');

  function print_ast(
    ast,
    keep_baselib,
    keep_docstrings,
    private_scope,
    write_name
  ) {
    var output_options = {
      omit_baselib: !keep_baselib,
      write_name: !!write_name,
      private_scope: !!private_scope,
      beautify: true,
      keep_docstrings: keep_docstrings,
    };
    if (keep_baselib) output_options.baselib_plain = baselib;
    var output = new compiler.OutputStream(output_options);
    ast.print(output);
    return output.get();
  }

  return {
    toplevel: null,

    compile: (code, opts) => {
      opts = opts || {};
      var classes = this.toplevel ? this.toplevel.classes : undefined;
      var scoped_flags = this.toplevel ? this.toplevel.scoped_flags : undefined;
      this.toplevel = compiler.parse(code, {
        filename: opts.filename || "<embedded>",
        basedir: "__stdlib__",
        classes: classes,
        scoped_flags: scoped_flags,
        discard_asserts: opts.discard_asserts,
      });
      var ans = print_ast(
        this.toplevel,
        opts.keep_baselib,
        opts.keep_docstrings,
        opts.private_scope,
        opts.write_name
      );
      if (classes) {
        var class_exports = {};
        var self = this;
        this.toplevel.exports.forEach(function (name) {
          class_exports[name] = true;
        });
        Object.getOwnPropertyNames(classes).forEach(function (name) {
          if (
            !has_prop(class_exports, name) &&
            !has_prop(self.toplevel.classes, name)
          )
            self.toplevel.classes[name] = classes[name];
        });
      }
      scoped_flags = this.toplevel.scoped_flags;

      return ans;
    },
  };
};
