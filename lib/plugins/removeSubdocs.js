'use strict';

const each = require('../helpers/each');

/*!
 * ignore
 */

module.exports = function removeSubdocs(schema) {
  const unshift = true;
  schema.s.hooks.pre('remove', false, function removeSubDocsPreRemove(next) {
    if (this.$isSubdocument) {
      next();
      return;
    }

    const _this = this;
    const subdocs = this.$getAllSubdocs();

    each(subdocs, function(subdoc, cb) {
      subdoc.$__remove(cb);
    }, function(error) {
      if (error) {
        return _this.$__schema.s.hooks.execPost('remove:error', _this, [_this], { error: error }, function(error) {
          next(error);
        });
      }
      next();
    });
  }, null, unshift);
};
