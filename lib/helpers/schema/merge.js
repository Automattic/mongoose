'use strict';

module.exports = function merge(s1, s2) {
  const paths = Object.keys(s2.tree);
  const pathsToAdd = {};
  for (const key of paths) {
    if (s1.paths[key] || s1.nested[key] || s1.singleNestedPaths[key]) {
      continue;
    }
    pathsToAdd[key] = s2.tree[key];
  }
  s1.add(pathsToAdd);

  s1.callQueue = s1.callQueue.concat(s2.callQueue);
  s1.method(s2.methods);
  s1.static(s2.statics);

  for (const query in s2.query) {
    s1.query[query] = s2.query[query];
  }

  for (const virtual in s2.virtuals) {
    s1.virtuals[virtual] = s2.virtuals[virtual].clone();
  }

  s1.s.hooks.merge(s2.s.hooks, false);
};
