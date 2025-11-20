'use strict';

const UUID = require('mongodb/lib/bson').UUID;

const UUID_FORMAT = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

module.exports = function castUUID(value) {
  if (value == null) {
    return value;
  }

  if (value instanceof UUID) {
    return value;
  }
  if (typeof value === 'string') {
    if (UUID_FORMAT.test(value)) {
      return new UUID(value);
    } else {
      throw new Error(`"${value}" is not a valid UUID string`);
    }
  }

  // Re: gh-647 and gh-3030, we're ok with casting using `toString()`
  // **unless** its the default Object.toString, because "[object Object]"
  // doesn't really qualify as useful data
  if (value.toString && value.toString !== Object.prototype.toString) {
    if (UUID_FORMAT.test(value.toString())) {
      return new UUID(value.toString());
    }
  }

  throw new Error(`"${value}" cannot be casted to a UUID`);
};

module.exports.UUID_FORMAT = UUID_FORMAT;
