const { join } = require("path");

exports.path = join(__dirname, "dist", "wasm");
exports.nftables = join(exports.path, "share", "pari", "nftables");
