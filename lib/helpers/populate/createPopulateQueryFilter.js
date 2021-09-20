'use strict';

const SkipPopulateValue = require('./SkipPopulateValue');
const parentPaths = require('../path/parentPaths');
const { trusted } = require('../query/trusted');

module.exports = function createPopulateQueryFilter(ids, _match, _foreignField, model, skipInvalidIds) {
  const match = _formatMatch(_match);

  if (_foreignField.size === 1) {
    const foreignField = Array.from(_foreignField)[0];
    const foreignSchemaType = model.schema.path(foreignField);
    if (foreignField !== '_id' || !match['_id']) {
      ids = _filterInvalidIds(ids, foreignSchemaType, skipInvalidIds);
      match[foreignField] = trusted({ $in: ids });
    }

    const _parentPaths = parentPaths(foreignField);
    for (let i = 0; i < _parentPaths.length - 1; ++i) {
      const cur = _parentPaths[i];
      if (match[cur] != null && match[cur].$elemMatch != null) {
        match[cur].$elemMatch[foreignField.slice(cur.length + 1)] = trusted({ $in: ids });
        delete match[foreignField];
        break;
      }
    }
  } else {
    const $or = [];
    if (Array.isArray(match.$or)) {
      match.$and = [{ $or: match.$or }, { $or: $or }];
      delete match.$or;
    } else {
      match.$or = $or;
    }
    for (const foreignField of _foreignField) {
      if (foreignField !== '_id' || !match['_id']) {
        const foreignSchemaType = model.schema.path(foreignField);
        ids = _filterInvalidIds(ids, foreignSchemaType, skipInvalidIds);
        $or.push({ [foreignField]: { $in: ids } });
      }
    }
  }

  return match;
};

/*!
 * Optionally filter out invalid ids that don't conform to foreign field's schema
 * to avoid cast errors (gh-7706)
 */

function _filterInvalidIds(ids, foreignSchemaType, skipInvalidIds) {
  ids = ids.filter(v => !(v instanceof SkipPopulateValue));
  if (!skipInvalidIds) {
    return ids;
  }
  return ids.filter(id => {
    try {
      foreignSchemaType.cast(id);
      return true;
    } catch (err) {
      return false;
    }
  });
}

/*!
 * Format `mod.match` given that it may be an array that we need to $or if
 * the client has multiple docs with match functions
 */

function _formatMatch(match) {
  if (Array.isArray(match)) {
    if (match.length > 1) {
      return { $or: [].concat(match.map(m => Object.assign({}, m))) };
    }
    return Object.assign({}, match[0]);
  }
  return Object.assign({}, match);
}