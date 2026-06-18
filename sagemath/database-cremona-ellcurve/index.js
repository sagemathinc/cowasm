const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.cremona = join(exports.path, "share", "cremona");
exports.database = join(exports.cremona, "cremona.db");
