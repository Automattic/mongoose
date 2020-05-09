'use strict';

/*!
 * Module dependencies
 */

const checkEmbeddedDiscriminatorKeyProjection =
  require('./helpers/discriminator/checkEmbeddedDiscriminatorKeyProjection');
const get = require('./helpers/get');
const getDiscriminatorByValue =
  require('./helpers/discriminator/getDiscriminatorByValue');
const isDefiningProjection = require('./helpers/projection/isDefiningProjection');
const clone = require('./helpers/clone');

/*!
 * Prepare a set of path options for query population.
 *
 * @param {Query} query
 * @param {Object} options
 * @return {Array}
 */

exports.preparePopulationOptions = function preparePopulationOptions(query, options) {
  const _populate = query.options.populate;
  const pop = Object.keys(_populate).reduce((vals, key) => vals.concat([_populate[key]]), []);

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
  const _populate = query._mongooseOptions.populate;
  const pop = Object.keys(_populate).reduce((vals, key) => vals.concat([_populate[key]]), []);

  // lean options should trickle through all queries
  if (options.lean != null) {
    pop.
      filter(p => get(p, 'options.lean') == null).
      forEach(makeLean(options.lean));
  }

  const session = get(query, 'options.session', null);
  if (session != null) {
    pop.forEach(path => {
      if (path.options == null) {
        path.options = { session: session };
        return;
      }
      if (!('session' in path.options)) {
        path.options.session = session;
      }
    });
  }

  const projection = query._fieldsForExec();
  pop.forEach(p => {
    p._queryProjection = projection;
  });

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
 * @return {Document}
 */
exports.createModel = function createModel(model, doc, fields, userProvidedFields) {
  model.hooks.execPreSync('createModel', doc);
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
      const _fields = clone(userProvidedFields);
      exports.applyPaths(_fields, discriminator.schema);
      return new discriminator(undefined, _fields, true);
    }
  }

  return new model(undefined, fields, {
    skipId: true,
    isNew: false,
    willInit: true
  });
};

/*!
 * ignore
 */

exports.applyPaths = function applyPaths(fields, schema) {
  // determine if query is selecting or excluding fields
  let exclude;
  let keys;
  let keyIndex;

  if (fields) {
    keys = Object.keys(fields);
    keyIndex = keys.length;

    while (keyIndex--) {
      if (keys[keyIndex][0] === '+') {
        continue;
      }
      const field = fields[keys[keyIndex]];
      // Skip `$meta` and `$slice`
      if (!isDefiningProjection(field)) {
        continue;
      }
      exclude = !field;
      break;
    }
  }

  // if selecting, apply default schematype select:true fields
  // if excluding, apply schematype select:false fields

  const selected = [];
  const excluded = [];
  const stack = [];

  analyzeSchema(schema);

  switch (exclude) {
    case true:
      for (const fieldName of excluded) {
        fields[fieldName] = 0;
      }
      break;
    case false:
      if (schema &&
          schema.paths['_id'] &&
          schema.paths['_id'].options &&
          schema.paths['_id'].options.select === false) {
        fields._id = 0;
      }

      for (const fieldName of selected) {
        fields[fieldName] = fields[fieldName] || 1;
      }
      break;
    case undefined:
      if (fields == null) {
        break;
      }
      // Any leftover plus paths must in the schema, so delete them (gh-7017)
      for (const key of Object.keys(fields || {})) {
        if (key.startsWith('+')) {
          delete fields[key];
        }
      }

      // user didn't specify fields, implies returning all fields.
      // only need to apply excluded fields and delete any plus paths
      for (const fieldName of excluded) {
        fields[fieldName] = 0;
      }
      break;
  }

  function analyzeSchema(schema, prefix) {
    prefix || (prefix = '');

    // avoid recursion
    if (stack.indexOf(schema) !== -1) {
      return [];
    }
    stack.push(schema);

    const addedPaths = [];
    schema.eachPath(function(path, type) {
      if (prefix) path = prefix + '.' + path;

      const addedPath = analyzePath(path, type);
      if (addedPath != null) {
        addedPaths.push(addedPath);
      }

      // nested schemas
      if (type.schema) {
        const _addedPaths = analyzeSchema(type.schema, path);

        // Special case: if discriminator key is the only field that would
        // be projected in, remove it.
        if (exclude === false) {
          checkEmbeddedDiscriminatorKeyProjection(fields, path, type.schema,
            selected, _addedPaths);
        }
      }
    });

    stack.pop();
    return addedPaths;
  }

  function analyzePath(path, type) {
    const plusPath = '+' + path;
    const hasPlusPath = fields && plusPath in fields;
    if (hasPlusPath) {
      // forced inclusion
      delete fields[plusPath];
    }

    if (typeof type.selected !== 'boolean') return;

    if (hasPlusPath) {
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
    const pieces = path.split('.');
    let cur = '';
    for (let i = 0; i < pieces.length; ++i) {
      cur += cur.length ? '.' + pieces[i] : pieces[i];
      if (excluded.indexOf(cur) !== -1) {
        return;
      }
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
    return path;
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

exports.handleDeleteWriteOpResult = function handleDeleteWriteOpResult(callback) {
  return function _handleDeleteWriteOpResult(error, res) {
    if (error) {
      return callback(error);
    }
    const mongooseResult = Object.assign({}, res.result);
    if (get(res, 'result.n', null) != null) {
      mongooseResult.deletedCount = res.result.n;
    }
    if (res.deletedCount != null) {
      mongooseResult.deletedCount = res.deletedCount;
    }
    return callback(null, mongooseResult);
  };
};
