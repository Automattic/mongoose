'use strict';

const webpack = require('webpack');
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
    alias: {
      'bn.js': require.resolve('bn.js')
    },
    fallback: {
      assert: require.resolve('assert-browserify'),
      buffer: require.resolve('buffer'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify')
    }
  },
  target: 'web',
  mode: 'production',
  plugins: [
    new webpack.DefinePlugin({
      process: '({env:{}})'
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    })
  ]
};

module.exports = webpackConfig;

