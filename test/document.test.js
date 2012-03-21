
/**
 * Module dependencies.
 */

var start = require('./common')
  , should = require('should')
  , mongoose = start.mongoose
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , Document = require('../lib/document')
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

var em = new Schema({ title: String, body: String });
var schema = TestDocument.prototype.schema = new Schema({
    test    : String
  , oids    : [ObjectId]
  , numbers : [Number]
  , nested  : {
        age   : Number
      , cool  : ObjectId
      , deep  : { x: String }
      , path  : String
      , setr  : String
    }
  , nested2 : {
        nested: String
      , yup   : {
            nested  : Boolean
          , yup     : String
          , age     : Number
        }
    }
  , em: [em]
});

schema.virtual('nested.agePlus2').get(function (v) {
  return this.nested.age + 2;
});
schema.virtual('nested.setAge').set(function (v) {
  this.nested.age = v;
});
schema.path('nested.path').get(function (v) {
  return this.nested.age + (v ? v : '');
});
schema.path('nested.setr').set(function (v) {
  return v + ' setter';
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
          , path  : 'my path'
        }
    });

    doc.test.should.eql('test');
    doc.oids.should.be.an.instanceof(Array);
    (doc.nested.age == 5).should.be.true;
    DocumentObjectId.toString(doc.nested.cool).should.eql('4c6c2d6240ced95d0e00003c');
    doc.nested.agePlus2.should.eql(7);
    doc.nested.path.should.eql('5my path');
    doc.nested.setAge = 10;
    (doc.nested.age == 10).should.be.true;
    doc.nested.setr = 'set it';
    doc.getValue('nested.setr').should.eql('set it setter');

    var doc2 = new TestDocument();
    doc2.init({
        test    : 'toop'
      , oids    : []
      , nested  : {
            age   : 2
          , cool  : DocumentObjectId.fromString('4cf70857337498f95900001c')
          , deep  : { x: 'yay' }
        }
    });

    doc2.test.should.eql('toop');
    doc2.oids.should.be.an.instanceof(Array);
    (doc2.nested.age == 2).should.be.true;

    // GH-366
    should.strictEqual(doc2.nested.bonk, undefined);
    should.strictEqual(doc2.nested.nested, undefined);
    should.strictEqual(doc2.nested.test, undefined);
    should.strictEqual(doc2.nested.age.test, undefined);
    should.strictEqual(doc2.nested.age.nested, undefined);
    should.strictEqual(doc2.oids.nested, undefined);
    should.strictEqual(doc2.nested.deep.x, 'yay');
    should.strictEqual(doc2.nested.deep.nested, undefined);
    should.strictEqual(doc2.nested.deep.cool, undefined);
    should.strictEqual(doc2.nested2.yup.nested, undefined);
    should.strictEqual(doc2.nested2.yup.nested2, undefined);
    should.strictEqual(doc2.nested2.yup.yup, undefined);
    should.strictEqual(doc2.nested2.yup.age, undefined);
    doc2.nested2.yup.should.be.a('object');

    doc2.nested2.yup = {
        age: 150
      , yup: "Yesiree"
      , nested: true
    };

    should.strictEqual(doc2.nested2.nested, undefined);
    should.strictEqual(doc2.nested2.yup.nested, true);
    should.strictEqual(doc2.nested2.yup.yup, "Yesiree");
    (doc2.nested2.yup.age == 150).should.be.true;
    doc2.nested2.nested = "y";
    should.strictEqual(doc2.nested2.nested, "y");
    should.strictEqual(doc2.nested2.yup.nested, true);
    should.strictEqual(doc2.nested2.yup.yup, "Yesiree");
    (doc2.nested2.yup.age == 150).should.be.true;

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

    should.strictEqual(doc._doc.test._marked, undefined);
    should.strictEqual(doc._doc.nested._marked, undefined);
    should.strictEqual(doc._doc.nested.age._marked, undefined);
    should.strictEqual(doc._doc.nested.cool._marked, undefined);
  },

  'toObject options': function () {
    var doc = new TestDocument();

    doc.init({
        test    : 'test'
      , oids    : []
      , nested  : {
            age   : 5
          , cool  : DocumentObjectId.fromString('4c6c2d6240ced95d0e00003c')
          , path  : 'my path'
        }
    });

    var clone = doc.toObject({ getters: true, virtuals: false });

    clone.test.should.eql('test');
    clone.oids.should.be.an.instanceof(Array);
    (clone.nested.age == 5).should.be.true;
    DocumentObjectId.toString(clone.nested.cool).should.eql('4c6c2d6240ced95d0e00003c');
    clone.nested.path.should.eql('5my path');
    should.equal(undefined, clone.nested.agePlus2);

    clone = doc.toObject({ virtuals: true });

    clone.test.should.eql('test');
    clone.oids.should.be.an.instanceof(Array);
    (clone.nested.age == 5).should.be.true;
    DocumentObjectId.toString(clone.nested.cool).should.eql('4c6c2d6240ced95d0e00003c');
    clone.nested.path.should.eql('my path');
    clone.nested.agePlus2.should.eql(7);

    clone = doc.toObject({ getters: true });

    clone.test.should.eql('test');
    clone.oids.should.be.an.instanceof(Array);
    (clone.nested.age == 5).should.be.true;
    DocumentObjectId.toString(clone.nested.cool).should.eql('4c6c2d6240ced95d0e00003c');
    clone.nested.path.should.eql('5my path');
    clone.nested.agePlus2.should.eql(7);
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
    doc.pre('hooksTest', true, function(next, done){
      steps++;
      steps.should.eql(3);
      setTimeout(function(){
        steps.should.eql(4);
      }, 10);
      setTimeout(function(){
        steps++;
        done();
      }, 110);
      next();
    });

    doc.pre('hooksTest', true, function(next, done){
      steps++;
      setTimeout(function(){
        steps.should.eql(4);
      }, 10);
      setTimeout(function(){
        steps++;
        done();
      }, 110);
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

    doc.pre('hooksTest', true, function(next, done){
      steps++;
      next();
      done();
      done();
    });

    doc.pre('hooksTest', true, function(next, done){
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

    doc.pre('hooksTest', true, function(next, done){
      steps++;
      next();
      done();
      done();
    });

    doc.pre('hooksTest', true, function(next, done){
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

    doc.pre('hooksTest', true, function(next, done){
      steps++;
      next();
      done();
    });

    doc.pre('hooksTest', true, function(next, done){
      steps++;
      next();
      done();
    });

    doc.pre('hooksTest', true, function(next, done){
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

  // gh-746
  'hooking set works with document arrays': function () {
    var db = start();

    var child = new Schema({ text: String });

    child.pre('set', function (next, path, value, type) {
      next(path, value, type);
    });

    var schema = new Schema({
        name: String
      , e: [child]
    });

    var S = db.model('docArrayWithHookedSet', schema);

    var s = new S({ name: "test" });
    s.e = [{ text: 'hi' }];
    s.save(function (err) {
      db.close();
      should.strictEqual(null, err);
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
    obj.should.eql({ numbers: [], oids: [], em: [] });
  },

  // GH-209
  'MongooseErrors should be instances of Error': function () {
    var MongooseError = require('../lib/error')
      , err = new MongooseError("Some message");
    err.should.be.an.instanceof(Error);
  },
  'ValidationErrors should be instances of Error': function () {
    var ValidationError = Document.ValidationError
      , err = new ValidationError(new TestDocument);
    err.should.be.an.instanceof(Error);
  },

  'methods on embedded docs should work': function () {
    var db = start()
      , ESchema = new Schema({ name: String })

    ESchema.methods.test = function () {
      return this.name + ' butter';
    }
    ESchema.statics.ten = function () {
      return 10;
    }

    var E = db.model('EmbeddedMethodsAndStaticsE', ESchema);
    var PSchema = new Schema({ embed: [ESchema] });
    var P = db.model('EmbeddedMethodsAndStaticsP', PSchema);

    var p = new P({ embed: [{name: 'peanut'}] });
    should.equal('function', typeof p.embed[0].test);
    should.equal('function', typeof E.ten);
    p.embed[0].test().should.equal('peanut butter');
    E.ten().should.equal(10);

    // test push casting
    p = new P;
    p.embed.push({name: 'apple'});
    should.equal('function', typeof p.embed[0].test);
    should.equal('function', typeof E.ten);
    p.embed[0].test().should.equal('apple butter');

    db.close();
  },

  'setting a positional path does not cast value to array': function () {
    var doc = new TestDocument;
    doc.init({ numbers: [1,3] });
    doc.numbers[0].should.eql(1);
    doc.numbers[1].valueOf().should.eql(3);
    doc.set('numbers.1', 2);
    doc.numbers[0].should.eql(1);
    doc.numbers[1].valueOf().should.eql(2);
  },

  'no maxListeners warning should occur': function () {
    var db = start();

    var traced = false;
    var trace = console.trace;

    console.trace = function () {
      traced = true;
      console.trace = trace;
    }

    var schema = new Schema({
        title: String
      , embed1: [new Schema({name:String})]
      , embed2: [new Schema({name:String})]
      , embed3: [new Schema({name:String})]
      , embed4: [new Schema({name:String})]
      , embed5: [new Schema({name:String})]
      , embed6: [new Schema({name:String})]
      , embed7: [new Schema({name:String})]
      , embed8: [new Schema({name:String})]
      , embed9: [new Schema({name:String})]
      , embed10: [new Schema({name:String})]
      , embed11: [new Schema({name:String})]
    });

    var S = db.model('noMaxListeners', schema);

    var s = new S({ title: "test" });
    db.close();
    traced.should.be.false
  },

  'isSelected': function () {
    var doc = new TestDocument();

    doc.init({
        test    : 'test'
      , numbers : [4,5,6,7]
      , nested  : {
            age   : 5
          , cool  : DocumentObjectId.fromString('4c6c2d6240ced95d0e00003c')
          , path  : 'my path'
          , deep  : { x: 'a string' }
        }
      , notapath: 'i am not in the schema'
      , em: [{ title: 'gocars' }]
    });

    doc.isSelected('_id').should.be.true;
    doc.isSelected('test').should.be.true;
    doc.isSelected('numbers').should.be.true;
    doc.isSelected('oids').should.be.true; // even if no data
    doc.isSelected('nested').should.be.true;
    doc.isSelected('nested.age').should.be.true;
    doc.isSelected('nested.cool').should.be.true;
    doc.isSelected('nested.path').should.be.true;
    doc.isSelected('nested.deep').should.be.true;
    doc.isSelected('nested.nope').should.be.true; // not a path
    doc.isSelected('nested.deep.x').should.be.true;
    doc.isSelected('nested.deep.x.no').should.be.true;
    doc.isSelected('nested.deep.y').should.be.true; // not a path
    doc.isSelected('noway').should.be.true; // not a path
    doc.isSelected('notapath').should.be.true; // not a path but in the _doc
    doc.isSelected('em').should.be.true;
    doc.isSelected('em.title').should.be.true;
    doc.isSelected('em.body').should.be.true;
    doc.isSelected('em.nonpath').should.be.true; // not a path

    var selection = {
        'test': 1
      , 'numbers': 1
      , 'nested.deep': 1
      , 'oids': 1
    }

    doc = new TestDocument(undefined, selection);

    doc.init({
        test    : 'test'
      , numbers : [4,5,6,7]
      , nested  : {
            deep  : { x: 'a string' }
        }
    });

    doc.isSelected('_id').should.be.true;
    doc.isSelected('test').should.be.true;
    doc.isSelected('numbers').should.be.true;
    doc.isSelected('oids').should.be.true; // even if no data
    doc.isSelected('nested').should.be.true;
    doc.isSelected('nested.age').should.be.false;
    doc.isSelected('nested.cool').should.be.false;
    doc.isSelected('nested.path').should.be.false;
    doc.isSelected('nested.deep').should.be.true;
    doc.isSelected('nested.nope').should.be.false;
    doc.isSelected('nested.deep.x').should.be.true;
    doc.isSelected('nested.deep.x.no').should.be.true;
    doc.isSelected('nested.deep.y').should.be.true;
    doc.isSelected('noway').should.be.false;
    doc.isSelected('notapath').should.be.false;
    doc.isSelected('em').should.be.false;
    doc.isSelected('em.title').should.be.false;
    doc.isSelected('em.body').should.be.false;
    doc.isSelected('em.nonpath').should.be.false;

    var selection = {
        'em.title': 1
    }

    doc = new TestDocument(undefined, selection);

    doc.init({
        em: [{ title: 'one' }]
    });

    doc.isSelected('_id').should.be.true;
    doc.isSelected('test').should.be.false;
    doc.isSelected('numbers').should.be.false;
    doc.isSelected('oids').should.be.false;
    doc.isSelected('nested').should.be.false;
    doc.isSelected('nested.age').should.be.false;
    doc.isSelected('nested.cool').should.be.false;
    doc.isSelected('nested.path').should.be.false;
    doc.isSelected('nested.deep').should.be.false;
    doc.isSelected('nested.nope').should.be.false;
    doc.isSelected('nested.deep.x').should.be.false;
    doc.isSelected('nested.deep.x.no').should.be.false;
    doc.isSelected('nested.deep.y').should.be.false;
    doc.isSelected('noway').should.be.false;
    doc.isSelected('notapath').should.be.false;
    doc.isSelected('em').should.be.true;
    doc.isSelected('em.title').should.be.true;
    doc.isSelected('em.body').should.be.false;
    doc.isSelected('em.nonpath').should.be.false;

    var selection = {
        'em': 0
    }

    doc = new TestDocument(undefined, selection);
    doc.init({
        test    : 'test'
      , numbers : [4,5,6,7]
      , nested  : {
            age   : 5
          , cool  : DocumentObjectId.fromString('4c6c2d6240ced95d0e00003c')
          , path  : 'my path'
          , deep  : { x: 'a string' }
        }
      , notapath: 'i am not in the schema'
    });

    doc.isSelected('_id').should.be.true;
    doc.isSelected('test').should.be.true;
    doc.isSelected('numbers').should.be.true;
    doc.isSelected('oids').should.be.true;
    doc.isSelected('nested').should.be.true;
    doc.isSelected('nested.age').should.be.true;
    doc.isSelected('nested.cool').should.be.true;
    doc.isSelected('nested.path').should.be.true;
    doc.isSelected('nested.deep').should.be.true;
    doc.isSelected('nested.nope').should.be.true;
    doc.isSelected('nested.deep.x').should.be.true;
    doc.isSelected('nested.deep.x.no').should.be.true;
    doc.isSelected('nested.deep.y').should.be.true;
    doc.isSelected('noway').should.be.true;
    doc.isSelected('notapath').should.be.true;
    doc.isSelected('em').should.be.false;
    doc.isSelected('em.title').should.be.false;
    doc.isSelected('em.body').should.be.false;
    doc.isSelected('em.nonpath').should.be.false;

    var selection = {
        '_id': 0
    }

    doc = new TestDocument(undefined, selection);
    doc.init({
        test    : 'test'
      , numbers : [4,5,6,7]
      , nested  : {
            age   : 5
          , cool  : DocumentObjectId.fromString('4c6c2d6240ced95d0e00003c')
          , path  : 'my path'
          , deep  : { x: 'a string' }
        }
      , notapath: 'i am not in the schema'
    });

    doc.isSelected('_id').should.be.false;
    doc.isSelected('nested.deep.x.no').should.be.true;

    doc = new TestDocument({ test: 'boom' });
    doc.isSelected('_id').should.be.true;
    doc.isSelected('test').should.be.true;
    doc.isSelected('numbers').should.be.true;
    doc.isSelected('oids').should.be.true;
    doc.isSelected('nested').should.be.true;
    doc.isSelected('nested.age').should.be.true;
    doc.isSelected('nested.cool').should.be.true;
    doc.isSelected('nested.path').should.be.true;
    doc.isSelected('nested.deep').should.be.true;
    doc.isSelected('nested.nope').should.be.true;
    doc.isSelected('nested.deep.x').should.be.true;
    doc.isSelected('nested.deep.x.no').should.be.true;
    doc.isSelected('nested.deep.y').should.be.true;
    doc.isSelected('noway').should.be.true;
    doc.isSelected('notapath').should.be.true;
    doc.isSelected('em').should.be.true;
    doc.isSelected('em.title').should.be.true;
    doc.isSelected('em.body').should.be.true;
    doc.isSelected('em.nonpath').should.be.true;

    doc = new TestDocument({ test: 'boom' }, true);
    doc.isSelected('_id').should.be.true;
    doc.isSelected('test').should.be.true;
    doc.isSelected('numbers').should.be.true;
    doc.isSelected('oids').should.be.true;
    doc.isSelected('nested').should.be.true;
    doc.isSelected('nested.age').should.be.true;
    doc.isSelected('nested.cool').should.be.true;
    doc.isSelected('nested.path').should.be.true;
    doc.isSelected('nested.deep').should.be.true;
    doc.isSelected('nested.nope').should.be.true;
    doc.isSelected('nested.deep.x').should.be.true;
    doc.isSelected('nested.deep.x.no').should.be.true;
    doc.isSelected('nested.deep.y').should.be.true;
    doc.isSelected('noway').should.be.true;
    doc.isSelected('notapath').should.be.true;
    doc.isSelected('em').should.be.true;
    doc.isSelected('em.title').should.be.true;
    doc.isSelected('em.body').should.be.true;
    doc.isSelected('em.nonpath').should.be.true;
  },

  'unselected required fields should pass validation': function () {
    var db = start()
      , Tschema = new Schema({ name: String, req: { type: String, required: true }})
      , T = db.model('unselectedRequiredFieldValidation', Tschema);

    var t = new T({ name: 'teeee', req: 'i am required' });
    t.save(function (err) {
      should.strictEqual(null, err);
      T.findById(t).select('name').exec(function (err, t) {
        should.strictEqual(null, err);
        should.strictEqual(undefined, t.req);
        t.name = 'wooo';
        t.save(function (err) {
          should.strictEqual(null, err);

          T.findById(t).select('name').exec(function (err, t) {
            should.strictEqual(null, err);
            t.req = undefined;
            t.save(function (err) {
              err = String(err);
              var invalid  = /Validator "required" failed for path req/.test(err);
              invalid.should.be.true;
              t.req = 'it works again'
              t.save(function (err) {
                db.close();
                should.strictEqual(null, err);
              });
            });
          });
        });
      });
    });
  }
};
