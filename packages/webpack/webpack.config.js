/*
This is a fairly minimal webpack config file for using wapython in a frontend
Javascript project that uses WebPack 5 (and Typescript).

The one nontrivial thing is the list resolve.fallback below, which are basically
the node.js polyfills for the browser. This is needed to be able to use the memfs
package, which our WASI support relies on. For your own projects, you'll need to
merge this list in, either using false or if you need that polyfill for some
other reason, keep your own config.
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
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    fallback: {
      process: false,
      url: false,
      assert: false,
      stream: false,
      util: false,
      buffer: false,
      events: false,
      path: require.resolve("path-browserify"),
    },
  },
};
