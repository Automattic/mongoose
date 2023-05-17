'use strict';

const assert = require('assert');
const getSubdocumentStrictValue = require('../../lib/helpers/schema/getSubdocumentStrictValue');
const { mongoose } = require('../common');

describe('getSubdocumentStrictValue', function() {
  beforeEach(() => mongoose.deleteModel(/Test/));
  after(() => mongoose.deleteModel(/Test/));

  it('returns top-level document if no subdocs', function() {
    const schema = mongoose.Schema({ name: String });

    assert.strictEqual(getSubdocumentStrictValue(schema, ['name']), undefined);
  });

  it('picks up single nested subdocs along the path', function() {
    const schema = mongoose.Schema({
      name: String,
      nested: mongoose.Schema({
        nestedPath: String
      }, { strict: 'throw' })
    });

    assert.strictEqual(
      getSubdocumentStrictValue(schema, ['nested', 'nestedPath']),
      'throw'
    );
  });

  it('picks up document arrays', function() {
    const schema = mongoose.Schema({
      name: String,
      docArr: [mongoose.Schema({
        nestedPath: String
      }, { strict: 'throw' })]
    });

    const res = getSubdocumentStrictValue(schema, ['docArr', '0', 'nestedPath']);
    assert.strictEqual(res, 'throw');
  });

  it('picks up doubly nested subdocuments', function() {
    const schema = mongoose.Schema({
      name: String,
      l1: mongoose.Schema({
        l2: mongoose.Schema({
          nested: String
        }, { strict: false })
      }, { strict: 'throw' })
    });

    const res = getSubdocumentStrictValue(schema, ['l1', 'l2', 'nested']);
    assert.strictEqual(res, false);
  });

  it('picks up single nested subdocs under document arrays', function() {
    const schema = mongoose.Schema({
      name: String,
      docArr: [mongoose.Schema({
        nested: mongoose.Schema({
          l3Path: String
        }, { strict: 'throw' })
      }, { strict: false })]
    });

    const res = getSubdocumentStrictValue(schema, ['docArr', '0', 'nested', 'l3Path']);
    assert.strictEqual(res, 'throw');
  });
});
