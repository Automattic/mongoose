'use strict';

const each = require('../helpers/each');

/*!
 * ignore
 */

module.exports = function(schema) {
  const unshift = true;
  schema.s.hooks.pre('save', false, function(next) {
    if (this.$__.isSubDocument) {
      next();
      return;
    }

    const _this = this;
    const subdocs = this.$getAllSubdocs();

    if (!subdocs.length) {
      next();
      return;
    }

    each(subdocs, function(subdoc, cb) {
      subdoc.$__schema.s.hooks.execPre('save', subdoc, function(err) {
        cb(err);
      });
    }, function(error) {
      if (error) {
        return _this.$__schema.s.hooks.execPost('save:error', _this, [_this], { error: error }, function(error) {
          next(error);
        });
      }
      next();
    });
  }, null, unshift);

  schema.s.hooks.post('save', function(doc, next) {
    if (this.$__.isSubDocument) {
      next();
      return;
    }

    const _this = this;
    const subdocs = this.$getAllSubdocs();

    if (!subdocs.length) {
      next();
      return;
    }

    each(subdocs, function(subdoc, cb) {
      subdoc.$__schema.s.hooks.execPost('save', subdoc, [subdoc], function(err) {
        cb(err);
      });
    }, function(error) {
      if (error) {
        return _this.$__schema.s.hooks.execPost('save:error', _this, [_this], { error: error }, function(error) {
          next(error);
        });
      }
      next();
    });
  }, null, unshift);
};
