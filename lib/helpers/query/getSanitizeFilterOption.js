'use strict';

const { modelSymbol } = require('../symbols');

/*!
 * Resolve the `sanitizeFilter` option for an operation that is bound to a model
 * or a connection. Matches the precedence used by
 * `Query.prototype._castConditions()`: the connection's `config` (set by the
 * driver connection options) wins over the connection's options, then the
 * Mongoose instance's global options, then the operation's own options.
 *
 * @param {Model|Connection|null} [modelOrConnection]
 * @param {object} [options] operation-level options
 * @return {boolean|undefined}
 * @api private
 */

module.exports = function getSanitizeFilterOption(modelOrConnection, options) {
  // A model's `db` is a Mongoose Connection, but a Connection's `db` is the
  // driver's Db object, which has none of the options we're looking for.
  const connection = modelOrConnection?.[modelSymbol] ? modelOrConnection.db : modelOrConnection;
  const base = connection?.base ?? modelOrConnection?.base;

  return connection?.config?.sanitizeFilter ??
    connection?.options?.sanitizeFilter ??
    base?.options?.sanitizeFilter ??
    options?.sanitizeFilter;
};
