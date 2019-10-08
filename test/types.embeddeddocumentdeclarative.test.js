'use strict';

/**
 * Module dependencies.
 */

const assert = require('assert');
const start = require('./common');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

/**
 * Test.
 */

describe('types.embeddeddocumentdeclarative', function() {
  let GrandChildSchema;
  let ChildSchema;
  let ParentSchema;

  before(function() {
    GrandChildSchema = {
      name: String
    };

    ChildSchema = {
      name: String,
      children: [GrandChildSchema]
    };

    ParentSchema = new Schema({
      name: String,
      typePojoToMixed: false,
      child: ChildSchema
    });

    mongoose.model('Parent-7494-EmbeddedDeclarative', ParentSchema);
  });

  it('returns a proper ownerDocument (gh-7494)', function(done) {
    const Parent = mongoose.model('Parent-7494-EmbeddedDeclarative');
    const p = new Parent({
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
