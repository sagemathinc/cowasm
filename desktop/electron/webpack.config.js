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
  entry: "./src/renderer.ts",
  devtool: "inline-source-map",
  output: {
    filename: "[name].bundle.js",
    path: resolve(__dirname, "dist/renderer"),
    clean: true,
  },
  plugins: [
    new NodePolyfillPlugin() /* required for python-wasm */,
    new HtmlWebpackPlugin({
      title: "CoWasm Desktop",
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
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
};
