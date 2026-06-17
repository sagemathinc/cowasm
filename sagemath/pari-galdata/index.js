const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.galdata = join(exports.path, "share", "pari", "galdata");
