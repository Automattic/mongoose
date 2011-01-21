
/**
 * Module dependencies
 *
 */

var utils = require('./utils');

/**
 * Collection constructor
 * Options reference
 *  - safe (true): whether to pass the safe flag to all ops
 *  - atomic (true): whether to make all ops on the collection atomic
 *
 * @param {String} collection name
 * @param {Collection} connection object
 * @param {Object} options object
 * @api public
 */

function Collection (name, conn, options) {
  this.name = name;
  this.conn = conn;
  this.conn.on('open', this.onOpen.bind(this));
  this.conn.on('close', this.onClose.bind(this));
  if (this.conn.readyState == 1) this.onOpen();
  this.queue = [];
  this.buffer = true;
  this.options = utils.options({
      safe: true
    , atomic: true
  }, options);
};

/**
 * The collection name
 *
 * @api public
 */

Collection.prototype.name;

/**
 * The Connection instance
 *
 * @api public
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
  this.buffer = true;
};

/**
 * Adds a callback to the queue
 *
 * @param {String} method name
 * @param {Array} arguments
 * @api private
 */

Collection.prototype.addQueue = function (name, args) {
  this.queue.push([name, args]);
  return this;
};

/**
 * Executes the current queue
 *
 * @api private
 */

Collection.prototype.doQueue = function () {
  for (var i = 0, l = this.queue.length; i < l; i++){
    this[this.queue[i][0]].apply(this, this.queue[i][1]);
  }
  return this;
};

/**
 * Ensure index function
 *
 * @api private
 */

Collection.prototype.ensureIndex = function(){
  throw new Error('Collection#ensureIndex unimplemented by driver');
};

/**
 * FindAndModify command
 *
 * @api private
 */

Collection.prototype.findAndModify = function(){
  throw new Error('Collection#findAndModify unimplemented by driver');
};

/**
 * FindOne command
 *
 * @api private
 */

Collection.prototype.findOne = function(){
  throw new Error('Collection#findOne unimplemented by driver');
};

/**
 * Find command
 *
 * @api private
 */

Collection.prototype.find = function(){
  throw new Error('Collection#find unimplemented by driver');
};

/**
 * Insert command
 *
 * @api private
 */

Collection.prototype.insert = function(){
  throw new Error('Collection#insert unimplemented by driver');
};

/**
 * Update command
 *
 * @api private
 */

Collection.prototype.save = function(){
  throw new Error('Collection#save unimplemented by driver');
};

/**
 * Insert command
 *
 * @api private
 */

Collection.prototype.update = function(){
  throw new Error('Collection#update unimplemented by driver');
};

/**
 * getIndexes command
 *
 * @api private
 */

Collection.prototype.getIndexes = function(){
  throw new Error('Collection#getIndexes unimplemented by driver');
};

/**
 * Module exports.
 */

module.exports = Collection;
