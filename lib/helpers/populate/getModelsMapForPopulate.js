'use strict';

const MongooseError = require('../../error/index');
const SkipPopulateValue = require('./SkipPopulateValue');
const get = require('../get');
const isPathExcluded = require('../projection/isPathExcluded');
const getSchemaTypes = require('./getSchemaTypes');
const getVirtual = require('./getVirtual');
const lookupLocalFields = require('./lookupLocalFields');
const mpath = require('mpath');
const normalizeRefPath = require('./normalizeRefPath');
const util = require('util');
const utils = require('../../utils');

const modelSymbol = require('../symbols').modelSymbol;
const populateModelSymbol = require('../symbols').populateModelSymbol;
const schemaMixedSymbol = require('../../schema/symbols').schemaMixedSymbol;

module.exports = function getModelsMapForPopulate(model, docs, options) {
  let doc;
  const len = docs.length;
  const map = [];
  const modelNameFromQuery = options.model && options.model.modelName || options.model;
  let schema;
  let refPath;
  let modelNames;
  const available = {};

  const modelSchema = model.schema;

  // Populating a nested path should always be a no-op re: #9073.
  // People shouldn't do this, but apparently they do.
  if (modelSchema.nested[options.path]) {
    return [];
  }

  const _virtualRes = getVirtual(model.schema, options.path);
  const virtual = _virtualRes == null ? null : _virtualRes.virtual;
  if (virtual != null) {
    return _virtualPopulate(model, docs, options, _virtualRes);
  }

  let allSchemaTypes = getSchemaTypes(model, modelSchema, null, options.path);
  allSchemaTypes = Array.isArray(allSchemaTypes) ? allSchemaTypes : [allSchemaTypes].filter(v => v != null);

  if (allSchemaTypes.length <= 0 && options.strictPopulate !== false) {
    return new MongooseError('Cannot populate path `' + options.path +
      '` because it is not in your schema. Set the `strictPopulate` option ' +
      'to false to override.');
  }

  for (let i = 0; i < len; i++) {
    doc = docs[i];
    let justOne = null;

    const docSchema = doc != null && doc.$__ != null ? doc.schema : modelSchema;
    schema = getSchemaTypes(model, docSchema, doc, options.path);

    // Special case: populating a path that's a DocumentArray unless
    // there's an explicit `ref` or `refPath` re: gh-8946
    if (schema != null &&
        schema.$isMongooseDocumentArray &&
        schema.options.ref == null &&
        schema.options.refPath == null) {
      continue;
    }
    const isUnderneathDocArray = schema && schema.$isUnderneathDocArray;
    if (isUnderneathDocArray && get(options, 'options.sort') != null) {
      return new MongooseError('Cannot populate with `sort` on path ' + options.path +
        ' because it is a subproperty of a document array');
    }

    modelNames = null;
    let isRefPath = false;
    let normalizedRefPath = null;
    let schemaOptions = null;

    if (Array.isArray(schema)) {
      const schemasArray = schema;
      for (const _schema of schemasArray) {
        let _modelNames;
        let res;
        try {
          res = _getModelNames(doc, _schema, modelNameFromQuery);
          _modelNames = res.modelNames;
          isRefPath = isRefPath || res.isRefPath;
          normalizedRefPath = normalizeRefPath(normalizedRefPath, doc, options.path) ||
            res.refPath;
          justOne = res.justOne;
        } catch (error) {
          return error;
        }

        if (isRefPath && !res.isRefPath) {
          continue;
        }
        if (!_modelNames) {
          continue;
        }
        modelNames = modelNames || [];
        for (const modelName of _modelNames) {
          if (modelNames.indexOf(modelName) === -1) {
            modelNames.push(modelName);
          }
        }
      }
    } else {
      try {
        const res = _getModelNames(doc, schema, modelNameFromQuery);
        modelNames = res.modelNames;
        isRefPath = res.isRefPath;
        normalizedRefPath = res.refPath;
        justOne = res.justOne;
        schemaOptions = get(schema, 'options.populate', null);
      } catch (error) {
        return error;
      }

      if (!modelNames) {
        continue;
      }
    }

    const data = {};
    const localField = options.path;
    const foreignField = '_id';

    // `justOne = null` means we don't know from the schema whether the end
    // result should be an array or a single doc. This can result from
    // populating a POJO using `Model.populate()`
    if ('justOne' in options && options.justOne !== void 0) {
      justOne = options.justOne;
    } else if (schema && !schema[schemaMixedSymbol]) {
      // Skip Mixed types because we explicitly don't do casting on those.
      justOne = Array.isArray(schema) ?
        schema.every(schema => !schema.$isMongooseArray) :
        !schema.$isMongooseArray;
    }

    if (!modelNames) {
      continue;
    }

    data.isVirtual = false;
    data.justOne = justOne;
    data.localField = localField;
    data.foreignField = foreignField;

    // Get local fields
    const ret = _getLocalFieldValues(doc, localField, model, options, null, schema);

    const id = String(utils.getValue(foreignField, doc));
    options._docs[id] = Array.isArray(ret) ? ret.slice() : ret;

    let match = get(options, 'match', null);

    const hasMatchFunction = typeof match === 'function';
    if (hasMatchFunction) {
      match = match.call(doc, doc);
    }
    data.match = match;
    data.hasMatchFunction = hasMatchFunction;
    data.isRefPath = isRefPath;

    const embeddedDiscriminatorModelNames = _findRefPathForDiscriminators(doc,
      modelSchema, data, options, normalizedRefPath, ret);

    modelNames = embeddedDiscriminatorModelNames || modelNames;

    try {
      addModelNamesToMap(model, map, available, modelNames, options, data, ret, doc, schemaOptions);
    } catch (err) {
      return err;
    }
  }

  return map;

  function _getModelNames(doc, schema, modelNameFromQuery) {
    let modelNames;
    let isRefPath = false;
    const justOne = null;

    if (schema && schema.caster) {
      schema = schema.caster;
    }
    if (schema && schema.$isSchemaMap) {
      schema = schema.$__schemaType;
    }

    const ref = schema && schema.options && schema.options.ref;
    refPath = schema && schema.options && schema.options.refPath;
    if (schema != null &&
        schema[schemaMixedSymbol] &&
        !ref &&
        !refPath &&
        !modelNameFromQuery) {
      return { modelNames: null };
    }

    const normalizedRefPath = normalizeRefPath(refPath, doc, options.path);

    if (modelNameFromQuery) {
      modelNames = [modelNameFromQuery]; // query options
    } else if (normalizedRefPath) {
      if (options._queryProjection != null && isPathExcluded(options._queryProjection, normalizedRefPath)) {
        throw new MongooseError('refPath `' + normalizedRefPath +
          '` must not be excluded in projection, got ' +
          util.inspect(options._queryProjection));
      }

      if (modelSchema.virtuals.hasOwnProperty(normalizedRefPath) && doc.$__ == null) {
        modelNames = [modelSchema.virtuals[normalizedRefPath].applyGetters(void 0, doc)];
      } else {
        modelNames = utils.getValue(normalizedRefPath, doc);
      }

      if (Array.isArray(modelNames)) {
        modelNames = utils.array.flatten(modelNames);
      }

      isRefPath = true;
    } else {
      let ref;
      let refPath;

      if ((ref = get(schema, 'options.ref')) != null) {
        ref = handleRefFunction(ref, doc);
        modelNames = [ref];
      } else if ((refPath = get(schema, 'options.refPath')) != null) {
        isRefPath = true;
        refPath = normalizeRefPath(refPath, doc, options.path);
        modelNames = utils.getValue(refPath, doc);
        if (Array.isArray(modelNames)) {
          modelNames = utils.array.flatten(modelNames);
        }
      }
    }

    if (!modelNames) {
      return { modelNames: modelNames, isRefPath: isRefPath, refPath: normalizedRefPath, justOne: justOne };
    }

    if (!Array.isArray(modelNames)) {
      modelNames = [modelNames];
    }

    return { modelNames: modelNames, isRefPath: isRefPath, refPath: normalizedRefPath, justOne: justOne };
  }
};

