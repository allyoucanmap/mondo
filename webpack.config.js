const webpack = require('webpack');
const path = require("path");
const DefinePlugin = require("webpack/lib/DefinePlugin");

module.exports = {
    entry: {
        'app': [
            'webpack/hot/only-dev-server',
            './app/main.js'
        ]
    },
    output: {
        path: '/public/built',
        filename: '[name].js',
        publicPath: 'http://localhost:8079/built/'
    },
    devServer: {
        port: 8079,
        contentBase: path.join(__dirname, 'app'),
        publicPath: 'http://localhost:8079/built/'
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                loader: 'style-loader!css-loader'
            },
            {
                test: /\.less$/,
                loader: 'style-loader!css-loader!less-loader'
            },
            {
                test: /\.jsx$/,
                loader: 'react-hot-loader',
                include: /app/
            },
            {
                test: /\.jsx$/,
                loader: 'babel-loader',
                include: /app/
            },
            {
                test: /\.vert$/,
                loader: 'raw-loader',
                include: /gl/
            },
            {
                test: /\.frag$/,
                loader: 'raw-loader',
                include: /gl/
            }
        ]
    },
    plugins: [
        new webpack.HashedModuleIdsPlugin(),
        new DefinePlugin({
            'process.env': {
                NODE_ENV: '"development"'
            }
        })
    ],
    node: {
        fs: 'empty'
    },
    devtool: 'eval'
};
