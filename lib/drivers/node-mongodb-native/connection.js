/*!
 * Module dependencies.
 */

'use strict';

const MongooseConnection = require('../../connection');
const MongooseError = require('../../error/index');
const STATES = require('../../connectionState');
const mongodb = require('mongodb');
const pkg = require('../../../package.json');
const processConnectionOptions = require('../../helpers/processConnectionOptions');
const setTimeout = require('../../helpers/timers').setTimeout;
const utils = require('../../utils');
const Schema = require('../../schema');

/**
 * A [node-mongodb-native](https://github.com/mongodb/node-mongodb-native) connection implementation.
 *
 * @inherits Connection
 * @api private
 */

function NativeConnection() {
  MongooseConnection.apply(this, arguments);
  this._listening = false;
  // Tracks the last time (as unix timestamp) the connection received a
  // serverHeartbeatSucceeded or serverHeartbeatFailed event from the underlying MongoClient.
  // If we haven't received one in a while (like due to a frozen AWS Lambda container) then
  // `readyState` is likely stale.
  this._lastHeartbeatAt = null;
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
    this._queue.push({ fn: wireup });
  }

  function wireup() {
    newConn.client = _this.client;
    newConn.db = _this.client.db(name);
    newConn._lastHeartbeatAt = _this._lastHeartbeatAt;
    newConn.onOpen();
  }

  newConn.name = name;

  // push onto the otherDbs stack, this is used when state changes
  this.otherDbs.push(newConn);
  newConn.otherDbs.push(this);

  // push onto the relatedDbs cache, this is used when state changes
  if (options && options.useCache) {
    this.relatedDbs[newConn.name] = newConn;
    newConn.relatedDbs = this.relatedDbs;
  }

  return newConn;
};

/**
 * Runs a [db-level aggregate()](https://www.mongodb.com/docs/manual/reference/method/db.aggregate/) on this connection's underlying `db`
 *
 * @param {Array} pipeline
 * @param {Object} [options]
 */

NativeConnection.prototype.aggregate = function aggregate(pipeline, options) {
  return new this.base.Aggregate(null, this).append(pipeline).option(options ?? {});
};

/**
 * Removes the database connection with the given name created with `useDb()`.
 *
 * Throws an error if the database connection was not found.
 *
 * #### Example:
 *
 *     // Connect to `initialdb` first
 *     const conn = await mongoose.createConnection('mongodb://127.0.0.1:27017/initialdb').asPromise();
 *
 *     // Creates an un-cached connection to `mydb`
 *     const db = conn.useDb('mydb');
 *
 *     // Closes `db`, and removes `db` from `conn.relatedDbs` and `conn.otherDbs`
 *     await conn.removeDb('mydb');
 *
 * @method removeDb
 * @memberOf Connection
 * @param {String} name The database name
 * @return {Connection} this
 */

