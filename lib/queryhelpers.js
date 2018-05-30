'use strict';

/*!
 * Module dependencies
 */

const get = require('lodash.get');
const isDefiningProjection = require('./services/projection/isDefiningProjection');
const utils = require('./utils');

/*!
 * Prepare a set of path options for query population.
 *
 * @param {Query} query
 * @param {Object} options
 * @return {Array}
 */

exports.preparePopulationOptions = function preparePopulationOptions(query, options) {
  const pop = utils.object.vals(query.options.populate);

  // lean options should trickle through all queries
  if (options.lean != null) {
    pop.
      filter(p => get(p, 'options.lean') == null).
      forEach(makeLean(options.lean));
  }

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
  const pop = utils.object.vals(query._mongooseOptions.populate);

  // lean options should trickle through all queries
  if (options.lean != null) {
    pop.
      filter(p => get(p, 'options.lean') == null).
      forEach(makeLean(options.lean));
  }

  return pop;
};


/*!
 * returns discriminator by discriminatorMapping.value
 *
 * @param {Model} model
 * @param {string} value
 */
function getDiscriminatorByValue(model, value) {
  let discriminator = null;
  if (!model.discriminators) {
    return discriminator;
  }
  for (const name in model.discriminators) {
    const it = model.discriminators[name];
    if (
      it.schema &&
      it.schema.discriminatorMapping &&
      it.schema.discriminatorMapping.value == value
    ) {
      discriminator = it;
      break;
    }
  }
  return discriminator;
}

exports.getDiscriminatorByValue = getDiscriminatorByValue;

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
exports.createModel = function createModel(model, doc, fields, userProvidedFields) {
  const discriminatorMapping = model.schema ?
    model.schema.discriminatorMapping :
    null;

  const key = discriminatorMapping && discriminatorMapping.isRoot ?
    discriminatorMapping.key :
    null;

  const value = doc[key];
  if (key && value && model.discriminators) {
    const discriminator = model.discriminators[value] || getDiscriminatorByValue(model, value);
    if (discriminator) {
      const _fields = utils.clone(userProvidedFields);
      exports.applyPaths(_fields, discriminator.schema);
      return new discriminator(undefined, _fields, true);
    }
  }

  const skipDefaults = gatherPaths(doc, {}, '');
  return new model(undefined, fields, {
    skipId: true,
    isNew: false,
    skipDefaults: skipDefaults
  });
};

/*!
 *
 */

function gatherPaths(obj, map, path) {
  for (const key of Object.keys(obj)) {
    const fullPath = path ? path + '.' + key : key;
    map[fullPath] = true;
    if (obj[key] != null &&
        typeof obj[key] === 'object' &&
        !Array.isArray(obj) &&
        !(obj instanceof Map) &&
        !obj[key]._bsontype &&
        !utils.isMongooseObject(obj[key])) {
      gatherPaths(obj[key], map, fullPath);
    }
  }

  return map;
}

/*!
 * ignore
 */

exports.applyPaths = function applyPaths(fields, schema) {
  // determine if query is selecting or excluding fields
  let exclude;
  let keys;
  let ki;
  let field;

  if (fields) {
    keys = Object.keys(fields);
    ki = keys.length;

    while (ki--) {
      if (keys[ki][0] === '+') {
        continue;
      }
      field = fields[keys[ki]];
      // Skip `$meta` and `$slice`
      if (!isDefiningProjection(field)) {
        continue;
      }
      exclude = field === 0;
      break;
    }
  }

  // if selecting, apply default schematype select:true fields
  // if excluding, apply schematype select:false fields

  let selected = [];
  let excluded = [];
  let stack = [];

  let analyzePath = function(path, type) {
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
    let pieces = path.split('.');
    let root = pieces[0];
    if (~excluded.indexOf(root)) {
      return;
    }

    // Special case: if user has included a parent path of a discriminator key,
    // don't explicitly project in the discriminator key because that will
    // project out everything else under the parent path
    if (!exclude && get(type, 'options.$skipDiscriminatorCheck', false)) {
      let cur = '';
      for (let i = 0; i < pieces.length; ++i) {
        cur += (cur.length === 0 ? '' : '.') + pieces[i];
        const projection = get(fields, cur, false);
        if (projection && typeof projection !== 'object') {
          return;
        }
      }
    }

    (type.selected ? selected : excluded).push(path);
  };

  var analyzeSchema = function(schema, prefix) {
    prefix || (prefix = '');

    // avoid recursion
    if (stack.indexOf(schema) !== -1) {
      return;
    }
    stack.push(schema);

    schema.eachPath(function(path, type) {
      if (prefix) path = prefix + '.' + path;

      analyzePath(path, type);

      // array of subdocs?
      if (type.schema) {
        analyzeSchema(type.schema, path);
      }
    });

    stack.pop();
  };

  analyzeSchema(schema);

  let i;
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

function makeLean(val) {
  return function(option) {
    option.options || (option.options = {});
    option.options.lean = val;
  };
}

/*!
 * Handle the `WriteOpResult` from the server
 */

exports.handleWriteOpResult = function handleWriteOpResult(callback) {
  return function _handleWriteOpResult(error, res) {
    if (error) {
      return callback(error);
    }
    return callback(null, res.result);
  };
};
