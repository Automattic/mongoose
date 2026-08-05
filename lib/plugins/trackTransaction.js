'use strict';

const arrayAtomicsSymbol = require('../helpers/symbols').arrayAtomicsSymbol;
const sessionNewDocuments = require('../helpers/symbols').sessionNewDocuments;
const symbols = require('../schema/symbols');
const utils = require('../utils');

module.exports = function trackTransaction(schema) {
  schema.pre('save', trackTransactionPreSave);
  schema.pre('deleteOne', { document: true, query: false }, trackTransactionPreDeleteOne);
};

function trackTransactionPreSave() {
  _getInitialState(this);
}

function trackTransactionPreDeleteOne() {
  const initialState = _getInitialState(this);
  if (initialState != null && !Object.hasOwn(initialState, 'isDeleted')) {
    initialState.isDeleted = this.$isDeleted();
  }
}

function _getInitialState(doc) {
  const session = doc.$session();
  if (session == null) {
    return null;
  }
  if (session.transaction == null || session[sessionNewDocuments] == null) {
    return null;
  }

  if (!session[sessionNewDocuments].has(doc)) {
    const initialState = {};
    if (doc.isNew) {
      initialState.isNew = true;
    }
    if (doc.$__schema.options.versionKey) {
      initialState.versionKey = doc.get(doc.$__schema.options.versionKey);
    }

    initialState.modifiedPaths = new Set(Object.keys(doc.$__.activePaths.getStatePaths('modify')));
    initialState.atomics = _getAtomics(doc);

    session[sessionNewDocuments].set(doc, initialState);
  }

  return session[sessionNewDocuments].get(doc);
}

function _getAtomics(doc, previous) {
  const pathToAtomics = new Map();
  previous = previous || new Map();

  const pathsToCheck = Object.keys(doc.$__.activePaths.init).concat(Object.keys(doc.$__.activePaths.modify));

  for (const path of pathsToCheck) {
    const val = doc.$__getValue(path);
    if (Array.isArray(val) &&
        utils.isMongooseDocumentArray(val) &&
        val.length &&
        val[arrayAtomicsSymbol] != null &&
        utils.hasOwnKeys(val[arrayAtomicsSymbol])) {
      const existing = previous.get(path) || {};
      pathToAtomics.set(path, mergeAtomics(existing, val[arrayAtomicsSymbol]));
    }
  }

  const dirty = doc.$__dirty();
  for (const dirt of dirty) {
    const path = dirt.path;

    const val = dirt.value;
    if (val?.[arrayAtomicsSymbol] != null && utils.hasOwnKeys(val[arrayAtomicsSymbol])) {
      const existing = previous.get(path) || {};
      pathToAtomics.set(path, mergeAtomics(existing, val[arrayAtomicsSymbol]));
    }
  }

  return pathToAtomics;
}

function mergeAtomics(destination, source) {
  destination = destination || {};

  if (source.$pullAll != null) {
    destination.$pullAll = (destination.$pullAll || []).concat(source.$pullAll);
  }
  if (source.$push != null) {
    destination.$push = destination.$push || {};
    destination.$push.$each = (destination.$push.$each || []).concat(source.$push.$each);
  }
  if (source.$addToSet != null) {
    destination.$addToSet = (destination.$addToSet || []).concat(source.$addToSet);
  }
  if (source.$set != null) {
    destination.$set = Array.isArray(source.$set) ? [...source.$set] : Object.assign({}, source.$set);
  }

  return destination;
}

trackTransactionPreSave[symbols.builtInMiddleware] = true;
trackTransactionPreDeleteOne[symbols.builtInMiddleware] = true;
