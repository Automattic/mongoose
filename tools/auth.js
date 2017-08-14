'use strict';

const Server = require('mongodb-topology-manager').Server;
const co = require('co');
const mongodb = require('mongodb');

co(function*() {
  // Create new instance
  var server = new Server('mongod', {
    auth: null,
    dbpath: '/data/db/27017'
  });

  // Purge the directory
  yield server.purge();

  // Start process
  yield server.start();

  const db = yield mongodb.MongoClient.connect('mongodb://localhost:27017/admin');

  yield db.addUser('passwordIsTaco', 'taco', {
    roles: ['dbOwner']
  });

  console.log('done');
}).catch(error => {
  console.error(error);
  process.exit(-1);
});
