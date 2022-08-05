'use strict';

const config = require('../webpack.config.js');
const webpack = require('webpack');

const compiler = webpack(config);

console.log('Starting browser build...');
compiler.run((err, stats) => {
  if (err) {
    console.err(stats.toString());
    console.err('Browser build unsuccessful.');
    process.exit(1);
  }
  console.log(stats.toString());
  console.log('Browser build successful.');
  process.exit(0);
});
