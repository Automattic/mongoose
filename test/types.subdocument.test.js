
/**
 * Module dependencies.
 */

'use strict';

const setDocumentTimestamps = require('../lib/helpers/timestamps/setDocumentTimestamps');
const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

/**
 * Test.
 */

describe('types.subdocument', function() {
  let GrandChildSchema;
  let ChildSchema;
  let ParentSchema;
  let db;

  before(function() {
    GrandChildSchema = new Schema({
      name: String
    });

    ChildSchema = new Schema({
      name: String,
      child: GrandChildSchema
    });

    ParentSchema = new Schema({
      name: String,
      children: [ChildSchema]
    });

    mongoose.model('Parent-3589-Sub', ParentSchema);
    db = start();
  });

  after(async function() {
    await db.close();
  });

  it('returns a proper ownerDocument (gh-3589)', function() {
    const Parent = mongoose.model('Parent-3589-Sub');
    const p = new Parent({
      name: 'Parent Parentson',
      children: [
        {
          name: 'Child Parentson',
          child: {
            name: 'GrandChild Parentson'
          }
        }
      ]
    });

    assert.equal(p._id, p.children[0].child.ownerDocument()._id);
  });

  it('not setting timestamps in subdocuments', function() {
    const Thing = db.model('Test', new Schema({
      subArray: [{
        testString: String
      }]
    }, {
      timestamps: true
    }));

    const thingy = new Thing({
      subArray: [{
        testString: 'Test 1'
      }]
    });

    const now = new Date();
    setDocumentTimestamps(thingy, undefined, () => now, 'createdAt', 'updatedAt');
    assert.equal(thingy.createdAt.valueOf(), now.valueOf());
    assert.equal(thingy.updatedAt.valueOf(), now.valueOf());
    assert.strictEqual(thingy.subArray[0].createdAt, undefined);
    assert.strictEqual(thingy.subArray[0].updatedAt, undefined);
  });

  describe('#isModified', function() {
    it('defers to parent isModified (gh-8223)', function() {
      const childSchema = Schema({ id: Number, text: String });
      const parentSchema = Schema({ child: childSchema });
      const Model = db.model('Test1', parentSchema);

      const doc = new Model({ child: { text: 'foo' } });
      assert.ok(doc.isModified('child.id'));
      assert.ok(doc.child.isModified('id'));
    });
  });
});
