'use strict';

module.exports = {
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
          presets: ['es2015']
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


