'use strict';

const MongooseError = require('../error/mongooseError');
const isPOJO = require('./isPOJO');

/*!
 * Builds a readable, catchable error for a circular reference detected in a
 * query filter or update. Mongoose can't serialize a circular structure for
 * MongoDB, so we throw instead of crashing with an uncatchable
 * `RangeError: Maximum call stack size exceeded`. See gh-10378.
 *
 * @param {String} subject e.g. `'query filter'` or `'update'`
 * @return {MongooseError}
 */

exports.circularReferenceError = function circularReferenceError(subject) {
  return new MongooseError(
    `The ${subject} contains a circular reference, which Mongoose cannot ` +
    'serialize into a MongoDB command. Remove the circular reference before ' +
    'passing it to Mongoose.'
  );
};

/*!
 * Walks `obj` and throws a `MongooseError` if it contains a circular reference.
 *
 * Only descends into POJOs and arrays - the structures that cause unbounded
 * recursion when Mongoose casts a query filter or update - so this never
 * triggers getters on documents, ObjectIds, etc. Uses ancestor-path tracking
 * (add on descend, remove on ascend) so shared but acyclic references like
 * `{ a: x, b: x }` are allowed; only a reference back into its own ancestor
 * chain throws. See gh-10378.
 *
 * @param {Object} obj
 * @param {String} subject e.g. `'update'`
 * @api private
 */

exports.assertNoCircularReference = function assertNoCircularReference(obj, subject) {
  _assert(obj, subject, []);
};

function _assert(val, subject, ancestors) {
  const isArray = Array.isArray(val);
  if (!isArray && !isPOJO(val)) {
    return;
  }
  if (ancestors.includes(val)) {
    throw exports.circularReferenceError(subject);
  }

  ancestors.push(val);
  if (isArray) {
    for (let i = 0; i < val.length; ++i) {
      _assert(val[i], subject, ancestors);
    }
  } else {
    const keys = Object.keys(val);
    for (let i = 0; i < keys.length; ++i) {
      _assert(val[keys[i]], subject, ancestors);
    }
  }
  ancestors.pop();
}
