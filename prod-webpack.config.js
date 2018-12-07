const path = require('path');
const webpack = require('webpack');
const DefinePlugin = require("webpack/lib/DefinePlugin");

let webpackConfig = require('./webpack.config.js');

webpackConfig.entry = {
    app: './app/main.js'
};

webpackConfig.output = {
    path: path.join(__dirname, 'dist'),
    filename: '[name].js',
    publicPath: ''
};

webpackConfig.devServer = undefined;

webpackConfig.plugins = [
    new webpack.HashedModuleIdsPlugin(),
    new DefinePlugin({
        'process.env': {
            NODE_ENV: '"production"'
        }
    })
];

webpackConfig.devtool = undefined;

module.exports = webpackConfig;
