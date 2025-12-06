'use strict';

module.exports = function applyReadConcern(schema, options) {
  if (options.readConcern !== undefined) {
    return;
  }

  // Don't apply default read concern to operations in transactions,
  // because you shouldn't set read concern on individual operations
  // within a transaction.
  // See: https://www.mongodb.com/docs/manual/reference/read-concern/
  if (options?.session?.transaction) {
    return;
  }

  const level = schema.options?.readConcern?.level;
  if (level != null) {
    options.readConcern = { level };
  }
};