NativeConnection.prototype.removeDb = function removeDb(name) {
  const dbs = this.otherDbs.filter(db => db.name === name);
  if (!dbs.length) {
    throw new MongooseError(`No connections to database "${name}" found`);
  }

  for (const db of dbs) {
    db._closeCalled = true;
    db._destroyCalled = true;
    db._readyState = STATES.disconnected;
    db.$wasForceClosed = true;
  }
  delete this.relatedDbs[name];
  this.otherDbs = this.otherDbs.filter(db => db.name !== name);
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

/**
 * Implementation of `listDatabases()` for MongoDB driver
 *
 * @return Promise
 * @api public
 */

NativeConnection.prototype.listDatabases = async function listDatabases() {
  await this._waitForConnect();

  return await this.db.admin().listDatabases();
};

/*!
 * ignore
 */

NativeConnection.prototype.createClient = async function createClient(uri, options) {
  if (typeof uri !== 'string') {
    throw new MongooseError('The `uri` parameter to `openUri()` must be a ' +
      `string, got "${typeof uri}". Make sure the first parameter to ` +
      '`mongoose.connect()` or `mongoose.createConnection()` is a string.');
  }

  if (this._destroyCalled) {
    throw new MongooseError(
      'Connection has been closed and destroyed, and cannot be used for re-opening the connection. ' +
      'Please create a new connection with `mongoose.createConnection()` or `mongoose.connect()`.'
    );
  }

  if (this.readyState === STATES.connecting || this.readyState === STATES.connected) {
    if (this._connectionString !== uri) {
      throw new MongooseError('Can\'t call `openUri()` on an active connection with ' +
        'different connection strings. Make sure you aren\'t calling `mongoose.connect()` ' +
        'multiple times. See: https://mongoosejs.com/docs/connections.html#multiple_connections');
    }
  }

  options = processConnectionOptions(uri, options);

  if (options) {

    const autoIndex = options.config && options.config.autoIndex != null ?
      options.config.autoIndex :
      options.autoIndex;
    if (autoIndex != null) {
      this.config.autoIndex = autoIndex !== false;
      delete options.config;
      delete options.autoIndex;
    }

    if ('autoCreate' in options) {
      this.config.autoCreate = !!options.autoCreate;
      delete options.autoCreate;
    }

    if ('sanitizeFilter' in options) {
      this.config.sanitizeFilter = options.sanitizeFilter;
      delete options.sanitizeFilter;
    }

    if ('autoSearchIndex' in options) {
      this.config.autoSearchIndex = options.autoSearchIndex;
      delete options.autoSearchIndex;
    }

    if ('bufferTimeoutMS' in options) {
      this.config.bufferTimeoutMS = options.bufferTimeoutMS;
      delete options.bufferTimeoutMS;
    }

    // Backwards compat
    if (options.user || options.pass) {
      options.auth = options.auth || {};
      options.auth.username = options.user;
      options.auth.password = options.pass;

      this.user = options.user;
      this.pass = options.pass;
    }
    delete options.user;
    delete options.pass;

    if (options.bufferCommands != null) {
      this.config.bufferCommands = options.bufferCommands;
      delete options.bufferCommands;
    }
  } else {
    options = {};
  }

  this._connectionOptions = options;
  const dbName = options.dbName;
  if (dbName != null) {
    this.$dbName = dbName;
  }
  delete options.dbName;

  if (!utils.hasUserDefinedProperty(options, 'driverInfo')) {
    options.driverInfo = {
      name: 'Mongoose',
      version: pkg.version
    };
  }

  const { schemaMap, encryptedFieldsMap } = this._buildEncryptionSchemas();

  if ((Object.keys(schemaMap).length > 0 || Object.keys(encryptedFieldsMap).length) && !options.autoEncryption) {
    throw new Error('Must provide `autoEncryption` when connecting with encrypted schemas.');
  }

  if (Object.keys(schemaMap).length > 0) {
    options.autoEncryption.schemaMap = schemaMap;
  }

  if (Object.keys(encryptedFieldsMap).length > 0) {
    options.autoEncryption.encryptedFieldsMap = encryptedFieldsMap;
  }

  this.readyState = STATES.connecting;
  this._connectionString = uri;

  let client;
  try {
    client = new mongodb.MongoClient(uri, options);
  } catch (error) {
    this.readyState = STATES.disconnected;
    throw error;
  }
  this.client = client;

  client.setMaxListeners(0);
  await client.connect();

  _setClient(this, client, options, dbName);

  for (const db of this.otherDbs) {
    _setClient(db, client, {}, db.name);
  }
  return this;
};

/**
 * Given a connection, which may or may not have encrypted models, build
 * a schemaMap and/or an encryptedFieldsMap for the connection, combining all models
 * into a single schemaMap and encryptedFields map.
 *
 * @returns the generated schemaMap and encryptedFieldsMap
  */
NativeConnection.prototype._buildEncryptionSchemas = function() {
  const qeMappings = {};
  const csfleMappings = {};

  const encryptedModels = Object.values(this.models).filter(model => model.schema._hasEncryptedFields());

  // If discriminators are configured for the collection, there might be multiple models
  // pointing to the same namespace.  For this scenario, we merge all the schemas for each namespace
  // into a single schema and then generate a schemaMap/encryptedFieldsMap for the combined schema.
  for (const model of encryptedModels) {
    const { schema, collection: { collectionName } } = model;
    const namespace = `${this.$dbName}.${collectionName}`;
    const mappings = schema.encryptionType() === 'csfle' ? csfleMappings : qeMappings;

    mappings[namespace] ??= new Schema({}, { encryptionType: schema.encryptionType() });

    const isNonRootDiscriminator = schema.discriminatorMapping && !schema.discriminatorMapping.isRoot;
    if (isNonRootDiscriminator) {
      const rootSchema = schema._baseSchema;
      schema.eachPath((pathname) => {
        if (rootSchema.path(pathname)) return;
        if (!mappings[namespace]._hasEncryptedField(pathname)) return;

        throw new Error(`Cannot have duplicate keys in discriminators with encryption. key=${pathname}`);
      });
    }

    mappings[namespace].add(schema);
  }

  const schemaMap = Object.fromEntries(Object.entries(csfleMappings).map(
    ([namespace, schema]) => ([namespace, schema._buildSchemaMap()])
  ));

  const encryptedFieldsMap = Object.fromEntries(Object.entries(qeMappings).map(
    ([namespace, schema]) => ([namespace, schema._buildEncryptedFields()])
  ));

  return {
    schemaMap, encryptedFieldsMap
  };
};

/*!
 * ignore
 */

NativeConnection.prototype.setClient = function setClient(client) {
  if (!(client instanceof mongodb.MongoClient)) {
    throw new MongooseError('Must call `setClient()` with an instance of MongoClient');
  }
  if (this.readyState !== STATES.disconnected) {
    throw new MongooseError('Cannot call `setClient()` on a connection that is already connected.');
  }
  if (client.topology == null) {
    throw new MongooseError('Cannot call `setClient()` with a MongoClient that you have not called `connect()` on yet.');
  }

  this._connectionString = client.s.url;
  _setClient(this, client, {}, client.s.options.dbName);

  for (const model of Object.values(this.models)) {
    // Errors handled internally, so safe to ignore error
    model.init().catch(function $modelInitNoop() {});
  }

  return this;
};

/*!
 * ignore
 */

function _setClient(conn, client, options, dbName) {
  const db = dbName != null ? client.db(dbName) : client.db();
  conn.db = db;
  conn.client = client;
  conn.host = client &&
    client.s &&
    client.s.options &&
    client.s.options.hosts &&
    client.s.options.hosts[0] &&
    client.s.options.hosts[0].host || void 0;
  conn.port = client &&
    client.s &&
    client.s.options &&
    client.s.options.hosts &&
    client.s.options.hosts[0] &&
    client.s.options.hosts[0].port || void 0;
  conn.name = dbName != null ? dbName : db.databaseName;
  conn._closeCalled = client._closeCalled;

  const _handleReconnect = () => {
    // If we aren't disconnected, we assume this reconnect is due to a
    // socket timeout. If there's no activity on a socket for
    // `socketTimeoutMS`, the driver will attempt to reconnect and emit
    // this event.
    if (conn.readyState !== STATES.connected) {
      conn.readyState = STATES.connected;
      conn.emit('reconnect');
      conn.emit('reconnected');
      conn.onOpen();
    }
  };

  const type = client &&
  client.topology &&
  client.topology.description &&
  client.topology.description.type || '';

  if (type === 'Single') {
    client.on('serverDescriptionChanged', ev => {
      const newDescription = ev.newDescription;
      if (newDescription.type === 'Unknown') {
        conn.readyState = STATES.disconnected;
      } else {
        _handleReconnect();
      }
    });
  } else if (type.startsWith('ReplicaSet')) {
    client.on('topologyDescriptionChanged', ev => {
      // Emit disconnected if we've lost connectivity to the primary
      const description = ev.newDescription;
      if (conn.readyState === STATES.connected && description.type !== 'ReplicaSetWithPrimary') {
        // Implicitly emits 'disconnected'
        conn.readyState = STATES.disconnected;
      } else if (conn.readyState === STATES.disconnected && description.type === 'ReplicaSetWithPrimary') {
        _handleReconnect();
      }
    });
  }

  conn._lastHeartbeatAt = null;

  client.on('serverHeartbeatSucceeded', () => {
    conn._lastHeartbeatAt = Date.now();
    for (const otherDb of conn.otherDbs) {
      otherDb._lastHeartbeatAt = conn._lastHeartbeatAt;
    }
  });

  if (options.monitorCommands) {
    client.on('commandStarted', (data) => conn.emit('commandStarted', data));
    client.on('commandFailed', (data) => conn.emit('commandFailed', data));
    client.on('commandSucceeded', (data) => conn.emit('commandSucceeded', data));
  }

  conn.onOpen();

  for (const i in conn.collections) {
    if (utils.object.hasOwnProperty(conn.collections, i)) {
      conn.collections[i].onOpen();
    }
  }
}

/*!
 * Module exports.
 */

module.exports = NativeConnection;
