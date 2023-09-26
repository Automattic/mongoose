'use strict';

const helpers = require('../../queryHelpers');

module.exports = completeMany;

/**
 * Given a model and an array of docs, hydrates all the docs to be instances
 * of the model. Used to initialize docs returned from the db from `find()`
 *
 * @param {Model} model
 * @param {Array} docs
 * @param {Object} fields the projection used, including `select` from schemas
 * @param {Object} userProvidedFields the user-specified projection
 * @param {Object} [opts]
 * @param {Array} [opts.populated]
 * @param {ClientSession} [opts.session]
 * @param {Function} callback
 * @api private
 */

async function completeMany(model, docs, fields, userProvidedFields, opts) {
  return Promise.all(docs.map(doc => new Promise((resolve, reject) => {
    const rawDoc = doc;
    doc = helpers.createModel(model, doc, fields, userProvidedFields);
    if (opts.session != null) {
      doc.$session(opts.session);
    }
    doc.$init(rawDoc, opts, (err) => {
      if (err != null) {
        return reject(err);
      }
      resolve(doc);
    });
  })));
}
