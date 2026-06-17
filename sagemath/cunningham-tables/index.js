const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.cunningham_tables = join(exports.path, "share", "cunningham_tables");
