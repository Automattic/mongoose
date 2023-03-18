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

function getUri(default_uri, db) {
  const env = process.env.START_REPLICA_SET ? process.env.MONGOOSE_REPLSET_URI : process.env.MONGOOSE_TEST_URI;
  const use = env ? env : default_uri;
  const lastIndex = use.lastIndexOf('/');
  const dbQueryString = use.slice(lastIndex);
  const queryIndex = dbQueryString.indexOf('?');
  const query = queryIndex === -1 ? '' : '?' + dbQueryString.slice(queryIndex + 1);
  // use length if lastIndex is 9 or lower, because that would mean it found the last character of "mongodb://"
  return use.slice(0, lastIndex <= 9 ? use.length : lastIndex) + `/${db}` + query;
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

// the following has to be done, otherwise mocha will evaluate this before running the global-setup, where it becomes the default
Object.defineProperty(module.exports, 'uri', {
  get: () => getUri('mongodb://127.0.0.1:27017/', databases[0])
});

/**
 * testing uri for 2nd db
 */

Object.defineProperty(module.exports, 'uri2', {
  get: () => getUri('mongodb://127.0.0.1:27017/', databases[1])
});

/**
 * expose mongoose
 */

module.exports.mongoose = mongoose;

/**
 * expose mongod version helper
 */

module.exports.mongodVersion = async function() {
  const db = await module.exports();

  const admin = db.client.db().admin();

  const info = await admin.serverStatus();
  const version = info.version.split('.').map(function(n) {
    return parseInt(n, 10);
  });
  await db.close();
  return version;
};

async function dropDBs() {
  this.timeout(60000);

  // retry the "dropDBs" actions if the error is "operation was interrupted", which can often happen in replset CI tests
  let retries = 5;
  while (retries > 0) {
    retries -= 1;
    try {
      await _dropDBs();
    } catch (err) {
      if (err instanceof mongoose.mongo.MongoWriteConcernError && /operation was interrupted/.test(err.message)) {
        console.log('DropDB operation interrupted, retrying'); // log that a error was thrown to know that it is going to re-try
        continue;
      }

      throw err;
    }
  }
}

async function _dropDBs() {
  const db = await module.exports({ noErrorListener: true }).asPromise();
  await db.dropDatabase();
  await db.close();
}

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
