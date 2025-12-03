'use strict';

const assert = require('assert');
const mongoose = require('./common').mongoose;
const Schema = mongoose.Schema;

describe('SchemaTypeSet', function() {
  let db;

  before(function() {
    db = mongoose.createConnection('mongodb://localhost:27017/mongoose_test_set');
  });

  after(function(done) {
    db.close(done);
  });

  it('should support Set as a schema type', function() {
    const schema = new Schema({
      tags: { type: Set, of: String }
    });

    const Model = db.model('TestSet', schema);
    const doc = new Model({ tags: ['a', 'b', 'a'] });

    assert.ok(doc.tags instanceof Set);
    assert.equal(doc.tags.size, 2);
    assert.ok(doc.tags.has('a'));
    assert.ok(doc.tags.has('b'));
  });

  it('should support saving and loading Set', async function() {
    const schema = new Schema({
      tags: { type: Set, of: String }
    });

    const Model = db.model('TestSetSave', schema);
    const doc = new Model({ tags: ['a', 'b'] });
    
    await doc.save();

    const loaded = await Model.findById(doc._id);
    assert.ok(loaded.tags instanceof Set);
    assert.equal(loaded.tags.size, 2);
    assert.ok(loaded.tags.has('a'));
    assert.ok(loaded.tags.has('b'));
  });

  it('should support change tracking', async function() {
    const schema = new Schema({
      tags: { type: Set, of: String }
    });

    const Model = db.model('TestSetChange', schema);
    const doc = new Model({ tags: ['a'] });
    await doc.save();

    doc.tags.add('b');
    assert.ok(doc.isModified('tags'));

    await doc.save();
    
    const loaded = await Model.findById(doc._id);
    assert.equal(loaded.tags.size, 2);
    assert.ok(loaded.tags.has('b'));
  });

  it('should cast elements', function() {
    const schema = new Schema({
      nums: { type: Set, of: Number }
    });

    const Model = db.model('TestSetCast', schema);
    const doc = new Model({ nums: ['1', 2, '3'] });

    assert.equal(doc.nums.size, 3);
    assert.ok(doc.nums.has(1));
    assert.ok(doc.nums.has(2));
    assert.ok(doc.nums.has(3));
  });

  it('should handle delete and clear', async function() {
    const schema = new Schema({
      tags: { type: Set, of: String }
    });

    const Model = db.model('TestSetDelete', schema);
    const doc = new Model({ tags: ['a', 'b'] });
    await doc.save();

    doc.tags.delete('a');
    assert.ok(doc.isModified('tags'));
    await doc.save();

    let loaded = await Model.findById(doc._id);
    assert.equal(loaded.tags.size, 1);
    assert.ok(loaded.tags.has('b'));
    assert.ok(!loaded.tags.has('a'));

    doc.tags.clear();
    assert.ok(doc.isModified('tags'));
    await doc.save();

    loaded = await Model.findById(doc._id);
    assert.equal(loaded.tags.size, 0);
  });
  
  it('should support toJSON', function() {
    const schema = new Schema({
      tags: { type: Set, of: String }
    });
    
    const Model = db.model('TestSetJSON', schema);
    const doc = new Model({ tags: ['a', 'b'] });
    
    const json = doc.toJSON();
    assert.ok(Array.isArray(json.tags));
    assert.equal(json.tags.length, 2);
    assert.ok(json.tags.includes('a'));
    assert.ok(json.tags.includes('b'));
  });
});
