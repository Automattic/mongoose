/**
 * Module dependencies.
 */

var start = require('./common'),
    mongoose = start.mongoose,
    assert = require('power-assert'),
    Schema = mongoose.Schema,
    MongooseDocumentArray = mongoose.Types.DocumentArray,
    EmbeddedDocument = require('../lib/types/embedded'),
    DocumentArray = require('../lib/types/documentarray');

/**
 * setup
 */

var test = new Schema({
  string: String,
  number: Number,
  date: {
    type: Date,
    default: Date.now
  }
});

function TestDoc(schema) {
  var Subdocument = function() {
    EmbeddedDocument.call(this, {}, new DocumentArray);
  };

  /**
   * Inherits from EmbeddedDocument.
   */

  Subdocument.prototype.__proto__ = EmbeddedDocument.prototype;

  /**
   * Set schema.
   */

  Subdocument.prototype.$__setSchema(schema || test);

  return Subdocument;
}

/**
 * Test.
 */

describe('debug: colors', function() {
  var db;
  var Test;

  before(function() {
    db = start();
    Test = db.model('Test', test, 'TEST');
  });

  after(function(done) {
    db.close(done);
  });

  it('Document', function(done) {
    var date = new Date();

    Test.create([{
      string: 'qwerty',
      number: 123,
      date: date
    }, {
      string: 'asdfgh',
      number: 456,
      date: date
    }, {
      string: 'zxcvbn',
      number: 789,
      date: date
    }], function(err) {
      assert.ifError(err);
      Test
          .find()
          .lean(false)
          .exec(function(err, docs) {
            assert.ifError(err);

            var colorfull = require('util').inspect(docs, {
              depth: null,
              colors: true
            });

            var colorless = require('util').inspect(docs, {
              depth: null,
              colors: false
            });

            // console.log(colorfull, colorless);

            assert.notEqual(colorfull, colorless);

            done();
          });
    });
  });

  it('MongooseDocumentArray', function() {
    var Subdocument = TestDoc();

    var sub1 = new Subdocument();
    sub1.string = 'string';
    sub1.number = 12345;
    sub1.date = new Date();

    var docs = new MongooseDocumentArray([sub1]);

    var colorfull = require('util').inspect(docs, {
      depth: null,
      colors: true
    });

    var colorless = require('util').inspect(docs, {
      depth: null,
      colors: false
    });

    // console.log(colorfull, colorless);

    assert.notEqual(colorfull, colorless);
  });
});
