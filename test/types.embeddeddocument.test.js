
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
  children: [GrandChildSchema]
});

var ParentSchema = new Schema({
  name: String,
  child: ChildSchema
});

mongoose.model('Parent-3589-Embedded', ParentSchema);

/**
 * Test.
 */

describe('types.embeddeddocument', function() {
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
