'use strict';

const assert = require('assert');

require('../common'); // required for side-effect setup (so that the default driver is set-up)
const isIndexEqual = require('../../lib/helpers/indexes/isIndexEqual');

describe('isIndexEqual', function() {
  it('ignores default collation options when comparing collations (gh-8994)', function() {
    const key = { username: 1 };
    const options = {
      unique: true,
      collation: {
        locale: 'en',
        strength: 2
      }
    };
    const dbIndex = {
      unique: true,
      key: { username: 1 },
      name: 'username_1',
      background: true,
      collation: {
        locale: 'en',
        caseLevel: false,
        caseFirst: 'off',
        strength: 2,
        numericOrdering: false,
        version: '57.1'
      }
    };

    assert.ok(isIndexEqual(key, options, dbIndex));

    dbIndex.collation.locale = 'de';
    assert.ok(!isIndexEqual(key, options, dbIndex));
  });

  it('works when MongoDB index has collation but Mongoose index doesn\'t (gh-9224)', function() {
    const key = { username: 1 };
    const options = {};
    const dbIndex = {
      unique: true,
      key: { username: 1 },
      name: 'username_1',
      background: true,
      collation: {
        locale: 'en',
        caseLevel: false,
        caseFirst: 'off',
        strength: 2,
        numericOrdering: false,
        version: '57.1'
      }
    };

    assert.ok(!isIndexEqual(key, options, dbIndex));
  });

  it('handles text indexes (gh-9225)', function() {
    const key = { name: 'text' };
    const options = {};
    const dbIndex = {
      v: 2,
      key: { _fts: 'text', _ftsx: 1 },
      name: 'name_text',
      ns: 'test.tests',
      background: true,
      weights: { name: 1 },
      default_language: 'english',
      language_override: 'language',
      textIndexVersion: 3
    };

    assert.ok(isIndexEqual(key, options, dbIndex));

    key.otherProp = 'text';
    assert.ok(!isIndexEqual(key, options, dbIndex));

    delete key.otherProp;
    options.weights = { name: 2 };
    assert.ok(!isIndexEqual(key, options, dbIndex));

    options.weights.name = 1;
    assert.ok(isIndexEqual(key, options, dbIndex));
  });
});
