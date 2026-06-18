const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.stein_watkins = join(exports.path, "share", "stein_watkins");
