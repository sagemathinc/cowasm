const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.jonesNumfield = join(exports.path, "share", "jones_numfield");