/*!
 * ignore
 */

function _virtualPopulate(model, docs, options, _virtualRes) {
  const map = [];
  const available = {};
  const virtual = _virtualRes.virtual;

  for (const doc of docs) {
    let modelNames = null;
    const data = {};

    // localField and foreignField
    let localField;
    const virtualPrefix = _virtualRes.nestedSchemaPath ?
      _virtualRes.nestedSchemaPath + '.' : '';
    if (typeof virtual.options.localField === 'function') {
      localField = virtualPrefix + virtual.options.localField.call(doc, doc);
    } else if (Array.isArray(virtual.options.localField)) {
      localField = virtual.options.localField.map(field => virtualPrefix + field);
    } else {
      localField = virtualPrefix + virtual.options.localField;
    }
    data.count = virtual.options.count;

    if (virtual.options.skip != null && !options.hasOwnProperty('skip')) {
      options.skip = virtual.options.skip;
    }
    if (virtual.options.limit != null && !options.hasOwnProperty('limit')) {
      options.limit = virtual.options.limit;
    }
    if (virtual.options.perDocumentLimit != null && !options.hasOwnProperty('perDocumentLimit')) {
      options.perDocumentLimit = virtual.options.perDocumentLimit;
    }
    let foreignField = virtual.options.foreignField;

    if (!localField || !foreignField) {
      return new MongooseError('If you are populating a virtual, you must set the ' +
        'localField and foreignField options');
    }

    if (typeof localField === 'function') {
      localField = localField.call(doc, doc);
    }
    if (typeof foreignField === 'function') {
      foreignField = foreignField.call(doc);
    }

    data.isRefPath = false;

    // `justOne = null` means we don't know from the schema whether the end
    // result should be an array or a single doc. This can result from
    // populating a POJO using `Model.populate()`
    let justOne = null;
    if ('justOne' in options && options.justOne !== void 0) {
      justOne = options.justOne;
    }

    if (virtual.options.refPath) {
      const normalizedRefPath =
        normalizeRefPath(virtual.options.refPath, doc, options.path);
      justOne = !!virtual.options.justOne;
      data.isRefPath = true;
      const refValue = utils.getValue(normalizedRefPath, doc);
      modelNames = Array.isArray(refValue) ? refValue : [refValue];
    } else if (virtual.options.ref) {
      let normalizedRef;
      if (typeof virtual.options.ref === 'function') {
        normalizedRef = virtual.options.ref.call(doc, doc);
      } else {
        normalizedRef = virtual.options.ref;
      }
      justOne = !!virtual.options.justOne;
      // When referencing nested arrays, the ref should be an Array
      // of modelNames.
      if (Array.isArray(normalizedRef)) {
        modelNames = normalizedRef;
      } else {
        modelNames = [normalizedRef];
      }
    }

    data.isVirtual = true;
    data.virtual = virtual;
    data.justOne = justOne;

    // `match`
    let match = get(options, 'match', null) ||
      get(data, 'virtual.options.match', null) ||
      get(data, 'virtual.options.options.match', null);

    let hasMatchFunction = typeof match === 'function';
    if (hasMatchFunction) {
      match = match.call(doc, doc);
    }

    if (Array.isArray(localField) && Array.isArray(foreignField) && localField.length === foreignField.length) {
      match = Object.assign({}, match);
      for (let i = 1; i < localField.length; ++i) {
        match[foreignField[i]] = convertTo_id(mpath.get(localField[i], doc, lookupLocalFields), model.schema);
        hasMatchFunction = true;
      }

      localField = localField[0];
      foreignField = foreignField[0];
    }

    data.localField = localField;
    data.foreignField = foreignField;
    data.match = match;
    data.hasMatchFunction = hasMatchFunction;

    // Get local fields
    const ret = _getLocalFieldValues(doc, localField, model, options, virtual);

    try {
      addModelNamesToMap(model, map, available, modelNames, options, data, ret, doc);
    } catch (err) {
      return err;
    }
  }

  return map;
}

