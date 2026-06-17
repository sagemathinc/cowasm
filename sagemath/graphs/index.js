const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.graphs = join(exports.path, "share", "graphs");
