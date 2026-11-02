'use strict';

const applyReadConcern = require('../schema/applyReadConcern');

/*!
 * Store the read preference and read concern that the populate options `pops` inherit from
 * `query`: the query's explicit settings, falling back to the schema-level defaults the same
 * way `Query.prototype._optionsForExec()` does. `_execPopulateQuery()` applies these unless
 * the populate options set their own.
 *
 * Store them separately from `pop.options` because a query's clones share its populate options:
 * inherited values written to `pop.options` would look like explicit settings to later executions.
 */

module.exports = function setInheritedReadOptions(query, pops) {
  const options = query.options;
  const schema = query.model.schema;
  const readPreference = 'readPreference' in options ? options.readPreference : schema.options.read;
  const readConcernOptions = { readConcern: options.readConcern, session: options.session };
  applyReadConcern(schema, readConcernOptions);

  for (const pop of pops) {
    pop._inheritedReadPreference = readPreference;
    pop._inheritedReadConcern = readConcernOptions.readConcern;
  }
};