/*!
 * ignore
 */

function addModelNamesToMap(model, map, available, modelNames, options, data, ret, doc, schemaOptions) {
  // `PopulateOptions#connection`: if the model is passed as a string, the
  // connection matters because different connections have different models.
  const connection = options.connection != null ? options.connection : model.db;

  if (modelNames == null) {
    return;
  }

  let k = modelNames.length;
  while (k--) {
    const modelName = modelNames[k];
    if (modelName == null) {
      continue;
    }

    let Model;
    if (options.model && options.model[modelSymbol]) {
      Model = options.model;
    } else if (modelName[modelSymbol]) {
      Model = modelName;
    } else {
      try {
        Model = connection.model(modelName);
      } catch (err) {
        if (ret !== void 0) {
          throw err;
        }
        Model = null;
      }
    }

    let ids = ret;
    const flat = Array.isArray(ret) ? utils.array.flatten(ret) : [];

    if (data.isRefPath && Array.isArray(ret) && flat.length === modelNames.length) {
      ids = flat.filter((val, i) => modelNames[i] === modelName);
    }

    const perDocumentLimit = options.perDocumentLimit == null ?
      get(options, 'options.perDocumentLimit', null) :
      options.perDocumentLimit;

    if (!available[modelName] || perDocumentLimit != null) {
      const currentOptions = {
        model: Model
      };

      if (data.isVirtual && get(data.virtual, 'options.options')) {
        currentOptions.options = utils.clone(data.virtual.options.options);
      } else if (schemaOptions != null) {
        currentOptions.options = Object.assign({}, schemaOptions);
      }
      utils.merge(currentOptions, options);

      // Used internally for checking what model was used to populate this
      // path.
      options[populateModelSymbol] = Model;

      available[modelName] = {
        model: Model,
        options: currentOptions,
        match: data.hasMatchFunction ? [data.match] : data.match,
        docs: [doc],
        ids: [ids],
        allIds: [ret],
        localField: new Set([data.localField]),
        foreignField: new Set([data.foreignField]),
        justOne: data.justOne,
        isVirtual: data.isVirtual,
        virtual: data.virtual,
        count: data.count,
        [populateModelSymbol]: Model
      };
      map.push(available[modelName]);
    } else {
      available[modelName].localField.add(data.localField);
      available[modelName].foreignField.add(data.foreignField);
      available[modelName].docs.push(doc);
      available[modelName].ids.push(ids);
      available[modelName].allIds.push(ret);
      if (data.hasMatchFunction) {
        available[modelName].match.push(data.match);
      }
    }
  }
}

