const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.mutationClass = join(exports.path, "share", "mutation_class");
