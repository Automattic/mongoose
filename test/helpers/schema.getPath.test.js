'use strict';

const Schema = require('../../lib/schema');
const assert = require('assert');
const getPath = require('../../lib/helpers/schema/getPath');

describe('getPath()', function() {
  it('works', function() {
    const schema = new Schema({
      docArr: [{ el: String }]
    });

    assert.equal(getPath(schema, 'docArr.el').constructor.name, 'SchemaString');
    assert.equal(getPath(schema, 'docArr.0.el').constructor.name, 'SchemaString');
  });

  it('nested arrays', function() {
    const schema = new Schema({
      nested: [{ docs: [{ el: String }] }]
    });

    assert.equal(getPath(schema, 'nested.docs.el').constructor.name, 'SchemaString');
    assert.equal(getPath(schema, 'nested.0.docs.el').constructor.name, 'SchemaString');
  });

  it('handles getting paths underneath Mixed array (gh-15653)', function() {
    const schema = new Schema({
      any: [Schema.Types.Mixed]
    });
    assert.strictEqual(getPath(schema, 'any.0.foo').constructor.name, 'SchemaMixed');
    assert.strictEqual(getPath(schema, 'any.0.foo.bar.baz').constructor.name, 'SchemaMixed');

    assert.strictEqual(getPath(schema, 'any.0').constructor.name, 'SchemaMixed');
  });
});
