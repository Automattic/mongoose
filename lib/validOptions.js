
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
  'maxTimeMS',
  'objectIdGetter',
  'overwriteModels',
  'returnDocument',
  'returnOriginal',
  'runValidators',
  'sanitizeFilter',
  'sanitizeProjection',
  'selectPopulatedPaths',
  'setDefaultsOnInsert',
  'strict',
  'strictPopulate',
  'strictQuery',
  'timestamps.createdAt.immutable',
  'toJSON',
  'toObject',
  'transactionAsyncLocalStorage',
  'translateAliases',
  'updatePipeline'
]);

module.exports = VALID_OPTIONS;
