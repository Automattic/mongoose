'use strict';

/**
 * Module dependencies.
 */

const mongoose = require('../');
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
 * You can set the environmental variable MONGOOSE_TEST_URI to override this.
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

/*!
 * testing uri
 */

module.exports.uri = process.env.MONGOOSE_TEST_URI || 'mongodb://127.0.0.1:27017/mongoose_test';

/*!
 * testing uri for 2nd db
 */

module.exports.uri2 = 'mongodb://127.0.0.1:27017/mongoose_test_2';

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

function dropDBs(done) {
  const db = module.exports({ noErrorListener: true });
  db.once('open', function() {
    // drop the default test database
    db.db.dropDatabase(function() {
      done();
    });
  });
}


before(function(done) {
  this.timeout(60 * 1000);
  dropDBs(done);
});

after(function(done) {
  dropDBs(() => {});

  // Give `dropDatabase()` some time to run
  setTimeout(() => done(), 250);
});

beforeEach(function() {
  if (this.currentTest) {
    global.CURRENT_TEST = this.currentTest.title;
    if (this.currentTest.parent.title) {
      global.CURRENT_TEST = this.currentTest.parent.title + global.CURRENT_TEST;
    }
  } else {
    global.CURRENT_TEST = 'N/A';
  }
});

process.on('unhandledRejection', function(error, promise) {
  if (error.$expected) {
    return;
  }
  if (promise.originalStack) {
    console.log('UnhandledRejection: ', promise.originalStack);
  }
  throw error;
});
