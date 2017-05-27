'use strict';

const co = require('co');

co(function*() {
  var ReplSet = require('mongodb-topology-manager').ReplSet;

  // Create new instance
  var topology = new ReplSet('mongod', [{
    // mongod process options
    options: {
      bind_ip: 'localhost', port: 31000, dbpath: `${__dirname}/31000`
    }
  }, {
    // mongod process options
    options: {
      bind_ip: 'localhost', port: 31001, dbpath: `${__dirname}/31001`
    }
  }, {
    // Type of node
    arbiterOnly: true,
    // mongod process options
    options: {
      bind_ip: 'localhost', port: 31002, dbpath: `${__dirname}/31002`
    }
  }], {
    replSet: 'rs'
  });

  yield topology.start();

  console.log('done');
}).catch(error => {
  console.error(error);
  process.exit(-1);
});
