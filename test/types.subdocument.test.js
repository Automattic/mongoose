
/**
 * Module dependencies.
 */

'use strict';

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
    let id;
    return thingy.save().
      then(function() {
        id = thingy._id;
      }).
      then(function() {
        const thingy2 = {
          subArray: [{
            testString: 'Test 2'
          }]
        };
        return Thing.updateOne({
          _id: id
        }, { $set: thingy2 });
      });
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
