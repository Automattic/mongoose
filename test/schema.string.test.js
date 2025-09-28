'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('SchemaString', function() {
  let M;

  before(function() {
    const schema = new Schema({ x: { type: String, match: /abc/g } });
    mongoose.deleteModel(/Test/);
    M = mongoose.model('Test', schema);
  });

  it('works when RegExp has global flag set (gh-9287)', function() {
    const doc = new M({ x: 'abc' });
    assert.ifError(doc.validateSync());
    assert.ifError(doc.validateSync());
  });

  it('regex validator works with validate() (gh-15380)', async function() {
    const schema = new Schema({ x: { type: String, validate: /abc/g } });
    mongoose.deleteModel(/Test/);
    M = mongoose.model('Test', schema);

    const doc = new M({ x: 'abc' });
    await doc.validate();
  });
});
