'use strict';

const assert = require('assert');
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
});