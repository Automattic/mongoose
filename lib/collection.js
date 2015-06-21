
/*!
 * Module dependencies.
 */

var STATES = require('./connectionstate')

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

function Collection (name, conn, opts) {
  if (undefined === opts) opts = {};
  if (undefined === opts.capped) opts.capped = {};

  opts.bufferCommands = undefined === opts.bufferCommands
    ? true
    : opts.bufferCommands;

  if ('number' == typeof opts.capped) {
    opts.capped = { size: opts.capped };
  }

  this.opts = opts;
  this.name = name;
  this.collectionName = name;
  this.conn = conn;
  this.queue = [];
  this.buffer = this.opts.bufferCommands;

  if (STATES.connected == this.conn.readyState) {
    this.onOpen();
  }
};

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

/**
 * Called when the database connects
 *
 * @api private
 */

Collection.prototype.onOpen = function () {
  var self = this;
  this.buffer = false;
  self.doQueue();
};

/**
 * Called when the database disconnects
 *
 * @api private
 */

Collection.prototype.onClose = function () {
  if (this.opts.bufferCommands) {
    this.buffer = true;
  }
};

/**
 * Queues a method for later execution when its
 * database connection opens.
 *
 * @param {String} name name of the method to queue
 * @param {Array} args arguments to pass to the method when executed
 * @api private
 */

Collection.prototype.addQueue = function (name, args) {
  this.queue.push([name, args]);
  return this;
};

/**
 * Executes all queued methods and clears the queue.
 *
 * @api private
 */

Collection.prototype.doQueue = function () {
  for (var i = 0, l = this.queue.length; i < l; i++){
    this[this.queue[i][0]].apply(this, this.queue[i][1]);
  }
  this.queue = [];
  return this;
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.ensureIndex = function(){
  throw new Error('Collection#ensureIndex unimplemented by driver');
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.findAndModify = function(){
  throw new Error('Collection#findAndModify unimplemented by driver');
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.findOne = function(){
  throw new Error('Collection#findOne unimplemented by driver');
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.find = function(){
  throw new Error('Collection#find unimplemented by driver');
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.insert = function(){
  throw new Error('Collection#insert unimplemented by driver');
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.save = function(){
  throw new Error('Collection#save unimplemented by driver');
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.update = function(){
  throw new Error('Collection#update unimplemented by driver');
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.getIndexes = function(){
  throw new Error('Collection#getIndexes unimplemented by driver');
};

/**
 * Abstract method that drivers must implement.
 */

Collection.prototype.mapReduce = function(){
  throw new Error('Collection#mapReduce unimplemented by driver');
};

/*!
 * Module exports.
 */

module.exports = Collection;
