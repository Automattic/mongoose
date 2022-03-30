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

  resolve: {
    fallback: {
      assert: require.resolve('assert-browserify'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify')
    }
  },
  target: 'web',
  mode: 'production'
};

module.exports = webpackConfig;

