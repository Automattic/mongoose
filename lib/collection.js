'use strict';

/*!
 * Module dependencies.
 */

const EventEmitter = require('events');
const STATES = require('./connectionstate');
const immediate = require('./helpers/immediate');

class Collection {
  /**
   * Abstract Collection constructor
   *
   * This is the base class that drivers inherit from and implement.
   *
   * @param {String} name name of the collection
   * @param {Connection} conn A MongooseConnection instance
   * @param {Object} opts optional collection options
   * @api public
   */
  constructor(name, conn, opts) {
    if (opts === void 0) {
      opts = {};
    }
    if (opts.capped === void 0) {
      opts.capped = {};
    }

    if (typeof opts.capped === 'number') {
      opts.capped = { size: opts.capped };
    }

    this.opts = opts;
    this.name = name;
    this.collectionName = name;
    this.conn = conn;
    this.queue = [];
    this.buffer = true;
    this.emitter = new EventEmitter();

    if (STATES.connected === this.conn.readyState) {
      this.onOpen();
    }
  }

  /**
   * Called when the database connects
   *
   * @api private
   */
  onOpen() {
    this.buffer = false;
    immediate(() => this.doQueue());
  }

  /**
   * Called when the database disconnects
   *
   * @api private
   */
  onClose() { }

  /**
   * Queues a method for later execution when its
   * database connection opens.
   *
   * @param {String} name name of the method to queue
   * @param {Array} args arguments to pass to the method when executed
   * @api private
   */
  addQueue(name, args) {
    this.queue.push([name, args]);
    return this;
  }

  /**
   * Removes a queued method
   *
   * @param {String} name name of the method to queue
   * @param {Array} args arguments to pass to the method when executed
   * @api private
   */
  removeQueue(name, args) {
    const index = this.queue.findIndex(v => v[0] === name && v[1] === args);
    if (index === -1) {
      return false;
    }
    this.queue.splice(index, 1);
    return true;
  }

  /**
   * Executes all queued methods and clears the queue.
   *
   * @api private
   */
  doQueue() {
    for (const method of this.queue) {
      if (typeof method[0] === 'function') {
        method[0].apply(this, method[1]);
      } else {
        this[method[0]].apply(this, method[1]);
      }
    }
    this.queue = [];
    const _this = this;
    immediate(function() {
      _this.emitter.emit('queue');
    });
    return this;
  }

  /**
   * Abstract method that drivers must implement.
   */
  ensureIndex() {
    throw new Error('Collection#ensureIndex unimplemented by driver');
  }

  /**
   * Abstract method that drivers must implement.
   */
  createIndex() {
    throw new Error('Collection#createIndex unimplemented by driver');
  }

  /**
   * Abstract method that drivers must implement.
   */
  findAndModify() {
    throw new Error('Collection#findAndModify unimplemented by driver');
  }

  /**
   * Abstract method that drivers must implement.
   */
  findOneAndUpdate() {
    throw new Error('Collection#findOneAndUpdate unimplemented by driver');
  }

  /**
   * Abstract method that drivers must implement.
   */
  findOneAndDelete() {
    throw new Error('Collection#findOneAndDelete unimplemented by driver');
  }

  /**
   * Abstract method that drivers must implement.
   */
  findOneAndReplace() {
    throw new Error('Collection#findOneAndReplace unimplemented by driver');
  }

  /**
   * Abstract method that drivers must implement.
   */
  findOne() {
    throw new Error('Collection#findOne unimplemented by driver');
  }

  /**
   * Abstract method that drivers must implement.
   */
  find() {
    throw new Error('Collection#find unimplemented by driver');
  }

  /**
   * Abstract method that drivers must implement.
   */
  insert() {
    throw new Error('Collection#insert unimplemented by driver');
  }

  /**
   * Abstract method that drivers must implement.
   */
  insertOne() {
    throw new Error('Collection#insertOne unimplemented by driver');
  }

  /**
   * Abstract method that drivers must implement.
   */
  insertMany() {
    throw new Error('Collection#insertMany unimplemented by driver');
  }

  /**
   * Abstract method that drivers must implement.
   */
  save() {
    throw new Error('Collection#save unimplemented by driver');
  }

  /**
   * Abstract method that drivers must implement.
   */
  update() {
    throw new Error('Collection#update unimplemented by driver');
  }

  /**
   * Abstract method that drivers must implement.
   */
  getIndexes() {
    throw new Error('Collection#getIndexes unimplemented by driver');
  }

  /**
   * Abstract method that drivers must implement.
   */
  mapReduce() {
    throw new Error('Collection#mapReduce unimplemented by driver');
  }

  /**
   * Abstract method that drivers must implement.
   */
  watch() {
    throw new Error('Collection#watch unimplemented by driver');
  }

  /*!
   * ignore
   */
  _shouldBufferCommands() {
    const opts = this.opts;

    if (opts.bufferCommands != null) {
      return opts.bufferCommands;
    }
    if (opts && opts.schemaUserProvidedOptions != null && opts.schemaUserProvidedOptions.bufferCommands != null) {
      return opts.schemaUserProvidedOptions.bufferCommands;
    }

    return this.conn._shouldBufferCommands();
  }

  /*!
   * ignore
   */
  _getBufferTimeoutMS() {
    const conn = this.conn;
    const opts = this.opts;

    if (opts.bufferTimeoutMS != null) {
      return opts.bufferTimeoutMS;
    }
    if (opts && opts.schemaUserProvidedOptions != null && opts.schemaUserProvidedOptions.bufferTimeoutMS != null) {
      return opts.schemaUserProvidedOptions.bufferTimeoutMS;
    }
    if (conn.config.bufferTimeoutMS != null) {
      return conn.config.bufferTimeoutMS;
    }
    if (conn.base != null && conn.base.get('bufferTimeoutMS') != null) {
      return conn.base.get('bufferTimeoutMS');
    }
    return 10000;
  }
}

/**
 * The collection name
 *
 * @api public
 * @property name
 */

Collection.prototype.name;

/**
 * The collection name
 *
 * @api public
 * @property collectionName
 */

Collection.prototype.collectionName;

/**
 * The Connection instance
 *
 * @api public
 * @property conn
 */

Collection.prototype.conn;

/*!
 * Module exports.
 */

module.exports = Collection;
