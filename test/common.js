'use strict';

/**
 * Module dependencies.
 */

const Server = require('mongodb-topology-manager').Server;
const mongoose = require('../');
const Collection = mongoose.Collection;
const assert = require('assert');

let server;
const collectionNames = new Map();

if (process.env.D === '1') {
  mongoose.set('debug', true);
}
if (process.env.PRINT_COLLECTIONS) {
  after(function() {
    console.log('Colls', Array.from(collectionNames.entries()).sort((a, b) => a[1] - b[1]));
  });
}

// For 3.1.3 deprecations
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useNewUrlParser', true);
// 3.3.x deprecations
mongoose.set('useUnifiedTopology', true);

/**
 * Override all Collection related queries to keep count
 */

[
  'createIndex',
  'ensureIndex',
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
 * ignore
 */

before(function(done) {
  module.exports.mongodVersion(function(err, version) {
    if (err) {
      return done(err);
    }
    const mongo36 = version[0] > 3 || (version[0] === 3 && version[1] >= 6);
    if (mongo36) {
      mongoose.set('usePushEach', true);
    }
    done();
  });
});

/*!
 * testing uri
 */

module.exports.uri = 'mongodb://localhost:27017/mongoose_test';

/*!
 * testing uri for 2nd db
 */

module.exports.uri2 = 'mongodb://localhost:27017/mongoose_test_2';

/**
 * expose mongoose
 */

module.exports.mongoose = mongoose;

/**
 * expose mongod version helper
 */

module.exports.mongodVersion = function(cb) {
  const db = module.exports();
  db.on('error', cb);

  db.on('open', function() {
    const admin = db.db.admin();
    admin.serverStatus(function(err, info) {
      if (err) {
        return cb(err);
      }
      const version = info.version.split('.').map(function(n) {
        return parseInt(n, 10);
      });
      db.close(function() {
        cb(null, version);
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

before(function() {
  return server.purge();
});

after(function() {
  this.timeout(15000);

  return server.stop();
});

before(function(done) {
  this.timeout(10 * 1000);
  dropDBs(done);
});

after(function(done) {
  dropDBs(() => {});

  // Give `dropDatabase()` some time to run
  setTimeout(() => done(), 250);
});

module.exports.server = server = new Server('mongod', {
  bind_ip: '127.0.0.1',
  port: 27000,
  dbpath: './data/db/27000'
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
