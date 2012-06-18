
/**
 * Test dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , random = require('../lib/utils').random
  , Query = require('../lib/query')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , CastError = SchemaType.CastError
  , ValidatorError = SchemaType.ValidatorError
  , ValidationError = mongoose.Document.ValidationError
  , ObjectId = Schema.ObjectId
  , DocumentObjectId = mongoose.Types.ObjectId
  , DocumentArray = mongoose.Types.DocumentArray
  , EmbeddedDocument = mongoose.Types.Embedded
  , MongooseNumber = mongoose.Types.Number
  , MongooseArray = mongoose.Types.Array
  , MongooseError = mongoose.Error;

describe('document: strict mode:', function(){
  it('should work', function(done){
    var db = start();

    var lax = new Schema({
        ts  : { type: Date, default: Date.now }
      , content: String
    });

    var strict = new Schema({
        ts  : { type: Date, default: Date.now }
      , content: String
    }, { strict: true });

    var Lax = db.model('Lax', lax);
    var Strict = db.model('Strict', strict);

    var l = new Lax({content: 'sample', rouge: 'data'});
    assert.equal(false, l._strictMode);
    l = l.toObject();
    assert.equal('sample', l.content);
    assert.equal('data', l.rouge);

    var s = new Strict({content: 'sample', rouge: 'data'});
    assert.equal(true, s._strictMode);
    s = s.toObject();
    assert.ok('ts' in s);
    assert.equal('sample', s.content);
    assert.ok(!('rouge' in s));
    assert.ok(!s.rouge);

    // instance override
    var instance = new Lax({content: 'sample', rouge: 'data'}, true);
    assert.ok(instance._strictMode);
    instance = instance.toObject();
    assert.equal('sample', instance.content);
    assert.ok(!instance.rouge);
    assert.ok('ts' in instance);

    // hydrate works as normal, but supports the schema level flag.
    var s2 = new Strict({content: 'sample', rouge: 'data'}, false);
    assert.equal(false, s2._strictMode);
    s2 = s2.toObject();
    assert.ok('ts' in s2);
    assert.equal('sample', s2.content);
    assert.ok('rouge' in s2);

    // testing init
    var s3 = new Strict();
    s3.init({content: 'sample', rouge: 'data'});
    var s3obj = s3.toObject();
    assert.equal('sample', s3.content);
    assert.ok(!('rouge' in s3));
    assert.ok(!s3.rouge);

    // strict on create
    Strict.create({content: 'sample2', rouge: 'data'}, function(err, doc){
      db.close();
      assert.equal('sample2', doc.content);
      assert.ok(!('rouge' in doc));
      assert.ok(!doc.rouge);
      done();
    });
  })
  it('nested doc', function(){
    var db = start();

    var lax = new Schema({
        name: { last: String }
    });

    var strict = new Schema({
        name: { last: String }
    }, { strict: true });

    var Lax = db.model('NestedLax', lax, 'nestdoc'+random());
    var Strict = db.model('NestedStrict', strict, 'nestdoc'+random());

    db.close();

    var l = new Lax;
    l.set('name', { last: 'goose', hack: 'xx' });
    l = l.toObject();
    assert.equal('goose', l.name.last);
    assert.equal('xx', l.name.hack);

    var s = new Strict;
    s.set({ name: { last: 'goose', hack: 'xx' }});
    s = s.toObject();
    assert.equal('goose', s.name.last);
    assert.ok(!('hack' in s.name));
    assert.ok(!s.name.hack);

    s = new Strict;
    s.set('name', { last: 'goose', hack: 'xx' });
    s.set('shouldnt.exist', ':(');
    s = s.toObject();
    assert.equal('goose', s.name.last);
    assert.ok(!('hack' in s.name));
    assert.ok(!s.name.hack);
    assert.ok(!s.shouldnt);
  })
  it('sub doc', function(done){
    var db = start();

    var lax = new Schema({
        ts  : { type: Date, default: Date.now }
      , content: String
    });

    var strict = new Schema({
        ts  : { type: Date, default: Date.now }
      , content: String
    }, { strict: true });

    var Lax = db.model('EmbeddedLax', new Schema({ dox: [lax] }), 'embdoc'+random());
    var Strict = db.model('EmbeddedStrict', new Schema({ dox: [strict] }), 'embdoc'+random());

    var l = new Lax({ dox: [{content: 'sample', rouge: 'data'}] });
    assert.equal(false, l.dox[0]._strictMode);
    l = l.dox[0].toObject();
    assert.equal('sample', l.content);
    assert.equal('data', l.rouge);
    assert.ok(l.rouge);

    var s = new Strict({ dox: [{content: 'sample', rouge: 'data'}] });
    assert.equal(true, s.dox[0]._strictMode);
    s = s.dox[0].toObject();
    assert.ok('ts' in s);
    assert.equal('sample', s.content);
    assert.ok(!('rouge' in s));
    assert.ok(!s.rouge);

    // testing init
    var s3 = new Strict();
    s3.init({dox: [{content: 'sample', rouge: 'data'}]});
    var s3obj = s3.toObject();
    assert.equal('sample', s3.dox[0].content);
    assert.ok(!('rouge' in s3.dox[0]));
    assert.ok(!s3.dox[0].rouge);

    // strict on create
    Strict.create({dox:[{content: 'sample2', rouge: 'data'}]}, function(err, doc){
      db.close();
      assert.equal('sample2', doc.dox[0].content);
      assert.ok(!('rouge' in doc.dox[0]));
      assert.ok(!doc.dox[0].rouge);
      done();
    });
  })

  it('virtuals', function(){
    var db = start();

    var getCount = 0
      , setCount = 0;

    var strictSchema = new Schema({
        email: String
      , prop: String
    }, {strict: true});

    strictSchema
    .virtual('myvirtual')
    .get(function() {
      getCount++;
      return 'ok';
    })
    .set(function(v) {
      setCount++;
      this.prop = v;
    });

    var StrictModel = db.model('StrictVirtual', strictSchema);

    var strictInstance = new StrictModel({
        email: 'hunter@skookum.com'
      , myvirtual: 'test'
    });

    db.close();
    assert.equal(0, getCount);
    assert.equal(1, setCount);

    strictInstance.myvirtual = 'anotherone';
    var myvirtual = strictInstance.myvirtual;

    assert.equal(1, getCount);
    assert.equal(2, setCount);
  })
})
