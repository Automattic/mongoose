'use strict';

const paths = require('path');

const base = require('./webpack.base.config.js');

const webpackConfig = Object.assign({}, base, {
  entry: require.resolve('./browser.js'),
  output: {
    filename: './dist/browser.umd.js',
    path: paths.resolve(__dirname, ''),
    library: 'mongoose',
    libraryTarget: 'umd',
    // override default 'window' globalObject so browser build will work in SSR environments
    // may become unnecessary in webpack 5
    globalObject: 'typeof self !== \'undefined\' ? self : this',
  },
  externals: [
    /^node_modules\/.+$/
  ],
});

module.exports = webpackConfig;

