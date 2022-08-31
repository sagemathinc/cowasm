/*
This is an attempt to make the bundle
smaller by enabling measuring, dangerously removing some node
polyfills, etc.  It doesn't help much.

The Javascript download is about about 1.8MB gziped, and with these
optimizations it gets it down to about 1.6MB.

For comparison, emscripten's Javascript shipped with pyodide seems
to be on the order of 0.3MB.

The difference is that we use a bunch of standard modules, e.g., memfs,
unionfs, modules from node.js for buffers, process, streams, events, etc.
This is all very nice, documented, modern, and fits into a big ecosystem.
But it is also 1MB more Javascript.  It's a tradeoff.
*/

const { resolve } = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");

const NODE_MODULES = [
  "Buffer",
  "buffer",
  "events",
  "path",
  "process",
  "stream",
  "util",
];

module.exports = {
  mode: process.env.NODE_ENV == "production" ? "production" : "development",
  entry: "./src/index.ts",
  devtool: "inline-source-map",
  output: {
    filename: "[name].bundle.js",
    path: resolve(__dirname, "dist"),
    clean: true,
  },
  plugins: [
    new NodePolyfillPlugin({
      includeAliases: NODE_MODULES,
    }) /* required for python-wasm */,
    new HtmlWebpackPlugin({
      title: "Web Python Examples",
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: "static",
      reportFilename: "measure.html",
    }),
  ],
  module: {
    rules: [
      {
        test: /\.wasm$|\.zip$/ /* required for python-wasm */,
        type: "asset/resource",
      },
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    alias: { assert: false, url: false },
    extensions: [".tsx", ".ts", ".js"],
  },
  devServer: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
};

// Refactor same code in terminal and webpack packages.
if (process.env.COCALC_PROJECT_ID && process.env.NODE_ENV != "production") {
  const port = 8080;
  const basePath = `/${process.env.COCALC_PROJECT_ID}/port/${port}/`;
  // Working in a cocalc project, so do a bit more to support the base path under.
  module.exports.output.publicPath = basePath;
  module.exports.devServer.port = port;
  module.exports.devServer.allowedHosts = "all";
  module.exports.devServer.host = "0.0.0.0";
  module.exports.devServer.client = {
    webSocketURL: `auto://cocalc.com${basePath}ws`,
  };
  console.log(`https://cocalc.com${basePath}\n`);
}
