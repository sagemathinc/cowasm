const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.databaseCubicHecke = join(exports.path, "database_cubic_hecke");
