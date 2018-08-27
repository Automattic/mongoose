'use strict';

const each = require('async/each');

/*!
 * ignore
 */

module.exports = function(schema) {
  const unshift = true;
  schema.s.hooks.pre('remove', false, function(next) {
    if (this.ownerDocument) {
      next();
      return;
    }

    const _this = this;
    const subdocs = this.$__getAllSubdocs();

    if (!subdocs.length) {
      next();
      return;
    }

    each(subdocs, function(subdoc, cb) {
      subdoc.$__remove(function(err) {
        cb(err);
      });
    }, function(error) {
      if (error) {
        return _this.schema.s.hooks.execPost('remove:error', _this, [_this], { error: error }, function(error) {
          next(error);
        });
      }
      next();
    });
  }, null, unshift);
};
