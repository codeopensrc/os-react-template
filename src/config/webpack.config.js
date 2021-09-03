"use strict";

const path = require("path")

const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

let plugins = [ new HtmlWebpackPlugin({
        template: "./src/html/template.html",
        filename: "index.html",
        hash: true
    })
]

process.argv.indexOf("--optimize-minimize") > -1
    ? plugins.push( new webpack.DefinePlugin({ 'process.env': { NODE_ENV: JSON.stringify('production')  } }) )
    : ""

module.exports = [{
    watchOptions: {
        poll: 500,
        aggregateTimeout: 400,
    },
    entry: {
        app: [ "./src/config/globals.js", "./src/config/polyfills.js", "./src/jsx/Entry.jsx"]
    },
    output: {
        path: path.resolve(__dirname, "../../pub"),
        publicPath: "",
        filename: "[name].bundle.js"
    },
    module: {
        loaders: [
            {test: /\.less/, loaders: ["style-loader", "css-loader", "less-loader"] },
            {test: /\.jsx/, loader: "babel-loader", query: {cacheDirectory: true, presets: ["es2015", "react", "stage-0"] }},
            {test: /\.js/, loader: "babel-loader", query: {cacheDirectory: true, presets: ["es2015", "react", "stage-0"] }}
        ]
    },
    resolve: ["", ".less", ".js", ".jsx"],
    plugins: plugins
}]
