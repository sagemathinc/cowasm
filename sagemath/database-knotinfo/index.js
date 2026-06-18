const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.databaseKnotinfo = join(exports.path, "database_knotinfo");
