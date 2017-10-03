/**
 * Module dependencies.
 */

var start = require('./common'),
    mongoose = start.mongoose,
    assert = require('power-assert'),
    Schema = mongoose.Schema,
    Document = mongoose.Document,
    VirtualType = mongoose.VirtualType,
    SchemaTypes = Schema.Types,
    ObjectId = SchemaTypes.ObjectId,
    Mixed = SchemaTypes.Mixed,
    DocumentObjectId = mongoose.Types.ObjectId,
    ReadPref = mongoose.mongo.ReadPreference,
    vm = require('vm');

/**
 * Test Document constructor.
 */

function TestDocument() {
  Document.apply(this, arguments);
}

/**
 * Inherits from Document.
 */

TestDocument.prototype.__proto__ = Document.prototype;

/**
 * Test.
 */

describe('schema', function() {
  before(function() {
    TestDocument.prototype.$__setSchema(new Schema({
      test: String
    }));
  });

  describe('nested fields with same name', function() {
    var db, NestedModel;

    before(function() {
      db = start();
      var NestedSchema = new Schema({
        a: {
          b: {
            c: {$type: String},
            d: {$type: String}
          }
        },
        b: {$type: String}
      }, {typeKey: '$type'});
      NestedModel = db.model('Nested', NestedSchema);
    });

    after(function() {
      db.close();
    });

    it('don\'t disappear', function(done) {
      var n = new NestedModel({
        a: {
          b: {
            c: 'foo',
            d: 'bar'
          }
        }, b: 'foobar'
      });

      n.save(function(err) {
        assert.ifError(err);
        NestedModel.findOne({_id: n._id}, function(err, nm) {
          assert.ifError(err);

          // make sure no field has disappeared
          assert.ok(nm.a);
          assert.ok(nm.a.b);
          assert.ok(nm.a.b.c);
          assert.ok(nm.a.b.d);
          assert.equal(nm.a.b.c, n.a.b.c);
          assert.equal(nm.a.b.d, n.a.b.d);

          done();
        });
      });
    });
  });


  it('can be created without the "new" keyword', function(done) {
    var schema = new Schema({name: String});
    assert.ok(schema instanceof Schema);
    done();
  });

  it('does expose a property for duck-typing instanceof', function(done) {
    var schema = new Schema({name: String});
    assert.ok(schema.instanceOfSchema);
    done();
  });

  it('supports different schematypes', function(done) {
    var Checkin = new Schema({
      date: Date,
      location: {
        lat: Number,
        lng: Number
      }
    });

    var Ferret = new Schema({
      name: String,
      owner: ObjectId,
      fur: String,
      color: {type: String},
      age: Number,
      checkins: [Checkin],
      friends: [ObjectId],
      likes: Array,
      alive: Boolean,
      extra: Mixed
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

    // check strings
    var Checkin1 = new Schema({
      date: 'date',
      location: {
        lat: 'number',
        lng: 'Number'
      }
    });

    assert.ok(Checkin1.path('date') instanceof SchemaTypes.Date);
    assert.ok(Checkin1.path('location.lat') instanceof SchemaTypes.Number);
    assert.ok(Checkin1.path('location.lng') instanceof SchemaTypes.Number);

    var Ferret1 = new Schema({
      name: 'string',
      owner: 'oid',
      fur: {type: 'string'},
      color: {type: 'String'},
      checkins: [Checkin],
      friends: Array,
      likes: 'array',
      alive: 'Bool',
      alive1: 'bool',
      alive2: 'boolean',
      extra: 'mixed',
      obj: 'object',
      buf: 'buffer',
      Buf: 'Buffer'
    });

    assert.ok(Ferret1.path('name') instanceof SchemaTypes.String);
    assert.ok(Ferret1.path('owner') instanceof SchemaTypes.ObjectId);
    assert.ok(Ferret1.path('fur') instanceof SchemaTypes.String);
    assert.ok(Ferret1.path('color') instanceof SchemaTypes.String);
    assert.ok(Ferret1.path('checkins') instanceof SchemaTypes.DocumentArray);
    assert.ok(Ferret1.path('friends') instanceof SchemaTypes.Array);
    assert.ok(Ferret1.path('likes') instanceof SchemaTypes.Array);
    assert.ok(Ferret1.path('alive') instanceof SchemaTypes.Boolean);
    assert.ok(Ferret1.path('alive1') instanceof SchemaTypes.Boolean);
    assert.ok(Ferret1.path('alive2') instanceof SchemaTypes.Boolean);
    assert.ok(Ferret1.path('extra') instanceof SchemaTypes.Mixed);
    assert.ok(Ferret1.path('obj') instanceof SchemaTypes.Mixed);
    assert.ok(Ferret1.path('buf') instanceof SchemaTypes.Buffer);
    assert.ok(Ferret1.path('Buf') instanceof SchemaTypes.Buffer);
    done();
  });

  it('supports dot notation for path accessors', function(done) {
    var Racoon = new Schema({
      name: {type: String, enum: ['Edwald', 'Tobi']},
      age: Number
    });

    // check for global variable leak
    assert.equal(typeof errorMessage, 'undefined');

    var Person = new Schema({
      name: String,
      raccoons: [Racoon],
      location: {
        city: String,
        state: String
      }
    });

    assert.ok(Person.path('name') instanceof SchemaTypes.String);
    assert.ok(Person.path('raccoons') instanceof SchemaTypes.DocumentArray);
    assert.ok(Person.path('location.city') instanceof SchemaTypes.String);
    assert.ok(Person.path('location.state') instanceof SchemaTypes.String);

    assert.strictEqual(Person.path('location.unexistent'), undefined);
    done();
  });

  it('allows paths nested > 2 levels', function(done) {
    var Nested = new Schema({
      first: {
        second: {
          third: String
        }
      }
    });
    assert.ok(Nested.path('first.second.third') instanceof SchemaTypes.String);
    done();
  });

  it('default definition', function(done) {
    var Test = new Schema({
      simple: {$type: String, default: 'a'},
      array: {$type: Array, default: [1, 2, 3, 4, 5]},
      arrayX: {$type: Array, default: 9},
      arrayFn: {
        $type: Array, default: function() {
          return [8];
        }
      },
      callback: {
        $type: Number, default: function() {
          assert.equal(this.a, 'b');
          return '3';
        }
      }
    }, {typeKey: '$type'});

    assert.equal(Test.path('simple').defaultValue, 'a');
    assert.equal(typeof Test.path('callback').defaultValue, 'function');

    assert.equal(Test.path('simple').getDefault(), 'a');
    assert.equal((+Test.path('callback').getDefault({a: 'b'})), 3);
    assert.equal(typeof Test.path('array').defaultValue, 'function');
    assert.equal(Test.path('array').getDefault(new TestDocument)[3], 4);
    assert.equal(Test.path('arrayX').getDefault(new TestDocument)[0], 9);
    assert.equal(typeof Test.path('arrayFn').defaultValue, 'function');
    assert.ok(Test.path('arrayFn').getDefault(new TestDocument).isMongooseArray);
    assert.ok(Test.path('arrayX').getDefault(new TestDocument).isMongooseArray);
    assert.equal(Test.path('arrayX').getDefault(new TestDocument)[0], 9);
    done();
  });

  it('Mixed defaults can be empty arrays', function(done) {
    var Test = new Schema({
      mixed1: {type: Mixed, default: []},
      mixed2: {type: Mixed, default: Array}
    });

    assert.ok(Test.path('mixed1').getDefault() instanceof Array);
    assert.equal(Test.path('mixed1').getDefault().length, 0);
    assert.ok(Test.path('mixed2').getDefault() instanceof Array);
    assert.equal(Test.path('mixed2').getDefault().length, 0);
    done();
  });

  describe('casting', function() {
    it('number', function(done) {
      var Tobi = new Schema({
        age: Number
      });

      // test String -> Number cast
      assert.equal(typeof Tobi.path('age').cast('0'), 'number');
      assert.equal((+Tobi.path('age').cast('0')), 0);

      assert.equal(typeof Tobi.path('age').cast(0), 'number');
      assert.equal((+Tobi.path('age').cast(0)), 0);
      done();
    });

    describe('string', function() {
      it('works', function(done) {
        var Tobi = new Schema({
          nickname: String
        });

        function Test() {
        }

        Test.prototype.toString = function() {
          return 'woot';
        };

        // test Number -> String cast
        assert.equal(typeof Tobi.path('nickname').cast(0), 'string');
        assert.equal(Tobi.path('nickname').cast(0), '0');

        // test any object that implements toString
        assert.equal(typeof Tobi.path('nickname').cast(new Test), 'string');
        assert.equal(Tobi.path('nickname').cast(new Test), 'woot');
        done();
      });
    });

    it('date', function(done) {
      var Loki = new Schema({
        birth_date: {type: Date}
      });

      assert.ok(Loki.path('birth_date').cast(1294525628301) instanceof Date);
      assert.ok(Loki.path('birth_date').cast('8/24/2000') instanceof Date);
      assert.ok(Loki.path('birth_date').cast(new Date) instanceof Date);
      assert.ok(Loki.path('birth_date').cast('') === null);
      assert.ok(Loki.path('birth_date').cast(null) === null);
      done();
    });

    it('objectid', function(done) {
      var Loki = new Schema({
        owner: {type: ObjectId}
      });

      var doc = new TestDocument(),
          id = doc._id.toString();

      assert.ok(Loki.path('owner').cast('4c54f3453e688c000000001a') instanceof DocumentObjectId);

      assert.ok(Loki.path('owner').cast(new DocumentObjectId()) instanceof DocumentObjectId);

      assert.ok(Loki.path('owner').cast(doc) instanceof DocumentObjectId);

      assert.equal(Loki.path('owner').cast(doc).toString(), id);
      done();
    });

    it('array', function(done) {
      var Loki = new Schema({
        oids: [ObjectId],
        dates: [Date],
        numbers: [Number],
        strings: [String],
        buffers: [Buffer],
        nocast: [],
        mixed: [Mixed]
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
      assert.equal(strings[0], 'test');

      assert.equal(typeof strings[1], 'string');
      assert.equal(strings[1], '123');

      var buffers = Loki.path('buffers').cast(['\0\0\0', new Buffer('abc')]);

      assert.ok(buffers[0] instanceof Buffer);
      assert.ok(buffers[1] instanceof Buffer);

      var nocasts = Loki.path('nocast').cast(['test', 123]);

      assert.equal(typeof nocasts[0], 'string');
      assert.equal(nocasts[0], 'test');

      assert.equal(typeof nocasts[1], 'number');
      assert.equal(nocasts[1], 123);

      var mixed = Loki.path('mixed').cast(['test', 123, '123', {}, new Date, new DocumentObjectId]);

      assert.equal(typeof mixed[0], 'string');
      assert.equal(typeof mixed[1], 'number');
      assert.equal(typeof mixed[2], 'string');
      assert.equal(typeof mixed[3], 'object');
      assert.ok(mixed[4] instanceof Date);
      assert.ok(mixed[5] instanceof DocumentObjectId);

      done();
    });

    it('array of arrays', function(done) {
      var test = new Schema({
        nums: [[Number]]
      });
      var nums = test.path('nums').cast([['1', '2']]);
      assert.equal(nums.length, 1);
      assert.deepEqual(nums[0].toObject(), [1, 2]);

      nums = test.path('nums').cast(1);
      assert.equal(nums.length, 1);
      assert.deepEqual(nums[0].toObject(), [1]);

      var threw = false;
      try {
        test.path('nums').cast([['abcd']]);
      } catch (error) {
        threw = true;
        assert.equal(error.name, 'CastError');
        assert.equal(error.message,
          'Cast to [[number]] failed for value "[["abcd"]]" at path "nums"');
      }
      assert.ok(threw);

      done();
    });

    it('boolean', function(done) {
      var Animal = new Schema({
        isFerret: {type: Boolean, required: true}
      });

      assert.strictEqual(Animal.path('isFerret').cast(null), null);
      assert.equal(Animal.path('isFerret').cast(undefined), false);
      assert.equal(Animal.path('isFerret').cast(false), false);
      assert.equal(Animal.path('isFerret').cast(0), false);
      assert.equal(Animal.path('isFerret').cast('0'), false);
      assert.equal(Animal.path('isFerret').cast('false'), false);
      assert.equal(Animal.path('isFerret').cast({}), true);
      assert.equal(Animal.path('isFerret').cast(true), true);
      assert.equal(Animal.path('isFerret').cast(1), true);
      assert.equal(Animal.path('isFerret').cast('1'), true);
      assert.equal(Animal.path('isFerret').cast('true'), true);
      done();
    });
  });

  it('methods declaration', function(done) {
    var a = new Schema;
    a.method('test', function() {
    });
    a.method({
      a: function() {
      },
      b: function() {
      }
    });
    assert.equal(Object.keys(a.methods).length, 3);
    done();
  });

  it('static declaration', function(done) {
    var a = new Schema;
    a.static('test', function() {
    });
    a.static({
      a: function() {
      },
      b: function() {
      },
      c: function() {
      }
    });

    assert.equal(Object.keys(a.statics).length, 4);
    done();
  });

  describe('setters', function() {
    it('work', function(done) {
      function lowercase(v) {
        return v.toLowerCase();
      }

      var Tobi = new Schema({
        name: {type: String, set: lowercase}
      });

      assert.equal(Tobi.path('name').applySetters('WOOT'), 'woot');
      assert.equal(Tobi.path('name').setters.length, 1);

      Tobi.path('name').set(function(v) {
        return v + 'WOOT';
      });

      assert.equal(Tobi.path('name').applySetters('WOOT'), 'wootwoot');
      assert.equal(Tobi.path('name').setters.length, 2);
      done();
    });

    it('order', function(done) {
      function extract(v) {
        return (v && v._id)
            ? v._id
            : v;
      }

      var Tobi = new Schema({
        name: {type: Schema.ObjectId, set: extract}
      });

      var id = new DocumentObjectId,
          sid = id.toString(),
          _id = {_id: id};

      assert.equal(Tobi.path('name').applySetters(sid, {a: 'b'}).toString(), sid);
      assert.equal(Tobi.path('name').applySetters(_id, {a: 'b'}).toString(), sid);
      assert.equal(Tobi.path('name').applySetters(id, {a: 'b'}).toString(), sid);
      done();
    });

    it('scope', function(done) {
      function lowercase(v, self) {
        assert.equal(this.a, 'b');
        assert.equal(self.path, 'name');
        return v.toLowerCase();
      }

      var Tobi = new Schema({
        name: {type: String, set: lowercase}
      });

      assert.equal(Tobi.path('name').applySetters('WHAT', {a: 'b'}), 'what');
      done();
    });

    it('casting', function(done) {
      function last(v) {
        assert.equal(typeof v, 'number');
        assert.equal(v, 0);
        return 'last';
      }

      function first() {
        return 0;
      }

      var Tobi = new Schema({
        name: {type: String, set: last}
      });

      Tobi.path('name').set(first);
      assert.equal(Tobi.path('name').applySetters('woot'), 'last');
      done();
    });

    describe('array', function() {
      it('object setters will be applied for each object in array', function(done) {
        var Tobi = new Schema({
          names: [{type: String, lowercase: true, trim: true}]
        });
        assert.equal(typeof Tobi.path('names').applySetters(['   whaT', 'WoOt  '])[0], 'string');
        assert.equal(typeof Tobi.path('names').applySetters(['   whaT', 'WoOt  '])[1], 'string');
        assert.equal(Tobi.path('names').applySetters(['   whaT', 'WoOt  '])[0], 'what');
        assert.equal(Tobi.path('names').applySetters(['   whaT', 'WoOt  '])[1], 'woot');
        done();
      });
    });

    describe('string', function() {
      it('lowercase', function(done) {
        var Tobi = new Schema({
          name: {type: String, lowercase: true}
        });

        assert.equal(Tobi.path('name').applySetters('WHAT'), 'what');
        assert.equal(Tobi.path('name').applySetters(1977), '1977');
        done();
      });
      it('uppercase', function(done) {
        var Tobi = new Schema({
          name: {type: String, uppercase: true}
        });

        assert.equal(Tobi.path('name').applySetters('what'), 'WHAT');
        assert.equal(Tobi.path('name').applySetters(1977), '1977');
        done();
      });
      it('trim', function(done) {
        var Tobi = new Schema({
          name: {type: String, uppercase: true, trim: true}
        });

        assert.equal(Tobi.path('name').applySetters('  what   '), 'WHAT');
        assert.equal(Tobi.path('name').applySetters(1977), '1977');
        done();
      });
    });

    it('applying when none have been defined', function(done) {
      var Tobi = new Schema({
        name: String
      });

      assert.equal(Tobi.path('name').applySetters('woot'), 'woot');
      done();
    });

    it('assignment of non-functions throw', function(done) {
      var schema = new Schema({fun: String});
      var g;

      try {
        schema.path('fun').set(4);
      } catch (err_) {
        g = err_;
      }

      assert.ok(g);
      assert.equal(g.message, 'A setter must be a function.');
      done();
    });
  });

  describe('getters', function() {
    it('work', function(done) {
      function woot(v) {
        return v + ' woot';
      }

      var Tobi = new Schema({
        name: {type: String, get: woot}
      });

      assert.equal(Tobi.path('name').getters.length, 1);
      assert.equal(Tobi.path('name').applyGetters('test'), 'test woot');
      done();
    });
    it('order', function(done) {
      function format(v) {
        return v
            ? '$' + v
            : v;
      }

      var Tobi = new Schema({
        name: {type: Number, get: format}
      });

      assert.equal(Tobi.path('name').applyGetters(30, {a: 'b'}), '$30');
      done();
    });
    it('scope', function(done) {
      function woot(v, self) {
        assert.equal(this.a, 'b');
        assert.equal(self.path, 'name');
        return v.toLowerCase();
      }

      var Tobi = new Schema({
        name: {type: String, get: woot}
      });

      assert.equal(Tobi.path('name').applyGetters('YEP', {a: 'b'}), 'yep');
      done();
    });
    it('casting', function(done) {
      function last(v) {
        assert.equal(typeof v, 'number');
        assert.equal(v, 0);
        return 'last';
      }

      function first() {
        return 0;
      }

      var Tobi = new Schema({
        name: {type: String, get: last}
      });

      Tobi.path('name').get(first);
      assert.equal(Tobi.path('name').applyGetters('woot'), 'last');
      done();
    });
    it('applying when none have been defined', function(done) {
      var Tobi = new Schema({
        name: String
      });

      assert.equal(Tobi.path('name').applyGetters('woot'), 'woot');
      done();
    });
    it('assignment of non-functions throw', function(done) {
      var schema = new Schema({fun: String});
      var g;

      try {
        schema.path('fun').get(true);
      } catch (err_) {
        g = err_;
      }

      assert.ok(g);
      assert.equal(g.message, 'A getter must be a function.');
      done();
    });
    it('auto _id', function(done) {
      var schema = new Schema({
        name: String
      });
      assert.ok(schema.path('_id') instanceof Schema.ObjectId);

      schema = new Schema({
        name: String
      }, {_id: true});
      assert.ok(schema.path('_id') instanceof Schema.ObjectId);

      schema = new Schema({
        name: String
      }, {_id: false});
      assert.equal(schema.path('_id'), undefined);

      // old options
      schema = new Schema({
        name: String
      }, {noId: false});
      assert.ok(schema.path('_id') instanceof Schema.ObjectId);

      schema = new Schema({
        name: String
      }, {noId: true});
      assert.equal(schema.path('_id'), undefined);
      done();
    });
  });

  describe('hooks', function() {
    it('registration', function(done) {
      var Tobi = new Schema();

      Tobi.pre('save', function() {
      });
      assert.equal(Tobi.callQueue.length, 2);

      Tobi.post('save', function() {
      });
      assert.equal(Tobi.callQueue.length, 3);

      Tobi.pre('save', function() {
      });
      assert.equal(Tobi.callQueue.length, 4);
      done();
    });
  });

  describe('indexes', function() {
    describe('definition', function() {
      it('basic', function(done) {
        var Tobi = new Schema({
          name: {type: String, index: true}
        });

        assert.equal(Tobi.path('name')._index, true);
        Tobi.path('name').index({unique: true});
        assert.deepEqual(Tobi.path('name')._index, {unique: true});
        Tobi.path('name').unique(false);
        assert.deepEqual(Tobi.path('name')._index, {unique: false});

        var T, i;

        T = new Schema({
          name: {type: String, sparse: true}
        });
        assert.deepEqual(T.path('name')._index, {sparse: true});

        T = new Schema({
          name: {type: String, unique: true}
        });
        assert.deepEqual(T.path('name')._index, {unique: true});

        T = new Schema({
          name: {type: Date, expires: '1.5m'}
        });
        assert.deepEqual(T.path('name')._index, {expireAfterSeconds: 90});

        T = new Schema({
          name: {type: Date, expires: 200}
        });
        assert.deepEqual(T.path('name')._index, {expireAfterSeconds: 200});

        T = new Schema({
          name: {type: String, sparse: true, unique: true}
        });
        assert.deepEqual(T.path('name')._index, {sparse: true, unique: true});

        T = new Schema({
          name: {type: String, unique: true, sparse: true}
        });
        i = T.path('name')._index;
        assert.equal(i.unique, true);
        assert.equal(i.sparse, true);

        T = new Schema({
          name: {type: String, index: {sparse: true, unique: true, expireAfterSeconds: 65}}
        });
        i = T.path('name')._index;
        assert.equal(i.unique, true);
        assert.equal(i.sparse, true);
        assert.equal(i.expireAfterSeconds, 65);

        T = new Schema({
          name: {type: Date, index: {sparse: true, unique: true, expires: '24h'}}
        });
        i = T.path('name')._index;
        assert.equal(i.unique, true);
        assert.equal(i.sparse, true);
        assert.equal(i.expireAfterSeconds, 60 * 60 * 24);

        T = new Schema({
          name: {type: String, index: false, unique: false}
        });
        assert.equal(T.path('name')._index, false);
        assert.equal(T.indexes().length, 0);

        done();
      });
      it('compound', function(done) {
        var Tobi = new Schema({
          name: {type: String, index: true},
          last: {type: Number, sparse: true},
          nope: {type: String, index: {background: false}}
        });

        Tobi.index({firstname: 1, last: 1}, {unique: true, expires: '1h'});
        Tobi.index({firstname: 1, nope: 1}, {unique: true, background: false});

        assert.deepEqual(Tobi.indexes(), [
          [{name: 1}, {background: true}],
          [{last: 1}, {sparse: true, background: true}],
          [{nope: 1}, {background: false}],
          [{firstname: 1, last: 1}, {unique: true, expireAfterSeconds: 60 * 60, background: true}],
          [{firstname: 1, nope: 1}, {unique: true, background: false}]
        ]);

        done();
      });
    });
  });

  describe('plugins', function() {
    it('work', function(done) {
      var Tobi = new Schema,
          called = false;

      Tobi.plugin(function(schema) {
        assert.equal(schema, Tobi);
        called = true;
      });

      assert.equal(called, true);
      done();
    });
  });

  describe('options', function() {
    it('defaults are set', function(done) {
      var Tobi = new Schema();

      assert.equal(typeof Tobi.options, 'object');
      assert.equal(Tobi.options.safe, undefined);
      assert.equal(Tobi.options.strict, true);
      assert.equal(Tobi.options.capped, false);
      assert.equal(Tobi.options.versionKey, '__v');
      assert.equal(Tobi.options.discriminatorKey, '__t');
      assert.equal(Tobi.options.shardKey, null);
      assert.equal(Tobi.options.read, null);
      assert.equal(Tobi.options._id, true);
      done();
    });

    it('setting', function(done) {
      var Tobi = new Schema({}, {collection: 'users'});

      Tobi.set('a', 'b');
      Tobi.set('safe', false);
      assert.equal(Tobi.options.collection, 'users');

      assert.equal(Tobi.options.a, 'b');
      assert.deepEqual(Tobi.options.safe, {w: 0});
      assert.equal(Tobi.options.read, null);

      var tags = [{x: 1}];

      Tobi.set('read', 'n');
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal(Tobi.options.read.mode, 'nearest');

      Tobi.set('read', 'n', tags);
      assert.equal(Tobi.options.read.mode, 'nearest');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi.set('read', ['n', tags]);
      assert.equal(Tobi.options.read.mode, 'nearest');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, {read: 'p'});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal(Tobi.options.read.mode, 'primary');

      Tobi = new Schema({}, {read: ['p', tags]});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal(Tobi.options.read.mode, 'primary');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, {read: 'primary'});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal(Tobi.options.read.mode, 'primary');

      Tobi = new Schema({}, {read: ['primary', tags]});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal(Tobi.options.read.mode, 'primary');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, {read: 's'});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal(Tobi.options.read.mode, 'secondary');

      Tobi = new Schema({}, {read: ['s', tags]});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal(Tobi.options.read.mode, 'secondary');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, {read: 'secondary'});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal(Tobi.options.read.mode, 'secondary');

      Tobi = new Schema({}, {read: ['secondary', tags]});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.equal(Tobi.options.read.mode, 'secondary');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, {read: 'pp'});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal(Tobi.options.read.mode, 'primaryPreferred');

      Tobi = new Schema({}, {read: ['pp', tags]});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal(Tobi.options.read.mode, 'primaryPreferred');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, {read: 'primaryPreferred'});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal(Tobi.options.read.mode, 'primaryPreferred');

      Tobi = new Schema({}, {read: ['primaryPreferred', tags]});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal(Tobi.options.read.mode, 'primaryPreferred');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, {read: 'sp'});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal(Tobi.options.read.mode, 'secondaryPreferred');

      Tobi = new Schema({}, {read: ['sp', tags]});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal(Tobi.options.read.mode, 'secondaryPreferred');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, {read: 'secondaryPreferred'});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal(Tobi.options.read.mode, 'secondaryPreferred');

      Tobi = new Schema({}, {read: ['secondaryPreferred', tags]});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal(Tobi.options.read.mode, 'secondaryPreferred');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, {read: 'n'});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal(Tobi.options.read.mode, 'nearest');

      Tobi = new Schema({}, {read: ['n', tags]});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal(Tobi.options.read.mode, 'nearest');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, {read: 'nearest'});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal(Tobi.options.read.mode, 'nearest');

      Tobi = new Schema({}, {read: ['nearest', tags]});
      assert.ok(Tobi.options.read instanceof ReadPref);
      assert.ok(Tobi.options.read.isValid());
      assert.equal(Tobi.options.read.mode, 'nearest');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      done();
    });
  });

  describe('virtuals', function() {
    it('works', function(done) {
      var Contact = new Schema({
        firstName: String,
        lastName: String
      });

      Contact
      .virtual('fullName')
      .get(function() {
        return this.get('firstName') + ' ' + this.get('lastName');
      })
      .set(function(fullName) {
        var split = fullName.split(' ');
        this.set('firstName', split[0]);
        this.set('lastName', split[1]);
      });

      assert.ok(Contact.virtualpath('fullName') instanceof VirtualType);
      done();
    });

    describe('id', function() {
      it('default creation of id can be overridden (gh-298)', function(done) {
        assert.doesNotThrow(function() {
          new Schema({id: String});
        });
        done();
      });
      it('disabling', function(done) {
        var schema = new Schema({name: String}, {noVirtualId: true});
        assert.strictEqual(undefined, schema.virtuals.id);
        done();
      });
    });

    describe('getter', function() {
      it('scope', function(done) {
        var Tobi = new Schema;

        Tobi.virtual('name').get(function(v, self) {
          assert.equal(this.a, 'b');
          assert.equal(self.path, 'name');
          return v.toLowerCase();
        });

        assert.equal(Tobi.virtualpath('name').applyGetters('YEP', {a: 'b'}), 'yep');
        done();
      });
    });

    describe('setter', function() {
      it('scope', function(done) {
        var Tobi = new Schema;

        Tobi.virtual('name').set(function(v, self) {
          assert.equal(this.a, 'b');
          assert.equal(self.path, 'name');
          return v.toLowerCase();
        });

        assert.equal(Tobi.virtualpath('name').applySetters('YEP', {a: 'b'}), 'yep');
        done();
      });
    });
  });

  describe('other contexts', function() {
    it('work', function(done) {
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
      var sandbox = {code: null};
      script.runInNewContext(sandbox);

      var Ferret = new Schema(sandbox.code);
      assert.ok(Ferret.path('nest.sub') instanceof SchemaTypes.Mixed);
      assert.ok(Ferret.path('name') instanceof SchemaTypes.String);
      assert.ok(Ferret.path('arr1') instanceof SchemaTypes.Array);
      assert.ok(Ferret.path('arr2') instanceof SchemaTypes.Array);
      assert.ok(Ferret.path('date') instanceof SchemaTypes.Date);
      assert.ok(Ferret.path('num') instanceof SchemaTypes.Number);
      assert.ok(Ferret.path('bool') instanceof SchemaTypes.Boolean);
      done();
    });
  });

  describe('#add()', function() {
    it('does not polute existing paths', function(done) {
      var o = {name: String};
      var s = new Schema(o);

      assert.throws(function() {
        s.add({age: Number}, 'name.');
      }, /Cannot set nested path/);

      assert.throws(function() {
        s.add({age: {x: Number}}, 'name.');
      }, /Cannot set nested path/);
      assert.equal(('age' in o.name), false);

      o = {name: 'string'};
      s = new Schema(o);

      assert.throws(function() {
        s.add({age: Number}, 'name.');
      }, /Cannot set nested path/);

      assert.throws(function() {
        s.add({age: {x: Number}}, 'name.');
      }, /Cannot set nested path/);

      assert.equal(o.name, 'string');
      done();
    });

    it('merging nested objects (gh-662)', function(done) {
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
          foo: 'baz',
          b: {
            bar: 'qux'
          }
        }
      });

      merged.save(function(err) {
        assert.ifError(err);
        Merged.findById(merged.id, function(err, found) {
          db.close();
          assert.ifError(err);
          assert.equal(found.a.foo, 'baz');
          assert.equal(found.a.b.bar, 'qux');
          done();
        });
      });
    });

    it('prefix (gh-1730)', function(done) {
      var s = new Schema({});

      s.add({ n: Number }, 'prefix.');

      assert.equal(s.pathType('prefix.n'), 'real');
      assert.equal(s.pathType('prefix'), 'nested');
      done();
    });
  });

  it('debugging msgs', function(done) {
    var err;
    try {
      new Schema({name: {first: null}});
    } catch (e) {
      err = e;
    }
    assert.equal(err.message, 'Invalid value for schema path `name.first`');
    try {
      new Schema({age: undefined});
    } catch (e) {
      err = e;
    }
    assert.equal(err.message, 'Invalid value for schema path `age`');
    done();
  });

  describe('construction', function() {
    it('array of object literal missing a type is interpreted as DocumentArray', function(done) {
      var goose = new mongoose.Mongoose;
      var s = new Schema({
        arr: [
          {something: {type: String}}
        ]
      });
      assert.ok(s.path('arr') instanceof SchemaTypes.DocumentArray);
      var M = goose.model('objectliteralschema', s);
      var m = new M({arr: [{something: 'wicked this way comes'}]});
      assert.equal(m.arr[0].something, 'wicked this way comes');
      assert.ok(m.arr[0]._id);
      done();
    });

    it('array of object literal with type.type is interpreted as DocumentArray', function(done) {
      var goose = new mongoose.Mongoose;
      var s = new Schema({
        arr: [
          {type: {type: String}}
        ]
      });
      assert.ok(s.path('arr') instanceof SchemaTypes.DocumentArray);
      var M = goose.model('objectliteralschema2', s);
      var m = new M({arr: [{type: 'works'}]});
      assert.equal(m.arr[0].type, 'works');
      assert.ok(m.arr[0]._id);
      done();
    });

    it('does not alter original argument (gh-1364)', function(done) {
      var schema = {
        ids: [{type: Schema.ObjectId, ref: 'something'}],
        a: {type: Array},
        b: Array,
        c: [Date],
        d: {type: 'Boolean'},
        e: [{a: String, b: [{type: {type: Buffer}, x: Number}]}]
      };

      new Schema(schema);
      assert.equal(Object.keys(schema).length, 6);
      assert.deepEqual([{type: Schema.ObjectId, ref: 'something'}], schema.ids);
      assert.deepEqual({type: Array}, schema.a);
      assert.deepEqual(Array, schema.b);
      assert.deepEqual([Date], schema.c);
      assert.deepEqual({type: 'Boolean'}, schema.d);
      assert.deepEqual([{a: String, b: [{type: {type: Buffer}, x: Number}]}], schema.e);

      done();
    });

    it('properly gets value of plain objects when dealing with refs (gh-1606)', function(done) {
      var db = start();
      var el = new Schema({title: String});
      var so = new Schema({
        title: String,
        obj: {type: Schema.Types.ObjectId, ref: 'Element'}
      });

      var Element = db.model('Element', el);
      var Some = db.model('Some', so);

      var ele = new Element({title: 'thing'});

      ele.save(function(err) {
        assert.ifError(err);
        var s = new Some({obj: ele.toObject()});
        s.save(function(err) {
          assert.ifError(err);
          Some.findOne({_id: s.id}, function(err, ss) {
            assert.ifError(err);
            assert.equal(ss.obj, ele.id);
            db.close(done);
          });
        });
      });
    });
  });

  describe('property names', function() {
    it('that conflict throw', function(done) {
      var child = new Schema({name: String});

      assert.throws(function() {
        new Schema({
          on: String,
          child: [child]
        });
      }, /`on` may not be used as a schema pathname/);

      assert.throws(function() {
        new Schema({
          collection: String
        });
      }, /`collection` may not be used as a schema pathname/);

      assert.throws(function() {
        new Schema({
          schema: String
        });
      }, /`schema` may not be used as a schema pathname/);

      assert.throws(function() {
        new Schema({
          db: String
        });
      }, /`db` may not be used as a schema pathname/);

      assert.throws(function() {
        new Schema({
          modelName: String
        });
      }, /`modelName` may not be used as a schema pathname/);

      assert.throws(function() {
        new Schema({
          isNew: String
        });
      }, /`isNew` may not be used as a schema pathname/);

      assert.throws(function() {
        new Schema({
          errors: String
        });
      }, /`errors` may not be used as a schema pathname/);

      assert.throws(function() {
        new Schema({
          init: String
        });
      }, /`init` may not be used as a schema pathname/);

      done();
    });

    it('that do not conflict do not throw', function(done) {
      assert.doesNotThrow(function() {
        new Schema({
          model: String
        });
      });

      assert.doesNotThrow(function() {
        Schema({child: [{parent: String}]});
      });

      assert.doesNotThrow(function() {
        Schema({child: [{parentArray: String}]});
      });

      assert.doesNotThrow(function() {
        var s = new Schema({docs: [{path: String}]});
        var M = mongoose.model('gh-1245', s);
        new M({docs: [{path: 'works'}]});
      });

      assert.doesNotThrow(function() {
        var s = new Schema({setMaxListeners: String});
        var M = mongoose.model('setMaxListeners-as-property-name', s);
        new M({setMaxListeners: 'works'});
      });

      done();
    });

    it('permit _scope to be used (gh-1184)', function(done) {
      var db = start();
      var child = new Schema({_scope: Schema.ObjectId});
      var C = db.model('scope', child);
      var c = new C;
      c.save(function(err) {
        db.close();
        assert.ifError(err);
        try {
          c._scope;
        } catch (e) {
          err = e;
        }
        assert.ifError(err);
        db.close(done);
      });
    });
  });

  describe('pathType()', function() {
    var schema;

    before(function() {
      schema = new Schema({
        n: String,
        nest: {thing: {nests: Boolean}},
        docs: [{x: [{y: String}]}],
        mixed: {}
      });
      schema.virtual('myVirtual').get(function() { return 42; });
    });

    describe('when called on an explicit real path', function() {
      it('returns "real"', function(done) {
        assert.equal(schema.pathType('n'), 'real');
        assert.equal(schema.pathType('nest.thing.nests'), 'real');
        assert.equal(schema.pathType('docs'), 'real');
        assert.equal(schema.pathType('docs.0.x'), 'real');
        assert.equal(schema.pathType('docs.0.x.3.y'), 'real');
        assert.equal(schema.pathType('mixed'), 'real');
        done();
      });
    });
    describe('when called on a virtual', function() {
      it('returns virtual', function(done) {
        assert.equal(schema.pathType('myVirtual'), 'virtual');
        done();
      });
    });
    describe('when called on nested structure', function() {
      it('returns nested', function(done) {
        assert.equal(schema.pathType('nest'), 'nested');
        assert.equal(schema.pathType('nest.thing'), 'nested');
        done();
      });
    });
    describe('when called on undefined path', function() {
      it('returns adHocOrUndefined', function(done) {
        assert.equal(schema.pathType('mixed.what'), 'adhocOrUndefined');
        assert.equal(schema.pathType('mixed.4'), 'adhocOrUndefined');
        assert.equal(schema.pathType('mixed.4.thing'), 'adhocOrUndefined');
        assert.equal(schema.pathType('mixed.4a.thing'), 'adhocOrUndefined');
        assert.equal(schema.pathType('mixed.4.9.thing'), 'adhocOrUndefined');
        assert.equal(schema.pathType('n.3'), 'adhocOrUndefined');
        assert.equal(schema.pathType('n.3a'), 'adhocOrUndefined');
        assert.equal(schema.pathType('n.3.four'), 'adhocOrUndefined');
        assert.equal(schema.pathType('n.3.4'), 'adhocOrUndefined');
        assert.equal(schema.pathType('n.3.4a'), 'adhocOrUndefined');
        assert.equal(schema.pathType('nest.x'), 'adhocOrUndefined');
        assert.equal(schema.pathType('nest.thing.x'), 'adhocOrUndefined');
        assert.equal(schema.pathType('nest.thing.nests.9'), 'adhocOrUndefined');
        assert.equal(schema.pathType('nest.thing.nests.9a'), 'adhocOrUndefined');
        assert.equal(schema.pathType('nest.thing.nests.a'), 'adhocOrUndefined');
        done();
      });
    });
  });

  it('required() with doc arrays (gh-3199)', function(done) {
    var schema = new Schema({
      test: [{x: String}]
    });

    schema.path('test').schema.path('x').required(true);
    var M = mongoose.model('gh3199', schema);
    var m = new M({test: [{}]});

    assert.equal(m.validateSync().errors['test.0.x'].kind, 'required');
    done();
  });

  it('custom typeKey in doc arrays (gh-3560)', function(done) {
    var schema = new Schema({
      test: [{
        name: {$type: String}
      }]
    }, {typeKey: '$type'});

    schema.path('test').schema.path('name').required(true);
    var M = mongoose.model('gh3560', schema);
    var m = new M({test: [{name: 'Val'}]});

    assert.ifError(m.validateSync());
    assert.equal(m.test[0].name, 'Val');
    done();
  });

  it('required for single nested schemas (gh-3562)', function(done) {
    var personSchema = new Schema({
      name: {type: String, required: true}
    });

    var bandSchema = new Schema({
      name: String,
      guitarist: {type: personSchema, required: true}
    });

    var Band = mongoose.model('gh3562', bandSchema);
    var band = new Band({name: 'Guns N\' Roses'});

    assert.ok(band.validateSync());
    assert.ok(band.validateSync().errors.guitarist);
    band.guitarist = {name: 'Slash'};
    assert.ifError(band.validateSync());

    done();
  });

  it('booleans cause cast error for date (gh-3935)', function(done) {
    var testSchema = new Schema({
      test: Date
    });

    var Test = mongoose.model('gh3935', testSchema);
    var test = new Test({ test: true });

    assert.ok(test.validateSync());
    assert.equal(test.validateSync().errors.test.name, 'CastError');

    done();
  });

  it('trim: false works with strings (gh-4042)', function(done) {
    var testSchema = new Schema({
      test: { type: String, trim: false }
    });

    var Test = mongoose.model('gh4042', testSchema);
    var test = new Test({ test: ' test ' });
    assert.equal(test.test, ' test ');
    done();
  });

  it('arrays with typeKey (gh-4548)', function(done) {
    var testSchema = new Schema({
      test: [{ $type: String }]
    }, { typeKey: '$type' });

    assert.equal(testSchema.paths.test.caster.instance, 'String');

    var Test = mongoose.model('gh4548', testSchema);
    var test = new Test({ test: [123] });
    assert.strictEqual(test.test[0], '123');
    done();
  });

  it('arrays of mixed arrays (gh-5416)', function(done) {
    var testSchema = new Schema({
      test: [Array]
    });

    assert.ok(testSchema.paths.test.casterConstructor !== Array);
    assert.equal(testSchema.paths.test.casterConstructor,
      mongoose.Schema.Types.Array);

    done();
  });

  describe('remove()', function() {
    before(function() {
      this.schema = new Schema({
        a: String,
        b: {
          c: {
            d: String
          }
        },
        e: Number,
        f: String,
        g: [String]
      });
    });

    it('removes a single path', function(done) {
      this.schema.remove('a');
      assert.strictEqual(this.schema.path('a'), undefined);
      done();
    });

    it('removes a nested path', function(done) {
      this.schema.remove('b.c.d');
      assert.strictEqual(this.schema.path('b'), undefined);
      assert.strictEqual(this.schema.path('b.c'), undefined);
      assert.strictEqual(this.schema.path('b.c.d'), undefined);
      done();
    });

    it('removes an array of paths', function(done) {
      this.schema.remove(['e', 'f', 'g']);
      assert.strictEqual(this.schema.path('e'), undefined);
      assert.strictEqual(this.schema.path('f'), undefined);
      assert.strictEqual(this.schema.path('g'), undefined);
      done();
    });

    it('works properly with virtuals (gh-2398)', function(done) {
      this.schema.remove('a');
      this.schema.virtual('a').get(function() { return 42; });
      var Test = mongoose.model('gh2398', this.schema);
      var t = new Test();
      assert.equal(t.a, 42);
      done();
    });

    it('methods named toString (gh-4551)', function(done) {
      this.schema.methods.toString = function() {
        return 'test';
      };
      // should not throw
      mongoose.model('gh4551', this.schema);
      done();
    });

    it('handles default value = 0 (gh-4620)', function(done) {
      var schema = new Schema({
        tags: { type: [Number], default: 0 }
      });
      assert.deepEqual(schema.path('tags').getDefault().toObject(), [0]);
      done();
    });

    it('type: childSchema (gh-5521)', function(done) {
      var childSchema = new mongoose.Schema({
        name: String
      }, { _id: false });

      var schema = new mongoose.Schema({
        children: [{ type: childSchema }]
      });

      var Model = mongoose.model('gh5521', schema);

      var doc = new Model({ children: [{ name: 'test' }] });
      assert.deepEqual(doc.toObject().children, [{ name: 'test' }]);
      done();
    });

    it('Decimal128 type (gh-4759)', function(done) {
      var Decimal128 = mongoose.Schema.Types.Decimal128;
      var schema = new Schema({
        num: Decimal128,
        nums: ['Decimal128']
      });
      assert.ok(schema.path('num') instanceof Decimal128);
      assert.ok(schema.path('nums').caster instanceof Decimal128);

      var casted = schema.path('num').cast('6.2e+23');
      assert.ok(casted instanceof mongoose.Types.Decimal128);
      assert.equal(casted.toString(), '6.2E+23');
      done();
    });

    it('clone() copies validators declared with validate() (gh-5607)', function(done) {
      var schema = new Schema({
        num: Number
      });

      schema.path('num').validate(function(v) {
        return v === 42;
      });

      var clone = schema.clone();
      assert.equal(clone.path('num').validators.length, 1);
      assert.ok(clone.path('num').validators[0].validator(42));
      assert.ok(!clone.path('num').validators[0].validator(41));
      done();
    });

    it('TTL index with timestamps (gh-5656)', function(done) {
      var testSchema = new mongoose.Schema({
        foo: String,
        updatedAt: {
          type: Date,
          expires: '2h'
        }
      }, { timestamps: true });

      var indexes = testSchema.indexes();
      assert.deepEqual(indexes, [
        [{ updatedAt: 1 }, { background: true, expireAfterSeconds: 7200 }]
      ]);
      done();
    });
  });
});
