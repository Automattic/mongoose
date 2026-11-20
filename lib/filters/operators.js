'use strict';

/**
 * MongoDB logical query operators that take an array of filters.
 * `$not` is excluded because it takes a single field's condition rather than an array of filters.
 */

exports.logicalOperators = new Set(['$and', '$or', '$nor']);
