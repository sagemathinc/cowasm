const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.polytopes_db = join(exports.path, "share", "polytopes_db");
