const { join } = require("path");
exports.path = join(__dirname, "dist", "native");
exports.bin = join(__dirname, "dist", "native", "bin", "ninja");
