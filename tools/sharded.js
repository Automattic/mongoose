'use strict';

run().catch(error => {
  console.error(error);
  process.exit(-1);
});


async function run () {
  const Sharded = require('mongodb-topology-manager').Sharded;

  // Create new instance
  const topology = new Sharded({
    mongod: 'mongod',
    mongos: 'mongos'
  });

  await topology.addShard([{
    options: {
      bind_ip: 'localhost', port: 31000, dbpath: `/data/db/31000`, shardsvr: null
    }
  }], { replSet: 'rs1' });

  await topology.addConfigurationServers([{
    options: {
      bind_ip: 'localhost', port: 35000, dbpath: `/data/db/35000`
    }
  }], { replSet: 'rs0' });

  await topology.addProxies([{
    bind_ip: 'localhost', port: 51000, configdb: 'localhost:35000'
  }], {
    binary: 'mongos'
  });

  console.log('Start...');
  // Start up topology
  await topology.start();

  console.log('Started');

  // Shard db
  await topology.enableSharding('test');

  console.log('done');
}