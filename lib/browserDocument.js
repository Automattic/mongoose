/*!
 * Module dependencies.
 */

var NodeJSDocument = require('./document')
  , EventEmitter = require('events').EventEmitter
  , setMaxListeners = EventEmitter.prototype.setMaxListeners
  , MongooseError = require('./error')
  , MixedSchema = require('./schema/mixed')
  , Schema = require('./schema')
  , ObjectId = require('./types/objectid')
  , ValidatorError = require('./schematype').ValidatorError
  , utils = require('./utils')
  , clone = utils.clone
  , isMongooseObject = utils.isMongooseObject
  , inspect = require('util').inspect
  , ValidationError = MongooseError.ValidationError
  , InternalCache = require('./internal')
  , deepEqual = utils.deepEqual
  , hooks = require('hooks')
  , Promise = require('./promise')
  , DocumentArray
  , MongooseArray
  , Embedded

/**
 * Document constructor.
 *
 * @param {Object} obj the values to set
 * @param {Object} [fields] optional object containing the fields which were selected in the query returning this document and any populated paths data
 * @param {Boolean} [skipId] bool, should we auto create an ObjectId _id
 * @inherits NodeJS EventEmitter http://nodejs.org/api/events.html#events_class_events_eventemitter
 * @event `init`: Emitted on a document after it has was retreived from the db and fully hydrated by Mongoose.
 * @event `save`: Emitted when the document is successfully saved
 * @api private
 */

function Document (obj, schema, fields, skipId, skipInit) {
  if ( !(this instanceof Document) )
    return new Document( obj, schema, fields, skipId, skipInit );


  if (utils.isObject(schema) && !(schema instanceof Schema)) {
    schema = new Schema(schema);
  }

  // When creating EmbeddedDocument, it already has the schema and he doesn't need the _id
  schema = this.schema || schema;

  // Generate ObjectId if it is missing, but it requires a scheme
  if ( !this.schema && schema.options._id ){
    obj = obj || {};

    if ( obj._id === undefined ){
      obj._id = new ObjectId();
    }
  }

  if ( !schema ){
    throw new MongooseError.MissingSchemaError();
  }

  this.$__setSchema(schema);

  this.$__ = new InternalCache;
  this.isNew = true;
  this.errors = undefined;

  //var schema = this.schema;

  if ('boolean' === typeof fields) {
    this.$__.strictMode = fields;
    fields = undefined;
  } else {
    this.$__.strictMode = this.schema.options && this.schema.options.strict;
    this.$__.selected = fields;
  }

  var required = this.schema.requiredPaths();
  for (var i = 0; i < required.length; ++i) {
    this.$__.activePaths.require(required[i]);
  }

  setMaxListeners.call(this, 0);
  this._doc = this.$__buildDoc(obj, fields, skipId);

  if ( !skipInit && obj ){
    this.init( obj );
  }

  this.$__registerHooksFromSchema();

  // apply methods
  for ( var m in schema.methods ){
    this[ m ] = schema.methods[ m ];
  }
  // apply statics
  for ( var s in schema.statics ){
    this[ s ] = schema.statics[ s ];
  }
}

/*!
 * Inherit from EventEmitter.
 */
Document.prototype = Object.create( NodeJSDocument.prototype );
Document.prototype.constructor = Document;



/*!
 * Module exports.
 */

Document.ValidationError = ValidationError;
module.exports = exports = Document;
