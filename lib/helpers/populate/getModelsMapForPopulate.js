'use strict';

const MongooseError = require('../../error/index');
const SkipPopulateValue = require('./SkipPopulateValue');
const get = require('../get');
const getDiscriminatorByValue = require('../discriminator/getDiscriminatorByValue');
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
  let i;
  let doc;
  const len = docs.length;
  const available = {};
  const map = [];
  const modelNameFromQuery = options.model && options.model.modelName || options.model;
  let schema;
  let refPath;
  let Model;
  let currentOptions;
  let modelNames;
  let modelName;
  let modelForFindSchema;

  const originalModel = options.model;
  let isVirtual = false;
  const modelSchema = model.schema;

  let allSchemaTypes = getSchemaTypes(modelSchema, null, options.path);
  allSchemaTypes = Array.isArray(allSchemaTypes) ? allSchemaTypes : [allSchemaTypes].filter(v => v != null);
  const _firstWithRefPath = allSchemaTypes.find(schematype => get(schematype, 'options.refPath', null) != null);

  for (i = 0; i < len; i++) {
    doc = docs[i];
    let justOne = null;

    schema = getSchemaTypes(modelSchema, doc, options.path);
    // Special case: populating a path that's a DocumentArray unless
    // there's an explicit `ref` or `refPath` re: gh-8946
    if (schema != null &&
        schema.$isMongooseDocumentArray &&
        schema.options.ref == null &&
        schema.options.refPath == null) {
      continue;
    }
    // Populating a nested path should always be a no-op re: #9073.
    // People shouldn't do this, but apparently they do.
    if (modelSchema.nested[options.path]) {
      continue;
    }
    const isUnderneathDocArray = schema && schema.$isUnderneathDocArray;
    if (isUnderneathDocArray && get(options, 'options.sort') != null) {
      return new MongooseError('Cannot populate with `sort` on path ' + options.path +
        ' because it is a subproperty of a document array');
    }

    modelNames = null;
    let isRefPath = !!_firstWithRefPath;
    let normalizedRefPath = _firstWithRefPath ? get(_firstWithRefPath, 'options.refPath', null) : null;

    if (Array.isArray(schema)) {
      const schemasArray = schema;
      for (const _schema of schemasArray) {
        let _modelNames;
        let res;
        try {
          res = _getModelNames(doc, _schema);
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
        const res = _getModelNames(doc, schema);
        modelNames = res.modelNames;
        isRefPath = res.isRefPath;
        normalizedRefPath = res.refPath;
        justOne = res.justOne;
      } catch (error) {
        return error;
      }

      if (!modelNames) {
        continue;
      }
    }

    const _virtualRes = getVirtual(model.schema, options.path);
    const virtual = _virtualRes == null ? null : _virtualRes.virtual;

    let localField;
    let count = false;
    if (virtual && virtual.options) {
      const virtualPrefix = _virtualRes.nestedSchemaPath ?
        _virtualRes.nestedSchemaPath + '.' : '';
      if (typeof virtual.options.localField === 'function') {
        localField = virtualPrefix + virtual.options.localField.call(doc, doc);
      } else {
        localField = virtualPrefix + virtual.options.localField;
      }
      count = virtual.options.count;

      if (virtual.options.skip != null && !options.hasOwnProperty('skip')) {
        options.skip = virtual.options.skip;
      }
      if (virtual.options.limit != null && !options.hasOwnProperty('limit')) {
        options.limit = virtual.options.limit;
      }
      if (virtual.options.perDocumentLimit != null && !options.hasOwnProperty('perDocumentLimit')) {
        options.perDocumentLimit = virtual.options.perDocumentLimit;
      }
    } else {
      localField = options.path;
    }
    let foreignField = virtual && virtual.options ?
      virtual.options.foreignField :
      '_id';

    // `justOne = null` means we don't know from the schema whether the end
    // result should be an array or a single doc. This can result from
    // populating a POJO using `Model.populate()`
    if ('justOne' in options && options.justOne !== void 0) {
      justOne = options.justOne;
    } else if (virtual && virtual.options && virtual.options.refPath) {
      const normalizedRefPath =
        normalizeRefPath(virtual.options.refPath, doc, options.path);
      justOne = !!virtual.options.justOne;
      isVirtual = true;
      const refValue = utils.getValue(normalizedRefPath, doc);
      modelNames = Array.isArray(refValue) ? refValue : [refValue];
    } else if (virtual && virtual.options && virtual.options.ref) {
      let normalizedRef;
      if (typeof virtual.options.ref === 'function') {
        normalizedRef = virtual.options.ref.call(doc, doc);
      } else {
        normalizedRef = virtual.options.ref;
      }
      justOne = !!virtual.options.justOne;
      isVirtual = true;
      if (!modelNames) {
        modelNames = [].concat(normalizedRef);
      }
    } else if (schema && !schema[schemaMixedSymbol]) {
      // Skip Mixed types because we explicitly don't do casting on those.
      justOne = Array.isArray(schema) ?
        schema.every(schema => !schema.$isMongooseArray) :
        !schema.$isMongooseArray;
    }

    if (!modelNames) {
      continue;
    }

    if (virtual && (!localField || !foreignField)) {
      return new MongooseError('If you are populating a virtual, you must set the ' +
        'localField and foreignField options');
    }

    options.isVirtual = isVirtual;
    options.virtual = virtual;
    if (typeof localField === 'function') {
      localField = localField.call(doc, doc);
    }
    if (typeof foreignField === 'function') {
      foreignField = foreignField.call(doc);
    }

    const localFieldPathType = modelSchema._getPathType(localField);
    const localFieldPath = localFieldPathType === 'real' ? modelSchema.path(localField) : localFieldPathType.schema;
    const localFieldGetters = localFieldPath && localFieldPath.getters ? localFieldPath.getters : [];
    let ret;

    const _populateOptions = get(options, 'options', {});

    const getters = 'getters' in _populateOptions ?
      _populateOptions.getters :
      options.isVirtual && get(virtual, 'options.getters', false);
    if (localFieldGetters.length > 0 && getters) {
      const hydratedDoc = (doc.$__ != null) ? doc : model.hydrate(doc);
      const localFieldValue = mpath.get(localField, doc, lookupLocalFields);
      if (Array.isArray(localFieldValue)) {
        const localFieldHydratedValue = mpath.get(localField.split('.').slice(0, -1), hydratedDoc, lookupLocalFields);
        ret = localFieldValue.map((localFieldArrVal, localFieldArrIndex) =>
          localFieldPath.applyGetters(localFieldArrVal, localFieldHydratedValue[localFieldArrIndex]));
      } else {
        ret = localFieldPath.applyGetters(localFieldValue, hydratedDoc);
      }
    } else {
      ret = convertTo_id(mpath.get(localField, doc, lookupLocalFields), schema);
    }

    const id = String(utils.getValue(foreignField, doc));
    options._docs[id] = Array.isArray(ret) ? ret.slice() : ret;

    let match = get(options, 'match', null) ||
      get(currentOptions, 'match', null) ||
      get(options, 'virtual.options.match', null) ||
      get(options, 'virtual.options.options.match', null);

    const hasMatchFunction = typeof match === 'function';
    if (hasMatchFunction) {
      match = match.call(doc, doc);
    }

    // Re: gh-8452. Embedded discriminators may not have `refPath`, so clear
    // out embedded discriminator docs that don't have a `refPath` on the
    // populated path.
    if (isRefPath && normalizedRefPath != null) {
      const pieces = normalizedRefPath.split('.');
      let cur = '';
      for (let j = 0; j < pieces.length; ++j) {
        const piece = pieces[j];
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
              const docValue = utils.getValue(localField.substr(cur.length + 1), subdoc);
              ret = ret.map(v => v === docValue ? SkipPopulateValue(v) : v);
              continue;
            }
            const modelName = utils.getValue(pieces.slice(j + 1).join('.'), subdoc);
            modelNames.push(modelName);
          }
        }
      }
    }

    let k = modelNames.length;
    while (k--) {
      modelName = modelNames[k];
      if (modelName == null) {
        continue;
      }

      // `PopulateOptions#connection`: if the model is passed as a string, the
      // connection matters because different connections have different models.
      const connection = options.connection != null ? options.connection : model.db;

      try {
        Model = originalModel && originalModel[modelSymbol] ?
          originalModel :
          modelName[modelSymbol] ? modelName : connection.model(modelName);
      } catch (error) {
        // If `ret` is undefined, we'll add an empty entry to modelsMap. We shouldn't
        // execute a query, but it is necessary to make sure `justOne` gets handled
        // correctly for setting an empty array (see gh-8455)
        if (ret !== undefined) {
          return error;
        }
      }

      let ids = ret;
      const flat = Array.isArray(ret) ? utils.array.flatten(ret) : [];

      if (isRefPath && Array.isArray(ret) && flat.length === modelNames.length) {
        ids = flat.filter((val, i) => modelNames[i] === modelName);
      }

      if (!available[modelName] || currentOptions.perDocumentLimit != null || get(currentOptions, 'options.perDocumentLimit') != null) {
        currentOptions = {
          model: Model
        };

        if (isVirtual && get(virtual, 'options.options')) {
          currentOptions.options = utils.clone(virtual.options.options);
        }
        utils.merge(currentOptions, options);

        // Used internally for checking what model was used to populate this
        // path.
        options[populateModelSymbol] = Model;

        available[modelName] = {
          model: Model,
          options: currentOptions,
          match: hasMatchFunction ? [match] : match,
          docs: [doc],
          ids: [ids],
          allIds: [ret],
          localField: new Set([localField]),
          foreignField: new Set([foreignField]),
          justOne: justOne,
          isVirtual: isVirtual,
          virtual: virtual,
          count: count,
          [populateModelSymbol]: Model
        };
        map.push(available[modelName]);
      } else {
        available[modelName].localField.add(localField);
        available[modelName].foreignField.add(foreignField);
        available[modelName].docs.push(doc);
        available[modelName].ids.push(ids);
        available[modelName].allIds.push(ret);
        if (hasMatchFunction) {
          available[modelName].match.push(match);
        }
      }
    }
  }

  return map;

  function _getModelNames(doc, schema) {
    let modelNames;
    let discriminatorKey;
    let isRefPath = false;
    let justOne = null;

    if (schema && schema.caster) {
      schema = schema.caster;
    }
    if (schema && schema.$isSchemaMap) {
      schema = schema.$__schemaType;
    }

    if (!schema && model.discriminators) {
      discriminatorKey = model.schema.discriminatorMapping.key;
    }

    refPath = schema && schema.options && schema.options.refPath;

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
      let modelForCurrentDoc = model;
      let schemaForCurrentDoc;

      if (!schema && discriminatorKey) {
        modelForFindSchema = utils.getValue(discriminatorKey, doc);
        if (modelForFindSchema) {
          // `modelForFindSchema` is the discriminator value, so we might need
          // find the discriminated model name
          const discriminatorModel = getDiscriminatorByValue(model, modelForFindSchema);
          if (discriminatorModel != null) {
            modelForCurrentDoc = discriminatorModel;
          } else {
            try {
              modelForCurrentDoc = model.db.model(modelForFindSchema);
            } catch (error) {
              return error;
            }
          }

          schemaForCurrentDoc = modelForCurrentDoc.schema._getSchema(options.path);

          if (schemaForCurrentDoc && schemaForCurrentDoc.caster) {
            schemaForCurrentDoc = schemaForCurrentDoc.caster;
          }
        }
      } else {
        schemaForCurrentDoc = schema;
      }
      const _virtualRes = getVirtual(modelForCurrentDoc.schema, options.path);
      const virtual = _virtualRes == null ? null : _virtualRes.virtual;

      if (schemaForCurrentDoc != null) {
        justOne = !schemaForCurrentDoc.$isMongooseArray && !schemaForCurrentDoc._arrayPath;
      }

      let ref;
      let refPath;

      if ((ref = get(schemaForCurrentDoc, 'options.ref')) != null) {
        ref = handleRefFunction(ref, doc);
        modelNames = [ref];
      } else if ((ref = get(virtual, 'options.ref')) != null) {
        ref = handleRefFunction(ref, doc);

        // When referencing nested arrays, the ref should be an Array
        // of modelNames.
        if (Array.isArray(ref)) {
          modelNames = ref;
        } else {
          modelNames = [ref];
        }

        isVirtual = true;
      } else if ((refPath = get(schemaForCurrentDoc, 'options.refPath')) != null) {
        isRefPath = true;
        refPath = normalizeRefPath(refPath, doc, options.path);
        modelNames = utils.getValue(refPath, doc);
        if (Array.isArray(modelNames)) {
          modelNames = utils.array.flatten(modelNames);
        }
      } else {
        // We may have a discriminator, in which case we don't want to
        // populate using the base model by default
        modelNames = discriminatorKey ? null : [model.modelName];
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

function handleRefFunction(ref, doc) {
  if (typeof ref === 'function' && !ref[modelSymbol]) {
    return ref.call(doc, doc);
  }
  return ref;
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
        val[i] = val[i]._id;
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
  // If doc has already been hydrated, e.g. `doc.populate('map').execPopulate()`
  // then `val` will already be a map
  if (val instanceof Map) {
    return Array.from(val.values());
  }

  return val;
}