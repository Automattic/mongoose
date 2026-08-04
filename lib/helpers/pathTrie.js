'use strict';

const wildcardSegment = '$*';

class PathTrieNode {
  constructor() {
    this.children = new Map();
    this.terminal = false;
    this.hasWildcard = false;
  }
}

/**
 * Trie of dotted paths for efficient path matching. Supports the map wildcard
 * segment `$*`, which matches any single segment. For example, a trie
 * containing `settings.$*` matches `settings.theme` but not `settings` or
 * `profile.theme`.
 *
 * @api private
 */

class PathTrie {
  constructor(paths) {
    this.root = new PathTrieNode();
    if (paths != null) {
      for (const path of paths) {
        this.add(path);
      }
    }
  }

  /**
   * Add a dotted path, like `settings.$*` or `profile.firstName`, to the trie.
   */

  add(path) {
    if (path.indexOf('.') === -1) {
      this._addSegment(this.root, path).terminal = true;
      return;
    }
    let node = this.root;
    for (const segment of path.split('.')) {
      node = this._addSegment(node, segment);
    }
    node.terminal = true;
  }

  _addSegment(node, segment) {
    let child = node.children.get(segment);
    if (child == null) {
      child = new PathTrieNode();
      node.children.set(segment, child);
      if (segment === wildcardSegment) {
        node.hasWildcard = true;
      }
    }
    return child;
  }

  /**
   * Check if `path` or any of its ancestor paths exist in the trie. `path` is
   * either a single segment string or a pre-split array of segments — lookups
   * never split, callers are responsible for splitting dotted paths.
   * For example, with a trie containing 'profile':
   *   matchesPathOrAncestor(['profile', 'firstName']) === true
   *   matchesPathOrAncestor('profile') === true
   * But with a trie containing 'profile.firstName':
   *   matchesPathOrAncestor('profile') === false
   */

  matchesPathOrAncestor(path) {
    return this._walk(path) === true;
  }

  /**
   * Check if `path`, any of its ancestor paths, or any of its descendant paths
   * exist in the trie. `path` is either a single segment string or a pre-split
   * array of segments — lookups never split, callers are responsible for
   * splitting dotted paths. For example:
   *   new PathTrie(['profile']).overlapsPath(['profile', 'firstName']) === true
   *   new PathTrie(['profile.firstName']).overlapsPath('profile') === true
   */

  overlapsPath(path) {
    return this._walk(path) !== false;
  }

  /**
   * Walk `path` — a single segment string, or a pre-split array of segments —
   * through the trie. Returns `true` if a terminal node was found at `path` or
   * one of its ancestors, `false` if the walk dead-ended, and the array of
   * reached nodes if `path` is a strict prefix of entries in the trie.
   */

  _walk(path) {
    if (typeof path === 'string') {
      const next = [];
      const literal = this.root.children.get(path);
      if (literal != null) {
        if (literal.terminal) {
          return true;
        }
        next.push(literal);
      }
      if (this.root.hasWildcard) {
        const wildcard = this.root.children.get(wildcardSegment);
        if (wildcard.terminal) {
          return true;
        }
        next.push(wildcard);
      }
      return next.length === 0 ? false : next;
    }
    let nodes = [this.root];
    for (const segment of path) {
      const next = [];
      for (const node of nodes) {
        const literal = node.children.get(segment);
        if (literal != null) {
          if (literal.terminal) {
            return true;
          }
          next.push(literal);
        }
        if (node.hasWildcard) {
          const wildcard = node.children.get(wildcardSegment);
          if (wildcard.terminal) {
            return true;
          }
          next.push(wildcard);
        }
      }
      if (next.length === 0) {
        return false;
      }
      nodes = next;
    }
    return nodes;
  }
}

module.exports = PathTrie;
