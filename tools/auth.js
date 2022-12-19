'use strict';

const Server = require('mongodb-topology-manager').Server;
const mongodb = require('mongodb');

run().catch(error => {
  console.error(error);
  process.exit(-1);
});

async function run() {
  // Create new instance
  const server = new Server('mongod', {
    auth: null,
    dbpath: '/data/db/27017'
  });

  // Purge the directory
  await server.purge();

  // Start process
  await server.start();

  const db = await mongodb.MongoClient.connect('mongodb://127.0.0.1:27017/admin');

  await db.addUser('passwordIsTaco', 'taco', {
    roles: ['dbOwner']
  });

  console.log('done');
}
