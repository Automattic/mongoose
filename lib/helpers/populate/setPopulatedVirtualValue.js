'use strict';

module.exports = function setPopulatedVirtualValue(populatedVirtuals, name, v, options) {
  if (options.justOne || options.count) {
    populatedVirtuals[name] = Array.isArray(v) ?
      v[0] :
      v;

    if (typeof populatedVirtuals[name] !== 'object') {
      populatedVirtuals[name] = options.count ? v : null;
    }
  } else {
    populatedVirtuals[name] = Array.isArray(v) ?
      v :
      v == null ? [] : [v];

    populatedVirtuals[name] = populatedVirtuals[name].filter(function(doc) {
      return doc && typeof doc === 'object';
    });
  }

  return populatedVirtuals[name];
};
