require.paths.unshift(__dirname + '/lib/support/node-mongodb-native/lib');

this.Mongoose = require('./lib/core').Mongoose;