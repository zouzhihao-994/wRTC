const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
    entry: {
        './web_rtc': './src/index.js',
        './web_rtc.min': './src/index.js'
    },
    output: {
        filename: '[name].js',
        // library: 'RTCClient',
        globalObject: 'this',
        libraryTarget: 'umd',
    },
    mode: 'none',
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                include: /\.min\.js$/,
            })
        ]
    },
    module: {
        rules: [{
            test: /\.js$/,
            exclude: /node_modules/,
            use: 'babel-loader'
        }]
    }
}