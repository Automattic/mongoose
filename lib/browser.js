/* eslint-env browser */

'use strict';

require('./driver').set(require('./drivers/browser'));

const DocumentProvider = require('./document_provider.js');
const PromiseProvider = require('./promise_provider');

DocumentProvider.setBrowser(true);

/**
 * The Mongoose [Promise](#promise_Promise) constructor.
 *
 * @method Promise
 * @api public
 */

Object.defineProperty(exports, 'Promise', {
  get: function() {
    return PromiseProvider.get();
  },
  set: function(lib) {
    PromiseProvider.set(lib);
  }
});

/**
 * Storage layer for mongoose promises
 *
 * @method PromiseProvider
 * @api public
 */

exports.PromiseProvider = PromiseProvider;

/**
 * The [MongooseError](#error_MongooseError) constructor.
 *
 * @method Error
 * @api public
 */

exports.Error = require('./error/index');

/**
 * The Mongoose [Schema](#schema_Schema) constructor
 *
 * #### Example:
 *
 *     const mongoose = require('mongoose');
 *     const Schema = mongoose.Schema;
 *     const CatSchema = new Schema(..);
 *
 * @method Schema
 * @api public
 */

exports.Schema = require('./schema');

/**
 * The various Mongoose Types.
 *
 * #### Example:
 *
 *     const mongoose = require('mongoose');
 *     const array = mongoose.Types.Array;
 *
 * #### Types:
 *
 * - [Array](/docs/schematypes.html#arrays)
 * - [Buffer](/docs/schematypes.html#buffers)
 * - [Embedded](/docs/schematypes.html#schemas)
 * - [DocumentArray](/docs/api/documentarraypath.html)
 * - [Decimal128](/docs/api/mongoose.html#mongoose_Mongoose-Decimal128)
 * - [ObjectId](/docs/schematypes.html#objectids)
 * - [Map](/docs/schematypes.html#maps)
 * - [Subdocument](/docs/schematypes.html#schemas)
 *
 * Using this exposed access to the `ObjectId` type, we can construct ids on demand.
 *
 *     const ObjectId = mongoose.Types.ObjectId;
 *     const id1 = new ObjectId;
 *
 * @property Types
 * @api public
 */
exports.Types = require('./types');

/**
 * The Mongoose [VirtualType](#virtualtype_VirtualType) constructor
 *
 * @method VirtualType
 * @api public
 */
exports.VirtualType = require('./virtualtype');

/**
 * The various Mongoose SchemaTypes.
 *
 * #### Note:
 *
 * _Alias of mongoose.Schema.Types for backwards compatibility._
 *
 * @property SchemaTypes
 * @see Schema.SchemaTypes #schema_Schema-Types
 * @api public
 */

exports.SchemaType = require('./schematype.js');

/**
 * Internal utils
 *
 * @property utils
 * @api private
 */

exports.utils = require('./utils.js');

/**
 * The Mongoose browser [Document](/api/document.html) constructor.
 *
 * @method Document
 * @api public
 */
exports.Document = DocumentProvider();

/**
 * Return a new browser model. In the browser, a model is just
 * a simplified document with a schema - it does **not** have
 * functions like `findOne()`, etc.
 *
 * @method model
 * @api public
 * @param {String} name
 * @param {Schema} schema
 * @return Class
 */
exports.model = function(name, schema) {
  class Model extends exports.Document {
    constructor(obj, fields) {
      super(obj, schema, fields);
    }
  }
  Model.modelName = name;

  return Model;
};

/*!
 * Module exports.
 */

if (typeof window !== 'undefined') {
  window.mongoose = module.exports;
  window.Buffer = Buffer;
}
