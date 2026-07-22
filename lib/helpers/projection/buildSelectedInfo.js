'use strict';

const isDefiningProjection = require('./isDefiningProjection');

/**
 * Precomputes, once per `$__.selected` projection object, the information
 * `Document#isSelected()` needs to answer "is this path selected?" in
 * O(path depth) instead of re-scanning every projection key on every call.
 *
 * Builds a trie over the dot-separated projection keys. Each trie node
 * records the insertion-order index of the projection key it represents (if
 * any), plus the minimum such index among its strict descendants. This lets
 * `isSelected()` reproduce the original algorithm's behavior exactly,
 * including for the rare case where a projection selects both a path and a
 * deeper path underneath it (whichever key comes first in the projection
 * object wins, matching the original loop-based implementation).
 *
 * @param {Object} selected - `this.$__.selected`
 * @return {Object} the precomputed `{ inclusive, keySet, root }` fields used by `isSelected()`
 * @api private
 */

module.exports = function buildSelectedInfo(selected) {
  const keys = Object.keys(selected);

  let inclusive = null;
  for (const cur of keys) {
    if (cur === '_id') {
      continue;
    }
    if (!isDefiningProjection(selected[cur])) {
      continue;
    }
    inclusive = !!selected[cur];
    break;
  }

  const keySet = new Set(keys);
  keySet.delete('_id');

  const root = { children: null, index: undefined, key: undefined, minDescendant: null };
  keys.forEach((key, index) => {
    if (key === '_id') {
      return;
    }
    const parts = key.split('.');
    let node = root;
    for (const part of parts) {
      if (node.children == null) {
        // `Object.create(null)` avoids collisions with path segments that
        // happen to shadow Object.prototype members (e.g. `constructor`,
        // `__proto__`, `toString`), which a plain `{}` literal would not.
        node.children = Object.create(null);
      }
      if (node.children[part] === undefined) {
        node.children[part] = { children: null, index: undefined, key: undefined, minDescendant: null };
      }
      node = node.children[part];
    }
    node.index = index;
    node.key = key;
  });

  // bottom-up: for each node, find the minimum insertion-order index among
  // all projection keys in its subtree (excluding the node's own key, if any)
  (function computeMinDescendant(node) {
    if (node.children == null) {
      return;
    }
    for (const part of Object.keys(node.children)) {
      const child = node.children[part];
      computeMinDescendant(child);

      const candidates = [];
      if (child.index !== undefined) {
        candidates.push({ index: child.index, key: child.key });
      }
      if (child.minDescendant != null) {
        candidates.push(child.minDescendant);
      }
      for (const candidate of candidates) {
        if (node.minDescendant == null || candidate.index < node.minDescendant.index) {
          node.minDescendant = candidate;
        }
      }
    }
  })(root);

  return { inclusive, keySet, root };
};