/*!
 * ignore
 */

function _findRefPathForDiscriminators(doc, modelSchema, data, options, normalizedRefPath, ret) {
  // Re: gh-8452. Embedded discriminators may not have `refPath`, so clear
  // out embedded discriminator docs that don't have a `refPath` on the
  // populated path.
  if (!data.isRefPath || normalizedRefPath == null) {
    return;
  }

  const pieces = normalizedRefPath.split('.');
  let cur = '';
  let modelNames = void 0;
  for (let i = 0; i < pieces.length; ++i) {
    const piece = pieces[i];
    cur = cur + (cur.length === 0 ? '' : '.') + piece;
    const schematype = modelSchema.path(cur);
    if (schematype != null &&
        schematype.$isMongooseArray &&
        schematype.caster.discriminators != null &&
        Object.keys(schematype.caster.discriminators).length > 0) {
      const subdocs = utils.getValue(cur, doc);
      const remnant = options.path.substr(cur.length + 1);
      const discriminatorKey = schematype.caster.schema.options.discriminatorKey;
      modelNames = [];
      for (const subdoc of subdocs) {
        const discriminatorName = utils.getValue(discriminatorKey, subdoc);
        const discriminator = schematype.caster.discriminators[discriminatorName];
        const discriminatorSchema = discriminator && discriminator.schema;
        if (discriminatorSchema == null) {
          continue;
        }
        const _path = discriminatorSchema.path(remnant);
        if (_path == null || _path.options.refPath == null) {
          const docValue = utils.getValue(data.localField.substr(cur.length + 1), subdoc);
          ret.forEach((v, i) => {
            if (v === docValue) {
              ret[i] = SkipPopulateValue(v);
            }
          });
          continue;
        }
        const modelName = utils.getValue(pieces.slice(i + 1).join('.'), subdoc);
        modelNames.push(modelName);
      }
    }
  }

  return modelNames;
}

