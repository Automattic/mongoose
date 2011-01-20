
/**
 * Module dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = start.mongoose
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , Document = require('mongoose/document')
  , DocumentObjectId = mongoose.Types.ObjectId;

/**
 * Test Document constructor.
 */

function TestDocument () {
  Document.apply(this, arguments);
};

/**
 * Inherits from Document.
 */

TestDocument.prototype.__proto__ = Document.prototype;

/**
 * Set a dummy schema to simulate compilation.
 */

TestDocument.prototype.schema = new Schema({
    test    : String
  , oids    : [ObjectId]
  , nested  : {
        age   : Number
      , cool  : ObjectId
    }
});

/**
 * Method subject to hooks. Simply fires the callback once the hooks are
 * executed.
 */

TestDocument.prototype.hooksTest = function(fn){
  fn(null);
};

/**
 * Apply hooks.
 */

Document.registerHooks.call(TestDocument, 'hooksTest');

/**
 * Test.
 */

module.exports = {

  'test toObject clone': function(){
    var doc = new TestDocument();
    doc.init({
        test    : 'test'
      , oids    : []
      , nested  : {
            age   : 5
          , cool  : new DocumentObjectId
        }
    });

    var copy = doc.toObject();

    copy.test._marked = true;
    copy.oids._marked = true;
    copy.nested._marked = true;
    copy.nested.age._marked = true;
    copy.nested.cool._marked = true;

    should.strictEqual(doc.doc.test._marked, undefined);
    should.strictEqual(doc.doc.oids._marked, undefined);
    should.strictEqual(doc.doc.nested._marked, undefined);
    should.strictEqual(doc.doc.nested.age._marked, undefined);
    should.strictEqual(doc.doc.nested.cool._marked, undefined);
  },

  'test hooks system': function(beforeExit){
    var doc = new TestDocument()
      , steps = 0
      , awaiting = 0
      , called = false;

    // serial
    doc.pre('hooksTest', function(next){
      steps++;
      setTimeout(function(){
        // make sure next step hasn't executed yet
        steps.should.eql(1);
        next();
      }, 50);
    });

    doc.pre('hooksTest', function(next){
      steps++;
      next();
    });

    // parallel
    doc.pre('hooksTest', function(next, done){
      steps++;
      setTimeout(function(){
        steps.should.eql(4);
      }, 50);
      setTimeout(function(){
        steps++;
        done();
      }, 100);
      next();
    });

    doc.pre('hooksTest', function(next, done){
      steps++;
      setTimeout(function(){
        steps.should.eql(4);
      }, 50);
      setTimeout(function(){
        steps++;
        done();
      }, 100);
      next();
    });

    doc.hooksTest(function(err){
      should.strictEqual(err, null);
      steps++;
      called = true;
    });

    beforeExit(function(){
      steps.should.eql(7);
      called.should.be.true;
    });
  },

  'test that calling next twice doesnt break': function(beforeExit){
    var doc = new TestDocument()
      , steps = 0
      , called = false;

    doc.pre('hooksTest', function(next){
      steps++;
      next();
      next();
    });

    doc.pre('hooksTest', function(next){
      steps++;
      next();
    });

    doc.hooksTest(function(err){
      should.strictEqual(err, null);
      steps++;
      called = true;
    });

    beforeExit(function(){
      steps.should.eql(3);
      called.should.be.true;
    });
  },

  'test that calling done twice doesnt break': function(beforeExit){
    var doc = new TestDocument()
      , steps = 0
      , called = false;

    doc.pre('hooksTest', function(next, done){
      steps++;
      next();
      done();
      done();
    });

    doc.pre('hooksTest', function(next, done){
      steps++;
      next();
      done();
      done();
    });

    doc.hooksTest(function(err){
      should.strictEqual(err, null);
      steps++;
      called = true;
    });

    beforeExit(function(){
      steps.should.eql(3);
      called.should.be.true;
    });
  },

  'test that calling done twice on the same doesnt mean completion':
  function(beforeExit){
    var doc = new TestDocument()
      , steps = 0
      , called = false;

    doc.pre('hooksTest', function(next, done){
      steps++;
      next();
      done();
      done();
    });

    doc.pre('hooksTest', function(next, done){
      steps++;
      next();
    });

    doc.hooksTest(function(err){
      should.strictEqual(err, null);
      called = true;
    });

    beforeExit(function(){
      steps.should.eql(2);
      called.should.be.false;
    });
  },

  'test hooks system errors from a serial hook': function(beforeExit){
    var doc = new TestDocument()
      , steps = 0
      , called = false;

    doc.pre('hooksTest', function(next){
      steps++;
      next();
    });

    doc.pre('hooksTest', function(next){
      steps++;
      next(new Error);
    });

    doc.pre('hooksTest', function(next){
      steps++;
    });

    doc.hooksTest(function(err){
      err.should.be.an.instanceof(Error);
      steps++;
      called = true;
    });

    beforeExit(function(){
      steps.should.eql(3);
      called.should.be.true;
    });
  },

  'test hooks system erros from last serial hook': function(beforeExit){
    var doc = new TestDocument()
      , called = false;

    doc.pre('hooksTest', function(next){
      next(new Error());
    });

    doc.hooksTest(function(err){
      err.should.be.an.instanceof(Error);
      called = true;
    });

    beforeExit(function(){
      called.should.be.true;
    });
  },

  'test that passing something that is not an error is ignored':
  function(beforeExit){
    var doc = new TestDocument()
      , called = false;

    doc.pre('hooksTest', function(next){
      next(true);
    });

    doc.hooksTest(function(err){
      should.strictEqual(err, null);
      called = true;
    });

    beforeExit(function(){
      called.should.be.true;
    });
  },

  'test hooks system errors from a parallel hook': function(beforeExit){
    var doc = new TestDocument()
      , steps = 0
      , called = false;

    doc.pre('hooksTest', function(next, done){
      steps++;
      next();
      done();
    });

    doc.pre('hooksTest', function(next, done){
      steps++;
      next();
      done();
    });

    doc.pre('hooksTest', function(next, done){
      steps++;
      next();
      done(new Error);
    });

    doc.hooksTest(function(err){
      err.should.be.an.instanceof(Error);
      steps++;
      called = true;
    });

    beforeExit(function(){
      steps.should.eql(4);
      called.should.be.true;
    });
  },
  
  'test that its not necessary to call the last next in the parallel chain':
  function(beforeExit){
    var doc = new TestDocument()
      , steps = 0
      , called = false;

    doc.pre('hooksTest', function(next, done){
      next();
      done();
    });

    doc.pre('hooksTest', function(next, done){
      done();
    });

    doc.hooksTest(function(){
      called = true;
    });

    beforeExit(function(){
      called.should.be.true;
    });
  }

};
