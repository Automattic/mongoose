'use strict';

/*!
 * Module dependencies.
 */

const mongodbDriver = require('./drivers/node-mongodb-native');

require('./driver').set(mongodbDriver);

const mongoose = require('./mongoose');

mongoose.setDriver(mongodbDriver);

/**
 * The [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) driver Mongoose uses.
 *
 * @property mongo
 * @api public
 */

mongoose.Mongoose.prototype.mongo = require('mongodb');

module.exports = mongoose;
