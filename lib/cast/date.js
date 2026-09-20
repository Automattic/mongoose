'use strict';

module.exports = function castDate(value) {
  if (Array.isArray(value)) {
    // Date accepts nested arrays through string coercion.
    if (value.length !== 1) {
      throw new Error('Arrays must have exactly one element to be cast to a date');
    }
    if (Array.isArray(value[0])) {
      throw new Error('Nested arrays cannot be cast to a date');
    }
    value = value[0];
  }

  if (value == null) {
    return null;
  }

  if (value === '') {
    throw new Error('Empty string cannot be cast to date');
  }

  if (value instanceof Date) {
    if (isNaN(value.valueOf())) {
      throw new Error('Date is invalid');
    }

    return value;
  }

  let date;

  if (typeof value === 'boolean') {
    throw new Error('Boolean values cannot be cast to dates');
  }

  if (value instanceof Number || typeof value === 'number') {
    date = new Date(value);
  } else if (typeof value === 'string' && !isNaN(Number(value)) && (Number(value) >= 275761 || Number(value) < -271820)) {
    // string representation of milliseconds take this path
    date = new Date(Number(value));
  } else if (typeof value.valueOf === 'function') {
    // support for moment.js. This is also the path strings will take because
    // strings have a `valueOf()`
    date = new Date(value.valueOf());
  } else {
    // fallback
    date = new Date(value);
  }

  if (!isNaN(date.valueOf())) {
    return date;
  }

  throw new Error('Value could not be converted to a valid date');
};
