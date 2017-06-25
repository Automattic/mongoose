/**
 * Module dependencies.
 */

var start = require('./common');
var mongoose = start.mongoose;
var assert = require('power-assert');
var EventEmitter = require('events').EventEmitter;
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var Document = require('../lib/document');
var DocumentObjectId = mongoose.Types.ObjectId;

/**
 * Test Document constructor.
 */

function TestDocument() {
  Document.apply(this, arguments);
}

/**
 * Inherits from Document.
 */

TestDocument.prototype.__proto__ = Document.prototype;

for (var i in EventEmitter.prototype) {
  TestDocument[i] = EventEmitter.prototype[i];
}

/**
 * Set a dummy schema to simulate compilation.
 */

var em = new Schema({title: String, body: String});
em.virtual('works').get(function() {
  return 'em virtual works';
});
var schema = new Schema({
  test: String,
  oids: [ObjectId],
  numbers: [Number],
  nested: {
    age: Number,
    cool: ObjectId,
    deep: {x: String},
    path: String,
    setr: String
  },
  nested2: {
    nested: String,
    yup: {
      nested: Boolean,
      yup: String,
      age: Number
    }
  },
  em: [em],
  date: Date
});
TestDocument.prototype.$__setSchema(schema);

schema.virtual('nested.agePlus2').get(function() {
  return this.nested.age + 2;
});
schema.virtual('nested.setAge').set(function(v) {
  this.nested.age = v;
});
schema.path('nested.path').get(function(v) {
  return (this.nested.age || '') + (v ? v : '');
});
schema.path('nested.setr').set(function(v) {
  return v + ' setter';
});

schema.path('date').set(function(v) {
  // should not have been cast to a Date yet
  assert.equal(typeof v, 'string');
  return v;
});

/**
 * Method subject to hooks. Simply fires the callback once the hooks are
 * executed.
 */

TestDocument.prototype.hooksTest = function(fn) {
  fn(null, arguments);
};

/**
 * Test.
 */
