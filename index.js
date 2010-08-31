require.paths.unshift(
  __dirname + './',
  __dirname + '/lib/mongoose',
  __dirname + '/support/node-mongodb-native/lib');

this.Mongoose = require('core').Mongoose;