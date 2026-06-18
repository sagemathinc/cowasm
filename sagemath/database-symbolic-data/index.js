const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.symbolicData = join(exports.path, "share", "symbolic_data");
