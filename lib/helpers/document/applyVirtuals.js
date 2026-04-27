'use strict';

const mpath = require('mpath');
const setParent = require('../lean/parent').setParent;
const utils = require('../../utils');

module.exports = applyVirtuals;

/**
 * Apply a given schema's virtuals to a given POJO
 *
 * @param {Schema} schema
 * @param {object} obj
 * @param {string[]} [virtuals] optional whitelist of virtuals to apply
 * @param {Object} [options]
 * @param {Object} [options.parent]
 * @param {boolean} [options.skipPopulateVirtuals=false]
 * @returns
 */

function applyVirtuals(schema, obj, virtuals, options) {
  if (virtuals === false || obj == null) {
    return obj;
  }

  if (Array.isArray(virtuals)) {
    virtuals = virtuals.map(virtual => Array.isArray(virtual) ? virtual : virtual.split('.'));
  }

  let virtualsForChildren = virtuals;
  let toApply = null;

  if (Array.isArray(virtuals)) {
    virtualsForChildren = [];
    toApply = [];
    for (const virtual of virtuals) {
      if (virtual.length === 1) {
        toApply.push(virtual);
      } else {
        virtualsForChildren.push(virtual);
      }
    }
  }

  let called = false;
  const applyVirtualsToResultOnce = () => {
    if (called) {
      return obj;
    }
    called = true;
    return applyVirtualsToDoc(schema, obj, toApply, options);
  };

  addToParentMap(obj, options, applyVirtualsToResultOnce);
  applyVirtualsToChildren(schema, obj, virtualsForChildren, options);
  return applyVirtualsToResultOnce();
}

/**
 * Apply virtuals to any subdocuments
 *
 * @param {Schema} schema subdocument schema
 * @param {object} res subdocument
 * @param {string[]} [virtuals] optional whitelist of virtuals to apply
 */

function addToParentMap(res, options, applyVirtualsToResult) {
  if (res == null) {
    return;
  }

  const parent = options?.parent;
  if (Array.isArray(parent)) {
    for (let i = 0; i < parent.length; ++i) {
      addToParentMap(res[i], { ...options, parent: parent[i] }, applyVirtualsToResult);
    }
    return;
  }

  if (Array.isArray(res)) {
    for (const doc of res) {
      if (doc != null && typeof doc === 'object') {
        setParent(doc, parent, applyVirtualsToResult);
      }
    }
    return;
  }

  if (typeof res === 'object') {
    setParent(res, parent, applyVirtualsToResult);
  }
}

function applyVirtualsToChildren(schema, res, virtuals, options) {
  let attachedVirtuals = false;
  for (const childSchema of schema.childSchemas) {
    const _path = childSchema.model.path;
    const _schema = childSchema.schema;
    if (!_path) {
      continue;
    }
    const _obj = mpath.get(_path, res);
    if (_obj == null || (Array.isArray(_obj) && _obj.flat(Infinity).length === 0)) {
      continue;
    }

    let virtualsForChild = null;
    if (Array.isArray(virtuals)) {
      virtualsForChild = [];
      for (const virtual of virtuals) {
        if (virtual[0] == _path) {
          virtualsForChild.push(virtual.slice(1));
        }
      }

      if (virtualsForChild.length === 0) {
        continue;
      }
    }

    applyVirtuals(_schema, _obj, virtualsForChild, {
      ...options,
      parent: res
    });
    attachedVirtuals = true;
  }

  if (virtuals?.length && !attachedVirtuals) {
    applyVirtualsToDoc(schema, res, virtuals, options);
  }
}

/**
 * Apply virtuals to a given document. Does not apply virtuals to subdocuments: use `applyVirtualsToChildren` instead
 *
 * @param {Schema} schema
 * @param {object} doc
 * @param {(string|string[])[]} [virtuals] optional whitelist of virtuals to apply
 * @returns
 */

function applyVirtualsToDoc(schema, obj, virtuals, options) {
  if (obj == null || typeof obj !== 'object') {
    return;
  }
  if (Array.isArray(obj)) {
    for (const el of obj) {
      applyVirtualsToDoc(schema, el, virtuals, options);
    }
    return;
  }

  if (schema.discriminators && utils.hasOwnKeys(schema.discriminators)) {
    for (const discriminatorKey of Object.keys(schema.discriminators)) {
      const discriminator = schema.discriminators[discriminatorKey];
      const key = discriminator.discriminatorMapping.key;
      const value = discriminator.discriminatorMapping.value;
      if (obj[key] == value) {
        schema = discriminator;
        break;
      }
    }
  }

  if (virtuals == null) {
    virtuals = Object.keys(schema.virtuals);
  }
  for (const virtual of virtuals) {
    const path = Array.isArray(virtual) ? virtual : virtual.indexOf('.') === -1 ? [virtual] : virtual.split('.');
    const pathKey = Array.isArray(virtual) ? virtual.join('.') : virtual;
    if (schema.virtuals[pathKey] == null) {
      continue;
    }
    const virtualType = schema.virtuals[pathKey];
    let cur = obj;
    for (let i = 0; i < path.length - 1; ++i) {
      cur[path[i]] = path[i] in cur ? cur[path[i]] : {};
      cur = cur[path[i]];
    }
    let val = virtualType.applyGetters(cur[path[path.length - 1]], obj);
    const isPopulateVirtual =
      virtualType.options?.ref || virtualType.options?.refPath;
    if (!options?.skipPopulateVirtuals && isPopulateVirtual && val === undefined) {
      if (virtualType.options.justOne) {
        val = null;
      } else {
        val = [];
      }
    }
    cur[path[path.length - 1]] = val;
  }
}
