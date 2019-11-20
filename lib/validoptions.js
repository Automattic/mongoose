
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
  'strict',
  'toJSON',
  'toObject',
  'useCreateIndex',
  'useFindAndModify',
  'useNewUrlParser',
  'usePushEach',
  'useUnifiedTopology'
]);

module.exports = VALID_OPTIONS;