const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.elliptic_curves = join(exports.path, "share", "elliptic_curves");
exports.common = join(exports.elliptic_curves, "common");
exports.ellcurves = join(exports.elliptic_curves, "ellcurves");