/*!
 * ignore
 */

function handleRefFunction(ref, doc) {
  if (typeof ref === 'function' && !ref[modelSymbol]) {
    return ref.call(doc, doc);
  }
  return ref;
}

/*!
 * ignore
 */

function _getLocalFieldValues(doc, localField, model, options, virtual, schema) {
  // Get Local fields
  const localFieldPathType = model.schema._getPathType(localField);
  const localFieldPath = localFieldPathType === 'real' ?
    model.schema.path(localField) :
    localFieldPathType.schema;
  const localFieldGetters = localFieldPath && localFieldPath.getters ?
    localFieldPath.getters : [];

  const _populateOptions = get(options, 'options', {});

  const getters = 'getters' in _populateOptions ?
    _populateOptions.getters :
    get(virtual, 'options.getters', false);
  if (localFieldGetters.length > 0 && getters) {
    const hydratedDoc = (doc.$__ != null) ? doc : model.hydrate(doc);
    const localFieldValue = utils.getValue(localField, doc);
    if (Array.isArray(localFieldValue)) {
      const localFieldHydratedValue = utils.getValue(localField.split('.').slice(0, -1), hydratedDoc);
      return localFieldValue.map((localFieldArrVal, localFieldArrIndex) =>
        localFieldPath.applyGetters(localFieldArrVal, localFieldHydratedValue[localFieldArrIndex]));
    } else {
      return localFieldPath.applyGetters(localFieldValue, hydratedDoc);
    }
  } else {
    return convertTo_id(mpath.get(localField, doc, lookupLocalFields), schema);
  }
}

/*!
 * Retrieve the _id of `val` if a Document or Array of Documents.
 *
 * @param {Array|Document|Any} val
 * @return {Array|Document|Any}
 */

function convertTo_id(val, schema) {
  if (val != null && val.$__ != null) return val._id;

  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; ++i) {
      if (val[i] != null && val[i].$__ != null) {
        if (val.isMongooseArrayProxy) {
          val.set(i, val[i]._id, true);
        } else {
          val[i] = val[i]._id;
        }
      }
    }
    if (val.isMongooseArray && val.$schema()) {
      return val.$schema().cast(val, val.$parent());
    }

    return [].concat(val);
  }

  // `populate('map')` may be an object if populating on a doc that hasn't
  // been hydrated yet
  if (val != null &&
      val.constructor.name === 'Object' &&
      // The intent here is we should only flatten the object if we expect
      // to get a Map in the end. Avoid doing this for mixed types.
      (schema == null || schema[schemaMixedSymbol] == null)) {
    const ret = [];
    for (const key of Object.keys(val)) {
      ret.push(val[key]);
    }
    return ret;
  }
  // If doc has already been hydrated, e.g. `doc.populate('map')`
  // then `val` will already be a map
  if (val instanceof Map) {
    return Array.from(val.values());
  }

  return val;
}