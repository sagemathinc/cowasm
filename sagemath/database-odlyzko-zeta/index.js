const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.odlyzko_zeta = join(exports.path, "share", "odlyzko_zeta");
