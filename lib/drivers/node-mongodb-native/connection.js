/*!
 * Module dependencies.
 */

'use strict';

const MongooseConnection = require('../../connection');
const STATES = require('../../connectionstate');
const setTimeout = require('../../helpers/timers').setTimeout;

/**
 * A [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) connection implementation.
 *
 * @inherits Connection
 * @api private
 */

function NativeConnection() {
  MongooseConnection.apply(this, arguments);
  this._listening = false;
}

/**
 * Expose the possible connection states.
 * @api public
 */

NativeConnection.STATES = STATES;

/*!
 * Inherits from Connection.
 */

Object.setPrototypeOf(NativeConnection.prototype, MongooseConnection.prototype);

/**
 * Switches to a different database using the same connection pool.
 *
 * Returns a new connection object, with the new db. If you set the `useCache`
 * option, `useDb()` will cache connections by `name`.
 *
 * **Note:** Calling `close()` on a `useDb()` connection will close the base connection as well.
 *
 * @param {String} name The database name
 * @param {Object} [options]
 * @param {Boolean} [options.useCache=false] If true, cache results so calling `useDb()` multiple times with the same name only creates 1 connection object.
 * @param {Boolean} [options.noListener=false] If true, the new connection object won't listen to any events on the base connection. This is better for memory usage in cases where you're calling `useDb()` for every request.
 * @return {Connection} New Connection Object
 * @api public
 */

NativeConnection.prototype.useDb = function(name, options) {
  // Return immediately if cached
  options = options || {};
  if (options.useCache && this.relatedDbs[name]) {
    return this.relatedDbs[name];
  }

  // we have to manually copy all of the attributes...
  const newConn = new this.constructor();
  newConn.name = name;
  newConn.base = this.base;
  newConn.collections = {};
  newConn.models = {};
  newConn.replica = this.replica;
  newConn.config = Object.assign({}, this.config, newConn.config);
  newConn.name = this.name;
  newConn.options = this.options;
  newConn._readyState = this._readyState;
  newConn._closeCalled = this._closeCalled;
  newConn._hasOpened = this._hasOpened;
  newConn._listening = false;
  newConn._parent = this;

  newConn.host = this.host;
  newConn.port = this.port;
  newConn.user = this.user;
  newConn.pass = this.pass;

  // First, when we create another db object, we are not guaranteed to have a
  // db object to work with. So, in the case where we have a db object and it
  // is connected, we can just proceed with setting everything up. However, if
  // we do not have a db or the state is not connected, then we need to wait on
  // the 'open' event of the connection before doing the rest of the setup
  // the 'connected' event is the first time we'll have access to the db object

  const _this = this;

  newConn.client = _this.client;

  if (this.db && this._readyState === STATES.connected) {
    wireup();
  } else {
    this.once('connected', wireup);
  }

  function wireup() {
    newConn.client = _this.client;
    const _opts = {};
    if (options.hasOwnProperty('noListener')) {
      _opts.noListener = options.noListener;
    }
    newConn.db = _this.client.db(name, _opts);
    newConn.onOpen();
  }

  newConn.name = name;

  // push onto the otherDbs stack, this is used when state changes
  if (options.noListener !== true) {
    this.otherDbs.push(newConn);
  }
  newConn.otherDbs.push(this);

  // push onto the relatedDbs cache, this is used when state changes
  if (options && options.useCache) {
    this.relatedDbs[newConn.name] = newConn;
    newConn.relatedDbs = this.relatedDbs;
  }

  return newConn;
};

/**
 * Closes the connection
 *
 * @param {Boolean} [force]
 * @return {Connection} this
 * @api private
 */

NativeConnection.prototype.doClose = async function doClose(force) {
  if (this.client == null) {
    return this;
  }

  let skipCloseClient = false;
  if (force != null && typeof force === 'object') {
    skipCloseClient = force.skipCloseClient;
    force = force.force;
  }

  if (skipCloseClient) {
    return this;
  }

  await this.client.close(force);
  // Defer because the driver will wait at least 1ms before finishing closing
  // the pool, see https://github.com/mongodb-js/mongodb-core/blob/a8f8e4ce41936babc3b9112bf42d609779f03b39/lib/connection/pool.js#L1026-L1030.
  // If there's queued operations, you may still get some background work
  // after the callback is called.
  await new Promise(resolve => setTimeout(resolve, 1));

  return this;
};


/*!
 * Module exports.
 */

module.exports = NativeConnection;
