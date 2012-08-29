
/**
 * Module dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , random = require('../lib/utils').random
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId
  , Document = require('../lib/document')
  , DocumentObjectId = mongoose.Types.ObjectId
  , SchemaType = mongoose.SchemaType
  , ValidatorError = SchemaType.ValidatorError
  , ValidationError = mongoose.Document.ValidationError
  , MongooseError = mongoose.Error;

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
em.virtual('works').get(function () {
  return 'em virtual works'
});
var schema = new Schema({
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
  , date: Date
});
TestDocument.prototype._setSchema(schema);

schema.virtual('nested.agePlus2').get(function (v) {
  return this.nested.age + 2;
});
schema.virtual('nested.setAge').set(function (v) {
  this.nested.age = v;
});
schema.path('nested.path').get(function (v) {
  return (this.nested.age || '') + (v ? v : '');
});
schema.path('nested.setr').set(function (v) {
  return v + ' setter';
});

var dateSetterCalled = false;
schema.path('date').set(function (v) {
  // should not have been cast to a Date yet
  assert.equal('string', typeof v);
  dateSetterCalled = true;
  return v;
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

describe('document:', function(){

  it('test shortcut getters', function(){
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

    ////
    assert.equal('test', doc.test);
    assert.ok(doc.oids instanceof Array);
    assert.equal(doc.nested.age, 5);
    assert.equal(DocumentObjectId.toString(doc.nested.cool), '4c6c2d6240ced95d0e00003c');
    assert.equal(7, doc.nested.agePlus2);
    assert.equal('5my path', doc.nested.path);
    doc.nested.setAge = 10;
    assert.equal(10, doc.nested.age);
    doc.nested.setr = 'set it';
    assert.equal(doc.getValue('nested.setr'), 'set it setter');

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

    assert.equal('toop', doc2.test);
    assert.ok(doc2.oids instanceof Array);
    assert.equal(doc2.nested.age, 2);

    // GH-366
    assert.equal(doc2.nested.bonk, undefined);
    assert.equal(doc2.nested.nested, undefined);
    assert.equal(doc2.nested.test, undefined);
    assert.equal(doc2.nested.age.test, undefined);
    assert.equal(doc2.nested.age.nested, undefined);
    assert.equal(doc2.oids.nested, undefined);
    assert.equal(doc2.nested.deep.x, 'yay');
    assert.equal(doc2.nested.deep.nested, undefined);
    assert.equal(doc2.nested.deep.cool, undefined);
    assert.equal(doc2.nested2.yup.nested, undefined);
    assert.equal(doc2.nested2.yup.nested2, undefined);
    assert.equal(doc2.nested2.yup.yup, undefined);
    assert.equal(doc2.nested2.yup.age, undefined);
    assert.equal('object', typeof doc2.nested2.yup);

    doc2.nested2.yup = {
        age: 150
      , yup: "Yesiree"
      , nested: true
    };

    assert.equal(doc2.nested2.nested, undefined);
    assert.equal(doc2.nested2.yup.nested, true);
    assert.equal(doc2.nested2.yup.yup, "Yesiree");
    assert.equal(doc2.nested2.yup.age, 150);
    doc2.nested2.nested = "y";
    assert.equal(doc2.nested2.nested, "y");
    assert.equal(doc2.nested2.yup.nested, true);
    assert.equal(doc2.nested2.yup.yup, "Yesiree");
    assert.equal(150, doc2.nested2.yup.age);

    assert.equal(DocumentObjectId.toString(doc2.nested.cool), '4cf70857337498f95900001c');

    assert.ok(doc.oids !== doc2.oids);
  });

  it('test shortcut setters', function(){
    var doc = new TestDocument();

    doc.init({
        test    : 'Test'
      , nested  : {
            age   : 5
        }
    });

    assert.equal(doc.isModified('test'), false);
    doc.test = 'Woot';
    assert.equal('Woot', doc.test);
    assert.equal(true, doc.isModified('test'));

    assert.equal(doc.isModified('nested.age'),false);
    doc.nested.age = 2;
    assert.equal(2,doc.nested.age);
    assert.ok(doc.isModified('nested.age'));

    doc.nested = { path: 'overwrite the entire nested object' };
    assert.equal(undefined, doc.nested.age);
    assert.equal(1, Object.keys(doc._doc.nested).length);
    assert.equal('overwrite the entire nested object', doc.nested.path);
    assert.ok(doc.isModified('nested'));
  });

  it('test accessor of id', function(){
    var doc = new TestDocument();
    assert.ok(doc._id instanceof DocumentObjectId);
  });

  it('test shortcut of id hexString', function(){
    var doc = new TestDocument()
      , _id = doc._id.toString();
    assert.equal('string', typeof doc.id);
  });

  it('test toObject clone', function(){
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

    assert.equal(doc._doc.test._marked, undefined);
    assert.equal(doc._doc.nested._marked, undefined);
    assert.equal(doc._doc.nested.age._marked, undefined);
    assert.equal(doc._doc.nested.cool._marked, undefined);
  });

  it('toObject options', function(){
    var doc = new TestDocument();

    doc.init({
        test    : 'test'
      , oids    : []
      , em: [{title:'asdf'}]
      , nested  : {
            age   : 5
          , cool  : DocumentObjectId.fromString('4c6c2d6240ced95d0e00003c')
          , path  : 'my path'
        }
      , nested2: {}
    });

    var clone = doc.toObject({ getters: true, virtuals: false });

    assert.equal(clone.test, 'test');
    assert.ok(clone.oids instanceof Array);
    assert.equal(5, clone.nested.age);
    assert.equal(DocumentObjectId.toString(clone.nested.cool), '4c6c2d6240ced95d0e00003c');
    assert.equal('5my path', clone.nested.path);
    assert.equal(undefined, clone.nested.agePlus2);
    assert.equal(undefined, clone.em[0].works);

    clone = doc.toObject({ virtuals: true });

    assert.equal('test', clone.test);
    assert.ok(clone.oids instanceof Array);
    assert.equal(5, clone.nested.age);
    assert.equal(DocumentObjectId.toString(clone.nested.cool), '4c6c2d6240ced95d0e00003c');
    assert.equal('my path', clone.nested.path);
    assert.equal(7, clone.nested.agePlus2);
    assert.equal(clone.em[0].works, 'em virtual works');

    clone = doc.toObject({ getters: true });

    assert.equal('test', clone.test);
    assert.ok(clone.oids instanceof Array);
    assert.equal(5, clone.nested.age);
    assert.equal(DocumentObjectId.toString(clone.nested.cool),'4c6c2d6240ced95d0e00003c');
    assert.equal('5my path', clone.nested.path);
    assert.equal(7, clone.nested.agePlus2);
    assert.equal('em virtual works', clone.em[0].works);

    // test toObject options
    doc.schema.options.toObject = { virtuals: true };
    clone = doc.toObject();
    assert.equal('test', clone.test);
    assert.ok(clone.oids instanceof Array);
    assert.equal(5, clone.nested.age);
    assert.equal(DocumentObjectId.toString(clone.nested.cool),'4c6c2d6240ced95d0e00003c');

    assert.equal('my path', clone.nested.path);
    assert.equal(7, clone.nested.agePlus2);
    assert.equal('asdf', clone.em[0].title);
    delete doc.schema.options.toObject;

    // minimize
    clone = doc.toObject({ minimize: true });
    assert.equal(undefined, clone.nested2);
    clone = doc.toObject({ minimize: false });
    assert.equal('Object', clone.nested2.constructor.name);
    assert.equal(1, Object.keys(clone.nested2).length);
    clone = doc.toObject('2');
    assert.equal(undefined, clone.nested2);

    doc.schema.options.toObject = { minimize: false };
    clone = doc.toObject();
    assert.equal('Object', clone.nested2.constructor.name);
    assert.equal(1, Object.keys(clone.nested2).length);
    delete doc.schema.options.toObject;

    doc.schema.options.minimize = false;
    clone = doc.toObject();
    assert.equal('Object', clone.nested2.constructor.name);
    assert.equal(1, Object.keys(clone.nested2).length);
    doc.schema.options.minimize = true;
    clone = doc.toObject();
    assert.equal(undefined, clone.nested2);
  })

  it('toJSON options', function(){
    var doc = new TestDocument();

    doc.init({
        test    : 'test'
      , oids    : []
      , em: [{title:'asdf'}]
      , nested  : {
            age   : 5
          , cool  : DocumentObjectId.fromString('4c6c2d6240ced95d0e00003c')
          , path  : 'my path'
        }
      , nested2: {}
    });

    // override to check if toJSON gets fired
    var path = TestDocument.prototype.schema.path('em');
    path.casterConstructor.prototype.toJSON = function () {
      return {};
    }

    doc.schema.options.toJSON = { virtuals: true };
    var clone = doc.toJSON();
    assert.equal('test', clone.test);
    assert.ok(clone.oids instanceof Array);
    assert.equal(5, clone.nested.age);
    assert.equal(DocumentObjectId.toString(clone.nested.cool),'4c6c2d6240ced95d0e00003c');
    assert.equal('my path', clone.nested.path);
    assert.equal(7, clone.nested.agePlus2);
    assert.equal('Object', clone.em[0].constructor.name);
    assert.equal(0, Object.keys(clone.em[0]).length);
    delete doc.schema.options.toJSON;
    delete path.casterConstructor.prototype.toJSON;

    doc.schema.options.toJSON = { minimize: false };
    clone = doc.toJSON();
    assert.equal('Object', clone.nested2.constructor.name);
    assert.equal(1, Object.keys(clone.nested2).length);
    clone = doc.toJSON('8');
    assert.equal('Object', clone.nested2.constructor.name);
    assert.equal(1, Object.keys(clone.nested2).length);

    // gh-852
    var arr = [doc]
      , err = false
      , str
    try {
      str = JSON.stringify(arr);
    } catch (_) { err = true; }
    assert.equal(false, err);
    assert.ok(/nested2/.test(str));
    assert.equal('Object', clone.nested2.constructor.name);
    assert.equal(1, Object.keys(clone.nested2).length);

    delete doc.schema.options.toJSON;
  });

  it('jsonifying an object', function(){
    var doc = new TestDocument({ test: 'woot' })
      , oidString = DocumentObjectId.toString(doc._id);

    // convert to json string
    var json = JSON.stringify(doc);

    // parse again
    var obj = JSON.parse(json);

    assert.equal('woot', obj.test);
    assert.equal(obj._id, oidString);
  });

  it('calling update on document should relay to its model (gh-794)', function(done){
    var db = start();
    var Docs = new Schema({text:String});
    var docs = db.model('docRelayUpdate', Docs);
    var d = new docs({text:'A doc'});
    var called = false;
    d.save(function () {
      var oldUpdate = docs.update;
      docs.update = function (query, operation) {
        assert.equal(1, Object.keys(query).length);
        assert.equal(query._id, d._id);
        assert.equal(1, Object.keys(operation).length);
        assert.equal(1, Object.keys(operation.$set).length);
        assert.equal(operation.$set.text, 'A changed doc');
        called = true;
        docs.update = oldUpdate;
        oldUpdate.apply(docs, arguments);
      };
      d.update({$set :{text: 'A changed doc'}}, function (err) {
        db.close();
        assert.ifError(err);
        assert.equal(true, called);
        done();
      });
    });

  });

  it('toObject should not set undefined values to null', function(){
    var doc = new TestDocument()
      , obj = doc.toObject();

    delete obj._id;
    assert.deepEqual(obj, { numbers: [], oids: [], em: [] });
  })

  describe('Errors', function(){
    it('MongooseErrors should be instances of Error (gh-209)', function(){
      var MongooseError = require('../lib/error')
        , err = new MongooseError("Some message");
      assert.ok(err instanceof Error);
    });
    it('ValidationErrors should be instances of Error', function(){
      var ValidationError = Document.ValidationError
        , err = new ValidationError(new TestDocument);
      assert.ok(err instanceof Error);
    });
  });

  it('methods on embedded docs should work', function(){
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
    db.close();

    var p = new P({ embed: [{name: 'peanut'}] });
    assert.equal('function', typeof p.embed[0].test);
    assert.equal('function', typeof E.ten);
    assert.equal('peanut butter', p.embed[0].test());
    assert.equal(10, E.ten());

    // test push casting
    p = new P;
    p.embed.push({name: 'apple'});
    assert.equal('function', typeof p.embed[0].test);
    assert.equal('function', typeof E.ten);
    assert.equal('apple butter', p.embed[0].test());
  });

  it('setting a positional path does not cast value to array', function(){
    var doc = new TestDocument;
    doc.init({ numbers: [1,3] });
    assert.equal(1, doc.numbers[0]);
    assert.equal(3, doc.numbers[1]);
    doc.set('numbers.1', 2);
    assert.equal(1, doc.numbers[0]);
    assert.equal(2, doc.numbers[1]);
  });

  it('no maxListeners warning should occur', function(){
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
    assert.equal(false, traced);
  });

  it('isSelected()', function(){
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

    assert.ok(doc.isSelected('_id'))
    assert.ok(doc.isSelected('test'))
    assert.ok(doc.isSelected('numbers'))
    assert.ok(doc.isSelected('oids')); // even if no data
    assert.ok(doc.isSelected('nested'));
    assert.ok(!doc.isSelected('nested.age'))
    assert.ok(!doc.isSelected('nested.cool'))
    assert.ok(!doc.isSelected('nested.path'))
    assert.ok(doc.isSelected('nested.deep'))
    assert.ok(!doc.isSelected('nested.nope'))
    assert.ok(doc.isSelected('nested.deep.x'));
    assert.ok(doc.isSelected('nested.deep.x.no'))
    assert.ok(doc.isSelected('nested.deep.y'))
    assert.ok(!doc.isSelected('noway'))
    assert.ok(!doc.isSelected('notapath'))
    assert.ok(!doc.isSelected('em'))
    assert.ok(!doc.isSelected('em.title'))
    assert.ok(!doc.isSelected('em.body'))
    assert.ok(!doc.isSelected('em.nonpath'))

    var selection = {
        'em.title': 1
    }

    doc = new TestDocument(undefined, selection);

    doc.init({
        em: [{ title: 'one' }]
    });

    assert.ok(doc.isSelected('_id'))
    assert.ok(!doc.isSelected('test'))
    assert.ok(!doc.isSelected('numbers'))
    assert.ok(!doc.isSelected('oids'))
    assert.ok(!doc.isSelected('nested'))
    assert.ok(!doc.isSelected('nested.age'))
    assert.ok(!doc.isSelected('nested.cool'))
    assert.ok(!doc.isSelected('nested.path'))
    assert.ok(!doc.isSelected('nested.deep'))
    assert.ok(!doc.isSelected('nested.nope'))
    assert.ok(!doc.isSelected('nested.deep.x'))
    assert.ok(!doc.isSelected('nested.deep.x.no'))
    assert.ok(!doc.isSelected('nested.deep.y'))
    assert.ok(!doc.isSelected('noway'))
    assert.ok(!doc.isSelected('notapath'))
    assert.ok(doc.isSelected('em'))
    assert.ok(doc.isSelected('em.title'))
    assert.ok(!doc.isSelected('em.body'))
    assert.ok(!doc.isSelected('em.nonpath'))

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

    assert.ok(doc.isSelected('_id'))
    assert.ok(doc.isSelected('test'))
    assert.ok(doc.isSelected('numbers'))
    assert.ok(doc.isSelected('oids'))
    assert.ok(doc.isSelected('nested'))
    assert.ok(doc.isSelected('nested.age'))
    assert.ok(doc.isSelected('nested.cool'))
    assert.ok(doc.isSelected('nested.path'))
    assert.ok(doc.isSelected('nested.deep'))
    assert.ok(doc.isSelected('nested.nope'))
    assert.ok(doc.isSelected('nested.deep.x'))
    assert.ok(doc.isSelected('nested.deep.x.no'))
    assert.ok(doc.isSelected('nested.deep.y'))
    assert.ok(doc.isSelected('noway'))
    assert.ok(doc.isSelected('notapath'));
    assert.ok(!doc.isSelected('em'));
    assert.ok(!doc.isSelected('em.title'));
    assert.ok(!doc.isSelected('em.body'));
    assert.ok(!doc.isSelected('em.nonpath'));

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

    assert.ok(!doc.isSelected('_id'))
    assert.ok(doc.isSelected('nested.deep.x.no'));

    doc = new TestDocument({ test: 'boom' });
    assert.ok(doc.isSelected('_id'))
    assert.ok(doc.isSelected('test'))
    assert.ok(doc.isSelected('numbers'))
    assert.ok(doc.isSelected('oids'))
    assert.ok(doc.isSelected('nested'))
    assert.ok(doc.isSelected('nested.age'))
    assert.ok(doc.isSelected('nested.cool'))
    assert.ok(doc.isSelected('nested.path'))
    assert.ok(doc.isSelected('nested.deep'))
    assert.ok(doc.isSelected('nested.nope'))
    assert.ok(doc.isSelected('nested.deep.x'))
    assert.ok(doc.isSelected('nested.deep.x.no'))
    assert.ok(doc.isSelected('nested.deep.y'))
    assert.ok(doc.isSelected('noway'))
    assert.ok(doc.isSelected('notapath'))
    assert.ok(doc.isSelected('em'))
    assert.ok(doc.isSelected('em.title'))
    assert.ok(doc.isSelected('em.body'))
    assert.ok(doc.isSelected('em.nonpath'));

    var selection = {
        '_id': 1
    }

    doc = new TestDocument(undefined, selection);
    doc.init({ _id: 'test' });

    assert.ok(doc.isSelected('_id'));
    assert.ok(!doc.isSelected('test'));

    doc = new TestDocument({ test: 'boom' }, true);
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
  })

  it('unselected required fields should pass validation', function(){
    var db = start()
      , Tschema = new Schema({ name: String, req: { type: String, required: true }})
      , T = db.model('unselectedRequiredFieldValidation', Tschema);

    var t = new T({ name: 'teeee', req: 'i am required' });
    t.save(function (err) {
      assert.ifError(err);
      T.findById(t).select('name').exec(function (err, t) {
        assert.ifError(err);
        assert.equal(undefined, t.req);
        t.name = 'wooo';
        t.save(function (err) {
          assert.ifError(err);

          T.findById(t).select('name').exec(function (err, t) {
            assert.ifError(err);
            t.req = undefined;
            t.save(function (err) {
              err = String(err);
              var invalid  = /Validator "required" failed for path req/.test(err);
              assert.ok(invalid);
              t.req = 'it works again'
              t.save(function (err) {
                assert.ifError(err);

                T.findById(t).select('_id').exec(function (err, t) {
                  assert.ifError(err);
                  t.save(function (err) {
                    db.close();
                    assert.ifError(err);
                  });
                });
              });
            });
          });
        });
      });
    });
  })

  it('#validate (gh-891)', function(done){
    var db = start()
      , schema = null
      , called = false

    var validate = [function(str){ called = true; return true }, 'BAM'];

    schema = new Schema({
        prop: { type: String, required: true, validate: validate }
      , nick: { type: String, required: true }
    });

    var M = db.model('validateSchema', schema, 'validateschema_'+random());
    var m = new M({ prop: 'gh891', nick: 'validation test' });
    m.save(function (err) {
      assert.ifError(err);
      assert.equal(true, called);
      called = false;
      M.findById(m, 'nick', function (err, m) {
        assert.equal(false, called);
        assert.ifError(err);
        m.nick = 'gh-891';
        m.save(function (err) {
          assert.equal(false, called);
          assert.ifError(err);
          done();
        })
      })
    })
  })

  it('#invalidate', function(done){
    var db = start()
      , InvalidateSchema = null
      , Post = null
      , post = null;

    InvalidateSchema = new Schema({
      prop: { type: String },
    }, { strict: false });

    mongoose.model('InvalidateSchema', InvalidateSchema);

    Post = db.model('InvalidateSchema');
    post = new Post();
    post.set({baz: 'val'});
    post.invalidate('baz', 'reason');

    post.save(function(err){
      assert.ok(err instanceof MongooseError);
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errors.baz instanceof ValidatorError);
      assert.equal(err.errors.baz.message,'Validator "reason" failed for path baz');
      assert.equal(err.errors.baz.type,'reason');
      assert.equal(err.errors.baz.path,'baz');

      post.save(function(err){
        db.close();
        assert.strictEqual(err, null);
        done();
      });
    });
  });

  describe('#equals', function(){
    describe('should work', function(){
      var db = start();
      var S = db.model('equals-S', new Schema({ _id: String }));
      var N = db.model('equals-N', new Schema({ _id: Number }));
      var O = db.model('equals-O', new Schema({ _id: Schema.ObjectId }));

      it('with string _ids', function(){
        var s1 = new S({ _id: 'one' });
        var s2 = new S({ _id: 'one' });
        assert.ok(s1.equals(s2));
      })
      it('with number _ids', function(){
        var n1 = new N({ _id: 0 });
        var n2 = new N({ _id: 0 });
        assert.ok(n1.equals(n2));
      })
      it('with ObjectId _ids', function(){
        var id = new mongoose.Types.ObjectId;
        var o1 = new O({ _id: id });
        var o2 = new O({ _id: id });
        assert.ok(o1.equals(o2));

        id = String(new mongoose.Types.ObjectId);
        o1 = new O({ _id: id });
        o2 = new O({ _id: id });
        assert.ok(o1.equals(o2));
      })

      after(function () {
        db.close();
      })
    })
  })

  describe('setter', function(){
    describe('order', function(){
      it('is applied correctly', function(){
        var date = 'Thu Aug 16 2012 09:45:59 GMT-0700 (PDT)';
        var d = new TestDocument();
        dateSetterCalled = false;
        d.date = date;
        assert.ok(dateSetterCalled);
        dateSetterCalled = false;
        assert.ok(d._doc.date instanceof Date);
        assert.ok(d.date instanceof Date);
        assert.equal(d.date.toString(), date);
        assert.equal(+d.date, +new Date(date));
      })
    })

    describe('on nested paths', function(){
      describe('using set(path, object)', function(){
        it('overwrites the entire object', function(){
          var doc = new TestDocument();

          doc.init({
              test    : 'Test'
            , nested  : {
                  age   : 5
              }
          });

          doc.set('nested', { path: 'overwrite the entire nested object' });
          assert.equal(undefined, doc.nested.age);
          assert.equal(1, Object.keys(doc._doc.nested).length);
          assert.equal('overwrite the entire nested object', doc.nested.path);
          assert.ok(doc.isModified('nested'));

          // vs merging using doc.set(object)
          doc.set({ test: 'Test', nested: { age: 4 }});
          assert.equal('4overwrite the entire nested object', doc.nested.path);
          assert.equal(4, doc.nested.age);
          assert.equal(2, Object.keys(doc._doc.nested).length);
          assert.ok(doc.isModified('nested'));

          var doc = new TestDocument();
          doc.init({
              test    : 'Test'
            , nested  : {
                  age   : 5
              }
          });

          doc.set({ test: 'Test', nested: { age: 5 }});
          assert.ok(!doc.isModified());
          assert.ok(!doc.isModified('test'));
          assert.ok(!doc.isModified('nested'));
          assert.ok(!doc.isModified('nested.age'));

          doc.nested = { path: 'overwrite the entire nested object', age: 5 };
          assert.equal(5, doc.nested.age);
          assert.equal(2, Object.keys(doc._doc.nested).length);
          assert.equal('5overwrite the entire nested object', doc.nested.path);
          assert.ok(doc.isModified('nested'));

          doc.nested.deep = { x: 'Hank and Marie' };
          assert.equal(3, Object.keys(doc._doc.nested).length);
          assert.equal('5overwrite the entire nested object', doc.nested.path);
          assert.ok(doc.isModified('nested'));
          assert.equal('Hank and Marie', doc.nested.deep.x);

          var doc = new TestDocument();
          doc.init({
              test    : 'Test'
            , nested  : {
                  age   : 5
              }
          });

          doc.set('nested.deep', { x: 'Hank and Marie' });
          assert.equal(2, Object.keys(doc._doc.nested).length);
          assert.equal(1, Object.keys(doc._doc.nested.deep).length);
          assert.ok(doc.isModified('nested'));
          assert.ok(!doc.isModified('nested.path'));
          assert.ok(!doc.isModified('nested.age'));
          assert.ok(doc.isModified('nested.deep'));
          assert.equal('Hank and Marie', doc.nested.deep.x);
        })
      })
    })

  })
})
