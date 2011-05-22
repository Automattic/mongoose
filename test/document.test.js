
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
  fn(null, arguments);
};

/**
 * Test.
 */

module.exports = {
  'test shortcut getters': function(){
    var doc = new TestDocument();
    doc.init({
        test    : 'test'
      , oids    : []
      , nested  : {
            age   : 5
          , cool  : DocumentObjectId.fromString('4c6c2d6240ced95d0e00003c')
        }
    });

    var doc2 = new TestDocument();
    doc2.init({
        test    : 'toop'
      , oids    : []
      , nested  : {
            age   : 2
          , cool  : DocumentObjectId.fromString('4cf70857337498f95900001c')
        }
    });

    doc.test.should.eql('test');
    doc.oids.should.be.an.instanceof(Array);
    (doc.nested.age == 5).should.be.true;
    DocumentObjectId.toString(doc.nested.cool).should.eql('4c6c2d6240ced95d0e00003c');

    doc2.test.should.eql('toop');
    doc2.oids.should.be.an.instanceof(Array);
    (doc2.nested.age == 2).should.be.true;
    DocumentObjectId.toString(doc2.nested.cool).should.eql('4cf70857337498f95900001c');

    doc.oids.should.not.equal(doc2.oids);
  },

  'test shortcut setters': function () {
    var doc = new TestDocument();

    doc.init({
        test    : 'Test'
      , nested  : {
            age   : 5
        }
    });

    doc.isModified('test').should.be.false;
    doc.test = 'Woot';
    doc.test.should.eql('Woot');
    doc.isModified('test').should.be.true;

    doc.isModified('nested.age').should.be.false;
    doc.nested.age = 2;
    (doc.nested.age == 2).should.be.true;
    doc.isModified('nested.age').should.be.true;
  },

  'test accessor of id': function () {
    var doc = new TestDocument();
    doc._id.should.be.an.instanceof(DocumentObjectId);
  },

  'test shortcut of id hexString': function () {
    var doc = new TestDocument()
      , _id = doc._id.toString();
    doc.id.should.be.a('string');
  },

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
    copy.nested._marked = true;
    copy.nested.age._marked = true;
    copy.nested.cool._marked = true;

    should.strictEqual(doc.doc.test._marked, undefined);
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
    }, true);

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
    }, true);

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
    }, true);

    doc.pre('hooksTest', function(next, done){
      steps++;
      next();
      done();
      done();
    }, true);

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
    }, true);

    doc.pre('hooksTest', function(next, done){
      steps++;
      next();
    }, true);

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

  'test mutating incoming args via middleware': function (beforeExit) {
    var doc = new TestDocument();

    doc.pre('set', function(next, path, val){
      next(path, 'altered-' + val);
    });

    doc.set('test', 'me');

    beforeExit(function(){
      doc.test.should.equal('altered-me');
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
    }, true);

    doc.pre('hooksTest', function(next, done){
      steps++;
      next();
      done();
    }, true);

    doc.pre('hooksTest', function(next, done){
      steps++;
      next();
      done(new Error);
    }, true);

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
  },

  'test passing two arguments to a method subject to hooks and return value':
  function (beforeExit) {
    var doc = new TestDocument()
      , called = false;

    doc.pre('hooksTest', function (next) {
      next();
    });

    doc.hooksTest(function (err, args) {
      args.should.have.length(2);
      args[1].should.eql('test');
      called = true;
    }, 'test')
    
    beforeExit(function () {
      called.should.be.true;
    });
  },

  'test jsonifying an object': function () {
    var doc = new TestDocument({ test: 'woot' })
      , oidString = DocumentObjectId.toString(doc._id);

    // convert to json string
    var json = JSON.stringify(doc);

    // parse again
    var obj = JSON.parse(json);

    obj.test.should.eql('woot');
    obj._id.should.eql(oidString);
  },

  'toObject should not set undefined values to null': function () {
    var doc = new TestDocument()
      , obj = doc.toObject();

    delete obj._id;
    obj.should.eql({ oids: [] });
  }

};
