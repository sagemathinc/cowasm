const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.elldata = join(exports.path, "share", "pari", "elldata");
