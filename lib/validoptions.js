
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
  'returnOriginal',
  'runValidators',
  'selectPopulatedPaths',
  'setDefaultsOnInsert',
  'strict',
  'strictQuery',
  'toJSON',
  'toObject',
  'typePojoToMixed',
  'useCreateIndex',
  'useFindAndModify',
  'useNewUrlParser',
  'usePushEach',
  'useUnifiedTopology'
]);

module.exports = VALID_OPTIONS;
