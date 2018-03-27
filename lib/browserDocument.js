/*!
 * Module dependencies.
 */

var NodeJSDocument = require('./document');
var EventEmitter = require('events').EventEmitter;
var MongooseError = require('./error');
var Schema = require('./schema');
var ObjectId = require('./types/objectid');
var ValidationError = MongooseError.ValidationError;
var applyHooks = require('./services/model/applyHooks');
var utils = require('./utils');

/**
 * Document constructor.
 *
 * @param {Object} obj the values to set
 * @param {Object} [fields] optional object containing the fields which were selected in the query returning this document and any populated paths data
 * @param {Boolean} [skipId] bool, should we auto create an ObjectId _id
 * @inherits NodeJS EventEmitter http://nodejs.org/api/events.html#events_class_events_eventemitter
 * @event `init`: Emitted on a document after it has was retrieved from the db and fully hydrated by Mongoose.
 * @event `save`: Emitted when the document is successfully saved
 * @api private
 */

function Document(obj, schema, fields, skipId, skipInit) {
  if (!(this instanceof Document)) {
    return new Document(obj, schema, fields, skipId, skipInit);
  }

  if (utils.isObject(schema) && !schema.instanceOfSchema) {
    schema = new Schema(schema);
  }

  // When creating EmbeddedDocument, it already has the schema and he doesn't need the _id
  schema = this.schema || schema;

  // Generate ObjectId if it is missing, but it requires a scheme
  if (!this.schema && schema.options._id) {
    obj = obj || {};

    if (obj._id === undefined) {
      obj._id = new ObjectId();
    }
  }

  if (!schema) {
    throw new MongooseError.MissingSchemaError();
  }

  this.$__setSchema(schema);

  NodeJSDocument.call(this, obj, fields, skipId, skipInit);

  applyHooks(this, schema, { decorateDoc: true });

  // apply methods
  for (var m in schema.methods) {
    this[m] = schema.methods[m];
  }
  // apply statics
  for (var s in schema.statics) {
    this[s] = schema.statics[s];
  }
}

/*!
 * Inherit from the NodeJS document
 */

Document.prototype = Object.create(NodeJSDocument.prototype);
Document.prototype.constructor = Document;

/*!
 * Browser doc exposes the event emitter API
 */

Document.$emitter = new EventEmitter();

utils.each(
  ['on', 'once', 'emit', 'listeners', 'removeListener', 'setMaxListeners',
    'removeAllListeners', 'addListener'],
  function(emitterFn) {
    Document[emitterFn] = function() {
      return Document.$emitter[emitterFn].apply(Document.$emitter, arguments);
    };
  });

/*!
 * Module exports.
 */

Document.ValidationError = ValidationError;
module.exports = exports = Document;
