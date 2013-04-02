
/*!
 * Module dependencies
 */

var utils = require('./utils')

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
}

/*!
 * Set each path query option to lean
 *
 * @param {Object} option
 */

function makeLean (option) {
  option.options || (option.options = {});
  option.options.lean = true;
}

