/**
 * Module dependencies.
 */

'use strict';

const start = require('./common');

const DocumentArray = require('../lib/types/documentarray');
const EmbeddedDocument = require('../lib/types/embedded');
const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const MongooseDocumentArray = mongoose.Types.DocumentArray;

/**
 * setup
 */

const test = new Schema({
  string: String,
  number: Number,
  date: {
    type: Date,
    default: Date.now
  }
});

function TestDoc(schema) {
  const Subdocument = function() {
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
  let db;
  let Test;

  before(function() {
    db = start();
    Test = db.model('Test', test, 'Test');
  });

  after(function(done) {
    db.close(done);
  });

  it('Document', function(done) {
    const date = new Date();

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

          const colorfull = require('util').inspect(docs, {
            depth: null,
            colors: true
          });

          const colorless = require('util').inspect(docs, {
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
    const Subdocument = TestDoc();

    const sub1 = new Subdocument();
    sub1.string = 'string';
    sub1.number = 12345;
    sub1.date = new Date();

    const docs = new MongooseDocumentArray([sub1]);

    const colorfull = require('util').inspect(docs, {
      depth: null,
      colors: true
    });

    const colorless = require('util').inspect(docs, {
      depth: null,
      colors: false
    });

    // console.log(colorfull, colorless);

    assert.notEqual(colorfull, colorless);
  });
});
