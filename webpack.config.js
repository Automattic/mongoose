'use strict';

const paths = require('path');

const webpackConfig = {
  entry: require.resolve('./browser.js'),
  output: {
    filename: './dist/browser.umd.js',
    path: paths.resolve(__dirname, ''),
    library: 'mongoose',
    libraryTarget: 'umd',
    // override default 'window' globalObject so browser build will work in SSR environments
    // may become unnecessary in webpack 5
    globalObject: 'typeof self !== \'undefined\' ? self : this'
  },
  externals: [
    /^node_modules\/.+$/
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        include: [
          /\/mongoose\//i,
          /\/kareem\//i
        ],
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env']
        }
      }
    ]
  },
  node: {
    // Replace these Node.js native modules with empty objects, Mongoose's
    // browser library does not use them.
    // See https://webpack.js.org/configuration/node/
    dns: 'empty',
    fs: 'empty',
    module: 'empty',
    net: 'empty',
    tls: 'empty'
  },
  target: 'web',
  mode: 'production'
};

module.exports = webpackConfig;

