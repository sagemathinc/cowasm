const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.seadata = join(exports.path, "share", "pari", "seadata");
