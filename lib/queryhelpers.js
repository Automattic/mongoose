
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

exports.preparePopulationOptions = function preparePopulationOptions(query, options) {
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

exports.preparePopulationOptionsMQ = function preparePopulationOptionsMQ(query, options) {
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
    var discriminator = model.discriminators[doc[key]];
    var _fields = utils.clone(fields);
    exports.applyPaths(_fields, discriminator.schema);
    return new model.discriminators[doc[key]](undefined, _fields, true);
  }

  return new model(undefined, fields, true);
};

/*!
 * ignore
 */

exports.applyPaths = function applyPaths(fields, schema) {
  // determine if query is selecting or excluding fields

  var exclude;
  var keys;
  var ki;

  if (fields) {
    keys = Object.keys(fields);
    ki = keys.length;

    while (ki--) {
      if (keys[ki][0] === '+') continue;
      exclude = fields[keys[ki]] === 0;
      break;
    }
  }

  // if selecting, apply default schematype select:true fields
  // if excluding, apply schematype select:false fields

  var selected = [],
      excluded = [],
      seen = [];

  var analyzePath = function(path, type) {
    if (typeof type.selected !== 'boolean') return;

    var plusPath = '+' + path;
    if (fields && plusPath in fields) {
      // forced inclusion
      delete fields[plusPath];

      // if there are other fields being included, add this one
      // if no other included fields, leave this out (implied inclusion)
      if (exclude === false && keys.length > 1 && !~keys.indexOf(path)) {
        fields[path] = 1;
      }

      return;
    }

    // check for parent exclusions
    var root = path.split('.')[0];
    if (~excluded.indexOf(root)) return;

    (type.selected ? selected : excluded).push(path);
  };

  var analyzeSchema = function(schema, prefix) {
    prefix || (prefix = '');

    // avoid recursion
    if (~seen.indexOf(schema)) return;
    seen.push(schema);

    schema.eachPath(function(path, type) {
      if (prefix) path = prefix + '.' + path;

      analyzePath(path, type);

      // array of subdocs?
      if (type.schema) {
        analyzeSchema(type.schema, path);
      }
    });
  };

  analyzeSchema(schema);

  var i;
  switch (exclude) {
    case true:
      for (i = 0; i < excluded.length; ++i) {
        fields[excluded[i]] = 0;
      }
      break;
    case false:
      if (schema &&
          schema.paths['_id'] &&
          schema.paths['_id'].options &&
          schema.paths['_id'].options.select === false) {
        fields._id = 0;
      }
      for (i = 0; i < selected.length; ++i) {
        fields[selected[i]] = 1;
      }
      break;
    case undefined:
      // user didn't specify fields, implies returning all fields.
      // only need to apply excluded fields
      for (i = 0; i < excluded.length; ++i) {
        fields[excluded[i]] = 0;
      }
      break;
  }
};

/*!
 * Set each path query option to lean
 *
 * @param {Object} option
 */

function makeLean(option) {
  option.options || (option.options = {});
  option.options.lean = true;
}
