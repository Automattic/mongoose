'use strict';

/*!
 * ignore
 */

module.exports = function(schema) {
  // ensure the documents receive an id getter unless disabled
  var autoIdGetter = !schema.paths['id'] &&
    (!schema.options.noVirtualId && schema.options.id);
  if (!autoIdGetter) {
    return;
  }

  schema.virtual('id').get(idGetter);

  if ('toHexString' in schema.methods) {
    return;
  }

  // Re: gh-6115, make it easy to get something usable as an ObjectID regardless
  // of whether a property is populated or not. With this, you can do
  // `blogPost.author.toHexString()` and get a hex string regardless of whether
  // `author` is populated
  schema.methods.toHexString = function() {
    return this.id;
  };
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
