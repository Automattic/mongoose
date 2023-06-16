'use strict';

/*!
 * ignore
 */

module.exports = function addIdGetter(schema) {
  // ensure the documents receive an id getter unless disabled
  const autoIdGetter = !schema.paths['id'] &&
    schema.paths['_id'] &&
    schema.options.id;
  if (!autoIdGetter) {
    return schema;
  }
  schema.virtual('id').get(idGetter);
  schema.virtual('id').set(idSetter);

  return schema;
};

/**
 * Returns this documents _id cast to a string.
 * @api private
 */

function idGetter() {
  if (this._id != null) {
    return String(this._id);
  }

  return null;
}

/**
 *
 * @param {String} v the id to set
 * @api private
 */

function idSetter(v) {
  this._id = v;
  return v;
}
