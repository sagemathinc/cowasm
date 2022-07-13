/*
This is a fairly minimal webpack config file for using python-wasm in a frontend
Javascript project that uses WebPack 5 (and Typescript).

KEY POINTS:

- The list resolve.fallback below are basically the node.js polyfills for
the browser. This is needed to be able to use the memfs
package, which our WASI support relies on. For your own projects, you'll need to
merge this list in, either using false or if you need that polyfill for some
other reason, keep your own config.

- asset/resource rules are to serve the wasm and zip files.  This requires
extra configuration, but is much more efficient than embedding these files
in source code!

*/

const { resolve } = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

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
    new HtmlWebpackPlugin({
      title: "Web Python Examples",
    }),
  ],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.wasm$/,
        type: "asset/resource",
      },
      {
        test: /\.zip$/,
        type: "asset/resource",
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    fallback: {
      url: false,
      assert: false,
      stream: false,
      process: require.resolve("process/"),
      util: require.resolve("util/"),
      events: require.resolve("events/"),
      buffer: require.resolve("buffer/"),
      path: require.resolve("path-browserify"),
    },
  },
};
