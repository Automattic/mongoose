'use strict';

const assert = require('assert');
const getDeepestSubdocumentForPath = require('../../lib/helpers/document/getDeepestSubdocumentForPath');
const { mongoose } = require('../common');

describe('getDeepestSubdocumentForPath', function() {
  beforeEach(() => mongoose.deleteModel(/Test/));
  after(() => mongoose.deleteModel(/Test/));

  it('returns top-level document if no subdocs', function() {
    const Test = mongoose.model('Test', mongoose.Schema({ name: String }));
    const doc = new Test({ name: 'foo' });

    assert.strictEqual(getDeepestSubdocumentForPath(doc, ['name'], doc.schema), doc);
  });

  it('picks up single nested subdocs along the path', function() {
    const Test = mongoose.model('Test', mongoose.Schema({
      name: String,
      nested: mongoose.Schema({
        nestedPath: String
      })
    }));
    const doc = new Test({ name: 'foo', nested: { nestedPath: 'bar' } });

    assert.strictEqual(
      getDeepestSubdocumentForPath(doc, ['nested', 'nestedPath'], doc.schema),
      doc.nested
    );
  });

  it('picks up document arrays', function() {
    const Test = mongoose.model('Test', mongoose.Schema({
      name: String,
      docArr: [{
        nestedPath: String
      }]
    }));
    const doc = new Test({ name: 'foo', docArr: [{ nestedPath: 'bar' }] });

    const res = getDeepestSubdocumentForPath(doc, ['docArr', '0', 'nestedPath'], doc.schema);
    const expected = doc.docArr[0];
    assert.strictEqual(res, expected);
  });

  it('picks up doubly nested subdocuments', function() {
    const Test = mongoose.model('Test', mongoose.Schema({
      name: String,
      l1: mongoose.Schema({
        l2: mongoose.Schema({
          nested: String
        })
      })
    }));
    const doc = new Test({ name: 'foo', l1: { l2: { nested: 'bar' } } });

    const res = getDeepestSubdocumentForPath(doc, ['l1', 'l2', 'nested'], doc.schema);
    const expected = doc.l1.l2;
    assert.strictEqual(res, expected);
  });

  it('returns deepest non-null subdoc', function() {
    const Test = mongoose.model('Test', mongoose.Schema({
      name: String,
      l1: mongoose.Schema({
        l2: mongoose.Schema({
          nested: String
        })
      })
    }));
    const doc = new Test({ name: 'foo', l1: { l2: null } });

    const res = getDeepestSubdocumentForPath(doc, ['l1', 'l2', 'nested'], doc.schema);
    const expected = doc.l1;
    assert.strictEqual(res, expected);
  });

  it('picks up single nested subdocs under document arrays', function() {
    const Test = mongoose.model('Test', mongoose.Schema({
      name: String,
      docArr: [{
        nested: mongoose.Schema({
          l3Path: String
        })
      }]
    }));
    const doc = new Test({ name: 'foo', docArr: [{ nested: { l3Path: 'bar' } }] });

    const res = getDeepestSubdocumentForPath(doc, ['docArr', '0', 'nested', 'l3Path'], doc.schema);
    const expected = doc.docArr[0].nested;
    assert.strictEqual(res, expected);
  });
});
