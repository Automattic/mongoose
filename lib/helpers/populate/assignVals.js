'use strict';

const assignRawDocsToIdStructure = require('./assignRawDocsToIdStructure');
const get = require('../get');
const getVirtual = require('./getVirtual');
const leanPopulateMap = require('./leanPopulateMap');
const mpath = require('mpath');
const sift = require('sift').default;
const utils = require('../../utils');

module.exports = function assignVals(o) {
  // Options that aren't explicitly listed in `populateOptions`
  const userOptions = get(o, 'allOptions.options.options');
  // `o.options` contains options explicitly listed in `populateOptions`, like
  // `match` and `limit`.
  const populateOptions = Object.assign({}, o.options, userOptions, {
    justOne: o.justOne
  });

  const originalIds = [].concat(o.rawIds);

  // replace the original ids in our intermediate _ids structure
  // with the documents found by query
  assignRawDocsToIdStructure(o.rawIds, o.rawDocs, o.rawOrder, populateOptions);

  // now update the original documents being populated using the
  // result structure that contains real documents.
  const docs = o.docs;
  const rawIds = o.rawIds;
  const options = o.options;
  const count = o.count && o.isVirtual;

  function setValue(val) {
    if (count) {
      return val;
    }
    if (o.justOne === true && Array.isArray(val)) {
      return valueFilter(val[0], options, populateOptions);
    } else if (o.justOne === false && !Array.isArray(val)) {
      return valueFilter([val], options, populateOptions);
    }
    return valueFilter(val, options, populateOptions);
  }

  for (let i = 0; i < docs.length; ++i) {
    const existingVal = utils.getValue(o.path, docs[i]);
    if (existingVal == null && !getVirtual(o.originalModel.schema, o.path)) {
      continue;
    }

    let valueToSet;
    if (count) {
      valueToSet = numDocs(rawIds[i]);
    } else if (Array.isArray(o.match)) {
      valueToSet = Array.isArray(rawIds[i]) ?
        sift(o.match[i], rawIds[i]) :
        sift(o.match[i], [rawIds[i]])[0];
    } else {
      valueToSet = rawIds[i];
    }

    // If we're populating a map, the existing value will be an object, so
    // we need to transform again
    const originalSchema = o.originalModel.schema;
    const isDoc = get(docs[i], '$__', null) != null;
    let isMap = isDoc ?
      existingVal instanceof Map :
      utils.isPOJO(existingVal);
    // If we pass the first check, also make sure the local field's schematype
    // is map (re: gh-6460)
    isMap = isMap && get(originalSchema._getSchema(o.path), '$isSchemaMap');
    if (!o.isVirtual && isMap) {
      const _keys = existingVal instanceof Map ?
        Array.from(existingVal.keys()) :
        Object.keys(existingVal);
      valueToSet = valueToSet.reduce((cur, v, i) => {
        cur.set(_keys[i], v);
        return cur;
      }, new Map());
    }

    if (o.isVirtual && isDoc) {
      docs[i].populated(o.path, o.justOne ? originalIds[0] : originalIds, o.allOptions);
      // If virtual populate and doc is already init-ed, need to walk through
      // the actual doc to set rather than setting `_doc` directly
      mpath.set(o.path, valueToSet, docs[i], setValue);
      continue;
    }

    const parts = o.path.split('.');
    let cur = docs[i];
    for (let j = 0; j < parts.length - 1; ++j) {
      if (cur[parts[j]] == null) {
        cur[parts[j]] = {};
      }
      cur = cur[parts[j]];
      // If the property in MongoDB is a primitive, we won't be able to populate
      // the nested path, so skip it. See gh-7545
      if (typeof cur !== 'object') {
        return;
      }
    }
    if (docs[i].$__) {
      docs[i].populated(o.path, o.allIds[i], o.allOptions);
    }

    // If lean, need to check that each individual virtual respects
    // `justOne`, because you may have a populated virtual with `justOne`
    // underneath an array. See gh-6867
    utils.setValue(o.path, valueToSet, docs[i], setValue, false);
  }
};

function numDocs(v) {
  if (Array.isArray(v)) {
    return v.length;
  }
  return v == null ? 0 : 1;
}

/*!
 * 1) Apply backwards compatible find/findOne behavior to sub documents
 *
 *    find logic:
 *      a) filter out non-documents
 *      b) remove _id from sub docs when user specified
 *
 *    findOne
 *      a) if no doc found, set to null
 *      b) remove _id from sub docs when user specified
 *
 * 2) Remove _ids when specified by users query.
 *
 * background:
 * _ids are left in the query even when user excludes them so
 * that population mapping can occur.
 */

function valueFilter(val, assignmentOpts, populateOptions) {
  if (Array.isArray(val)) {
    // find logic
    const ret = [];
    const numValues = val.length;
    for (let i = 0; i < numValues; ++i) {
      const subdoc = val[i];
      if (!isPopulatedObject(subdoc) && (!populateOptions.retainNullValues || subdoc != null)) {
        continue;
      }
      maybeRemoveId(subdoc, assignmentOpts);
      ret.push(subdoc);
      if (assignmentOpts.originalLimit &&
          ret.length >= assignmentOpts.originalLimit) {
        break;
      }
    }

    // Since we don't want to have to create a new mongoosearray, make sure to
    // modify the array in place
    while (val.length > ret.length) {
      Array.prototype.pop.apply(val, []);
    }
    for (let i = 0; i < ret.length; ++i) {
      val[i] = ret[i];
    }
    return val;
  }

  // findOne
  if (isPopulatedObject(val)) {
    maybeRemoveId(val, assignmentOpts);
    return val;
  }

  if (val instanceof Map) {
    return val;
  }

  if (populateOptions.justOne === true) {
    return (val == null ? val : null);
  }
  if (populateOptions.justOne === false) {
    return [];
  }
  return val;
}

/*!
 * Remove _id from `subdoc` if user specified "lean" query option
 */

function maybeRemoveId(subdoc, assignmentOpts) {
  if (assignmentOpts.excludeId) {
    if (typeof subdoc.setValue === 'function') {
      delete subdoc._doc._id;
    } else {
      delete subdoc._id;
    }
  }
}

/*!
 * Determine if `obj` is something we can set a populated path to. Can be a
 * document, a lean document, or an array/map that contains docs.
 */

function isPopulatedObject(obj) {
  if (obj == null) {
    return false;
  }

  return Array.isArray(obj) ||
    obj.$isMongooseMap ||
    obj.$__ != null ||
    leanPopulateMap.has(obj);
}