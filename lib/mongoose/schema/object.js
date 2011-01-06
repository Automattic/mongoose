
/**
 * Module dependencies.
 */

var SchemaType = require('./../type').SchemaType;

/**
 * Object SchemaType constructor.
 *
 * @param {String} key
 * @param {Schema} object schema
 * @api private
 */

function Object (key, schema) {
  this.schema = schema;
  SchemaType.call(this, key);
  if (!this.schema)
    this.default(function(){
      return {};
    });
};

/**
 * Inherit from SchemaType.
 */

Object.prototype.__proto__ = SchemaType.prototype;

/**
 * Module exports.
 */

module.exports = Object;
