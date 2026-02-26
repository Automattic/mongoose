'use strict';

const MongooseError = require('../../error/index');
const SkipPopulateValue = require('./skipPopulateValue');
const clone = require('../clone');
const get = require('../get');
const getDiscriminatorByValue = require('../discriminator/getDiscriminatorByValue');
const getConstructorName = require('../getConstructorName');
const getSchemaTypes = require('./getSchemaTypes');
const getVirtual = require('./getVirtual');
const lookupLocalFields = require('./lookupLocalFields');
const mpath = require('mpath');
const modelNamesFromRefPath = require('./modelNamesFromRefPath');
const utils = require('../../utils');

const modelSymbol = require('../symbols').modelSymbol;
const populateModelSymbol = require('../symbols').populateModelSymbol;
const schemaMixedSymbol = require('../../schema/symbols').schemaMixedSymbol;
const StrictPopulate = require('../../error/strictPopulate');
const numericPathSegmentPattern = '\\.\\d+(?=\\.|$)';
const hasNumericPathSegmentRE = new RegExp(numericPathSegmentPattern);
const numericPathSegmentRE = new RegExp(numericPathSegmentPattern, 'g');

module.exports = function getModelsMapForPopulate(model, docs, options) {
  let doc;
  const len = docs.length;
  const map = [];
  const modelNameFromQuery = options.model?.modelName || options.model;
  let schema;
  let refPath;
  let modelNames;
  let modelNamesSet;
  const available = {};

  const modelSchema = model.schema;

  // Populating a nested path should always be a no-op re: #9073.
  // People shouldn't do this, but apparently they do.
  if (options._localModel != null && options._localModel.schema.nested[options.path]) {
    return [];
  }

  const _virtualRes = getVirtual(model.schema, options.path);
  const virtual = _virtualRes == null ? null : _virtualRes.virtual;
  if (virtual != null) {
    return _virtualPopulate(model, docs, options, _virtualRes);
  }

  const parts = modelSchema.paths[options.path]?.splitPath() ?? options.path.split('.');
  let allSchemaTypes = getSchemaTypes(model, modelSchema, null, options.path, parts);
  allSchemaTypes = Array.isArray(allSchemaTypes) ? allSchemaTypes : [allSchemaTypes].filter(v => v != null);

  const isStrictPopulateDisabled = options.strictPopulate === false || options.options?.strictPopulate === false;
  if (!isStrictPopulateDisabled && allSchemaTypes.length === 0 && options._localModel != null) {
    return new StrictPopulate(options._fullPath || options.path);
  }

  for (let i = 0; i < len; i++) {
    doc = docs[i];
    let justOne = null;

    if (doc.$__ != null && doc.populated(options.path)) {
      const forceRepopulate = options.forceRepopulate ?? doc.constructor.base.options.forceRepopulate;
      if (forceRepopulate === false) {
        continue;
      }
    }

    const docSchema = doc?.$__ != null ? doc.$__schema : modelSchema;
    schema = getSchemaTypes(model, docSchema, doc, options.path, parts);

    // Special case: populating a path that's a DocumentArray unless
    // there's an explicit `ref` or `refPath` re: gh-8946
    if (schema != null &&
        schema.$isMongooseDocumentArray &&
        schema.options.ref == null &&
        schema.options.refPath == null) {
      continue;
    }
    const isUnderneathDocArray = schema?.$parentSchemaDocArray;
    if (isUnderneathDocArray && get(options, 'options.sort') != null) {
      return new MongooseError('Cannot populate with `sort` on path ' + options.path +
        ' because it is a subproperty of a document array');
    }

    modelNames = null;
    let isRefPath = false;
    let normalizedRefPath = null;
    let schemaOptions = null;
    let modelNamesInOrder = null;

    if (schema?.instance === 'Embedded') {
      if (schema.options.ref) {
        const data = {
          localField: options.path + '._id',
          foreignField: '_id',
          justOne: true
        };
        const res = _getModelNames(doc, schema, modelNameFromQuery, model);

        const unpopulatedValue = mpath.get(options.path, doc);
        const id = mpath.get('_id', unpopulatedValue);
        addModelNamesToMap(model, map, available, res.modelNames, options, data, id, doc, schemaOptions, unpopulatedValue);
      }
      // No-op if no `ref` set. See gh-11538
      continue;
    }

    if (Array.isArray(schema)) {
      const schemasArray = schema;
      for (const _schema of schemasArray) {
        let _modelNames;
        let res;
        try {
          res = _getModelNames(doc, _schema, modelNameFromQuery, model);
          _modelNames = res.modelNames;
          isRefPath = isRefPath || res.isRefPath;
          normalizedRefPath = normalizedRefPath || res.refPath;
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
        modelNamesSet = modelNamesSet || new Set();
        for (const modelName of _modelNames) {
          if (modelNamesSet.has(modelName) === false) {
            modelNamesSet.add(modelName);
            modelNames.push(modelName);
          }
        }
      }
    } else {
      try {
        const res = _getModelNames(doc, schema, modelNameFromQuery, model);
        modelNames = res.modelNames;
        isRefPath = res.isRefPath;
        normalizedRefPath = normalizedRefPath || res.refPath;
        justOne = res.justOne;
        schemaOptions = get(schema, 'options.populate', null);
        // Dedupe, because `refPath` can return duplicates of the same model name,
        // and that causes perf issues.
        if (isRefPath) {
          modelNamesInOrder = modelNames;
          modelNames = Array.from(new Set(modelNames));
        }
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
      if (options.path.endsWith('.' + schema.path) || options.path === schema.path) {
        justOne = Array.isArray(schema) ?
          schema.every(schema => !schema.$isMongooseArray) :
          !schema.$isMongooseArray;
      }
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
    throwOn$where(match);
    data.match = match;
    data.hasMatchFunction = hasMatchFunction;
    data.isRefPath = isRefPath;
    data.modelNamesInOrder = modelNamesInOrder;

    if (isRefPath) {
      const normalizedRefPathForDiscriminators = typeof normalizedRefPath === 'string' ?
        normalizedRefPath.replace(numericPathSegmentRE, '') :
        normalizedRefPath;
      const embeddedDiscriminatorModelNames = _findRefPathForDiscriminators(doc,
        modelSchema, data, options, normalizedRefPathForDiscriminators, ret);

      modelNames = embeddedDiscriminatorModelNames || modelNames;
    }

    try {
      addModelNamesToMap(model, map, available, modelNames, options, data, ret, doc, schemaOptions);
    } catch (err) {
      return err;
    }
  }
  return map;

  function _getModelNames(doc, schemaType, modelNameFromQuery, model) {
    let modelNames;
    let isRefPath = false;
    let justOne = null;

    const originalSchema = schemaType;
    if (schemaType?.instance === 'Array') {
      schemaType = schemaType.embeddedSchemaType;
    }
    if (schemaType?.$isSchemaMap) {
      schemaType = schemaType.$__schemaType;
    }

    const ref = schemaType?.options?.ref;
    refPath = schemaType?.options?.refPath;
    if (schemaType != null &&
        schemaType[schemaMixedSymbol] &&
        !ref &&
        !refPath &&
        !modelNameFromQuery) {
      return { modelNames: null };
    }

    if (modelNameFromQuery) {
      modelNames = [modelNameFromQuery]; // query options
    } else if (refPath != null) {
      if (typeof refPath === 'function') {
        const res = _getModelNamesFromFunctionRefPath(refPath, doc, schemaType, options.path, modelSchema, options._queryProjection);
        modelNames = res.modelNames;
        refPath = res.refPath;
      } else {
        modelNames = modelNamesFromRefPath(refPath, doc, options.path, modelSchema, options._queryProjection);
      }

      isRefPath = true;
    } else {
      let ref;
      let refPath;
      let schemaForCurrentDoc;
      let discriminatorValue;
      let modelForCurrentDoc = model;
      const discriminatorKey = model.schema.options.discriminatorKey;

      if (!schemaType && discriminatorKey && (discriminatorValue = utils.getValue(discriminatorKey, doc))) {
        // `modelNameForFind` is the discriminator value, so we might need
        // find the discriminated model name
        const discriminatorModel = getDiscriminatorByValue(model.discriminators, discriminatorValue) || model;
        if (discriminatorModel != null) {
          modelForCurrentDoc = discriminatorModel;
        } else {
          try {
            modelForCurrentDoc = _getModelFromConn(model.db, discriminatorValue);
          } catch (error) {
            return error;
          }
        }

        schemaForCurrentDoc = modelForCurrentDoc.schema._getSchema(options.path);

        if (schemaForCurrentDoc?.embeddedSchemaType) {
          schemaForCurrentDoc = schemaForCurrentDoc.embeddedSchemaType;
        }
      } else {
        schemaForCurrentDoc = schemaType;
      }

      if (originalSchema && originalSchema.path.endsWith('.$*')) {
        justOne = !originalSchema.$isMongooseArray && !originalSchema._arrayPath;
      } else if (schemaForCurrentDoc != null) {
        justOne = !schemaForCurrentDoc.$isMongooseArray && !schemaForCurrentDoc._arrayPath;
      }

      if ((ref = get(schemaForCurrentDoc, 'options.ref')) != null) {
        if (schemaForCurrentDoc != null &&
            typeof ref === 'function' &&
            options.path.endsWith('.' + schemaForCurrentDoc.path)) {
          // Ensure correct context for ref functions: subdoc, not top-level doc. See gh-8469
          modelNames = new Set();

          const subdocPath = options.path.slice(0, options.path.length - schemaForCurrentDoc.path.length - 1);
          const vals = mpath.get(subdocPath, doc, lookupLocalFields);
          const subdocsBeingPopulated = Array.isArray(vals) ?
            utils.array.flatten(vals) :
            (vals ? [vals] : []);
          for (const subdoc of subdocsBeingPopulated) {
            modelNames.add(handleRefFunction(ref, subdoc));
          }

          if (subdocsBeingPopulated.length === 0) {
            modelNames = [handleRefFunction(ref, doc)];
          } else {
            modelNames = Array.from(modelNames);
          }
        } else {
          ref = handleRefFunction(ref, doc);
          modelNames = [ref];
        }
      } else if ((refPath = get(schemaForCurrentDoc, 'options.refPath')) != null) {
        isRefPath = true;
        if (typeof refPath === 'function') {
          const res = _getModelNamesFromFunctionRefPath(refPath, doc, schemaForCurrentDoc, options.path, modelSchema, options._queryProjection);
          modelNames = res.modelNames;
          refPath = res.refPath;
        } else {
          modelNames = modelNamesFromRefPath(refPath, doc, options.path, modelSchema, options._queryProjection);
        }
      }
    }

    if (!modelNames) {
      // `Model.populate()` on a POJO with no known local model. Default to using the `Model`
      if (options._localModel == null) {
        modelNames = [model.modelName];
      } else {
        return { modelNames: modelNames, justOne: justOne, isRefPath: isRefPath, refPath: refPath };
      }
    }

    if (!Array.isArray(modelNames)) {
      modelNames = [modelNames];
    }

    return { modelNames: modelNames, justOne: justOne, isRefPath: isRefPath, refPath: refPath };
  }
};

/**
 * Resolve model names for function-style `refPath` and return the first
 * resolved refPath value so discriminator handling can inspect it later.
 *
 * @param {Function} refPath
 * @param {Document|Object} doc
 * @param {SchemaType} schema
 * @param {String} populatePath
 * @param {Schema} modelSchema
 * @param {Object} queryProjection
 * @returns {{modelNames: String[], refPath: String|null}}
 * @private
 */
function _getModelNamesFromFunctionRefPath(refPath, doc, schemaType, populatePath, modelSchema, queryProjection) {
  const modelNames = [];
  let normalizedRefPath = null;
  const schemaPath = schemaType?.path;

  if (schemaPath != null &&
      populatePath.length > schemaPath.length + 1 &&
      populatePath.charAt(populatePath.length - schemaPath.length - 1) === '.' &&
      populatePath.slice(populatePath.length - schemaPath.length) === schemaPath
  ) {
    const subdocPath = populatePath.slice(0, populatePath.length - schemaPath.length - 1);
    const segments = subdocPath.indexOf('.') === -1 ? [subdocPath] : subdocPath.split('.');
    let hasSubdoc = false;

    walkSubdocs(doc, '', 0);
    if (hasSubdoc) {
      return { modelNames, refPath: normalizedRefPath };
    }

    function walkSubdocs(currentSubdoc, indexedPathPrefix, segmentIndex) {
      if (currentSubdoc == null) {
        return;
      }

      if (segmentIndex >= segments.length) {
        hasSubdoc = true;
        const indexedPath = indexedPathPrefix + '.' + schemaPath;
        const subdocRefPath = refPath.call(currentSubdoc, currentSubdoc, indexedPath);
        normalizedRefPath = normalizedRefPath || subdocRefPath;
        modelNames.push(..._getModelNamesFromRefPath(subdocRefPath, doc, populatePath, indexedPath, modelSchema, queryProjection));
        return;
      }

      const segment = segments[segmentIndex];
      const source = currentSubdoc?._doc ?? currentSubdoc;

      if (segment === '$*') {
        if (source instanceof Map) {
          for (const [key, value] of source.entries()) {
            if (value != null) {
              const valuePath = indexedPathPrefix.length === 0 ?
                key :
                indexedPathPrefix + '.' + key;
              walkSubdocs(value, valuePath, segmentIndex + 1);
            }
          }
          return;
        }

        if (source != null && typeof source === 'object') {
          for (const key of Object.keys(source)) {
            const value = source[key];
            if (value != null) {
              const valuePath = indexedPathPrefix.length === 0 ?
                key :
                indexedPathPrefix + '.' + key;
              walkSubdocs(value, valuePath, segmentIndex + 1);
            }
          }
        }
        return;
      }

      const child = source[segment];
      const childPath = indexedPathPrefix.length === 0 ?
        segment :
        indexedPathPrefix + '.' + segment;

      if (Array.isArray(child)) {
        for (let i = 0; i < child.length; ++i) {
          if (child[i] != null) {
            walkSubdocs(child[i], childPath + '.' + i, segmentIndex + 1);
          }
        }
      } else if (child != null) {
        walkSubdocs(child, childPath, segmentIndex + 1);
      }
    }
  }

  const topLevelRefPath = refPath.call(doc, doc, populatePath);
  normalizedRefPath = normalizedRefPath || topLevelRefPath;
  modelNames.push(...modelNamesFromRefPath(topLevelRefPath, doc, populatePath, modelSchema, queryProjection));

  return { modelNames, refPath: normalizedRefPath };
}

/**
 * Resolve model names from a refPath, preferring the indexed populated path
 * for array subdocuments and falling back to the original populate path if
 * normalization fails.
 *
 * @param {String|Function} refPath
 * @param {Document|Object} doc
 * @param {String} populatePath
 * @param {String} indexedPath
 * @param {Schema} modelSchema
 * @param {Object} queryProjection
 * @returns {String[]}
 * @private
 */
function _getModelNamesFromRefPath(refPath, doc, populatePath, indexedPath, modelSchema, queryProjection) {
  const populatedPath = typeof refPath === 'string' && hasNumericPathSegmentRE.test(refPath) ?
    populatePath :
    indexedPath;

  try {
    return modelNamesFromRefPath(refPath, doc, populatedPath, modelSchema, queryProjection);
  } catch (error) {
    if (populatedPath === indexedPath &&
        typeof error?.message === 'string' &&
        error.message.startsWith('Could not normalize ref path')) {
      return modelNamesFromRefPath(refPath, doc, populatePath, modelSchema, queryProjection);
    }
    throw error;
  }
}

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
    if (typeof options.localField === 'string') {
      localField = options.localField;
    } else if (typeof virtual.options.localField === 'function') {
      localField = virtualPrefix + virtual.options.localField.call(doc, doc);
    } else if (Array.isArray(virtual.options.localField)) {
      localField = virtual.options.localField.map(field => virtualPrefix + field);
    } else {
      localField = virtualPrefix + virtual.options.localField;
    }
    data.count = virtual.options.count;

    if (virtual.options.skip != null && !Object.hasOwn(options, 'skip')) {
      options.skip = virtual.options.skip;
    }
    if (virtual.options.limit != null && !Object.hasOwn(options, 'limit')) {
      options.limit = virtual.options.limit;
    }
    if (virtual.options.perDocumentLimit != null && !Object.hasOwn(options, 'perDocumentLimit')) {
      options.perDocumentLimit = virtual.options.perDocumentLimit;
    }
    let foreignField = virtual.options.foreignField;

    if (!localField || !foreignField) {
      return new MongooseError(`Cannot populate virtual \`${options.path}\` on model \`${model.modelName}\`, because options \`localField\` and / or \`foreignField\` are missing`);
    }

    if (typeof localField === 'function') {
      localField = localField.call(doc, doc);
    }
    if (typeof foreignField === 'function') {
      foreignField = foreignField.call(doc, doc);
    }

    data.isRefPath = false;

    // `justOne = null` means we don't know from the schema whether the end
    // result should be an array or a single doc. This can result from
    // populating a POJO using `Model.populate()`
    let justOne = null;
    if ('justOne' in options && options.justOne !== void 0) {
      justOne = options.justOne;
    }

    // Use the correct target doc/sub-doc for dynamic ref on nested schema. See gh-12363
    if (_virtualRes.nestedSchemaPath && typeof virtual.options.ref === 'function') {
      const subdocs = utils.getValue(_virtualRes.nestedSchemaPath, doc);
      modelNames = Array.isArray(subdocs)
        ? subdocs.flatMap(subdoc => virtual._getModelNamesForPopulate(subdoc))
        : virtual._getModelNamesForPopulate(subdocs);
    } else {
      modelNames = virtual._getModelNamesForPopulate(doc);
    }
    if (virtual.options.refPath) {
      justOne = !!virtual.options.justOne;
      data.isRefPath = true;
    } else if (virtual.options.ref) {
      justOne = !!virtual.options.justOne;
    }

    data.isVirtual = true;
    data.virtual = virtual;
    data.justOne = justOne;

    // `match`
    const baseMatch = get(data, 'virtual.options.match', null) ||
      get(data, 'virtual.options.options.match', null);
    let match = get(options, 'match', null) || baseMatch;

    let hasMatchFunction = typeof match === 'function';
    if (hasMatchFunction) {
      match = match.call(doc, doc, data.virtual);
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

    throwOn$where(match);

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

function addModelNamesToMap(model, map, available, modelNames, options, data, ret, doc, schemaOptions, unpopulatedValue) {
  // `PopulateOptions#connection`: if the model is passed as a string, the
  // connection matters because different connections have different models.
  const connection = options.connection ?? model.db;

  unpopulatedValue = unpopulatedValue === void 0 ? ret : unpopulatedValue;
  if (Array.isArray(unpopulatedValue)) {
    unpopulatedValue = utils.cloneArrays(unpopulatedValue);
  }

  if (modelNames == null) {
    return;
  }

  const flatModelNames = utils.array.flatten(modelNames);
  let k = flatModelNames.length;
  while (k--) {
    let modelName = flatModelNames[k];
    if (modelName == null) {
      continue;
    }

    let Model;
    if (options.model && options.model[modelSymbol]) {
      Model = options.model;
    } else if (modelName[modelSymbol]) {
      Model = modelName;
      modelName = Model.modelName;
    } else {
      try {
        Model = _getModelFromConn(connection, modelName);
      } catch (err) {
        if (ret !== void 0) {
          throw err;
        }
        Model = null;
      }
    }

    let ids = ret;

    const modelNamesForRefPath = data.modelNamesInOrder || modelNames;
    if (data.isRefPath && Array.isArray(ret) && ret.length === modelNamesForRefPath.length) {
      ids = matchIdsToRefPaths(ret, modelNamesForRefPath, modelName);
    }

    const perDocumentLimit = options.perDocumentLimit == null ?
      get(options, 'options.perDocumentLimit', null) :
      options.perDocumentLimit;

    if (!available[modelName] || perDocumentLimit != null) {
      const currentOptions = {
        model: Model
      };
      if (data.isVirtual && get(data.virtual, 'options.options')) {
        currentOptions.options = clone(data.virtual.options.options);
      } else if (schemaOptions != null) {
        currentOptions.options = Object.assign({}, schemaOptions);
      }
      utils.merge(currentOptions, options);

      // Used internally for checking what model was used to populate this
      // path.
      options[populateModelSymbol] = Model;
      currentOptions[populateModelSymbol] = Model;
      available[modelName] = {
        model: Model,
        options: currentOptions,
        match: data.hasMatchFunction ? [data.match] : data.match,
        docs: [doc],
        ids: [ids],
        allIds: [ret],
        unpopulatedValues: [unpopulatedValue],
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
      available[modelName].unpopulatedValues.push(unpopulatedValue);
      if (data.hasMatchFunction) {
        available[modelName].match.push(data.match);
      }
    }
  }
}

function _getModelFromConn(conn, modelName) {
  /* If this connection has a parent from `useDb()`, bubble up to parent's models */
  if (conn.models[modelName] == null && conn._parent != null) {
    return _getModelFromConn(conn._parent, modelName);
  }

  return conn.model(modelName);
}

function matchIdsToRefPaths(ids, refPaths, refPathToFind) {
  if (!Array.isArray(refPaths)) {
    return refPaths === refPathToFind
      ? Array.isArray(ids)
        ? utils.array.flatten(ids)
        : [ids]
      : [];
  }
  if (Array.isArray(ids) && Array.isArray(refPaths)) {
    return ids.flatMap((id, index) => matchIdsToRefPaths(id, refPaths[index], refPathToFind));
  }
  return [];
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
  const localFieldGetters = localFieldPath?.getters || [];

  localField = localFieldPath?.instance === 'Embedded' ? localField + '._id' : localField;

  const _populateOptions = get(options, 'options', {});

  const getters = 'getters' in _populateOptions ?
    _populateOptions.getters :
    get(virtual, 'options.getters', false);
  if (localFieldGetters.length !== 0 && getters) {
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

/**
 * Retrieve the _id of `val` if a Document or Array of Documents.
 *
 * @param {Array|Document|Any} val
 * @param {Schema} schema
 * @return {Array|Document|Any}
 * @api private
 */

function convertTo_id(val, schema) {
  if (val?.$__ != null) {
    return val._doc._id;
  }
  if (val?._id != null && !schema?.$isSchemaMap) {
    return val._id;
  }

  if (Array.isArray(val)) {
    const rawVal = val.__array ?? val;
    for (let i = 0; i < rawVal.length; ++i) {
      if (rawVal[i]?.$__ != null) {
        rawVal[i] = rawVal[i]._doc._id;
      }
    }
    if (utils.isMongooseArray(val) && val.$schema()) {
      return val.$schema()._castForPopulate(val, val.$parent());
    }

    return [].concat(val);
  }

  // `populate('map')` may be an object if populating on a doc that hasn't
  // been hydrated yet
  if (getConstructorName(val) === 'Object' &&
      // The intent here is we should only flatten the object if we expect
      // to get a Map in the end. Avoid doing this for mixed types.
      schema?.[schemaMixedSymbol] == null) {
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
        schematype.$isMongooseDocumentArray &&
        schematype.Constructor.discriminators != null &&
        utils.hasOwnKeys(schematype.Constructor.discriminators)) {
      const subdocs = utils.getValue(cur, doc);
      const remnant = options.path.substring(cur.length + 1);
      const discriminatorKey = schematype.Constructor.schema.options.discriminatorKey;
      modelNames = [];
      for (const subdoc of subdocs) {
        const discriminatorName = utils.getValue(discriminatorKey, subdoc);
        const discriminator = schematype.Constructor.discriminators[discriminatorName];
        const discriminatorSchema = discriminator?.schema;
        if (discriminatorSchema == null) {
          continue;
        }
        const _path = discriminatorSchema.path(remnant);
        if (_path == null || _path.options.refPath == null) {
          const docValue = utils.getValue(data.localField.substring(cur.length + 1), subdoc);
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

/**
 * Throw an error if there are any $where keys
 */

function throwOn$where(match) {
  if (match == null) {
    return;
  }
  if (typeof match !== 'object') {
    return;
  }
  for (const key of Object.keys(match)) {
    if (key === '$where') {
      throw new MongooseError('Cannot use $where filter with populate() match');
    }
    if (match[key] != null && typeof match[key] === 'object') {
      throwOn$where(match[key]);
    }
  }
}
