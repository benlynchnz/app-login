var webpack = require("webpack");
var ExtractTextPlugin = require("extract-text-webpack-plugin");
var path = require("path");
var fs = require("fs");
var config = require("./package.json");

module.exports = {
  entry: "./src/index.js",

  output: {
    filename: config.name + ".js",
    path: path.resolve("./dist"),
    libraryTarget: "umd"
  },

  module: {
    loaders: [
        {
          test: /\.js[x]?$/,
          loader: "babel-loader",
          exclude: /node_modules/,
          query: {
            optional: "es7.classProperties"
          }
        },
        {
          test: /\.css$/,
          loader: ExtractTextPlugin.extract("style-loader", "css-loader?module&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]!postcss-loader")
        }
    ]
  },

  postcss: [
    require("autoprefixer"),
    require("postcss-color-rebeccapurple")
  ],

  externals: {
    "react/addons": "React",
    moment: "moment",
    lodash: "_"
  },

  resolve: {
    modulesDirectories: ["node_modules", "components"]
  },

  plugins: [
    new ExtractTextPlugin(config.name + ".css", { allChunks: true })
  ]
};