describe('document', function() {
  it('isSelected()', function(done) {
    var doc = new TestDocument();

    doc.init({
      test: 'test',
      numbers: [4, 5, 6, 7],
      nested: {
        age: 5,
        cool: DocumentObjectId.createFromHexString('4c6c2d6240ced95d0e00003c'),
        path: 'my path',
        deep: {x: 'a string'}
      },
      notapath: 'i am not in the schema',
      em: [{title: 'gocars'}]
    });

    assert.ok(doc.isSelected('_id'));
    assert.ok(doc.isSelected('test'));
    assert.ok(doc.isSelected('numbers'));
    assert.ok(doc.isSelected('oids')); // even if no data
    assert.ok(doc.isSelected('nested'));
    assert.ok(doc.isSelected('nested.age'));
    assert.ok(doc.isSelected('nested.cool'));
    assert.ok(doc.isSelected('nested.path'));
    assert.ok(doc.isSelected('nested.deep'));
    assert.ok(doc.isSelected('nested.nope')); // not a path
    assert.ok(doc.isSelected('nested.deep.x'));
    assert.ok(doc.isSelected('nested.deep.x.no'));
    assert.ok(doc.isSelected('nested.deep.y')); // not a path
    assert.ok(doc.isSelected('noway')); // not a path
    assert.ok(doc.isSelected('notapath')); // not a path but in the _doc
    assert.ok(doc.isSelected('em'));
    assert.ok(doc.isSelected('em.title'));
    assert.ok(doc.isSelected('em.body'));
    assert.ok(doc.isSelected('em.nonpath')); // not a path

    var selection = {
      test: 1,
      numbers: 1,
      'nested.deep': 1,
      oids: 1
    };

    doc = new TestDocument(undefined, selection);

    doc.init({
      test: 'test',
      numbers: [4, 5, 6, 7],
      nested: {
        deep: {x: 'a string'}
      }
    });

    assert.ok(doc.isSelected('_id'));
    assert.ok(doc.isSelected('test'));
    assert.ok(doc.isSelected('numbers'));
    assert.ok(doc.isSelected('oids')); // even if no data
    assert.ok(doc.isSelected('nested'));
    assert.ok(!doc.isSelected('nested.age'));
    assert.ok(!doc.isSelected('nested.cool'));
    assert.ok(!doc.isSelected('nested.path'));
    assert.ok(doc.isSelected('nested.deep'));
    assert.ok(!doc.isSelected('nested.nope'));
    assert.ok(doc.isSelected('nested.deep.x'));
    assert.ok(doc.isSelected('nested.deep.x.no'));
    assert.ok(doc.isSelected('nested.deep.y'));
    assert.ok(!doc.isSelected('noway'));
    assert.ok(!doc.isSelected('notapath'));
    assert.ok(!doc.isSelected('em'));
    assert.ok(!doc.isSelected('em.title'));
    assert.ok(!doc.isSelected('em.body'));
    assert.ok(!doc.isSelected('em.nonpath'));

    selection = {
      'em.title': 1
    };

    doc = new TestDocument(undefined, selection);

    doc.init({
      em: [{title: 'one'}]
    });

    assert.ok(doc.isSelected('_id'));
    assert.ok(!doc.isSelected('test'));
    assert.ok(!doc.isSelected('numbers'));
    assert.ok(!doc.isSelected('oids'));
    assert.ok(!doc.isSelected('nested'));
    assert.ok(!doc.isSelected('nested.age'));
    assert.ok(!doc.isSelected('nested.cool'));
    assert.ok(!doc.isSelected('nested.path'));
    assert.ok(!doc.isSelected('nested.deep'));
    assert.ok(!doc.isSelected('nested.nope'));
    assert.ok(!doc.isSelected('nested.deep.x'));
    assert.ok(!doc.isSelected('nested.deep.x.no'));
    assert.ok(!doc.isSelected('nested.deep.y'));
    assert.ok(!doc.isSelected('noway'));
    assert.ok(!doc.isSelected('notapath'));
    assert.ok(doc.isSelected('em'));
    assert.ok(doc.isSelected('em.title'));
    assert.ok(!doc.isSelected('em.body'));
    assert.ok(!doc.isSelected('em.nonpath'));

    selection = {
      em: 0
    };

    doc = new TestDocument(undefined, selection);
    doc.init({
      test: 'test',
      numbers: [4, 5, 6, 7],
      nested: {
        age: 5,
        cool: DocumentObjectId.createFromHexString('4c6c2d6240ced95d0e00003c'),
        path: 'my path',
        deep: {x: 'a string'}
      },
      notapath: 'i am not in the schema'
    });

    assert.ok(doc.isSelected('_id'));
    assert.ok(doc.isSelected('test'));
    assert.ok(doc.isSelected('numbers'));
    assert.ok(doc.isSelected('oids'));
    assert.ok(doc.isSelected('nested'));
    assert.ok(doc.isSelected('nested.age'));
    assert.ok(doc.isSelected('nested.cool'));
    assert.ok(doc.isSelected('nested.path'));
    assert.ok(doc.isSelected('nested.deep'));
    assert.ok(doc.isSelected('nested.nope'));
    assert.ok(doc.isSelected('nested.deep.x'));
    assert.ok(doc.isSelected('nested.deep.x.no'));
    assert.ok(doc.isSelected('nested.deep.y'));
    assert.ok(doc.isSelected('noway'));
    assert.ok(doc.isSelected('notapath'));
    assert.ok(!doc.isSelected('em'));
    assert.ok(!doc.isSelected('em.title'));
    assert.ok(!doc.isSelected('em.body'));
    assert.ok(!doc.isSelected('em.nonpath'));

    selection = {
      _id: 0
    };

    doc = new TestDocument(undefined, selection);
    doc.init({
      test: 'test',
      numbers: [4, 5, 6, 7],
      nested: {
        age: 5,
        cool: DocumentObjectId.createFromHexString('4c6c2d6240ced95d0e00003c'),
        path: 'my path',
        deep: {x: 'a string'}
      },
      notapath: 'i am not in the schema'
    });

    assert.ok(!doc.isSelected('_id'));
    assert.ok(doc.isSelected('nested.deep.x.no'));

    doc = new TestDocument({test: 'boom'});
    assert.ok(doc.isSelected('_id'));
    assert.ok(doc.isSelected('test'));
    assert.ok(doc.isSelected('numbers'));
    assert.ok(doc.isSelected('oids'));
    assert.ok(doc.isSelected('nested'));
    assert.ok(doc.isSelected('nested.age'));
    assert.ok(doc.isSelected('nested.cool'));
    assert.ok(doc.isSelected('nested.path'));
    assert.ok(doc.isSelected('nested.deep'));
    assert.ok(doc.isSelected('nested.nope'));
    assert.ok(doc.isSelected('nested.deep.x'));
    assert.ok(doc.isSelected('nested.deep.x.no'));
    assert.ok(doc.isSelected('nested.deep.y'));
    assert.ok(doc.isSelected('noway'));
    assert.ok(doc.isSelected('notapath'));
    assert.ok(doc.isSelected('em'));
    assert.ok(doc.isSelected('em.title'));
    assert.ok(doc.isSelected('em.body'));
    assert.ok(doc.isSelected('em.nonpath'));

    selection = {
      _id: 1
    };

    doc = new TestDocument(undefined, selection);
    doc.init({_id: 'test'});

    assert.ok(doc.isSelected('_id'));
    assert.ok(!doc.isSelected('test'));

    doc = new TestDocument({test: 'boom'}, true);
    assert.ok(doc.isSelected('_id'));
    assert.ok(doc.isSelected('test'));
    assert.ok(doc.isSelected('numbers'));
    assert.ok(doc.isSelected('oids'));
    assert.ok(doc.isSelected('nested'));
    assert.ok(doc.isSelected('nested.age'));
    assert.ok(doc.isSelected('nested.cool'));
    assert.ok(doc.isSelected('nested.path'));
    assert.ok(doc.isSelected('nested.deep'));
    assert.ok(doc.isSelected('nested.nope'));
    assert.ok(doc.isSelected('nested.deep.x'));
    assert.ok(doc.isSelected('nested.deep.x.no'));
    assert.ok(doc.isSelected('nested.deep.y'));
    assert.ok(doc.isSelected('noway'));
    assert.ok(doc.isSelected('notapath'));
    assert.ok(doc.isSelected('em'));
    assert.ok(doc.isSelected('em.title'));
    assert.ok(doc.isSelected('em.body'));
    assert.ok(doc.isSelected('em.nonpath'));

    selection = {
      _id: 1,
      n: 1
    };

    doc = new TestDocument(undefined, selection);
    doc.init({
      test: 'test',
      numbers: [4, 5, 6, 7],
      nested: {
        age: 5,
        cool: DocumentObjectId.createFromHexString('4c6c2d6240ced95d0e00003c'),
        path: 'my path',
        deep: {x: 'a string'}
      },
      notapath: 'i am not in the schema'
    });

    assert.ok(doc.isSelected('_id'));
    assert.ok(doc.isSelected('n'));
    assert.ok(!doc.isSelected('nested'));
    assert.ok(!doc.isSelected('nested.age'));
    assert.ok(!doc.isSelected('numbers'));

    done();
  });

  it('isDirectSelected (gh-5063)', function(done) {
    var selection = {
      test: 1,
      numbers: 1,
      'nested.deep': 1,
      oids: 1
    };

    var doc = new TestDocument(undefined, selection);

    doc.init({
      test: 'test',
      numbers: [4, 5, 6, 7],
      nested: {
        deep: {x: 'a string'}
      }
    });

    assert.ok(doc.isDirectSelected('nested.deep'));
    assert.ok(!doc.isDirectSelected('nested.cool'));
    assert.ok(!doc.isDirectSelected('nested'));

    done();
  });
});
