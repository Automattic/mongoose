'use strict';

const co = require('co');
run().catch(error => {
  console.error(error);
  process.exit(-1);
});

async function run () {
  const ReplSet = require('mongodb-topology-manager').ReplSet;

  // Create new instance
  const topology = new ReplSet('mongod', [{
    // mongod process options
    options: {
      bind_ip: 'localhost', port: 31000, dbpath: `/data/db/31000`
    }
  }, {
    // mongod process options
    options: {
      bind_ip: 'localhost', port: 31001, dbpath: `/data/db/31001`
    }
  }, {
    // Type of node
    arbiterOnly: true,
    // mongod process options
    options: {
      bind_ip: 'localhost', port: 31002, dbpath: `/data/db/31002`
    }
  }], {
    replSet: 'rs'
  });

  await topology.start();

  console.log('done');
}
