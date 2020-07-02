
/*!
 * Valid mongoose options
 */

'use strict';

const VALID_OPTIONS = Object.freeze([
  'applyPluginsToChildSchemas',
  'applyPluginsToDiscriminators',
  'autoIndex',
  'bufferCommands',
  'cloneSchemas',
  'debug',
  'maxTimeMS',
  'objectIdGetter',
  'runValidators',
  'selectPopulatedPaths',
  'setDefaultsOnInsert',
  'strict',
  'strictQuery',
  'toJSON',
  'toObject',
  'useCreateIndex',
  'useFindAndModify',
  'useNewUrlParser',
  'usePushEach',
  'useUnifiedTopology',
  'typePojoToMixed'
]);

module.exports = VALID_OPTIONS;
