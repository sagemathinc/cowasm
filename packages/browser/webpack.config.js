/*
This is a minimal webpack config file for using python-wasm in a frontend
Javascript project that uses WebPack 5 (and Typescript).   There are two
small things that you must:

- The NodePolyfillPlugin is needed because python-wasm
  uses memfs, which requires several polyfilled libraries.

- The wasm and zip asset/resource rules are needed so python-wasm
  can import the python wasm binary and zip filesystem.

*/

const { resolve } = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");

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
    new NodePolyfillPlugin() /* required for python-wasm */,
    new HtmlWebpackPlugin({
      title: "Web Python Examples",
    }),
  ],
  module: {
    rules: [
      {
        test: /\.wasm$|\.zip$|\.tar.xz$/ /* required for python-wasm */,
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
