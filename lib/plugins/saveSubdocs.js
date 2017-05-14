'use strict';

var each = require('async/each');

/*!
 * ignore
 */

module.exports = function(schema) {
  schema.callQueue.unshift(['pre', ['save', function(next) {
    if (this.ownerDocument) {
      next();
      return;
    }

    var _this = this;
    var subdocs = this.$__getAllSubdocs();

    if (!subdocs.length) {
      next();
      return;
    }

    each(subdocs, function(subdoc, cb) {
      subdoc.save(function(err) {
        cb(err);
      });
    }, function(error) {
      if (error) {
        return _this.schema.s.hooks.execPost('save:error', _this, [_this], { error: error }, function(error) {
          next(error);
        });
      }
      next();
    });
  }]]);
};
