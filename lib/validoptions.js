
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
  'bufferCommands',
  'bufferTimeoutMS',
  'cloneSchemas',
  'debug',
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
  'toObject'
]);

module.exports = VALID_OPTIONS;
