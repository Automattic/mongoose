'use strict';

const assert = require('assert');
const pluralize = require('../../lib/helpers/pluralize');

// David Xie: test pluralization rules (re: gh-11515)
// https://github.com/Automattic/mongoose/issues/11515

// six => sixes
// sex => sexes
// vertex => vertices
// Index => indices (David Xie's fix)
describe('pluralize.js testings', function() {
  it('Pluralize words', function(done) {
    const original = ['six', 'sex', 'vertex', 'Index'];
    const plurals = original.map((element) => pluralize(element));
    const expected = ['sixes', 'sexes', 'vertices', 'indices'];
    assert.deepStrictEqual(plurals, expected);
    done();
  });
});
