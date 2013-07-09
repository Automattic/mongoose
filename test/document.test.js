
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
  , MongooseError = mongoose.Error
  , Query = require('../lib/mongoosequery');

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
TestDocument.prototype.$__setSchema(schema);

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

describe('document', function(){

  describe('shortcut getters', function(){
    it('return undefined for properties with a null/undefined parent object (gh-1326)', function(done){
      var doc = new TestDocument;
      doc.init({ nested: null });
      assert.strictEqual(undefined, doc.nested.age);
      done();
    })

    it('work', function(done){
      var doc = new TestDocument();
      doc.init({
          test    : 'test'
        , oids    : []
        , nested  : {
              age   : 5
            , cool  : DocumentObjectId.createFromHexString('4c6c2d6240ced95d0e00003c')
            , path  : 'my path'
          }
      });

      assert.equal('test', doc.test);
      assert.ok(doc.oids instanceof Array);
      assert.equal(doc.nested.age, 5);
      assert.equal(String(doc.nested.cool), '4c6c2d6240ced95d0e00003c');
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
            , cool  : DocumentObjectId.createFromHexString('4cf70857337498f95900001c')
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

      assert.equal(String(doc2.nested.cool), '4cf70857337498f95900001c');

      assert.ok(doc.oids !== doc2.oids);
      done();
    });
  })

  it('test shortcut setters', function(done){
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
    done();
  });

  it('test accessor of id', function(done){
    var doc = new TestDocument();
    assert.ok(doc._id instanceof DocumentObjectId);
    done();
  });

  it('test shortcut of id hexString', function(done){
    var doc = new TestDocument()
      , _id = doc._id.toString();
    assert.equal('string', typeof doc.id);
    done();
  });

  it('test toObject clone', function(done){
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
    done();
  });

  it('toObject options', function(done){
    var doc = new TestDocument();

    doc.init({
        test    : 'test'
      , oids    : []
      , em: [{title:'asdf'}]
      , nested  : {
            age   : 5
          , cool  : DocumentObjectId.createFromHexString('4c6c2d6240ced95d0e00003c')
          , path  : 'my path'
        }
      , nested2: {}
    });

    var clone = doc.toObject({ getters: true, virtuals: false });

    assert.equal(clone.test, 'test');
    assert.ok(clone.oids instanceof Array);
    assert.equal(5, clone.nested.age);
    assert.equal(clone.nested.cool.toString(), '4c6c2d6240ced95d0e00003c');
    assert.equal('5my path', clone.nested.path);
    assert.equal(undefined, clone.nested.agePlus2);
    assert.equal(undefined, clone.em[0].works);

    clone = doc.toObject({ virtuals: true });

    assert.equal('test', clone.test);
    assert.ok(clone.oids instanceof Array);
    assert.equal(5, clone.nested.age);
    assert.equal(clone.nested.cool.toString(), '4c6c2d6240ced95d0e00003c');
    assert.equal('my path', clone.nested.path);
    assert.equal(7, clone.nested.agePlus2);
    assert.equal(clone.em[0].works, 'em virtual works');

    clone = doc.toObject({ getters: true });

    assert.equal('test', clone.test);
    assert.ok(clone.oids instanceof Array);
    assert.equal(5, clone.nested.age);
    assert.equal(clone.nested.cool.toString(),'4c6c2d6240ced95d0e00003c');
    assert.equal('5my path', clone.nested.path);
    assert.equal(7, clone.nested.agePlus2);
    assert.equal('em virtual works', clone.em[0].works);

    // test toObject options
    doc.schema.options.toObject = { virtuals: true };
    clone = doc.toObject();
    assert.equal('test', clone.test);
    assert.ok(clone.oids instanceof Array);
    assert.equal(5, clone.nested.age);
    assert.equal(clone.nested.cool.toString(),'4c6c2d6240ced95d0e00003c');

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

    // transform
    doc.schema.options.toObject = {};
    doc.schema.options.toObject.transform = function xform (doc, ret, options) {

      if ('function' == typeof doc.ownerDocument)
        // ignore embedded docs
        return;

      delete ret.em;
      delete ret.numbers;
      delete ret.oids;
      ret._id = ret._id.toString();
    }

    clone = doc.toObject();
    assert.equal(doc.id, clone._id);
    assert.ok(undefined === clone.em);
    assert.ok(undefined === clone.numbers);
    assert.ok(undefined === clone.oids);
    assert.equal('test', clone.test);
    assert.equal(5, clone.nested.age);

    // transform with return value
    var out = { myid: doc._id.toString() }
    doc.schema.options.toObject.transform = function (doc, ret, options) {
      if ('function' == typeof doc.ownerDocument)
        // ignore embedded docs
        return;

      return { myid: ret._id.toString() }
    }

    clone = doc.toObject();
    assert.deepEqual(out, clone);

    // ignored transform with inline options
    clone = doc.toObject({ x: 1 });
    assert.ok(!('myid' in clone));
    assert.equal('test', clone.test);
    assert.ok(clone.oids instanceof Array);
    assert.equal(5, clone.nested.age);
    assert.equal(clone.nested.cool.toString(),'4c6c2d6240ced95d0e00003c');
    assert.equal('my path', clone.nested.path);
    assert.equal('Object', clone.em[0].constructor.name);

    // applied transform when inline transform is true
    clone = doc.toObject({ x: 1, transform: true });
    assert.deepEqual(out, clone);

    // transform passed inline
    function xform (self, doc, opts) {
      opts.fields.split(' ').forEach(function (field) {
        delete doc[field];
      });
    }
    clone = doc.toObject({
        transform: xform
      , fields: '_id em numbers oids nested'
    });
    assert.equal('test', doc.test);
    assert.ok(undefined === clone.em);
    assert.ok(undefined === clone.numbers);
    assert.ok(undefined === clone.oids);
    assert.ok(undefined === clone._id);
    assert.ok(undefined === clone.nested);

    // all done
    delete doc.schema.options.toObject;
    done();
  })

  it('toJSON options', function(done){
    var doc = new TestDocument();

    doc.init({
        test    : 'test'
      , oids    : []
      , em: [{title:'asdf'}]
      , nested  : {
            age   : 5
          , cool  : DocumentObjectId.createFromHexString('4c6c2d6240ced95d0e00003c')
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
    assert.equal(clone.nested.cool.toString(),'4c6c2d6240ced95d0e00003c');
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

    // transform
    doc.schema.options.toJSON = {};
    doc.schema.options.toJSON.transform = function xform (doc, ret, options) {
      if ('function' == typeof doc.ownerDocument)
        // ignore embedded docs
        return;

      delete ret.em;
      delete ret.numbers;
      delete ret.oids;
      ret._id = ret._id.toString();
    }

    clone = doc.toJSON();
    assert.equal(doc.id, clone._id);
    assert.ok(undefined === clone.em);
    assert.ok(undefined === clone.numbers);
    assert.ok(undefined === clone.oids);
    assert.equal('test', clone.test);
    assert.equal(5, clone.nested.age);

    // transform with return value
    var out = { myid: doc._id.toString() }
    doc.schema.options.toJSON.transform = function (doc, ret, options) {
      if ('function' == typeof doc.ownerDocument)
        // ignore embedded docs
        return;

      return { myid: ret._id.toString() }
    }

    clone = doc.toJSON();
    assert.deepEqual(out, clone);

    // ignored transform with inline options
    clone = doc.toJSON({ x: 1 });
    assert.ok(!('myid' in clone));
    assert.equal('test', clone.test);
    assert.ok(clone.oids instanceof Array);
    assert.equal(5, clone.nested.age);
    assert.equal(clone.nested.cool.toString(),'4c6c2d6240ced95d0e00003c');
    assert.equal('my path', clone.nested.path);
    assert.equal('Object', clone.em[0].constructor.name);

    // applied transform when inline transform is true
    clone = doc.toJSON({ x: 1, transform: true });
    assert.deepEqual(out, clone);

    // transform passed inline
    function xform (self, doc, opts) {
      opts.fields.split(' ').forEach(function (field) {
        delete doc[field];
      });
    }
    clone = doc.toJSON({
        transform: xform
      , fields: '_id em numbers oids nested'
    });
    assert.equal('test', doc.test);
    assert.ok(undefined === clone.em);
    assert.ok(undefined === clone.numbers);
    assert.ok(undefined === clone.oids);
    assert.ok(undefined === clone._id);
    assert.ok(undefined === clone.nested);
    assert.ok(undefined === clone.myid);

    // all done
    delete doc.schema.options.toJSON;
    done();
  });

  it('jsonifying an object', function(done){
    var doc = new TestDocument({ test: 'woot' })
      , oidString = doc._id.toString();

    // convert to json string
    var json = JSON.stringify(doc);

    // parse again
    var obj = JSON.parse(json);

    assert.equal('woot', obj.test);
    assert.equal(obj._id, oidString);
    done();
  });

  describe('#update', function(){
    it('returns a Query', function(done){
      var mg = new mongoose.Mongoose;
      var M = mg.model('doc#update', { s: String });
      var doc = new M;
      assert.ok(doc.update() instanceof Query);
      done();
    })
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
  })

  it('toObject should not set undefined values to null', function(done){
    var doc = new TestDocument()
      , obj = doc.toObject();

    delete obj._id;
    assert.deepEqual(obj, { numbers: [], oids: [], em: [] });
    done();
  })

  describe('Errors', function(){
    it('MongooseErrors should be instances of Error (gh-209)', function(done){
      var MongooseError = require('../lib/error')
        , err = new MongooseError("Some message");
      assert.ok(err instanceof Error);
      done();
    });
    it('ValidationErrors should be instances of Error', function(done){
      var ValidationError = Document.ValidationError
        , err = new ValidationError(new TestDocument);
      assert.ok(err instanceof Error);
      done();
    });
  });

  it('methods on embedded docs should work', function(done){
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
    done();
  });

  it('setting a positional path does not cast value to array', function(done){
    var doc = new TestDocument;
    doc.init({ numbers: [1,3] });
    assert.equal(1, doc.numbers[0]);
    assert.equal(3, doc.numbers[1]);
    doc.set('numbers.1', 2);
    assert.equal(1, doc.numbers[0]);
    assert.equal(2, doc.numbers[1]);
    done();
  });

  it('no maxListeners warning should occur', function(done){
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
    done();
  });

  it('unselected required fields should pass validation', function(done){
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
    done();
  })

  describe('#validate', function(){
    var collection = 'validateschema_'+random();

    it('works (gh-891)', function(done){
      var db = start()
        , schema = null
        , called = false

      var validate = [function(str){ called = true; return true }, 'BAM'];

      schema = new Schema({
          prop: { type: String, required: true, validate: validate }
        , nick: { type: String, required: true }
      });

      var M = db.model('validateSchema', schema, collection);
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

    describe('works on arrays', function(){
      var db;
      before(function(done){
        db = start()
        done();
      })
      after(function(done){
        db.close(done)
      })

      it('with required', function(done){
        var schema = new Schema({
            name: String
          , arr : { type: [], required: true}
        });
        var M = db.model('validateSchema-array1', schema, collection);
        var m = new M({ name: 'gh1109-1' });
        m.save(function (err) {
          assert.ok(/"required" failed for path arr/.test(err));
          m.arr = [];
          m.save(function (err) {
            assert.ok(/"required" failed for path arr/.test(err));
            m.arr.push('works');
            m.save(function (err) {
              assert.ifError(err);
              done();
            })
          })
        })
      })

      it('with custom validator', function(done){
        var called = false;

        function validator (val) {
          called = true;
          return val && val.length > 1
        }

        var validate = [validator, 'BAM'];

        var schema = new Schema({
            arr : { type: [], validate: validate }
        });

        var M = db.model('validateSchema-array2', schema, collection);
        var m = new M({ name: 'gh1109-2', arr: [1] });
        assert.equal(false, called);
        m.save(function (err) {
          assert.ok(/"BAM" failed for path arr/.test(err));
          assert.equal(true, called);
          m.arr.push(2);
          called = false;
          m.save(function (err) {
            assert.equal(true, called);
            assert.ifError(err);
            done()
          })
        })
      })

      it('with both required + custom validator', function(done){
        function validator (val) {
          called = true;
          return val && val.length > 1
        }

        var validate = [validator, 'BAM'];

        var called = false;

        var schema = new Schema({
          arr : { type: [], required: true, validate: validate }
        });

        var M = db.model('validateSchema-array3', schema, collection);
        var m = new M({ name: 'gh1109-3' });
        m.save(function (err) {
          assert.ok(/"required" failed for path arr/.test(err));
          m.arr.push({nice: true});
          m.save(function (err) {
            assert.ok(/"BAM" failed for path arr/.test(err));
            m.arr.push(95);
            m.save(function (err) {
              assert.ifError(err);
              done()
            })
          })
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
      var B = db.model('equals-B', new Schema({ _id: Buffer }));

      it('with string _ids', function(done){
        var s1 = new S({ _id: 'one' });
        var s2 = new S({ _id: 'one' });
        assert.ok(s1.equals(s2));
        done();
      })
      it('with number _ids', function(done){
        var n1 = new N({ _id: 0 });
        var n2 = new N({ _id: 0 });
        assert.ok(n1.equals(n2));
        done();
      })
      it('with ObjectId _ids', function(done){
        var id = new mongoose.Types.ObjectId;
        var o1 = new O({ _id: id });
        var o2 = new O({ _id: id });
        assert.ok(o1.equals(o2));

        id = String(new mongoose.Types.ObjectId);
        o1 = new O({ _id: id });
        o2 = new O({ _id: id });
        assert.ok(o1.equals(o2));
        done();
      })
      it('with Buffer _ids', function(done){
        var n1 = new B({ _id: 0 });
        var n2 = new B({ _id: 0 });
        assert.ok(n1.equals(n2));
        done();
      })

      after(function () {
        db.close();
      })
    })
  })

  describe('setter', function(){
    describe('order', function(){
      it('is applied correctly', function(done){
        var date = 'Thu Aug 16 2012 09:45:59 GMT-0700';
        var d = new TestDocument();
        dateSetterCalled = false;
        d.date = date;
        assert.ok(dateSetterCalled);
        dateSetterCalled = false;
        assert.ok(d._doc.date instanceof Date);
        assert.ok(d.date instanceof Date);
        assert.equal(+d.date, +new Date(date));
        done();
      })
    })

    describe('on nested paths', function(){
      describe('using set(path, object)', function(){
        it('overwrites the entire object', function(done){
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

          // vs merging using doc.set(path, object, {merge: true})
          doc.set('nested', { path: 'did not overwrite the nested object' }, {merge: true});
          assert.equal('5did not overwrite the nested object', doc.nested.path);
          assert.equal(5, doc.nested.age);
          assert.equal(3, Object.keys(doc._doc.nested).length);
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
          done();
        })
      })

      describe('when overwriting with a document instance', function(){
        it('does not cause StackOverflows (gh-1234)', function(done){
          var doc = new TestDocument({ nested: { age: 35 }});
          doc.nested = doc.nested;
          assert.doesNotThrow(function () {
            doc.nested.age;
          });
          done();
        })
      })
    })

  })

  describe('virtual', function(){
    describe('setter', function(){
      var val;
      var M;

      before(function(done){
        var schema = new mongoose.Schema({ v: Number });
        schema.virtual('thang').set(function (v) {
          val = v;
        });

        var db = start();
        M = db.model('gh-1154', schema);
        db.close();
        done();
      })

      it('works with objects', function(done){
        var m = new M({ thang: {}});
        assert.deepEqual({}, val);
        done();
      })
      it('works with arrays', function(done){
        var m = new M({ thang: []});
        assert.deepEqual([], val);
        done();
      })
      it('works with numbers', function(done){
        var m = new M({ thang: 4});
        assert.deepEqual(4, val);
        done();
      })
      it('works with strings', function(done){
        var m = new M({ thang: '3'});
        assert.deepEqual('3', val);
        done();
      })
    })
  })
})
