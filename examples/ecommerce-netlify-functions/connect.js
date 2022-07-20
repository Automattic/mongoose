'use strict';

const config = require('./.config');
const mongoose = require('mongoose');

let conn = null;

module.exports = async function connect() {
  if (conn != null) {
    return conn;
  }
  conn = mongoose.connection;
  await mongoose.connect(config.mongodbUri);
  return conn;   
}