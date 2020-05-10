'use strict';

/*!
 * ignore
 */

module.exports = function addIdGetter(schema) {
  // ensure the documents receive an id getter unless disabled
  const autoIdGetter = !schema.paths['id'] &&
    schema.paths['_id'] &&
    !schema.options.noVirtualId &&
    schema.options.id;
  if (!autoIdGetter) {
    return;
  }

  schema.virtual('id').get(idGetter);
};

/*!
 * Returns this documents _id cast to a string.
 */

function idGetter() {
  if (this._id != null) {
    return String(this._id);
  }

  return null;
}
