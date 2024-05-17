'use strict';

/*!
 * Module dependencies.
 */

const mongodbDriver = require('./drivers/node-mongodb-native');

require('./driver').set(mongodbDriver);

const mongoose = require('./mongoose');

mongoose.setDriver(mongodbDriver);

mongoose.Mongoose.prototype.mongo = require('mongodb');

module.exports = mongoose;
