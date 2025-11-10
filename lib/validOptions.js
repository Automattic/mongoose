
/*!
 * Valid mongoose options
 */

'use strict';

const VALID_OPTIONS = Object.freeze([
  'allowDiskUse',
  'applyPluginsToChildSchemas',
  'applyPluginsToDiscriminators',
  'autoCreate',
  'autoIndex',
  'autoSearchIndex',
  'bufferCommands',
  'bufferTimeoutMS',
  'cloneSchemas',
  'createInitialConnection',
  'debug',
  'forceRepopulate',
  'id',
  'timestamps.createdAt.immutable',
  'maxTimeMS',
  'objectIdGetter',
  'overwriteModels',
  'returnOriginal',
  'runValidators',
  'sanitizeFilter',
  'sanitizeProjection',
  'selectPopulatedPaths',
  'setDefaultsOnInsert',
  'strict',
  'strictPopulate',
  'strictQuery',
  'toJSON',
  'toObject',
  'transactionAsyncLocalStorage',
  'translateAliases'
]);

module.exports = VALID_OPTIONS;
