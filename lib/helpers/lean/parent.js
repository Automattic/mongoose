'use strict';

const documentParentsMap = new WeakMap();
const attachVirtualsFnMap = new WeakMap();

module.exports = parent;
module.exports.setParent = setParent;

function parent(obj) {
  if (obj == null) {
    return void 0;
  }

  const res = documentParentsMap.get(obj);
  const attachVirtuals = res != null ? attachVirtualsFnMap.get(res) : null;
  if (attachVirtuals != null) {
    attachVirtuals();
  }

  return res;
}

function setParent(obj, parent, attachVirtuals) {
  if (obj == null || typeof obj !== 'object') {
    return;
  }

  documentParentsMap.set(obj, parent);
  attachVirtualsFnMap.set(obj, attachVirtuals);
}
