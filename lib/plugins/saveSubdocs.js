'use strict';

const each = require('../helpers/each');

/*!
 * ignore
 */

module.exports = function saveSubdocs(schema) {
  const unshift = true;
  schema.s.hooks.pre('save', false, function saveSubdocsPreSave(next) {
    if (this.$isSubdocument) {
      next();
      return;
    }

    const _this = this;
    const subdocs = this.$getAllSubdocs({ useCache: true });

    if (!subdocs.length) {
      next();
      return;
    }

    each(subdocs, function(subdoc, cb) {
      subdoc.$__schema.s.hooks.execPre('save', subdoc, function(err) {
        cb(err);
      });
    }, function(error) {
      // Invalidate subdocs cache because subdoc pre hooks can add new subdocuments
      if (_this.$__.saveOptions) {
        _this.$__.saveOptions.__subdocs = null;
      }
      if (error) {
        return _this.$__schema.s.hooks.execPost('save:error', _this, [_this], { error: error }, function(error) {
          next(error);
        });
      }
      next();
    });
  }, null, unshift);

  schema.s.hooks.post('save', async function saveSubdocsPostDeleteOne() {
    const removedSubdocs = this.$__.removedSubdocs;
    if (!removedSubdocs || !removedSubdocs.length) {
      return;
    }

    const promises = [];
    for (const subdoc of removedSubdocs) {
      promises.push(new Promise((resolve, reject) => {
        subdoc.$__schema.s.hooks.execPost('deleteOne', subdoc, [subdoc], function(err) {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      }));
    }

    this.$__.removedSubdocs = null;
    await Promise.all(promises);
  });

  schema.s.hooks.post('save', async function saveSubdocsPostSave() {
    if (this.$isSubdocument) {
      return;
    }

    const _this = this;
    const subdocs = this.$getAllSubdocs({ useCache: true });

    if (!subdocs.length) {
      return;
    }

    const promises = [];
    for (const subdoc of subdocs) {
      promises.push(new Promise((resolve, reject) => {
        subdoc.$__schema.s.hooks.execPost('save', subdoc, [subdoc], function(err) {
          if (err) {
            return reject(err);
          }
          resolve();
        });
      }));
    }

    try {
      await Promise.all(promises);
    } catch (error) {
      await new Promise((resolve, reject) => {
        this.$__schema.s.hooks.execPost('save:error', _this, [_this], { error: error }, function(error) {
          if (error) {
            return reject(error);
          }
          resolve();
        });
      });
    }
  }, null, unshift);
};
