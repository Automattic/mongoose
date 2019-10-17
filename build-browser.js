const config = require('./webpack.config.js');
const webpack = require('webpack');

const compiler = webpack(config);

console.log('Starting browser build...');
compiler.run((err, res) => {
  if (err) {
    console.err('Browser build unsuccessful.');
    process.exit(1);
  }
  console.log('Browser build successful.');
  process.exit(0);
});
