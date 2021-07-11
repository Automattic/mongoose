'use strict';

const helpers = require('../../queryhelpers');
const immediate = require('../immediate');

module.exports = completeMany;

/*!
 * Given a model and an array of docs, hydrates all the docs to be instances
 * of the model. Used to initialize docs returned from the db from `find()`
 *
 * @param {Model} model
 * @param {Array} docs
 * @param {Object} fields the projection used, including `select` from schemas
 * @param {Object} userProvidedFields the user-specified projection
 * @param {Object} opts
 * @param {Array} [opts.populated]
 * @param {ClientSession} [opts.session]
 * @param {Function} callback
 */

function completeMany(model, docs, fields, userProvidedFields, opts, callback) {
  const arr = [];
  let count = docs.length;
  const len = count;
  let error = null;

  function init(_error) {
    if (_error != null) {
      error = error || _error;
    }
    if (error != null) {
      --count || immediate(() => callback(error));
      return;
    }
    --count || immediate(() => callback(error, arr));
  }

  for (let i = 0; i < len; ++i) {
    arr[i] = helpers.createModel(model, docs[i], fields, userProvidedFields);
    try {
      arr[i].$init(docs[i], opts, init);
    } catch (error) {
      init(error);
    }

    if (opts.session != null) {
      arr[i].$session(opts.session);
    }
  }
}
