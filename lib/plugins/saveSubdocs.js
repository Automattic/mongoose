'use strict';

/*!
 * ignore
 */

module.exports = function saveSubdocs(schema) {
  const unshift = true;
  schema.s.hooks.pre('save', false, async function saveSubdocsPreSave() {
    if (this.$isSubdocument) {
      return;
    }

    const _this = this;
    const subdocs = this.$getAllSubdocs({ useCache: true });

    if (!subdocs.length) {
      return;
    }

    await Promise.all(subdocs.map(async(subdoc) => {
      return new Promise((resolve, reject) => {
        subdoc.$__schema.s.hooks.execPre('save', subdoc, function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }));

    // Invalidate subdocs cache because subdoc pre hooks can add new subdocuments
    if (_this.$__.saveOptions) {
      _this.$__.saveOptions.__subdocs = null;
    }
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

    await Promise.all(promises);
  }, null, unshift);
};
