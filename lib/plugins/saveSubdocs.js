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


async function saveSubdocsPreSave() {
  if (this.$isSubdocument) {
    return;
  }

  const subdocs = this.$getAllSubdocs({ useCache: true });

  if (!subdocs.length) {
    return;
  }

  const options = this.$__.saveOptions;
  await Promise.all(subdocs.map(subdoc => subdoc._execDocumentPreHooks('save', options, [options])));

  // Invalidate subdocs cache because subdoc pre hooks can add new subdocuments
  if (this.$__.saveOptions) {
    this.$__.saveOptions.__subdocs = null;
  }
}

async function saveSubdocsPostSave() {
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

  await Promise.all(promises);
}

async function saveSubdocsPreDeleteOne() {
  const removedSubdocs = this.$__.removedSubdocs;
  if (!removedSubdocs?.length) {
    return;
  }

  const options = this.$__.saveOptions;
  const promises = [];
  for (const subdoc of removedSubdocs) {
    promises.push(subdoc._execDocumentPreHooks('deleteOne', options));
  }

  await Promise.all(promises);
}

async function saveSubdocsPostDeleteOne() {
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
  await Promise.all(promises);
}


saveSubdocsPreSave[symbols.builtInMiddleware] = true;
saveSubdocsPostSave[symbols.builtInMiddleware] = true;
saveSubdocsPreDeleteOne[symbols.builtInMiddleware] = true;
saveSubdocsPostDeleteOne[symbols.builtInMiddleware] = true;
