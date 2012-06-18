
/**
 * Module dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , Schema = mongoose.Schema
  , Document = mongoose.Document
  , SchemaType = mongoose.SchemaType
  , VirtualType = mongoose.VirtualType
  , ObjectId = Schema.ObjectId
  , ValidatorError = SchemaType.ValidatorError
  , CastError = SchemaType.CastError
  , SchemaTypes = Schema.Types
  , DocumentObjectId = mongoose.Types.ObjectId
  , Mixed = SchemaTypes.Mixed
  , MongooseNumber = mongoose.Types.Number
  , MongooseArray = mongoose.Types.Array
  , vm = require('vm')

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
});

/**
 * Test.
 */

describe('schema', function(){
  it('supports different schematypes', function(){
    var Checkin = new Schema({
        date      : Date 
      , location  : {
            lat: Number
          , lng: Number
        }
    });

    var Ferret = new Schema({
        name      : String
      , owner     : ObjectId
      , fur       : String
      , color     : { type: String }
      , age       : Number
      , checkins  : [Checkin]
      , friends   : [ObjectId]
      , likes     : Array
      , alive     : Boolean
      , extra     : Mixed
    });

    assert.ok(Ferret.path('name') instanceof SchemaTypes.String);
    assert.ok(Ferret.path('owner') instanceof SchemaTypes.ObjectId);
    assert.ok(Ferret.path('fur') instanceof SchemaTypes.String);
    assert.ok(Ferret.path('color') instanceof SchemaTypes.String);
    assert.ok(Ferret.path('age') instanceof SchemaTypes.Number);
    assert.ok(Ferret.path('checkins') instanceof SchemaTypes.DocumentArray);
    assert.ok(Ferret.path('friends') instanceof SchemaTypes.Array);
    assert.ok(Ferret.path('likes') instanceof SchemaTypes.Array);
    assert.ok(Ferret.path('alive') instanceof SchemaTypes.Boolean);
    assert.ok(Ferret.path('extra') instanceof SchemaTypes.Mixed);

    assert.strictEqual(Ferret.path('unexistent'), undefined);

    assert.ok(Checkin.path('date') instanceof SchemaTypes.Date);
  });

  it('supports dot notation for path accessors', function(){
    var Racoon = new Schema({
        name  : { type: String, enum: ['Edwald', 'Tobi'] }
      , age   : Number
    });

    var Person = new Schema({
        name      : String
      , raccoons  : [Racoon]
      , location  : {
            city  : String
          , state : String
        }
    });

    assert.ok(Person.path('name') instanceof SchemaTypes.String);
    assert.ok(Person.path('raccoons') instanceof SchemaTypes.DocumentArray);
    assert.ok(Person.path('location.city') instanceof SchemaTypes.String);
    assert.ok(Person.path('location.state') instanceof SchemaTypes.String);

    assert.strictEqual(Person.path('location.unexistent'), undefined);
  })

  it('allows paths nested > 2 levels', function(){
    var Nested = new Schema({
      first: {
        second: {
          third: String
        }
      }
    });
    assert.ok(Nested.path('first.second.third') instanceof SchemaTypes.String);
  });

  it('default definition', function(){
    var Test = new Schema({
        simple    : { type: String, default: 'a' }
      , array     : { type: Array, default: [1,2,3,4,5] }
      , arrayX    : { type: Array, default: 9 }
      , arrayFn   : { type: Array, default: function () { return [8] } }
      , callback  : { type: Number, default: function(){
          assert.equal('b', this.a);
          return '3';
        }}
    });

    assert.equal(Test.path('simple').defaultValue, 'a');
    assert.equal(typeof Test.path('callback').defaultValue, 'function');

    assert.equal(Test.path('simple').getDefault(), 'a');
    assert.equal((+Test.path('callback').getDefault({ a: 'b' })), 3);
    assert.equal(typeof Test.path('array').defaultValue, 'function');
    assert.equal(Test.path('array').getDefault(new TestDocument)[3], 4);
    assert.equal(Test.path('arrayX').getDefault(new TestDocument)[0], 9);
    assert.equal(typeof Test.path('arrayFn').defaultValue, 'function');
    assert.ok(Test.path('arrayFn').getDefault(new TestDocument) instanceof MongooseArray);
  })

  it('Mixed defaults can be empty arrays', function(){
    var Test = new Schema({
        mixed1    : { type: Mixed, default: [] }
      , mixed2    : { type: Mixed, default: Array }
    });

    assert.ok(Test.path('mixed1').getDefault() instanceof Array);
    assert.equal(Test.path('mixed1').getDefault().length, 0);
    assert.ok(Test.path('mixed2').getDefault() instanceof Array);
    assert.equal(Test.path('mixed2').getDefault().length, 0);
  })


  describe('validation', function(){
    it('string required', function(){
      var Test = new Schema({
          simple: String
      });

      Test.path('simple').required(true);
      assert.equal(Test.path('simple').validators.length, 1);

      Test.path('simple').doValidate(null, function(err){
        assert.ok(err instanceof ValidatorError);
      });

      Test.path('simple').doValidate(undefined, function(err){
        assert.ok(err instanceof ValidatorError);
      });

      Test.path('simple').doValidate('', function(err){
        assert.ok(err instanceof ValidatorError);
      });

      Test.path('simple').doValidate('woot', function(err){
        assert.ifError(err);
      });
    });

    it('string enum', function(){
      var Test = new Schema({
          complex: { type: String, enum: ['a', 'b', undefined, 'c', null] }
      });

      assert.ok(Test.path('complex') instanceof SchemaTypes.String);
      assert.deepEqual(Test.path('complex').enumValues,['a', 'b', 'c', null]);
      assert.equal(Test.path('complex').validators.length, 1)

      Test.path('complex').enum('d', 'e');

      assert.deepEqual(Test.path('complex').enumValues, ['a', 'b', 'c', null, 'd', 'e']);

      Test.path('complex').doValidate('x', function(err){
        assert.ok(err instanceof ValidatorError);
      });

      // allow unsetting enums
      Test.path('complex').doValidate(undefined, function(err){
        assert.ok(err instanceof ValidatorError);
      });

      Test.path('complex').doValidate(null, function(err){
        assert.ifError(err);
      });

      Test.path('complex').doValidate('da', function(err){
        assert.ok(err instanceof ValidatorError);
      })
    })

    it('string regexp', function(){
      var Test = new Schema({
          simple: { type: String, match: /[a-z]/ }
      });

      assert.equal(1, Test.path('simple').validators.length);

      Test.path('simple').doValidate('az', function(err){
        assert.ifError(err);
      });

      Test.path('simple').match(/[0-9]/);
      assert.equal(2, Test.path('simple').validators.length);

      Test.path('simple').doValidate('12', function(err){
        assert.ok(err instanceof ValidatorError);
      });

      Test.path('simple').doValidate('a12', function(err){
        assert.ifError(err);
      });

      Test.path('simple').validators = [];
      Test.path('simple').match(/[1-9]/);
      Test.path('simple').doValidate(0, function(err){
        assert.ok(err instanceof ValidatorError);
      });
    })

    it('number min and max', function(){
      var Tobi = new Schema({
          friends: { type: Number, max: 15, min: 5 }
      });

      assert.equal(Tobi.path('friends').validators.length, 2);

      Tobi.path('friends').doValidate(10, function(err){
        assert.ifError(err);
      });

      Tobi.path('friends').doValidate(100, function(err){
        assert.ok(err instanceof ValidatorError);
      });

      Tobi.path('friends').doValidate(1, function(err){
        assert.ok(err instanceof ValidatorError);
      });

      // null is allowed
      Tobi.path('friends').doValidate(null, function(err){
        assert.ifError(err);
      });
    });

    it('number required', function(){
      var Edwald = new Schema({
          friends: { type: Number, required: true }
      });

      Edwald.path('friends').doValidate(null, function(err){
        assert.ok(err instanceof ValidatorError);
      });

      Edwald.path('friends').doValidate(undefined, function(err){
        assert.ok(err instanceof ValidatorError);
      });

      Edwald.path('friends').doValidate(0, function(err){
        assert.ifError(err);
      });
    })

    it('date required', function(){
      var Loki = new Schema({
          birth_date: { type: Date, required: true }
      });

      Loki.path('birth_date').doValidate(null, function (err) {
        assert.ok(err instanceof ValidatorError);
      });

      Loki.path('birth_date').doValidate(undefined, function (err) {
        assert.ok(err instanceof ValidatorError);
      });

      Loki.path('birth_date').doValidate(new Date(), function (err) {
        assert.ifError(err);
      });
    });

    it('objectid required', function(){
      var Loki = new Schema({
          owner: { type: ObjectId, required: true }
      });

      Loki.path('owner').doValidate(new DocumentObjectId(), function(err){
        assert.ifError(err);
      });

      Loki.path('owner').doValidate(null, function(err){
        assert.ok(err instanceof ValidatorError);
      });

      Loki.path('owner').doValidate(undefined, function(err){
        assert.ok(err instanceof ValidatorError);
      });
    });

    it('array required', function(){
      var Loki = new Schema({
          likes: { type: Array, required: true }
      });

      Loki.path('likes').doValidate(null, function (err) {
        assert.ok(err instanceof ValidatorError);
      });

      Loki.path('likes').doValidate(undefined, function (err) {
        assert.ok(err instanceof ValidatorError);
      });

      Loki.path('likes').doValidate([], function (err) {
        assert.ok(err instanceof ValidatorError);
      });
    });

    it('boolean required', function(){
      var Animal = new Schema({
          isFerret: { type: Boolean, required: true }
      });

      Animal.path('isFerret').doValidate(null, function(err){
        assert.ok(err instanceof ValidatorError);
      });

      Animal.path('isFerret').doValidate(undefined, function(err){
        assert.ok(err instanceof ValidatorError);
      });

      Animal.path('isFerret').doValidate(true, function(err){
        assert.ifError(err);
      });

      Animal.path('isFerret').doValidate(false, function(err){
        assert.ifError(err);
      });
    });

    describe('async', function(){
      it('works', function(done){
        var executed = 0;

        function validator (value, fn) {
          setTimeout(function(){
            executed++;
            fn(value === true);
            if (2 === executed) done();
          }, 5);
        };

        var Animal = new Schema({
            ferret: { type: Boolean, validate: validator }
        });

        Animal.path('ferret').doValidate(true, function(err){
          assert.ifError(err);
        });

        Animal.path('ferret').doValidate(false, function(err){
          assert.ok(err instanceof Error);
        });
      });

      it('multiple', function(done) {
        var executed = 0;

        function validator (value, fn) {
          setTimeout(function(){
            executed++;
            fn(value === true);
            if (2 === executed) done();
          }, 5);
        };

        var Animal = new Schema({
          ferret: {
            type: Boolean,
            validate: [
              {
                'validator': validator,
                'msg': 'validator1'
              },
              {
                'validator': validator,
                'msg': 'validator2'
              },
            ],
          }
        });

        Animal.path('ferret').doValidate(true, function(err){
          assert.ifError(err);
        });
      });

      it('scope', function(done){
        var called = false;
        function validator (value, fn) {
          assert.equal('b', this.a);

          setTimeout(function(){
            called = true;
            fn(true);
          }, 5);
        };

        var Animal = new Schema({
            ferret: { type: Boolean, validate: validator }
        });

        Animal.path('ferret').doValidate(true, function(err){
          assert.ifError(err);
          assert.equal(true, called);
          done();
        }, { a: 'b' });
      })
    })
  });

  describe('casting', function(){
    it('number', function(){
      var Tobi = new Schema({
          age: Number
      });

      // test String -> Number cast
      assert.equal('number', typeof +Tobi.path('age').cast('0'));
      assert.equal(0, (+Tobi.path('age').cast('0')));

      assert.equal('number', typeof +Tobi.path('age').cast(0));
      assert.equal(0, (+Tobi.path('age').cast(0)));
    });

    describe('string', function(){
      it('works', function(){
        var Tobi = new Schema({
            nickname: String
        });

        function Test(){};
        Test.prototype.toString = function(){
          return 'woot';
        };

        // test Number -> String cast
        assert.equal('string', typeof Tobi.path('nickname').cast(0));
        assert.equal('0', Tobi.path('nickname').cast(0));

        // test any object that implements toString
        assert.equal('string', typeof Tobi.path('nickname').cast(new Test));
        assert.equal('woot', Tobi.path('nickname').cast(new Test));
      });
      it('casts undefined to "undefined"', function(done){
        var db= require('./common')();
        var schema = new Schema({ arr: [String] });
        var M = db.model('castingStringArrayWithUndefined', schema);
        M.find({ arr: { $in: [undefined] }}, function (err) {
          db.close();
          assert.equal(err && err.message, 'Cast to string failed for value "undefined"');
          done();
        });
      });
    });

    it('date', function(){
      var Loki = new Schema({
          birth_date: { type: Date }
      });

      assert.ok(Loki.path('birth_date').cast(1294525628301) instanceof Date);
      assert.ok(Loki.path('birth_date').cast('8/24/2000') instanceof Date);
      assert.ok(Loki.path('birth_date').cast(new Date) instanceof Date);
    });

    it('objectid', function(){
      var Loki = new Schema({
          owner: { type: ObjectId }
      });

      var doc = new TestDocument()
        , id = doc._id.toString();

      assert.ok(Loki.path('owner').cast('4c54f3453e688c000000001a')
                        instanceof DocumentObjectId);

      assert.ok(Loki.path('owner').cast(new DocumentObjectId())
                        instanceof DocumentObjectId);

      assert.ok(Loki.path('owner').cast(doc)
                        instanceof DocumentObjectId);

      assert.equal(id, Loki.path('owner').cast(doc).toString());
    });

    it('array', function(){
      var Loki = new Schema({
          oids        : [ObjectId]
        , dates       : [Date]
        , numbers     : [Number]
        , strings     : [String]
        , buffers     : [Buffer]
        , nocast      : []
        , mixed       : [Mixed]
      });

      var oids = Loki.path('oids').cast(['4c54f3453e688c000000001a', new DocumentObjectId]);

      assert.ok(oids[0] instanceof DocumentObjectId);
      assert.ok(oids[1] instanceof DocumentObjectId);

      var dates = Loki.path('dates').cast(['8/24/2010', 1294541504958]);

      assert.ok(dates[0] instanceof Date);
      assert.ok(dates[1] instanceof Date);

      var numbers = Loki.path('numbers').cast([152, '31']);

      assert.equal(typeof numbers[0], 'number');
      assert.equal(typeof numbers[1], 'number');

      var strings = Loki.path('strings').cast(['test', 123]);

      assert.equal(typeof strings[0], 'string');
      assert.equal('test',strings[0]);

      assert.equal(typeof strings[1], 'string');
      assert.equal('123', strings[1]);

      var buffers = Loki.path('buffers').cast(['\0\0\0', new Buffer("abc")]);

      assert.ok(buffers[0] instanceof Buffer);
      assert.ok(buffers[1] instanceof Buffer);

      var nocasts = Loki.path('nocast').cast(['test', 123]);

      assert.equal(typeof nocasts[0], 'string');
      assert.equal('test', nocasts[0]);

      assert.equal(typeof nocasts[1], 'number');
      assert.equal(123, nocasts[1]);

      var mixed = Loki.path('mixed').cast(['test', 123, '123', {}, new Date, new DocumentObjectId]);

      assert.equal(typeof mixed[0], 'string');
      assert.equal(typeof mixed[1], 'number');
      assert.equal(typeof mixed[2], 'string');
      assert.equal(typeof mixed[3], 'object');
      assert.ok(mixed[4] instanceof Date);
      assert.ok(mixed[5] instanceof DocumentObjectId);
    });

    it('boolean', function(){
      var Animal = new Schema({
          isFerret: { type: Boolean, required: true }
      });

      assert.strictEqual(Animal.path('isFerret').cast(null), null);
      assert.equal(false, Animal.path('isFerret').cast(undefined));
      assert.equal(false, Animal.path('isFerret').cast(false));
      assert.equal(false, Animal.path('isFerret').cast(0));
      assert.equal(false, Animal.path('isFerret').cast('0'));
      assert.equal(true, Animal.path('isFerret').cast({}));
      assert.equal(true, Animal.path('isFerret').cast(true));
      assert.equal(true, Animal.path('isFerret').cast(1));
      assert.equal(true, Animal.path('isFerret').cast('1'));
    });
  });

  it('methods declaration', function(){
    var a = new Schema;
    a.method('test', function(){});
    a.method({
        a: function(){}
      , b: function(){}
    });
    assert.equal(3, Object.keys(a.methods).length);
  });

  it('static declaration', function(){
    var a = new Schema;
    a.static('test', function(){});
    a.static({
        a: function(){}
      , b: function(){}
      , c: function(){}
    });

    assert.equal(Object.keys(a.statics).length, 4)
  });

  describe('setters', function(){
    it('work', function(){
      function lowercase (v) {
        return v.toLowerCase();
      };

      var Tobi = new Schema({
          name: { type: String, set: lowercase }
      });

      assert.equal('woot', Tobi.path('name').applySetters('WOOT'));
      assert.equal(1, Tobi.path('name').setters.length);

      Tobi.path('name').set(function(v){
        return v + 'WOOT';
      });

      assert.equal('wootwoot', Tobi.path('name').applySetters('WOOT'));
      assert.equal(2, Tobi.path('name').setters.length);
    });

    it('order', function(){
      function extract (v, self) {
        return (v && v._id)
          ? v._id
          : v
      };

      var Tobi = new Schema({
          name: { type: Schema.ObjectId, set: extract }
      });

      var id = new DocumentObjectId
        , sid = id.toString()
        , _id = { _id: id };

      assert.equal(Tobi.path('name').applySetters(sid, { a: 'b' }).toString(),sid);
      assert.equal(Tobi.path('name').applySetters(_id, { a: 'b' }).toString(),sid);
      assert.equal(Tobi.path('name').applySetters(id, { a: 'b' }).toString(),sid);
    });

    it('scope', function(){
      function lowercase (v, self) {
        assert.equal('b', this.a);
        assert.equal('name', self.path);
        return v.toLowerCase();
      };

      var Tobi = new Schema({
          name: { type: String, set: lowercase }
      });

      assert.equal('what', Tobi.path('name').applySetters('WHAT', { a: 'b' }));
    });

    it('casting', function(){
      function last (v) {
        assert.equal('string', typeof v);
        assert.equal('0', v);
        return 'last';
      };

      function first (v) {
        return 0;
      };

      var Tobi = new Schema({
          name: { type: String, set: last }
      });

      Tobi.path('name').set(first);
      assert.equal('last', Tobi.path('name').applySetters('woot'));
    });

    describe('string', function(){
      console.error('\nTODO remove string lowercase/uppercase/trim setters before 3.0\n');
      it('lowercase', function(){
        var Tobi = new Schema({
            name: { type: String, lowercase: true }
        });

        assert.equal('what', Tobi.path('name').applySetters('WHAT'));
      });
      it('uppercase', function(){
        var Tobi = new Schema({
            name: { type: String, uppercase: true }
        });

        assert.equal('WHAT', Tobi.path('name').applySetters('what'));
      });
      it('trim', function(){
        var Tobi = new Schema({
            name: { type: String, uppercase: true, trim: true }
        });

        assert.equal('WHAT', Tobi.path('name').applySetters('  what   '));
      });
    });

    it('applying when none have been defined', function(){
      var Tobi = new Schema({
          name: String
      });

      assert.equal('woot', Tobi.path('name').applySetters('woot'));
    });

    it('assignment of non-functions throw', function(){
      var schema = new Schema({ fun: String });
      var g, s;

      try {
        schema.path('fun').set(4);
      } catch (err_) {
        g = err_;
      }

      assert.ok(g);
      assert.equal(g.message,'A setter must be a function.');
    })
  });

  describe('getters', function(){
    it('work', function(){
      function woot (v) {
        return v + ' woot';
      };

      var Tobi = new Schema({
          name: { type: String, get: woot }
      });

      assert.equal(1, Tobi.path('name').getters.length);
      assert.equal('test woot', Tobi.path('name').applyGetters('test'));
    });
    it('scope', function(){
      function woot (v, self) {
        assert.equal('b', this.a);
        assert.equal('name', self.path);
        return v.toLowerCase();
      };

      var Tobi = new Schema({
          name: { type: String, get: woot }
      });

      assert.equal('yep', Tobi.path('name').applyGetters('YEP', { a: 'b' }));
    });
    it('casting', function(){
      function last (v) {
        assert.equal('string', typeof v);
        assert.equal('0', v);
        return 'last';
      };

      function first (v) {
        return 0;
      };

      var Tobi = new Schema({
          name: { type: String, get: last }
      });

      Tobi.path('name').get(first);
      assert.equal('last', Tobi.path('name').applyGetters('woot'));
    });
    it('applying when none have been defined', function(){
      var Tobi = new Schema({
          name: String
      });

      assert.equal('woot', Tobi.path('name').applyGetters('woot'));
    });
    it('assignment of non-functions throw', function(){
      var schema = new Schema({ fun: String });
      var g, s;

      try {
        schema.path('fun').get(true);
      } catch (err_) {
        g = err_;
      }

      assert.ok(g);
      assert.equal(g.message,'A getter must be a function.');
    })
  });

  describe('hooks', function(){
    it('registration', function(){
      var Tobi = new Schema();

      Tobi.pre('save', function(){});
      assert.equal(1, Tobi.callQueue.length);

      Tobi.post('save', function(){});
      assert.equal(2, Tobi.callQueue.length);

      Tobi.pre('save', function(){});
      assert.equal(3, Tobi.callQueue.length);
    });
  });

  describe('indexes', function(){
    describe('definition', function(){
      it('basic', function(){
        var Tobi = new Schema({
            name: { type: String, index: true }
        });

        assert.equal(true, Tobi.path('name')._index);
        Tobi.path('name').index({ unique: true });
        assert.deepEqual(Tobi.path('name')._index, { unique: true });
        Tobi.path('name').unique(false);
        assert.deepEqual(Tobi.path('name')._index, { unique: false });

        var T1 = new Schema({
            name: { type: String, sparse: true }
        });
        assert.deepEqual(T1.path('name')._index, { sparse: true });

        var T2 = new Schema({
            name: { type: String, unique: true }
        });
        assert.deepEqual(T2.path('name')._index, { unique: true });

        var T3 = new Schema({
            name: { type: String, sparse: true, unique: true }
        });
        assert.deepEqual(T3.path('name')._index, { sparse: true, unique: true });

        var T4 = new Schema({
            name: { type: String, unique: true, sparse: true }
        });
        var i = T4.path('name')._index;
        assert.equal(true, i.unique);
        assert.equal(true, i.sparse);

        var T5 = new Schema({
            name: { type: String, index: { sparse: true, unique: true } }
        });
        var i = T5.path('name')._index;
        assert.equal(true, i.unique);
        assert.equal(true, i.sparse);
      })
      it('compound', function(){
        var Tobi = new Schema({
            name: { type: String, index: true }
          , last: { type: Number, sparse: true }
          , nope: { type: String, index: { background: false }}
        });

        Tobi.index({ firstname: 1, last: 1 }, { unique: true });
        Tobi.index({ firstname: 1, nope: 1 }, { unique: true, background: false });

        assert.deepEqual(Tobi.indexes, [
            [{ name: 1 }, {}]
          , [{ last: 1 }, { sparse: true }]
          , [{ nope: 1 }, { background : false}]
          , [{ firstname: 1, last: 1}, {unique: true }]
          , [{ firstname: 1, nope: 1 }, { unique: true, background: false }]
        ]);
      });
    });
  });

  describe('plugins', function(){
    var Tobi = new Schema
      , called = false;

    Tobi.plugin(function(schema){
      assert.equal(schema, Tobi);
      called = true;
    });

    assert.equal(true, called);
  });

  describe('options', function(){
    it('defaults are set', function(){
      var Tobi = new Schema();

      assert.equal('object', typeof Tobi.options);
      assert.equal(true, Tobi.options.safe);
      assert.equal(false, Tobi.options.strict);
    });

    it('setting', function(){
      var Tobi = new Schema({}, { collection: 'users' });

      Tobi.set('a', 'b');
      Tobi.set('safe', false);
      assert.equal('users', Tobi.options.collection);

      assert.equal('b', Tobi.options.a);
      assert.equal(Tobi.options.safe, false);
    });
  });

  describe('virtuals', function(){
    it('works', function(){
      var Contact = new Schema({
          firstName: String
        , lastName: String
      });

      Contact
      .virtual('fullName')
      .get(function () {
        return this.get('firstName') + ' ' + this.get('lastName');
      })
      .set(function (fullName) {
        var split = fullName.split(' ');
        this.set('firstName', split[0]);
        this.set('lastName', split[1]);
      });

      assert.ok(Contact.virtualpath('fullName') instanceof VirtualType);
    });

    describe('id', function(){
      it('default creation of id can be overridden (gh-298)', function(){
        assert.doesNotThrow(function () {
          new Schema({ id: String });
        });
      });
      it('disabling', function(){
        var schema = new Schema({ name: String }, { noVirtualId: true });
        assert.strictEqual(undefined, schema.virtuals.id);
      });
    });
  });

  describe('other contexts', function(){
    it('work', function(){
      var str = 'code = {' +
        '  name: String' +
        ', arr1: Array ' +
        ', arr2: { type: [] }' +
        ', date: Date  ' +
        ', num: { type: Number }' +
        ', bool: Boolean' +
        ', nest: { sub: { type: {}, required: true }}' +
        '}';

      var script = vm.createScript(str, 'testSchema.vm');
      var sandbox = { code: null };
      script.runInNewContext(sandbox);

      var Ferret = new Schema(sandbox.code);
      assert.ok(Ferret.path('nest.sub') instanceof SchemaTypes.Mixed);
      assert.ok(Ferret.path('name') instanceof SchemaTypes.String);
      assert.ok(Ferret.path('arr1') instanceof SchemaTypes.Array);
      assert.ok(Ferret.path('arr2') instanceof SchemaTypes.Array);
      assert.ok(Ferret.path('date') instanceof SchemaTypes.Date);
      assert.ok(Ferret.path('num') instanceof SchemaTypes.Number);
      assert.ok(Ferret.path('bool') instanceof SchemaTypes.Boolean);
    });
  });

  describe('#add()', function(){
    it('does not polute existing paths', function(){
      var o = { name: String }
      var s = new Schema(o);
      s.add({ age: Number }, 'name.');
      assert.equal(false, ('age' in o.name));
    });

    it('merging nested objects (gh-662)', function(done){
      var db = start();

      var MergedSchema = new Schema({
        a: {
          foo: String
        }
      });

      MergedSchema.add({
        a: {
          b: {
            bar: String
          }
        }
      });

      mongoose.model('Merged', MergedSchema);

      var Merged = db.model('Merged', 'merged_' + Math.random());

      var merged = new Merged({
        a: {
            foo: 'baz'
          , b: {
              bar: 'qux'
            }
        }
      });

      merged.save(function(err) {
        assert.ifError(err);
        Merged.findById(merged.id, function(err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(found.a.foo,'baz');
          assert.equal(found.a.b.bar,'qux');
          done();
        });
      });
    })
  });

  it('debugging msgs', function(){
    var err;
    try {
      new Schema({ name: { first: null } })
    } catch (e) {
      err = e;
    }
    assert.equal(err.message,'Invalid value for schema path `name.first`')
    try {
      new Schema({ age: undefined })
    } catch (e) {
      err = e;
    }
    assert.equal(err.message, 'Invalid value for schema path `age`')
  });

  describe('construction', function(){
    it('array of object literal missing a type is interpreted as Mixed', function(){
      var goose = new mongoose.Mongoose;
      var s = new Schema({
          arr: [
            { something: { type: String } }
          ]
      });
      assert.ok(s.path('arr') instanceof SchemaTypes.Array);
      var M = goose.model('objectliteralschema', s);
      var m = new M({ arr: [ { something: 'wicked this way comes' }] });
      assert.equal('wicked this way comes', m.arr[0].something);
      assert.ok(!m.arr[0]._id);
    });
    it('of nested schemas should throw (gh-700)', function(){
      var a = new Schema({ title: String })
        , err

      try {
        new Schema({ blah: Boolean, a: a });
      } catch (err_) {
        err = err_;
      }

      assert.ok(err);
      assert.ok(/Did you try nesting Schemas/.test(err.message));
    });
  });
});
