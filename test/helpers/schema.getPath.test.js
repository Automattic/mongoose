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
});
