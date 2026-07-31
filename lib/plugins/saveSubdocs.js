'use strict';

const symbols = require('../schema/symbols');

/*!
 * ignore
 */

module.exports = function saveSubdocs(schema) {
  const unshift = true;

  schema.s.hooks.pre('save', false, saveSubdocsPreSave, null, unshift);
  schema.s.hooks.post('save', saveSubdocsPostSave, null, unshift);
  schema.s.hooks.pre('save', saveSubdocsPreDeleteOne);
  schema.s.hooks.post('save', saveSubdocsPostDeleteOne);
};


// These hooks are deliberately not `async` so that they don't allocate a
// promise and force an extra microtask hop on every `save()` when there are
// no subdocuments. kareem only awaits hooks that return a promise.
function saveSubdocsPreSave() {
  if (this.$isSubdocument) {
    return;
  }

  const subdocs = this.$getAllSubdocs({ useCache: true });

  if (!subdocs.length) {
    return;
  }

  const options = this.$__.saveOptions;
  return Promise.all(subdocs.map(subdoc => subdoc._execDocumentPreHooks('save', options, [options]))).then(() => {
    // Invalidate subdocs cache because subdoc pre hooks can add new subdocuments
    if (this.$__.saveOptions) {
      this.$__.saveOptions.__subdocs = null;
    }
  });
}

function saveSubdocsPostSave() {
  if (this.$isSubdocument) {
    return;
  }

  const subdocs = this.$getAllSubdocs({ useCache: true });

  if (!subdocs.length) {
    return;
  }

  const options = this.$__.saveOptions;
  const promises = [];
  for (const subdoc of subdocs) {
    promises.push(subdoc._execDocumentPostHooks('save', options));
  }

  return Promise.all(promises);
}

function saveSubdocsPreDeleteOne() {
  const removedSubdocs = this.$__.removedSubdocs;
  if (!removedSubdocs?.length) {
    return;
  }

  const options = this.$__.saveOptions;
  const promises = [];
  for (const subdoc of removedSubdocs) {
    promises.push(subdoc._execDocumentPreHooks('deleteOne', options));
  }

  return Promise.all(promises);
}

function saveSubdocsPostDeleteOne() {
  const removedSubdocs = this.$__.removedSubdocs;
  if (!removedSubdocs?.length) {
    return;
  }

  const options = this.$__.saveOptions;
  const promises = [];
  for (const subdoc of removedSubdocs) {
    promises.push(subdoc._execDocumentPostHooks('deleteOne', options));
  }

  this.$__.removedSubdocs = null;
  return Promise.all(promises);
}


saveSubdocsPreSave[symbols.builtInMiddleware] = true;
saveSubdocsPostSave[symbols.builtInMiddleware] = true;
saveSubdocsPreDeleteOne[symbols.builtInMiddleware] = true;
saveSubdocsPostDeleteOne[symbols.builtInMiddleware] = true;
