'use strict';

const symbols = require('../schema/symbols');

const UPDATE_OPERATIONS = [
  'update',
  'updateOne',
  'updateMany',
  'findOneAndUpdate'
];

module.exports = function convertSetUndefinedToUnset(schema) {
  for (const op of UPDATE_OPERATIONS) {
    schema.pre(op, { document: false, query: true }, convertUndefinedMiddleware);
  }
};

function convertUndefinedMiddleware() {
  const update = this.getUpdate();
  if (update == null || typeof update !== 'object' || Array.isArray(update)) {
    return;
  }

  if (convertUndefinedAssignments(update)) {
    this.setUpdate(update);
  }
}

convertUndefinedMiddleware[symbols.builtInMiddleware] = true;

function convertUndefinedAssignments(update) {
  let modified = false;

  modified = convertOperatorUndefined(update, '$set') || modified;
  modified = convertTopLevelUndefined(update) || modified;

  return modified;
}

function convertOperatorUndefined(update, operator) {
  const operatorDoc = update[operator];
  if (operatorDoc == null || typeof operatorDoc !== 'object' || Array.isArray(operatorDoc)) {
    return false;
  }

  let modified = false;
  for (const key of Object.keys(operatorDoc)) {
    if (operatorDoc[key] !== undefined) {
      continue;
    }
    ensureUnsetDoc(update)[key] = 1;
    delete operatorDoc[key];
    modified = true;
  }

  if (modified && Object.keys(operatorDoc).length === 0) {
    delete update[operator];
  }

  return modified;
}

function convertTopLevelUndefined(update) {
  let modified = false;
  for (const key of Object.keys(update)) {
    if (key.startsWith('$')) {
      continue;
    }
    if (update[key] !== undefined) {
      continue;
    }
    ensureUnsetDoc(update)[key] = 1;
    delete update[key];
    modified = true;
  }

  return modified;
}

function ensureUnsetDoc(update) {
  if (update.$unset == null || typeof update.$unset !== 'object' || Array.isArray(update.$unset)) {
    update.$unset = {};
  }
  return update.$unset;
}


