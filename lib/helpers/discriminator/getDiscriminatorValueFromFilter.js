'use strict';

const isPOJO = require('../isPOJO');

/**
 * Returns the single discriminator value that a query filter condition selects,
 * like `'Clicked'` for `'Clicked'`, `{ $eq: 'Clicked' }`, or `{ $in: ['Clicked'] }`.
 * Returns the condition unchanged if it does not select exactly one value.
 *
 * @param {any} value the filter condition on the discriminator key
 * @return {any}
 * @api private
 */

module.exports = function getDiscriminatorValueFromFilter(value) {
  if (!isPOJO(value)) {
    return value;
  }
  const keys = Object.keys(value);
  if (keys.length !== 1) {
    return value;
  }
  if (keys[0] === '$eq') {
    return value.$eq;
  }
  if (keys[0] === '$in' && Array.isArray(value.$in) && value.$in.length === 1) {
    return value.$in[0];
  }
  return value;
};
