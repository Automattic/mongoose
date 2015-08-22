
/*!
 * Module dependencies
 */

var utils = require('./utils');

/*!
 * Prepare a set of path options for query population.
 *
 * @param {Query} query
 * @param {Object} options
 * @return {Array}
 */

exports.preparePopulationOptions = function preparePopulationOptions (query, options) {
  var pop = utils.object.vals(query.options.populate);

  // lean options should trickle through all queries
  if (options.lean) pop.forEach(makeLean);

  return pop;
};

/*!
 * Prepare a set of path options for query population. This is the MongooseQuery
 * version
 *
 * @param {Query} query
 * @param {Object} options
 * @return {Array}
 */

exports.preparePopulationOptionsMQ = function preparePopulationOptionsMQ (query, options) {
  var pop = utils.object.vals(query._mongooseOptions.populate);

  // lean options should trickle through all queries
  if (options.lean) pop.forEach(makeLean);

  return pop;
};

/*!
 * If the document is a mapped discriminator type, it returns a model instance for that type, otherwise,
 * it returns an instance of the given model.
 *
 * @param {Model}  model
 * @param {Object} doc
 * @param {Object} fields
 *
 * @return {Model}
 */
exports.createModel = function createModel(model, doc, fields) {
  var discriminatorMapping = model.schema
    ? model.schema.discriminatorMapping
    : null;

  var key = discriminatorMapping && discriminatorMapping.isRoot
    ? discriminatorMapping.key
    : null;

  if (key && doc[key] && model.discriminators && model.discriminators[doc[key]]) {
    return new model.discriminators[doc[key]](undefined, fields, true);
  }

  return new model(undefined, fields, true);
};

/*!
 * Set each path query option to lean
 *
 * @param {Object} option
 */

function makeLean (option) {
  option.options || (option.options = {});
  option.options.lean = true;
}
