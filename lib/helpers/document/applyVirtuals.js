'use strict';

const mpath = require('mpath');

module.exports = applyVirtuals;

function applyVirtuals(schema, doc, virtuals, parent) {
  if (doc == null) {
    return doc;
  }

  let virtualsForChildren = virtuals;
  let toApply = null;

  if (Array.isArray(virtuals)) {
    virtualsForChildren = [];
    toApply = [];
    const len = virtuals.length;
    for (let i = 0; i < len; ++i) {
      const virtual = virtuals[i];
      if (virtual.length === 1) {
        toApply.push(virtual[0]);
      } else {
        virtualsForChildren.push(virtual);
      }
    }
  }

  applyVirtualsToChildren(this, schema, doc, virtualsForChildren, parent);
  return applyVirtualsToDocs(schema, doc, toApply);
}

function applyVirtualsToDocs(schema, res, toApply) {
  if (Array.isArray(res)) {
    const len = res.length;
    for (let i = 0; i < len; ++i) {
      applyVirtualsToDoc(schema, res[i], toApply);
    }
    return res;
  } else {
    return applyVirtualsToDoc(schema, res, toApply);
  }
}

function applyVirtualsToChildren(doc, schema, res, virtuals, parent) {
  const len = schema.childSchemas.length;
  let attachedVirtuals = false;
  for (let i = 0; i < len; ++i) {
    const _path = schema.childSchemas[i].model.path;
    const _schema = schema.childSchemas[i].schema;
    if (!_path) {
      continue;
    }
    const _doc = mpath.get(_path, res);
    if (_doc == null || (Array.isArray(_doc) && _doc.flat(Infinity).length === 0)) {
      continue;
    }

    let virtualsForChild = null;
    if (Array.isArray(virtuals)) {
      virtualsForChild = [];
      const len = virtuals.length;
      for (let i = 0; i < len; ++i) {
        const virtual = virtuals[i];
        if (virtual[0] == _path) {
          virtualsForChild.push(virtual.slice(1));
        }
      }

      if (virtualsForChild.length === 0) {
        continue;
      }
    }

    applyVirtuals.call(doc, _schema, _doc, virtualsForChild, res);
    attachedVirtuals = true;
  }

  if (virtuals && virtuals.length && !attachedVirtuals) {
    applyVirtualsToDoc(schema, res, virtuals, parent);
  }
}

function applyVirtualsToDoc(schema, doc, virtuals) {
  if (doc == null || typeof doc !== 'object') {
    return;
  }
  if (Array.isArray(doc)) {
    for (let i = 0; i < doc.length; ++i) {
      applyVirtualsToDoc(schema, doc[i], virtuals);
    }
    return;
  }

  if (schema.discriminators && Object.keys(schema.discriminators).length > 0) {
    for (const discriminatorKey of Object.keys(schema.discriminators)) {
      const discriminator = schema.discriminators[discriminatorKey];
      const key = discriminator.discriminatorMapping.key;
      const value = discriminator.discriminatorMapping.value;
      if (doc[key] == value) {
        schema = discriminator;
        break;
      }
    }
  }

  if (virtuals == null) {
    virtuals = Object.keys(schema.virtuals);
  }
  const numVirtuals = virtuals.length;
  for (let i = 0; i < numVirtuals; ++i) {
    const virtual = virtuals[i];
    if (schema.virtuals[virtual] == null) {
      continue;
    }
    const virtualType = schema.virtuals[virtual];
    const sp = Array.isArray(virtual)
      ? virtual :
      virtual.indexOf('.') === -1
        ? [virtual]
        : virtual.split('.');
    let cur = doc;
    for (let j = 0; j < sp.length - 1; ++j) {
      cur[sp[j]] = sp[j] in cur ? cur[sp[j]] : {};
      cur = cur[sp[j]];
    }
    let val = virtualType.applyGetters(cur[sp[sp.length - 1]], doc);
    if (isPopulateVirtual(virtualType) && val === undefined) {
      if (virtualType.options.justOne) {
        val = null;
      } else {
        val = [];
      }
    }
    cur[sp[sp.length - 1]] = val;
  }
}

function isPopulateVirtual(virtualType) {
  return virtualType.options && (virtualType.options.ref || virtualType.options.refPath);
}
