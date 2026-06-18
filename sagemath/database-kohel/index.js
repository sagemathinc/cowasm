const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.databaseKohel = join(exports.path, "share", "database_kohel");
