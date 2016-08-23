
/**
 * Module dependencies.
 */

var assert = require('power-assert'),
    start = require('./common'),
    mongoose = start.mongoose,
    Schema = mongoose.Schema;

/**
 * Schema.
 */

var GrandChildSchema = new Schema({
  name: String
});

var ChildSchema = new Schema({
  name: String,
  child: GrandChildSchema
});

var ParentSchema = new Schema({
  name: String,
  children: [ChildSchema]
});

mongoose.model('Parent-3589-Sub', ParentSchema);

/**
 * Test.
 */

describe('types.subdocument', function() {
  it('returns a proper ownerDocument (gh-3589)', function(done) {
    var Parent = mongoose.model('Parent-3589-Sub');
    var p = new Parent({
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
    done();
  });
  it('not setting timestamps in subdocuments', function() {
    var Thing = mongoose.model('Thing', new Schema({
      subArray: [{
        testString: String
      }]
    }, {
      timestamps: true
    }));

    var thingy = new Thing({
      subArray: [{
        testString: 'Test 1'
      }]
    });
    var id;
    thingy.save(function(err, item) {
      assert(!err);
      id = item._id;
    })
    .then(function() {
      var thingy2 = {
        subArray: [{
          testString: 'Test 2'
        }]
      };
      return Thing.update({
        _id: id
      }, {$set: thingy2});
    })
    .then(function() {
      mongoose.connection.close();
    }, function(reason) {
      assert(!reason);
    });
  });
});
