
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
});
