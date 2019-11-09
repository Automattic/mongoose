'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

/**
 * Test.
 */

describe('types.embeddeddocument', function() {
  let GrandChildSchema;
  let ChildSchema;
  let ParentSchema;

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
    const Parent = mongoose.model('Parent-3589-Embedded');
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
