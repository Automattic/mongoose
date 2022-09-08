'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('../index');
const Collection = mongoose.Collection;
const assert = require('assert');

const collectionNames = new Map();

if (process.env.D === '1') {
  mongoose.set('debug', true);
}
if (process.env.PRINT_COLLECTIONS) {
  after(function() {
    console.log('Colls', Array.from(collectionNames.entries()).sort((a, b) => a[1] - b[1]));
  });
}

/**
 * Override all Collection related queries to keep count
 */

[
  'createIndex',
  'findAndModify',
  'findOne',
  'find',
  'insert',
  'save',
  'update',
  'remove',
  'count',
  'distinct',
  'isCapped',
  'options'
].forEach(function(method) {
  const oldMethod = Collection.prototype[method];

  Collection.prototype[method] = function() {
    return oldMethod.apply(this, arguments);
  };
});

/**
 * Override Collection#onOpen to keep track of connections
 */

const oldOnOpen = Collection.prototype.onOpen;

Collection.prototype.onOpen = function() {
  return oldOnOpen.apply(this, arguments);
};

/**
 * Override Collection#onClose to keep track of disconnections
 */

const oldOnClose = Collection.prototype.onClose;

Collection.prototype.onClose = function() {
  return oldOnClose.apply(this, arguments);
};

/**
 * Create a connection to the test database.
 * You can set the environment variable MONGOOSE_TEST_URI to override this.
 *
 * @api private
 */

module.exports = function(options) {
  options || (options = {});
  let uri;

  if (options.uri) {
    uri = options.uri;
    delete options.uri;
  } else {
    uri = module.exports.uri;
  }

  const noErrorListener = !!options.noErrorListener;
  delete options.noErrorListener;
  options.enableUtf8Validation = false;

  const conn = mongoose.createConnection(uri, options);

  const model = conn.model;
  conn.model = function(name, schema, collection) {
    if (schema == null || schema._baseSchema != null) {
      // 2 cases: if calling `db.model(name)` to retrieve a model,
      // or if declaring a discriminator, skip adding the model name.
      return model.apply(this, arguments);
    }

    const collName = collection == null ? mongoose.pluralize(name) : collection;

    let count = collectionNames.get(collName) || 0;
    collectionNames.set(collName, ++count);
    return model.apply(this, arguments);
  };

  if (noErrorListener) {
    return conn;
  }

  conn.on('error', function(err) {
    assert.ok(err);
  });

  return conn;
};

function getUri(env, default_uri, db) {
  const use = env ? env : default_uri;
  const lastIndex = use.lastIndexOf('/');
  // use length if lastIndex is 9 or lower, because that would mean it found the last character of "mongodb://"
  return use.slice(0, lastIndex <= 9 ? use.length : lastIndex) + `/${db}`;
}

/**
 * Testing Databases, used for consistency
 */

const databases = module.exports.databases = [
  'mongoose_test',
  'mongoose_test_2'
];

/**
 * testing uri
 */

module.exports.uri = getUri(process.env.MONGOOSE_TEST_URI, 'mongodb://127.0.0.1:27017/', databases[0]);

/**
 * testing uri for 2nd db
 */

module.exports.uri2 = getUri(process.env.MONGOOSE_TEST_URI, 'mongodb://127.0.0.1:27017/', databases[1]);

/**
 * expose mongoose
 */

module.exports.mongoose = mongoose;

/**
 * expose mongod version helper
 */

module.exports.mongodVersion = async function() {
  return new Promise((resolve, reject) => {
    const db = module.exports();


    db.on('error', reject);

    db.on('open', function() {
      const admin = db.db.admin();
      admin.serverStatus(function(err, info) {
        if (err) {
          return reject(err);
        }
        const version = info.version.split('.').map(function(n) {
          return parseInt(n, 10);
        });
        db.close(function() {
          resolve(version);
        });
      });
    });
  });
};

async function dropDBs() {
  const db = await module.exports({ noErrorListener: true }).asPromise();
  await db.dropDatabase();
  await db.close();
}

before(async function() {
  this.timeout(60000);
  if (process.env.START_REPLICA_SET) {
    const uri = await startReplicaSet();

    module.exports.uri = uri;
    module.exports.uri2 = uri.replace(databases[0], databases[1]);

    process.env.REPLICA_SET = 'rs0';

    const conn = mongoose.createConnection(uri);
    await conn.asPromise();
    await conn.db.collection('test').findOne();
    await conn.close();
  }
});

before(dropDBs);

after(dropDBs);

process.on('unhandledRejection', function(error, promise) {
  if (error.$expected) {
    return;
  }
  if (promise.originalStack) {
    console.log('UnhandledRejection: ', promise.originalStack);
  }
  throw error;
});

async function startReplicaSet() {
  const ReplSet = require('mongodb-memory-server').MongoMemoryReplSet;

  // Create new instance
  const replSet = new ReplSet({
    binary: {
      version: '5.0.4'
    },
    instanceOpts: [
      // Set the expiry job in MongoDB to run every second
      {
        port: 27017,
        args: ['--setParameter', 'ttlMonitorSleepSecs=1']
      }
    ],
    dbName: databases[0],
    replSet: {
      name: 'rs0',
      count: 2,
      storageEngine: 'wiredTiger'
    }
  });

  await replSet.start();
  await replSet.waitUntilRunning();

  await new Promise(resolve => setTimeout(resolve, 10000));

  return replSet.getUri(databases[0]);
}
