'use strict';

const assert = require('assert');
const PathTrie = require('../../lib/helpers/pathTrie');

describe('pathTrie', function() {
  describe('matchesPathOrAncestor', function() {
    it('matches exact paths', function() {
      const trie = new PathTrie(['profile.firstName']);
      assert.strictEqual(trie.matchesPathOrAncestor(['profile', 'firstName']), true);
      assert.strictEqual(trie.matchesPathOrAncestor(['profile', 'lastName']), false);
    });

    it('matches descendants of entries but not ancestors', function() {
      const trie = new PathTrie(['profile']);
      assert.strictEqual(trie.matchesPathOrAncestor(['profile', 'firstName']), true);
      assert.strictEqual(trie.matchesPathOrAncestor(['profile', 'name', 'first']), true);
      assert.strictEqual(trie.matchesPathOrAncestor('profile'), true);

      const deepTrie = new PathTrie(['profile.firstName']);
      assert.strictEqual(deepTrie.matchesPathOrAncestor('profile'), false);
    });

    it('matches map wildcards (gh-16383)', function() {
      const trie = new PathTrie(['settings.$*']);
      assert.strictEqual(trie.matchesPathOrAncestor(['settings', 'theme']), true);
      assert.strictEqual(trie.matchesPathOrAncestor(['settings', 'theme', 'nested']), true);
      assert.strictEqual(trie.matchesPathOrAncestor('settings'), false);
      assert.strictEqual(trie.matchesPathOrAncestor(['other', 'theme']), false);
    });

    it('matches nested wildcards', function() {
      const trie = new PathTrie(['docs.$*.name']);
      assert.strictEqual(trie.matchesPathOrAncestor(['docs', 'key1', 'name']), true);
      assert.strictEqual(trie.matchesPathOrAncestor(['docs', 'key1', 'other']), false);
      assert.strictEqual(trie.matchesPathOrAncestor(['docs', 'key1']), false);
    });

    it('prefers literal entries over overlapping wildcard prefixes', function() {
      const trie = new PathTrie(['settings.$*.enabled', 'settings.theme']);
      assert.strictEqual(trie.matchesPathOrAncestor(['settings', 'theme']), true);
      assert.strictEqual(trie.matchesPathOrAncestor(['settings', 'theme', 'color']), true);
      assert.strictEqual(trie.matchesPathOrAncestor(['settings', 'other', 'enabled']), true);
      assert.strictEqual(trie.matchesPathOrAncestor(['settings', 'other']), false);
    });

    it('treats string lookups as a single segment, never splitting', function() {
      const trie = new PathTrie(['profile.firstName']);
      assert.strictEqual(trie.matchesPathOrAncestor('profile.firstName'), false);
      assert.strictEqual(trie.matchesPathOrAncestor(['profile', 'firstName']), true);
    });

    it('ignores numeric segments like array indexes (gh-16383)', function() {
      const trie = new PathTrie(['comments.text']);
      assert.strictEqual(trie.matchesPathOrAncestor(['comments', '0', 'text']), true);
      assert.strictEqual(trie.matchesPathOrAncestor(['comments', '12', 'text']), true);
      assert.strictEqual(trie.matchesPathOrAncestor(['comments', '0', 'author']), false);
      assert.strictEqual(trie.matchesPathOrAncestor(['comments', '0']), false);
    });

    it('still matches explicit numeric entries', function() {
      const trie = new PathTrie(['comments.0.text']);
      assert.strictEqual(trie.matchesPathOrAncestor(['comments', '0', 'text']), true);
      assert.strictEqual(trie.matchesPathOrAncestor(['comments', '1', 'text']), false);
    });

    it('matches wildcards against numeric segments', function() {
      const trie = new PathTrie(['comments.$*']);
      assert.strictEqual(trie.matchesPathOrAncestor(['comments', '0']), true);
    });
  });

  describe('overlapsPath', function() {
    it('matches exact paths, ancestors, and descendants', function() {
      const trie = new PathTrie(['profile.firstName']);
      assert.strictEqual(trie.overlapsPath(['profile', 'firstName']), true);
      assert.strictEqual(trie.overlapsPath(['profile', 'firstName', 'foo']), true);
      assert.strictEqual(trie.overlapsPath('profile'), true);
      assert.strictEqual(trie.overlapsPath(['profile', 'lastName']), false);
      assert.strictEqual(trie.overlapsPath('name'), false);
    });

    it('matches map wildcards (gh-16383)', function() {
      const trie = new PathTrie(['settings.$*']);
      assert.strictEqual(trie.overlapsPath(['settings', 'theme']), true);
      assert.strictEqual(trie.overlapsPath('settings'), true);
      assert.strictEqual(trie.overlapsPath('balance'), false);
    });

    it('matches ancestors of nested wildcard entries', function() {
      const trie = new PathTrie(['docs.$*.name']);
      assert.strictEqual(trie.overlapsPath('docs'), true);
      assert.strictEqual(trie.overlapsPath(['docs', 'key1']), true);
      assert.strictEqual(trie.overlapsPath(['docs', 'key1', 'name']), true);
      assert.strictEqual(trie.overlapsPath(['docs', 'key1', 'other']), false);
    });

    it('treats string lookups as a single segment, never splitting', function() {
      const trie = new PathTrie(['profile.firstName']);
      assert.strictEqual(trie.overlapsPath('profile.firstName'), false);
      assert.strictEqual(trie.overlapsPath(['profile', 'firstName']), true);
    });

    it('ignores numeric segments like array indexes (gh-16383)', function() {
      const trie = new PathTrie(['comments.text']);
      assert.strictEqual(trie.overlapsPath(['comments', '0', 'text']), true);
      assert.strictEqual(trie.overlapsPath(['comments', '0']), true);
      assert.strictEqual(trie.overlapsPath(['comments', '0', 'text', 'foo']), true);
      assert.strictEqual(trie.overlapsPath(['comments', '0', 'author']), false);
    });
  });

  describe('add', function() {
    it('adds paths after construction', function() {
      const trie = new PathTrie();
      trie.add('settings.$*');
      assert.strictEqual(trie.matchesPathOrAncestor(['settings', 'theme']), true);
    });

    it('adds top-level paths after construction', function() {
      const trie = new PathTrie();
      trie.add('balance');
      assert.strictEqual(trie.matchesPathOrAncestor('balance'), true);
      assert.strictEqual(trie.matchesPathOrAncestor('name'), false);
    });
  });
});
