'use strict';

/*!
 * Store the read preference and read concern that the populate options `pops` inherit from
 * `query`'s explicit settings. Schema-level `read` and `readConcern` defaults are not inherited:
 * each populate query applies its own model's schema defaults. `_execPopulateQuery()` applies
 * these unless the populate options set their own.
 *
 * Store them separately from `pop.options` because a query's clones share its populate options:
 * inherited values written to `pop.options` would look like explicit settings to later executions.
 */

module.exports = function setInheritedReadOptions(query, pops) {
  const options = query.options;
  const readPreference = 'readPreference' in options ? options.readPreference : undefined;

  for (const pop of pops) {
    pop._inheritedReadPreference = readPreference;
    pop._inheritedReadConcern = options.readConcern;
  }
};
