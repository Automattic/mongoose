'use strict';

const { after } = require('mocha');
const config = require('../.config');
const mongoose = require('mongoose');

before(async() => {
  await mongoose.connect(config.mongodbUri);
  await mongoose.connection.dropDatabase();
});

after(async function() {
  await mongoose.disconnect();
});
