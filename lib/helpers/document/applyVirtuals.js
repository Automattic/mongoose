'use strict';

const mpath = require('mpath');

module.exports = applyVirtuals;

/**
 * Apply a given schema's virtuals to a given POJO
 *
 * @param {Schema} schema
 * @param {Object} obj
 * @param {Array<string>} [virtuals] optional whitelist of virtuals to apply
 * @returns
 */

function applyVirtuals(schema, obj, virtuals) {
  if (obj == null) {
    return obj;
  }

  let virtualsForChildren = virtuals;
  let toApply = null;

  if (Array.isArray(virtuals)) {
    virtualsForChildren = [];
    toApply = [];
    for (const virtual of virtuals) {
      if (virtual.length === 1) {
        toApply.push(virtual[0]);
      } else {
        virtualsForChildren.push(virtual);
      }
    }
  }

  applyVirtualsToChildren(schema, obj, virtualsForChildren);
  return applyVirtualsToDoc(schema, obj, toApply);
}

/**
 * Apply virtuals to any subdocuments
 *
 * @param {Schema} schema subdocument schema
 * @param {Object} res subdocument
 * @param {Array<String>} [virtuals] optional whitelist of virtuals to apply
 */

function applyVirtualsToChildren(schema, res, virtuals) {
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

    applyVirtuals(_schema, _obj, virtualsForChild);
    attachedVirtuals = true;
  }

  if (virtuals && virtuals.length && !attachedVirtuals) {
    applyVirtualsToDoc(schema, res, virtuals);
  }
}

/**
 * Apply virtuals to a given document. Does not apply virtuals to subdocuments: use `applyVirtualsToChildren` instead
 *
 * @param {Schema} schema
 * @param {Object} doc
 * @param {Array<String>} [virtuals] optional whitelist of virtuals to apply
 * @returns
 */

function applyVirtualsToDoc(schema, obj, virtuals) {
  if (obj == null || typeof obj !== 'object') {
    return;
  }
  if (Array.isArray(obj)) {
    for (const el of obj) {
      applyVirtualsToDoc(schema, el, virtuals);
    }
    return;
  }

  if (schema.discriminators && Object.keys(schema.discriminators).length > 0) {
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
    if (schema.virtuals[virtual] == null) {
      continue;
    }
    const virtualType = schema.virtuals[virtual];
    const sp = Array.isArray(virtual)
      ? virtual
      : virtual.indexOf('.') === -1
        ? [virtual]
        : virtual.split('.');
    let cur = obj;
    for (let i = 0; i < sp.length - 1; ++i) {
      cur[sp[i]] = sp[i] in cur ? cur[sp[i]] : {};
      cur = cur[sp[i]];
    }
    let val = virtualType.applyGetters(cur[sp[sp.length - 1]], obj);
    const isPopulateVirtual =
      virtualType.options && (virtualType.options.ref || virtualType.options.refPath);
    if (isPopulateVirtual && val === undefined) {
      if (virtualType.options.justOne) {
        val = null;
      } else {
        val = [];
      }
    }
    cur[sp[sp.length - 1]] = val;
  }
}
