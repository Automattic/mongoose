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

    const subdocs = this.$getAllSubdocs({ useCache: true });

    if (!subdocs.length) {
      return;
    }

    const options = this.$__.saveOptions;
    await Promise.all(subdocs.map(subdoc => subdoc._execDocumentPreHooks('save', options)));

    // Invalidate subdocs cache because subdoc pre hooks can add new subdocuments
    if (this.$__.saveOptions) {
      this.$__.saveOptions.__subdocs = null;
    }
  }, null, unshift);

  schema.s.hooks.pre('save', async function saveSubdocsPreDeleteOne() {
    const removedSubdocs = this.$__.removedSubdocs;
    if (!removedSubdocs?.length) {
      return;
    }

    const promises = [];
    for (const subdoc of removedSubdocs) {
      promises.push(subdoc._execDocumentPreHooks('deleteOne'));
    }

    await Promise.all(promises);
  });

  schema.s.hooks.post('save', async function saveSubdocsPostDeleteOne() {
    const removedSubdocs = this.$__.removedSubdocs;
    if (!removedSubdocs?.length) {
      return;
    }

    const promises = [];
    for (const subdoc of removedSubdocs) {
      promises.push(subdoc._execDocumentPostHooks('deleteOne'));
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
      promises.push(subdoc._execDocumentPostHooks('save'));
    }

    await Promise.all(promises);
  }, null, unshift);
};
