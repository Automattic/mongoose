
/**
 * Module dependencies.
 */

var assert = require('power-assert'),
    start = require('./common'),
    mongoose = start.mongoose,
    Schema = mongoose.Schema;

/**
 * Test.
 */

describe('types.embeddeddocument', function() {
  var GrandChildSchema;
  var ChildSchema;
  var ParentSchema;

  before(function() {
    GrandChildSchema = new Schema({
      name: String
    });

    ChildSchema = new Schema({
      name: String,
      children: [GrandChildSchema]
    });

    ParentSchema = new Schema({
      name: String,
      child: ChildSchema
    });

    mongoose.model('Parent-3589-Embedded', ParentSchema);
  });

  it('returns a proper ownerDocument (gh-3589)', function(done) {
    var Parent = mongoose.model('Parent-3589-Embedded');
    var p = new Parent({
      name: 'Parent Parentson',
      child: {
        name: 'Child Parentson',
        children: [
          {
            name: 'GrandChild Parentson'
          }
        ]
      }
    });

    assert.equal(p._id, p.child.children[0].ownerDocument()._id);
    done();
  });
});
