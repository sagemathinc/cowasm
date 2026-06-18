const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.combinatorial_designs = join(exports.path, "share", "combinatorial_designs");
