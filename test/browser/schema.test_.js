var Schema = mongoose.Schema
  , Document = mongoose.Document
  , SchemaType = mongoose.SchemaType
  , VirtualType = mongoose.VirtualType
  , ValidatorError = mongoose.Error.ValidatorError
  , SchemaTypes = Schema.Types
  , ObjectId = SchemaTypes.ObjectId
  , Mixed = SchemaTypes.Mixed
  , DocumentObjectId = mongoose.Types.ObjectId
  , MongooseArray = mongoose.Types.Array

/**
 * Test Document constructor.
 */

function TestDocument () {
  mongoose.Document.apply(this, arguments);
}

/**
 * Inherits from Document.
 */

TestDocument.prototype = Object.create( Document.prototype );
TestDocument.prototype.constructor = TestDocument;

/**
 * Set a dummy schema to simulate compilation.
 */

TestDocument.prototype.$__setSchema(new Schema({
  test    : String
}));

describe('schema', function(){
  it('can be created without the "new" keyword', function(done) {
    var schema = mongoose.Schema({ name: String });
    assert.ok(schema instanceof mongoose.Schema);
    done();
  });

  it('supports different schematypes', function(done) {
    var Checkin = new mongoose.Schema({
        date      : Date
      , location  : {
            lat: Number
          , lng: Number
        }
    });

    var Ferret = new mongoose.Schema({
        name      : String
      , owner     : mongoose.Schema.Types.ObjectId
      , fur       : String
      , color     : { type: String }
      , age       : Number
      , checkins  : [Checkin]
      , friends   : [mongoose.Schema.Types.ObjectId]
      , likes     : Array
      , alive     : Boolean
      , extra     : mongoose.Schema.Types.Mixed
    });

    assert.ok(Ferret.path('name') instanceof mongoose.Schema.Types.String);
    assert.ok(Ferret.path('owner') instanceof mongoose.Schema.Types.ObjectId);
    assert.ok(Ferret.path('fur') instanceof mongoose.Schema.Types.String);
    assert.ok(Ferret.path('color') instanceof mongoose.Schema.Types.String);
    assert.ok(Ferret.path('age') instanceof mongoose.Schema.Types.Number);
    assert.ok(Ferret.path('checkins') instanceof mongoose.Schema.Types.DocumentArray);
    assert.ok(Ferret.path('friends') instanceof mongoose.Schema.Types.Array);
    assert.ok(Ferret.path('likes') instanceof mongoose.Schema.Types.Array);
    assert.ok(Ferret.path('alive') instanceof mongoose.Schema.Types.Boolean);
    assert.ok(Ferret.path('extra') instanceof mongoose.Schema.Types.Mixed);

    assert.strictEqual(Ferret.path('unexistent'), undefined);

    assert.ok(Checkin.path('date') instanceof mongoose.Schema.Types.Date);

    // check strings
    var Checkin1 = new mongoose.Schema({
        date      : 'date'
      , location  : {
            lat: 'number'
          , lng: 'Number'
        }
    });

    assert.ok(Checkin1.path('date') instanceof mongoose.Schema.Types.Date);
    assert.ok(Checkin1.path('location.lat') instanceof mongoose.Schema.Types.Number);
    assert.ok(Checkin1.path('location.lng') instanceof mongoose.Schema.Types.Number);

    var Ferret1 = new mongoose.Schema({
        name      : "string"
      , owner     : "oid"
      , fur       : { type: "string" }
      , color     : { type: "String" }
      , checkins  : [Checkin]
      , friends   : Array
      , likes     : "array"
      , alive     : "Bool"
      , alive1    : "bool"
      , alive2    : "boolean"
      , extra     : "mixed"
      , obj       : "object"
      , buf       : "buffer"
      , Buf       : "Buffer"
    });

    assert.ok(Ferret1.path('name') instanceof mongoose.Schema.Types.String);
    assert.ok(Ferret1.path('owner') instanceof mongoose.Schema.Types.ObjectId);
    assert.ok(Ferret1.path('fur') instanceof mongoose.Schema.Types.String);
    assert.ok(Ferret1.path('color') instanceof mongoose.Schema.Types.String);
    assert.ok(Ferret1.path('checkins') instanceof mongoose.Schema.Types.DocumentArray);
    assert.ok( Ferret1.path('friends') instanceof mongoose.Schema.Types.Array);
    assert.ok(Ferret1.path('likes') instanceof mongoose.Schema.Types.Array);
    assert.ok(Ferret1.path('alive') instanceof mongoose.Schema.Types.Boolean);
    assert.ok(Ferret1.path('alive1') instanceof mongoose.Schema.Types.Boolean);
    assert.ok(Ferret1.path('alive2') instanceof mongoose.Schema.Types.Boolean);
    assert.ok(Ferret1.path('extra') instanceof mongoose.Schema.Types.Mixed);
    assert.ok(Ferret1.path('obj') instanceof mongoose.Schema.Types.Mixed);
    assert.ok(Ferret1.path('buf') instanceof mongoose.Schema.Types.Buffer);
    assert.ok(Ferret1.path('Buf') instanceof mongoose.Schema.Types.Buffer);
    done();
  });

  describe('casting', function(){
    it('number', function(done){
      var Tobi = new Schema({
        age: Number
      });

      // test String -> Number cast
      assert.equal('number', typeof Tobi.path('age').cast('0'));
      assert.equal(0, (+Tobi.path('age').cast('0')));

      assert.equal('number', typeof Tobi.path('age').cast(0));
      assert.equal(0, (+Tobi.path('age').cast(0)));
      done();
    });

    describe('string', function(){
      it('works', function(done){
        var Tobi = new Schema({
          nickname: String
        });

        function Test(){}
        Test.prototype.toString = function(){
          return 'woot';
        };

        // test Number -> String cast
        assert.equal('string', typeof Tobi.path('nickname').cast(0));
        assert.equal('0', Tobi.path('nickname').cast(0));

        // test any object that implements toString
        assert.equal('string', typeof Tobi.path('nickname').cast(new Test));
        assert.equal('woot', Tobi.path('nickname').cast(new Test));
        done();
      });
      /*it('casts undefined to "undefined"', function(done){
        var schema = new Schema({ arr: [String] });
        var M = db.model('castingStringArrayWithUndefined', schema);
        M.find({ arr: { $in: [undefined] }}, function (err) {
          db.close();
          assert.equal(err && err.message, 'Cast to string failed for value "undefined" at path "arr"');
          done();
        });
      });*/
    });

    it('date', function(done){
      var Loki = new Schema({
        birth_date: { type: Date }
      });

      assert.ok(Loki.path('birth_date').cast(1294525628301) instanceof Date);
      assert.ok(Loki.path('birth_date').cast('8/24/2000') instanceof Date);
      assert.ok(Loki.path('birth_date').cast(new Date) instanceof Date);
      done();
    });

    it('objectid', function(done){
      var Loki = new Schema({
        owner: { type: ObjectId }
      });

      var doc = new TestDocument({}, new Schema())
        , id = doc._id.toString();

      assert.ok(Loki.path('owner').cast('4c54f3453e688c000000001a')
        instanceof DocumentObjectId);

      assert.ok(Loki.path('owner').cast(new DocumentObjectId())
        instanceof DocumentObjectId);

      assert.ok(Loki.path('owner').cast(doc)
        instanceof DocumentObjectId);

      assert.equal(id, Loki.path('owner').cast(doc).toString());
      done();
    });

    it('array', function(done){
      var Loki = new Schema({
        oids        : [ObjectId]
        , dates       : [Date]
        , numbers     : [Number]
        , strings     : [String]
        //, buffers     : [Buffer]
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

      /*var buffers = Loki.path('buffers').cast(['\0\0\0', new Buffer("abc")]);

      assert.ok(buffers[0] instanceof Buffer);
      assert.ok(buffers[1] instanceof Buffer);*/

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
      done();
    });

    it('boolean', function(done){
      var Animal = new Schema({
        isFerret: { type: Boolean, required: true }
      });

      assert.strictEqual(Animal.path('isFerret').cast(null), null);
      assert.equal(false, Animal.path('isFerret').cast(undefined));
      assert.equal(false, Animal.path('isFerret').cast(false));
      assert.equal(false, Animal.path('isFerret').cast(0));
      assert.equal(false, Animal.path('isFerret').cast('0'));
      assert.equal(false, Animal.path('isFerret').cast('false'));
      assert.equal(true, Animal.path('isFerret').cast({}));
      assert.equal(true, Animal.path('isFerret').cast(true));
      assert.equal(true, Animal.path('isFerret').cast(1));
      assert.equal(true, Animal.path('isFerret').cast('1'));
      assert.equal(true, Animal.path('isFerret').cast('true'));
      done();
    });
  });
});