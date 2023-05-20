'use strict';

/**
 * Module dependencies.
 */

const start = require('./common');

const mongoose = start.mongoose;
const assert = require('assert');
const sinon = require('sinon');
const Schema = mongoose.Schema;
const Document = mongoose.Document;
const VirtualType = mongoose.VirtualType;
const SchemaTypes = Schema.Types;
const ObjectId = SchemaTypes.ObjectId;
const Mixed = SchemaTypes.Mixed;
const DocumentObjectId = mongoose.Types.ObjectId;
const vm = require('vm');
const idGetter = require('../lib/helpers/schema/idGetter');
const applyPlugins = require('../lib/helpers/schema/applyPlugins');

/**
 * Test Document constructor.
 */

function TestDocument() {
  Document.apply(this, arguments);
}

/**
 * Inherits from Document.
 */

Object.setPrototypeOf(TestDocument.prototype, Document.prototype);

/**
 * Test.
 */

describe('schema', function() {
  let db;

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  before(function() {
    TestDocument.prototype.$__setSchema(new Schema({
      test: String
    }));
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  describe('nested fields with same name', function() {
    let NestedModel;

    before(function() {
      const NestedSchema = new Schema({
        a: {
          b: {
            c: { $type: String },
            d: { $type: String }
          }
        },
        b: { $type: String }
      }, { typeKey: '$type' });
      NestedModel = db.model('Test', NestedSchema);
    });

    it('don\'t disappear', async function() {
      const n = new NestedModel({
        a: {
          b: {
            c: 'foo',
            d: 'bar'
          }
        }, b: 'foobar'
      });

      await n.save();
      const nm = await NestedModel.findOne({ _id: n._id });

      // make sure no field has disappeared
      assert.ok(nm.a);
      assert.ok(nm.a.b);
      assert.ok(nm.a.b.c);
      assert.ok(nm.a.b.d);
      assert.equal(nm.a.b.c, n.a.b.c);
      assert.equal(nm.a.b.d, n.a.b.d);


    });
  });


  it('can be created without the "new" keyword', function() {
    const schema = new Schema({ name: String });
    assert.ok(schema instanceof Schema);
  });

  it('does expose a property for duck-typing instanceof', function() {
    const schema = new Schema({ name: String });
    assert.ok(schema.instanceOfSchema);
  });

  it('supports different schematypes', function() {
    const Checkin = new Schema({
      date: Date,
      location: {
        lat: Number,
        lng: Number
      }
    });

    const Ferret = new Schema({
      name: String,
      owner: ObjectId,
      fur: String,
      color: { type: String },
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
    const Checkin1 = new Schema({
      date: 'date',
      location: {
        lat: 'number',
        lng: 'Number'
      }
    });

    assert.ok(Checkin1.path('date') instanceof SchemaTypes.Date);
    assert.ok(Checkin1.path('location.lat') instanceof SchemaTypes.Number);
    assert.ok(Checkin1.path('location.lng') instanceof SchemaTypes.Number);

    const Ferret1 = new Schema({
      name: 'string',
      owner: 'oid',
      fur: { type: 'string' },
      color: { type: 'String' },
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

  });

  it('supports dot notation for path accessors', function() {
    const Racoon = new Schema({
      name: { type: String, enum: ['Edwald', 'Tobi'] },
      age: Number
    });

    // check for global variable leak
    assert.equal(typeof errorMessage, 'undefined');

    const Person = new Schema({
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

  });

  it('allows paths nested > 2 levels', function() {
    const Nested = new Schema({
      first: {
        second: {
          third: String
        }
      }
    });
    assert.ok(Nested.path('first.second.third') instanceof SchemaTypes.String);

  });

  it('default definition', function() {
    const Test = new Schema({
      simple: { $type: String, default: 'a' },
      array: { $type: Array, default: [1, 2, 3, 4, 5] },
      arrayX: { $type: Array, default: 9 },
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
    }, { typeKey: '$type' });

    assert.equal(Test.path('simple').defaultValue, 'a');
    assert.equal(typeof Test.path('callback').defaultValue, 'function');

    assert.equal(Test.path('simple').getDefault(), 'a');
    assert.equal((+Test.path('callback').getDefault({ a: 'b' })), 3);
    assert.equal(typeof Test.path('array').defaultValue, 'function');
    assert.equal(Test.path('array').getDefault(new TestDocument())[3], 4);
    assert.equal(Test.path('arrayX').getDefault(new TestDocument())[0], 9);
    assert.equal(typeof Test.path('arrayFn').defaultValue, 'function');
    assert.ok(Test.path('arrayFn').getDefault(new TestDocument()).isMongooseArray);
    assert.ok(Test.path('arrayX').getDefault(new TestDocument()).isMongooseArray);
    assert.equal(Test.path('arrayX').getDefault(new TestDocument())[0], 9);

  });

  it('Mixed defaults can be empty arrays', function() {
    const Test = new Schema({
      mixed1: { type: Mixed, default: [] },
      mixed2: { type: Mixed, default: Array }
    });

    assert.ok(Test.path('mixed1').getDefault() instanceof Array);
    assert.equal(Test.path('mixed1').getDefault().length, 0);
    assert.ok(Test.path('mixed2').getDefault() instanceof Array);
    assert.equal(Test.path('mixed2').getDefault().length, 0);

  });

  describe('casting', function() {
    it('number', function() {
      const Tobi = new Schema({
        age: Number
      });

      // test String -> Number cast
      assert.equal(typeof Tobi.path('age').cast('0'), 'number');
      assert.equal((+Tobi.path('age').cast('0')), 0);

      assert.equal(typeof Tobi.path('age').cast(0), 'number');
      assert.equal((+Tobi.path('age').cast(0)), 0);

    });

    describe('string', function() {
      it('works', function() {
        const Tobi = new Schema({
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
        assert.equal(typeof Tobi.path('nickname').cast(new Test()), 'string');
        assert.equal(Tobi.path('nickname').cast(new Test()), 'woot');

      });
    });

    it('date', function() {
      const Loki = new Schema({
        birth_date: { type: Date }
      });

      assert.ok(Loki.path('birth_date').cast(1294525628301) instanceof Date);
      assert.ok(Loki.path('birth_date').cast('8/24/2000') instanceof Date);
      assert.ok(Loki.path('birth_date').cast(new Date()) instanceof Date);
      assert.ok(Loki.path('birth_date').cast('') === null);
      assert.ok(Loki.path('birth_date').cast(null) === null);

    });

    it('objectid', function() {
      const Loki = new Schema({
        owner: { type: ObjectId }
      });

      const doc = new TestDocument();
      const id = doc._id.toString();

      assert.ok(Loki.path('owner').cast('4c54f3453e688c000000001a') instanceof DocumentObjectId);

      assert.ok(Loki.path('owner').cast(new DocumentObjectId()) instanceof DocumentObjectId);

      assert.ok(Loki.path('owner').cast(doc) instanceof DocumentObjectId);

      assert.equal(Loki.path('owner').cast(doc).toString(), id);

    });

    it('array', function() {
      const Loki = new Schema({
        oids: [ObjectId],
        dates: [Date],
        numbers: [Number],
        strings: [String],
        buffers: [Buffer],
        nocast: [],
        mixed: [Mixed]
      });

      const oids = Loki.path('oids').cast(['4c54f3453e688c000000001a', new DocumentObjectId()]);

      assert.ok(oids[0] instanceof DocumentObjectId);
      assert.ok(oids[1] instanceof DocumentObjectId);

      const dates = Loki.path('dates').cast(['8/24/2010', 1294541504958]);

      assert.ok(dates[0] instanceof Date);
      assert.ok(dates[1] instanceof Date);

      const numbers = Loki.path('numbers').cast([152, '31']);

      assert.equal(typeof numbers[0], 'number');
      assert.equal(typeof numbers[1], 'number');

      const strings = Loki.path('strings').cast(['test', 123]);

      assert.equal(typeof strings[0], 'string');
      assert.equal(strings[0], 'test');

      assert.equal(typeof strings[1], 'string');
      assert.equal(strings[1], '123');

      const buffers = Loki.path('buffers').cast(['\0\0\0', Buffer.from('abc')]);

      assert.ok(buffers[0] instanceof Buffer);
      assert.ok(buffers[1] instanceof Buffer);

      const nocasts = Loki.path('nocast').cast(['test', 123]);

      assert.equal(typeof nocasts[0], 'string');
      assert.equal(nocasts[0], 'test');

      assert.equal(typeof nocasts[1], 'number');
      assert.equal(nocasts[1], 123);

      const mixed = Loki.path('mixed').cast(['test', 123, '123', {}, new Date(), new DocumentObjectId()]);

      assert.equal(typeof mixed[0], 'string');
      assert.equal(typeof mixed[1], 'number');
      assert.equal(typeof mixed[2], 'string');
      assert.equal(typeof mixed[3], 'object');
      assert.ok(mixed[4] instanceof Date);
      assert.ok(mixed[5] instanceof DocumentObjectId);

      // gh-6405
      assert.ok(Loki.path('dates.$') instanceof SchemaTypes.Date);
      assert.ok(Loki.path('numbers.$') instanceof SchemaTypes.Number);
      assert.ok(Loki.path('strings.$') instanceof SchemaTypes.String);
      assert.ok(Loki.path('buffers.$') instanceof SchemaTypes.Buffer);
      assert.ok(Loki.path('mixed.$') instanceof SchemaTypes.Mixed);


    });

    it('array of arrays', function() {
      const test = new Schema({
        nums: [[Number]],
        strings: [{ type: [String] }]
      });
      let nums = test.path('nums').cast([['1', '2']]);
      assert.equal(nums.length, 1);
      assert.deepEqual(nums[0].toObject(), [1, 2]);

      nums = test.path('nums').cast(1);
      assert.equal(nums.length, 1);
      assert.deepEqual(nums[0].toObject(), [1]);

      let threw = false;
      try {
        test.path('nums').cast([['abcd']]);
      } catch (error) {
        threw = true;
        assert.equal(error.name, 'CastError');
        assert.ok(error.message.includes('Cast to [[Number]] failed'), error.message);
      }
      assert.ok(threw);

      const strs = test.path('strings').cast('test');
      assert.equal(strs.length, 1);
      assert.deepEqual(strs[0].toObject(), ['test']);


    });

    it('boolean', function() {
      const Animal = new Schema({
        isFerret: { type: Boolean, required: true }
      });

      assert.strictEqual(Animal.path('isFerret').cast(null), null);
      assert.strictEqual(Animal.path('isFerret').cast(undefined), undefined);

      assert.equal(Animal.path('isFerret').cast(false), false);
      assert.equal(Animal.path('isFerret').cast(0), false);
      assert.equal(Animal.path('isFerret').cast('0'), false);
      assert.equal(Animal.path('isFerret').cast('false'), false);
      assert.equal(Animal.path('isFerret').cast(true), true);
      assert.equal(Animal.path('isFerret').cast(1), true);
      assert.equal(Animal.path('isFerret').cast('1'), true);
      assert.equal(Animal.path('isFerret').cast('true'), true);

    });
  });

  it('methods declaration', function() {
    const a = new Schema();
    a.method('test', function() {
    });
    a.method({
      a: function() {
      },
      b: function() {
      }
    });
    assert.equal(Object.keys(a.methods).length, 3);

  });

  it('static declaration', function() {
    const a = new Schema();
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

  });

  describe('setters', function() {
    it('work', function() {
      function lowercase(v) {
        return v.toLowerCase();
      }

      const Tobi = new Schema({
        name: { type: String, set: lowercase }
      });

      assert.equal(Tobi.path('name').applySetters('WOOT'), 'woot');
      assert.equal(Tobi.path('name').setters.length, 1);

      Tobi.path('name').set(function(v) {
        return v + 'WOOT';
      });

      assert.equal(Tobi.path('name').applySetters('WOOT'), 'wootwoot');
      assert.equal(Tobi.path('name').setters.length, 2);

    });

    it('order', function() {
      function extract(v) {
        return (v && v._id)
          ? v._id
          : v;
      }

      const Tobi = new Schema({
        name: { type: Schema.ObjectId, set: extract }
      });

      const id = new DocumentObjectId();
      const sid = id.toString();
      const _id = { _id: id };

      assert.equal(Tobi.path('name').applySetters(sid, { a: 'b' }).toString(), sid);
      assert.equal(Tobi.path('name').applySetters(_id, { a: 'b' }).toString(), sid);
      assert.equal(Tobi.path('name').applySetters(id, { a: 'b' }).toString(), sid);

    });

    it('scope', function() {
      function lowercase(v, cur, self) {
        assert.equal(this.a, 'b');
        assert.equal(self.path, 'name');
        return v.toLowerCase();
      }

      const Tobi = new Schema({
        name: { type: String, set: lowercase }
      });

      assert.equal(Tobi.path('name').applySetters('WHAT', { a: 'b' }), 'what');

    });

    it('casting', function() {
      function last(v) {
        assert.equal(typeof v, 'number');
        assert.equal(v, 0);
        return 'last';
      }

      function first() {
        return 0;
      }

      const Tobi = new Schema({
        name: { type: String, set: last }
      });

      Tobi.path('name').set(first);
      assert.equal(Tobi.path('name').applySetters('woot'), 'last');

    });

    describe('array', function() {
      it('object setters will be applied for each object in array', function() {
        const Tobi = new Schema({
          names: [{ type: String, lowercase: true, trim: true }]
        });
        assert.equal(typeof Tobi.path('names').applySetters(['   whaT', 'WoOt  '])[0], 'string');
        assert.equal(typeof Tobi.path('names').applySetters(['   whaT', 'WoOt  '])[1], 'string');
        assert.equal(Tobi.path('names').applySetters(['   whaT', 'WoOt  '])[0], 'what');
        assert.equal(Tobi.path('names').applySetters(['   whaT', 'WoOt  '])[1], 'woot');

      });
    });

    describe('string', function() {
      it('lowercase', function() {
        const Tobi = new Schema({
          name: { type: String, lowercase: true }
        });

        assert.equal(Tobi.path('name').applySetters('WHAT'), 'what');
        assert.equal(Tobi.path('name').applySetters(1977), '1977');

      });
      it('uppercase', function() {
        const Tobi = new Schema({
          name: { type: String, uppercase: true }
        });

        assert.equal(Tobi.path('name').applySetters('what'), 'WHAT');
        assert.equal(Tobi.path('name').applySetters(1977), '1977');

      });
      it('trim', function() {
        const Tobi = new Schema({
          name: { type: String, uppercase: true, trim: true }
        });

        assert.equal(Tobi.path('name').applySetters('  what   '), 'WHAT');
        assert.equal(Tobi.path('name').applySetters(1977), '1977');

      });
    });

    it('applying when none have been defined', function() {
      const Tobi = new Schema({
        name: String
      });

      assert.equal(Tobi.path('name').applySetters('woot'), 'woot');

    });

    it('assignment of non-functions throw', function() {
      const schema = new Schema({ fun: String });
      let g;

      try {
        schema.path('fun').set(4);
      } catch (err_) {
        g = err_;
      }

      assert.ok(g);
      assert.equal(g.message, 'A setter must be a function.');

    });
  });

  describe('getters', function() {
    it('work', function() {
      function woot(v) {
        return v + ' woot';
      }

      const Tobi = new Schema({
        name: { type: String, get: woot }
      });

      assert.equal(Tobi.path('name').getters.length, 1);
      assert.equal(Tobi.path('name').applyGetters('test'), 'test woot');

    });
    it('order', function() {
      function format(v) {
        return v
          ? '$' + v
          : v;
      }

      const Tobi = new Schema({
        name: { type: Number, get: format }
      });

      assert.equal(Tobi.path('name').applyGetters(30, { a: 'b' }), '$30');

    });
    it('scope', function() {
      function woot(v, self) {
        assert.equal(this.a, 'b');
        assert.equal(self.path, 'name');
        return v.toLowerCase();
      }

      const Tobi = new Schema({
        name: { type: String, get: woot }
      });

      assert.equal(Tobi.path('name').applyGetters('YEP', { a: 'b' }), 'yep');

    });
    it('casting', function() {
      function last(v) {
        assert.equal(typeof v, 'number');
        assert.equal(v, 0);
        return 'last';
      }

      function first() {
        return 0;
      }

      const Tobi = new Schema({
        name: { type: String, get: first }
      });

      Tobi.path('name').get(last);
      assert.equal(Tobi.path('name').applyGetters('woot'), 'last');

    });
    it('applying when none have been defined', function() {
      const Tobi = new Schema({
        name: String
      });

      assert.equal(Tobi.path('name').applyGetters('woot'), 'woot');

    });
    it('assignment of non-functions throw', function() {
      const schema = new Schema({ fun: String });
      let g;

      try {
        schema.path('fun').get(true);
      } catch (err_) {
        g = err_;
      }

      assert.ok(g);
      assert.equal(g.message, 'A getter must be a function.');

    });
    it('auto _id', function() {
      let schema = new Schema({
        name: String
      });
      assert.ok(schema.path('_id') instanceof Schema.ObjectId);

      schema = new Schema({
        name: String
      }, { _id: true });
      assert.ok(schema.path('_id') instanceof Schema.ObjectId);

      schema.set('_id', false);
      assert.ok(schema.path('_id') == null);

      schema = new Schema({
        name: String
      }, { _id: false });
      assert.equal(schema.path('_id'), undefined);

      schema.set('_id', true);
      assert.ok(schema.path('_id') instanceof Schema.ObjectId);

    });
  });

  describe('indexes', function() {
    describe('definition', function() {
      it('basic', function() {
        const Tobi = new Schema({
          name: { type: String, index: true }
        });

        assert.equal(Tobi.path('name')._index, true);
        Tobi.path('name').index({ unique: true });
        assert.deepEqual(Tobi.path('name')._index, { unique: true });
        Tobi.path('name').unique(false);
        assert.deepEqual(Tobi.path('name')._index, { unique: false });

        let T, i;

        T = new Schema({
          name: { type: String, sparse: true }
        });
        assert.deepEqual(T.path('name')._index, { sparse: true });

        T = new Schema({
          name: { type: String, unique: true }
        });
        assert.deepEqual(T.path('name')._index, { unique: true });

        T = new Schema({
          name: { type: Date, expires: '1.5m' }
        });
        assert.deepEqual(T.path('name')._index, { expireAfterSeconds: 90 });

        T = new Schema({
          name: { type: Date, expires: 200 }
        });
        assert.deepEqual(T.path('name')._index, { expireAfterSeconds: 200 });

        T = new Schema({
          name: { type: String, sparse: true, unique: true }
        });
        assert.deepEqual(T.path('name')._index, { sparse: true, unique: true });

        T = new Schema({
          name: { type: String, unique: true, sparse: true }
        });
        i = T.path('name')._index;
        assert.equal(i.unique, true);
        assert.equal(i.sparse, true);

        T = new Schema({
          name: { type: String, index: { sparse: true, unique: true, expireAfterSeconds: 65 } }
        });
        i = T.path('name')._index;
        assert.equal(i.unique, true);
        assert.equal(i.sparse, true);
        assert.equal(i.expireAfterSeconds, 65);

        T = new Schema({
          name: { type: Date, index: { sparse: true, unique: true, expires: '24h' } }
        });
        i = T.path('name')._index;
        assert.equal(i.unique, true);
        assert.equal(i.sparse, true);
        assert.equal(i.expireAfterSeconds, 60 * 60 * 24);

        T = new Schema({
          name: { type: String, index: false, unique: false }
        });
        assert.equal(T.path('name')._index, false);
        assert.equal(T.indexes().length, 0);


      });
      it('compound', function() {
        const Tobi = new Schema({
          name: { type: String, index: true },
          last: { type: Number, sparse: true },
          nope: { type: String, index: { background: false } }
        });

        Tobi.index({ firstname: 1, last: 1 }, { unique: true, expires: '1h' });
        Tobi.index({ firstname: 1, nope: 1 }, { unique: true, background: false });

        assert.deepEqual(Tobi.indexes(), [
          [{ name: 1 }, { background: true }],
          [{ last: 1 }, { sparse: true, background: true }],
          [{ nope: 1 }, { background: false }],
          [{ firstname: 1, last: 1 }, { unique: true, expireAfterSeconds: 60 * 60, background: true }],
          [{ firstname: 1, nope: 1 }, { unique: true, background: false }]
        ]);


      });

      it('compound based on name (gh-6499)', function() {
        const testSchema = new Schema({
          prop1: { type: String, index: { name: 'test1' } },
          prop2: { type: Number, index: true },
          prop3: { type: String, index: { name: 'test1' } }
        });

        const indexes = testSchema.indexes();
        assert.equal(indexes.length, 2);
        assert.deepEqual(indexes[0][0], { prop1: 1, prop3: 1 });
        assert.deepEqual(indexes[1][0], { prop2: 1 });
      });

      it('with single nested doc (gh-6113)', function() {
        const pointSchema = new Schema({
          type: {
            type: String,
            default: 'Point',
            validate: v => v === 'Point'
          },
          coordinates: [[Number]]
        });

        const schema = new Schema({
          point: { type: pointSchema, index: '2dsphere' }
        });

        assert.deepEqual(schema.indexes(), [
          [{ point: '2dsphere' }, { background: true }]
        ]);


      });

      it('with embedded discriminator (gh-6485)', function() {
        const eventSchema = new Schema({
          message: { type: String, index: true }
        }, { discriminatorKey: 'kind', _id: false });

        const batchSchema = new Schema({
          events: [eventSchema]
        });

        const docArray = batchSchema.path('events');

        docArray.discriminator('gh6485_Clicked', new Schema({
          element: { type: String, index: true }
        }, { _id: false }));

        docArray.discriminator('gh6485_Purchased', Schema({
          product: { type: String, index: true }
        }, { _id: false }));

        assert.deepEqual(batchSchema.indexes().map(v => v[0]), [
          { 'events.message': 1 },
          { 'events.element': 1 },
          { 'events.product': 1 }
        ]);
      });
    });
  });

  describe('plugins', function() {
    it('work', function() {
      const Tobi = new Schema();
      let called = false;

      Tobi.plugin(function(schema) {
        assert.equal(schema, Tobi);
        called = true;
      });

      assert.equal(called, true);
    });

    it('options param (gh-12077)', function() {
      const Tobi = new Schema();
      let called = false;

      Tobi.plugin(function(schema, opts) {
        assert.equal(schema, Tobi);
        assert.deepStrictEqual(opts, { answer: 42 });
        called = true;
      }, { answer: 42 });

      assert.equal(called, true);
    });
  });

  describe('options', function() {
    it('defaults are set', function() {
      const Tobi = new Schema();

      assert.equal(typeof Tobi.options, 'object');
      assert.equal(Tobi.options.safe, undefined);
      assert.equal(Tobi.options.strict, true);
      assert.equal(Tobi.options.capped, false);
      assert.equal(Tobi.options.versionKey, '__v');
      assert.equal(Tobi.options.discriminatorKey, '__t');
      assert.equal(Tobi.options.shardKey, null);
      assert.equal(Tobi.options.read, null);
      assert.equal(Tobi.options._id, true);
    });

    it('setting', function() {
      let Tobi = new Schema({}, { collection: 'users' });

      Tobi.set('a', 'b');
      Tobi.set('writeConcern', { w: 0 });
      assert.equal(Tobi.options.collection, 'users');

      assert.equal(Tobi.options.a, 'b');
      assert.deepEqual(Tobi.options.writeConcern, { w: 0 });
      assert.equal(Tobi.options.read, null);

      const tags = [{ x: 1 }];

      Tobi.set('read', 'n');
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

      Tobi = new Schema({}, { read: 'p' });
      assert.equal(Tobi.options.read, 'primary');

      Tobi = new Schema({}, { read: ['s', tags] });
      assert.equal(Tobi.options.read.mode, 'secondary');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, { read: 'primary' });
      assert.equal(Tobi.options.read, 'primary');

      Tobi = new Schema({}, { read: ['secondary', tags] });
      assert.equal(Tobi.options.read.mode, 'secondary');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, { read: 's' });
      assert.equal(Tobi.options.read, 'secondary');

      Tobi = new Schema({}, { read: ['s', tags] });
      assert.equal(Tobi.options.read.mode, 'secondary');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, { read: 'secondary' });
      assert.equal(Tobi.options.read, 'secondary');

      Tobi = new Schema({}, { read: ['secondary', tags] });
      assert.equal(Tobi.options.read.mode, 'secondary');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, { read: 'pp' });
      assert.equal(Tobi.options.read, 'primaryPreferred');

      Tobi = new Schema({}, { read: ['pp', tags] });
      assert.equal(Tobi.options.read.mode, 'primaryPreferred');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, { read: 'primaryPreferred' });
      assert.equal(Tobi.options.read, 'primaryPreferred');

      Tobi = new Schema({}, { read: ['primaryPreferred', tags] });
      assert.equal(Tobi.options.read.mode, 'primaryPreferred');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, { read: 'sp' });
      assert.equal(Tobi.options.read, 'secondaryPreferred');

      Tobi = new Schema({}, { read: ['sp', tags] });
      assert.equal(Tobi.options.read.mode, 'secondaryPreferred');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, { read: 'secondaryPreferred' });
      assert.equal(Tobi.options.read, 'secondaryPreferred');

      Tobi = new Schema({}, { read: ['secondaryPreferred', tags] });
      assert.equal(Tobi.options.read.mode, 'secondaryPreferred');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, { read: 'n' });
      assert.equal(Tobi.options.read, 'nearest');

      Tobi = new Schema({}, { read: ['n', tags] });
      assert.equal(Tobi.options.read.mode, 'nearest');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);

      Tobi = new Schema({}, { read: 'nearest' });
      assert.equal(Tobi.options.read, 'nearest');

      Tobi = new Schema({}, { read: ['nearest', tags] });
      assert.equal(Tobi.options.read.mode, 'nearest');
      assert.ok(Array.isArray(Tobi.options.read.tags));
      assert.equal(Tobi.options.read.tags.length, 1);
      assert.equal(Tobi.options.read.tags[0].x, 1);


    });
  });

  describe('virtuals', function() {
    it('works', function() {
      const Contact = new Schema({
        firstName: String,
        lastName: String
      });

      Contact
        .virtual('fullName')
        .get(function() {
          return this.get('firstName') + ' ' + this.get('lastName');
        })
        .set(function(fullName) {
          const split = fullName.split(' ');
          this.set('firstName', split[0]);
          this.set('lastName', split[1]);
        });

      assert.ok(Contact.virtualpath('fullName') instanceof VirtualType);

    });

    describe('id', function() {
      it('default creation of id can be overridden (gh-298)', function() {
        assert.doesNotThrow(function() {
          new Schema({ id: String });
        });

      });
      it('disabling', function() {
        const schema = new Schema({ name: String });
        assert.strictEqual(undefined, schema.virtuals.id);

      });
    });

    describe('getter', function() {
      it('scope', function() {
        const Tobi = new Schema();

        Tobi.virtual('name').get(function(v, self) {
          assert.equal(this.a, 'b');
          assert.equal(self.path, 'name');
          return v.toLowerCase();
        });

        assert.equal(Tobi.virtualpath('name').applyGetters('YEP', { a: 'b' }), 'yep');

      });
    });

    describe('setter', function() {
      it('scope', function() {
        const Tobi = new Schema();

        Tobi.virtual('name').set(function(v, self) {
          assert.equal(this.a, 'b');
          assert.equal(self.path, 'name');
          return v.toLowerCase();
        });

        assert.equal(Tobi.virtualpath('name').applySetters('YEP', { a: 'b' }), 'yep');

      });
    });
  });

  describe('other contexts', function() {
    it('work', function() {
      if (typeof Deno !== 'undefined') {
        // Deno throws "Not implemented: Script.prototype.runInNewContext"
        return this.skip();
      }

      const str = 'code = {' +
        '  name: String' +
        ', arr1: Array ' +
        ', arr2: { type: [] }' +
        ', date: Date  ' +
        ', num: { type: Number }' +
        ', bool: Boolean' +
        ', nest: { sub: { type: {}, required: true }}' +
        '}';

      const script = vm.createScript(str, 'testSchema.vm');
      const sandbox = { code: null };
      script.runInNewContext(sandbox);

      const Ferret = new Schema(sandbox.code);
      assert.ok(Ferret.path('nest.sub') instanceof SchemaTypes.Mixed);
      assert.ok(Ferret.path('name') instanceof SchemaTypes.String);
      assert.ok(Ferret.path('arr1') instanceof SchemaTypes.Array);
      assert.ok(Ferret.path('arr2') instanceof SchemaTypes.Array);
      assert.ok(Ferret.path('date') instanceof SchemaTypes.Date);
      assert.ok(Ferret.path('num') instanceof SchemaTypes.Number);
      assert.ok(Ferret.path('bool') instanceof SchemaTypes.Boolean);

    });
  });

  describe('#add()', function() {
    it('does not pollute existing paths', function() {
      let o = { name: String };
      let s = new Schema(o);

      assert.throws(function() {
        s.add({ age: Number }, 'name.');
      }, /Cannot set nested path/);

      assert.throws(function() {
        s.add({ age: { x: Number } }, 'name.');
      }, /Cannot set nested path/);
      assert.equal(('age' in o.name), false);

      o = { name: 'string' };
      s = new Schema(o);

      assert.throws(function() {
        s.add({ age: Number }, 'name.');
      }, /Cannot set nested path/);

      assert.throws(function() {
        s.add({ age: { x: Number } }, 'name.');
      }, /Cannot set nested path/);

      assert.equal(o.name, 'string');

    });

    it('returns the schema instance', function() {
      const schema = new Schema({ name: String });
      const ret = schema.add({ age: Number });
      assert.strictEqual(ret, schema);
    });

    it('returns the schema instance when schema instance is passed', function() {
      const schemaA = new Schema({ name: String });
      const schemaB = new Schema({ age: Number });
      const ret = schemaB.add(schemaA);
      assert.strictEqual(ret, schemaB);
    });

    it('merging nested objects (gh-662)', async function() {
      const MergedSchema = new Schema({
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

      db.deleteModel(/Test/);
      const Merged = db.model('Test', MergedSchema);

      const merged = new Merged({
        a: {
          foo: 'baz',
          b: {
            bar: 'qux'
          }
        }
      });

      await merged.save();
      const found = await Merged.findById(merged.id);
      assert.equal(found.a.foo, 'baz');
      assert.equal(found.a.b.bar, 'qux');
    });

    it('prefix (gh-1730)', function() {
      const s = new Schema({});

      s.add({ n: Number }, 'prefix.');

      assert.equal(s.pathType('prefix.n'), 'real');
      assert.equal(s.pathType('prefix'), 'nested');
    });

    it('adds another schema (gh-6897)', function() {
      const s = new Schema({ name: String });

      const s2 = new Schema({ age: Number });

      s2.statics.foo = function() { return 42; };
      s2.pre('save', function() {
        throw new Error('oops!');
      });

      s.add(s2);

      assert.ok(s.paths.age);
      assert.strictEqual(s.statics.foo, s2.statics.foo);
      assert.ok(s.s.hooks._pres.get('save'));
    });

    it('overwrites existing paths (gh-10203)', function() {
      const baseSchema = new Schema({
        username: {
          type: String,
          required: false
        }
      });

      const userSchema = new Schema({
        email: {
          type: String,
          required: true
        },
        username: {
          type: String,
          required: true
        }
      });

      const realSchema = baseSchema.clone();
      realSchema.add(userSchema);

      assert.ok(realSchema.path('username').isRequired);
    });
  });

  it('debugging msgs', function() {
    let err;
    try {
      new Schema({ name: { first: null } });
    } catch (e) {
      err = e;
    }
    assert.ok(err.message.indexOf('Invalid value for schema path `name.first`') !== -1, err.message);
    try {
      new Schema({ age: undefined });
    } catch (e) {
      err = e;
    }
    assert.ok(err.message.indexOf('Invalid value for schema path `age`') !== -1, err.message);
  });

  describe('construction', function() {
    it('array of object literal missing a type is interpreted as DocumentArray', function() {
      const goose = new mongoose.Mongoose();
      const s = new Schema({
        arr: [
          { something: { type: String } }
        ]
      });
      assert.ok(s.path('arr') instanceof SchemaTypes.DocumentArray);
      const M = goose.model('objectliteralschema', s);
      const m = new M({ arr: [{ something: 'wicked this way comes' }] });
      assert.equal(m.arr[0].something, 'wicked this way comes');
      assert.ok(m.arr[0]._id);

    });

    it('array of object literal with type.type is interpreted as DocumentArray', function() {
      const goose = new mongoose.Mongoose();
      const s = new Schema({
        arr: [
          { type: { type: String } }
        ]
      });
      assert.ok(s.path('arr') instanceof SchemaTypes.DocumentArray);
      const M = goose.model('objectliteralschema2', s);
      const m = new M({ arr: [{ type: 'works' }] });
      assert.equal(m.arr[0].type, 'works');
      assert.ok(m.arr[0]._id);

    });

    it('does not alter original argument (gh-1364)', function() {
      const schema = {
        ids: [{ type: Schema.ObjectId, ref: 'something' }],
        a: { type: Array },
        b: Array,
        c: [Date],
        d: { type: 'Boolean' },
        e: [{ a: String, b: [{ type: { type: Buffer }, x: Number }] }]
      };

      new Schema(schema);
      assert.equal(Object.keys(schema).length, 6);
      assert.deepEqual([{ type: Schema.ObjectId, ref: 'something' }], schema.ids);
      assert.deepEqual({ type: Array }, schema.a);
      assert.deepEqual(Array, schema.b);
      assert.deepEqual([Date], schema.c);
      assert.deepEqual({ type: 'Boolean' }, schema.d);
      assert.deepEqual([{ a: String, b: [{ type: { type: Buffer }, x: Number }] }], schema.e);


    });

    it('properly gets value of plain objects when dealing with refs (gh-1606)', async function() {
      const el = new Schema({ title: String });
      const so = new Schema({
        title: String,
        obj: { type: Schema.Types.ObjectId, ref: 'Test' }
      });

      const Element = db.model('Test', el);
      const Some = db.model('Test1', so);

      const ele = new Element({ title: 'thing' });

      await ele.save();
      const s = new Some({ obj: ele.toObject() });
      await s.save();
      const ss = await Some.findOne({ _id: s.id });
      assert.equal(ss.obj, ele.id);
    });

    it('array of of schemas and objects (gh-7218)', function() {
      const baseSchema = new Schema({ created: Date }, { id: true });
      const s = new Schema([baseSchema, { name: String }], { id: false });

      assert.ok(s.path('created'));
      assert.ok(s.path('name'));
      assert.ok(!s.options.id);
    });

    it('copies options from array of schemas', function() {
      const baseSchema = new Schema({ created: Date }, { id: true, toJSON: { virtuals: true } });
      const s = new Schema([baseSchema, { name: String }]);

      assert.ok(s.path('created'));
      assert.ok(s.path('name'));
      assert.ok(s.options.id);
      assert.deepEqual(s.options.toJSON, { virtuals: true });
      assert.strictEqual(s.options.toObject, undefined);

      s.add(new Schema({}, { toObject: { getters: true } }));
      assert.ok(s.path('created'));
      assert.ok(s.path('name'));
      assert.ok(s.options.id);
      assert.deepEqual(s.options.toJSON, { virtuals: true });
      assert.deepEqual(s.options.toObject, { getters: true });
    });

    it('propagates typeKey down to implicitly created single nested schemas (gh-13154)', function() {
      const TestSchema = {
        action: {
          $type: {
            type: {
              $type: String,
              required: true
            }
          },
          required: true
        }
      };
      const s = new Schema(TestSchema, { typeKey: '$type' });
      assert.equal(s.path('action').constructor.name, 'SubdocumentPath');
      assert.ok(s.path('action').schema.$implicitlyCreated);
      assert.equal(s.path('action.type').constructor.name, 'SchemaString');
    });
  });

  describe('property names', function() {
    describe('reserved keys are log a warning (gh-9010)', () => {
      this.afterEach(() => sinon.restore());
      const reservedProperties = [
        'emit', 'listeners', 'removeListener', /* 'collection', */ // TODO: add `collection`
        'errors', 'get', 'init', 'isModified', 'isNew', 'populated',
        'remove', 'save', 'toObject', 'validate'
      ];

      for (const reservedProperty of reservedProperties) {
        it(`\`${reservedProperty}\` when used as a schema path logs a warning`, async() => {
          // Arrange
          const emitWarningStub = sinon.stub(process, 'emitWarning').returns();

          // Act
          new Schema({ [reservedProperty]: String });

          // Assert
          const lastWarnMessage = emitWarningStub.args[0][0];
          assert.ok(lastWarnMessage.includes(`\`${reservedProperty}\` is a reserved schema pathname`), lastWarnMessage);
        });

        it(`\`${reservedProperty}\` when used as a schema path doesn't log a warning if \`suppressReservedKeysWarning\` is true`, async() => {
          // Arrange
          const emitWarningStub = sinon.stub(process, 'emitWarning').returns();


          // Act
          new Schema(
            { [reservedProperty]: String },
            { suppressReservedKeysWarning: true }
          );

          const lastWarnMessage = emitWarningStub.args[0] && emitWarningStub.args[0][0];

          // Assert
          assert.strictEqual(lastWarnMessage, undefined);
        });
      }
    });


    it('that do not conflict do not throw', function() {
      assert.doesNotThrow(function() {
        new Schema({
          model: String
        });
      });

      assert.doesNotThrow(function() {
        Schema({ child: [{ parent: String }] });
      });

      assert.doesNotThrow(function() {
        Schema({ child: [{ parentArray: String }] });
      });

      assert.doesNotThrow(function() {
        const s = new Schema({ docs: [{ path: String }] });
        const M = mongoose.model('gh-1245', s);
        new M({ docs: [{ path: 'works' }] });
      });

      assert.doesNotThrow(function() {
        const s = new Schema({ setMaxListeners: String });
        const M = mongoose.model('setMaxListeners-as-property-name', s);
        new M({ setMaxListeners: 'works' });
      });
    });
  });

  describe('pathType()', function() {
    let schema;

    before(function() {
      schema = new Schema({
        n: String,
        nest: { thing: { nests: Boolean } },
        docs: [{ x: [{ y: String }] }],
        mixed: {}
      });
      schema.virtual('myVirtual').get(function() { return 42; });
    });

    describe('when called on an explicit real path', function() {
      it('returns "real"', function() {
        assert.equal(schema.pathType('n'), 'real');
        assert.equal(schema.pathType('nest.thing.nests'), 'real');
        assert.equal(schema.pathType('docs'), 'real');
        assert.equal(schema.pathType('docs.0.x'), 'real');
        assert.equal(schema.pathType('docs.0.x.3.y'), 'real');
        assert.equal(schema.pathType('mixed'), 'real');

      });
    });
    describe('when called on a virtual', function() {
      it('returns virtual', function() {
        assert.equal(schema.pathType('myVirtual'), 'virtual');

      });
    });
    describe('when called on nested structure', function() {
      it('returns nested', function() {
        assert.equal(schema.pathType('nest'), 'nested');
        assert.equal(schema.pathType('nest.thing'), 'nested');

      });
    });
    describe('when called on undefined path', function() {
      it('returns adHocOrUndefined', function() {
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

      });
    });

    it('handles maps (gh-7448) (gh-7464)', function() {
      const schema = new Schema({ map: { type: Map, of: String } });

      assert.equal(schema.pathType('map.foo'), 'real');
      assert.equal(schema.pathType('map'), 'real');
      assert.equal(schema.pathType('mapfoo'), 'adhocOrUndefined');
      assert.equal(schema.pathType('fake'), 'adhocOrUndefined');

      return Promise.resolve();
    });
  });

  it('required() with doc arrays (gh-3199)', function() {
    const schema = new Schema({
      test: [{ x: String }]
    });

    schema.path('test').schema.path('x').required(true);
    const M = mongoose.model('gh3199', schema);
    const m = new M({ test: [{}] });

    assert.equal(m.validateSync().errors['test.0.x'].kind, 'required');

  });

  it('custom typeKey in doc arrays (gh-3560)', function() {
    const schema = new Schema({
      test: [{
        name: { $type: String }
      }]
    }, { typeKey: '$type' });

    schema.path('test').schema.path('name').required(true);
    const M = mongoose.model('gh3560', schema);
    const m = new M({ test: [{ name: 'Val' }] });

    assert.ifError(m.validateSync());
    assert.equal(m.test[0].name, 'Val');

  });

  it('required for single nested schemas (gh-3562)', function() {
    const personSchema = new Schema({
      name: { type: String, required: true }
    });

    const bandSchema = new Schema({
      name: String,
      guitarist: { type: personSchema, required: true }
    });

    const Band = mongoose.model('gh3562', bandSchema);
    const band = new Band({ name: 'Guns N\' Roses' });

    assert.ok(band.validateSync());
    assert.ok(band.validateSync().errors.guitarist);
    band.guitarist = { name: 'Slash' };
    assert.ifError(band.validateSync());


  });

  it('booleans cause cast error for date (gh-3935)', function() {
    const testSchema = new Schema({
      test: Date
    });

    const Test = mongoose.model('gh3935', testSchema);
    const test = new Test({ test: true });

    assert.ok(test.validateSync());
    assert.equal(test.validateSync().errors.test.name, 'CastError');


  });

  it('trim: false works with strings (gh-4042)', function() {
    const testSchema = new Schema({
      test: { type: String, trim: false }
    });

    const Test = mongoose.model('gh4042', testSchema);
    const test = new Test({ test: ' test ' });
    assert.equal(test.test, ' test ');

  });

  it('arrays with typeKey (gh-4548)', function() {
    const testSchema = new Schema({
      test: [{ $type: String }]
    }, { typeKey: '$type' });

    assert.equal(testSchema.paths.test.caster.instance, 'String');

    const Test = mongoose.model('gh4548', testSchema);
    const test = new Test({ test: [123] });
    assert.strictEqual(test.test[0], '123');

  });

  it('arrays of mixed arrays (gh-5416)', function() {
    const testSchema = new Schema({
      test: [Array]
    });

    assert.ok(testSchema.paths.test.casterConstructor !== Array);
    assert.equal(testSchema.paths.test.casterConstructor,
      mongoose.Schema.Types.Array);


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

    it('returns the schema instance', function() {
      const ret = this.schema.clone().remove('g');
      assert.ok(ret instanceof Schema);
    });

    it('removes a single path', function() {
      assert.ok(this.schema.paths.a);
      this.schema.remove('a');
      assert.strictEqual(this.schema.path('a'), undefined);
      assert.strictEqual(this.schema.paths.a, void 0);

    });

    it('removes a nested path', function() {
      this.schema.remove('b.c.d');
      assert.strictEqual(this.schema.path('b'), undefined);
      assert.strictEqual(this.schema.path('b.c'), undefined);
      assert.strictEqual(this.schema.path('b.c.d'), undefined);

    });

    it('removes all children of a nested path (gh-2398)', function() {
      this.schema.remove('b');
      assert.strictEqual(this.schema.nested['b'], undefined);
      assert.strictEqual(this.schema.nested['b.c'], undefined);
      assert.strictEqual(this.schema.path('b.c.d'), undefined);

    });

    it('removes an array of paths', function() {
      this.schema.remove(['e', 'f', 'g']);
      assert.strictEqual(this.schema.path('e'), undefined);
      assert.strictEqual(this.schema.path('f'), undefined);
      assert.strictEqual(this.schema.path('g'), undefined);

    });

    it('works properly with virtuals (gh-2398)', function() {
      this.schema.remove('a');
      this.schema.virtual('a').get(function() { return 42; });
      const Test = mongoose.model('gh2398', this.schema);
      const t = new Test();
      assert.equal(t.a, 42);

    });

    it('methods named toString (gh-4551)', function() {
      this.schema.methods.toString = function() {
        return 'test';
      };
      assert.doesNotThrow(() => {
        mongoose.model('gh4551', this.schema);
      });
    });

    it('handles default value = 0 (gh-4620)', function() {
      const schema = new Schema({
        tags: { type: [Number], default: 0 }
      });
      assert.deepEqual(schema.path('tags').getDefault().toObject(), [0]);

    });

    it('type: childSchema (gh-5521)', function() {
      const childSchema = new mongoose.Schema({
        name: String
      }, { _id: false });

      const schema = new mongoose.Schema({
        children: [{ type: childSchema }]
      });

      const Model = mongoose.model('gh5521', schema);

      const doc = new Model({ children: [{ name: 'test' }] });
      assert.deepEqual(doc.toObject().children, [{ name: 'test' }]);

    });

    it('Decimal128 type (gh-4759)', function() {
      const Decimal128 = mongoose.Schema.Types.Decimal128;
      const schema = new Schema({
        num: Decimal128,
        nums: ['Decimal128']
      });
      assert.ok(schema.path('num') instanceof Decimal128);
      assert.ok(schema.path('nums').caster instanceof Decimal128);

      const casted = schema.path('num').cast('6.2e+23');
      assert.ok(casted instanceof mongoose.Types.Decimal128);
      assert.equal(casted.toString(), '6.2E+23');

    });

    describe('clone()', function() {
      it('copies methods, statics, and query helpers (gh-5752)', function() {
        const schema = new Schema({});

        schema.methods.fakeMethod = function() { return 'fakeMethod'; };
        schema.statics.fakeStatic = function() { return 'fakeStatic'; };
        schema.query.fakeQueryHelper = function() { return 'fakeQueryHelper'; };

        const clone = schema.clone();
        assert.equal(clone.methods.fakeMethod, schema.methods.fakeMethod);
        assert.equal(clone.statics.fakeStatic, schema.statics.fakeStatic);
        assert.equal(clone.query.fakeQueryHelper, schema.query.fakeQueryHelper);

      });

      it('copies validators declared with validate() (gh-5607)', function() {
        const schema = new Schema({
          num: Number
        });

        schema.path('num').validate(function(v) {
          return v === 42;
        });

        const clone = schema.clone();
        assert.equal(clone.path('num').validators.length, 1);
        assert.ok(clone.path('num').validators[0].validator(42));
        assert.ok(!clone.path('num').validators[0].validator(41));

      });

      it('copies virtuals (gh-6133)', function() {
        const userSchema = new Schema({
          firstName: { type: String, required: true },
          lastName: { type: String, required: true }
        });

        userSchema.virtual('fullName').get(function() {
          return this.firstName + ' ' + this.lastName;
        });

        assert.ok(userSchema.virtuals.fullName);
        const clonedUserSchema = userSchema.clone();
        assert.ok(clonedUserSchema.virtuals.fullName);


      });

      it('with nested virtuals (gh-6274)', function() {
        const PersonSchema = new Schema({
          name: {
            first: String,
            last: String
          }
        });

        PersonSchema.
          virtual('name.full').
          get(function() {
            return this.get('name.first') + ' ' + this.get('name.last');
          }).
          set(function(fullName) {
            const split = fullName.split(' ');
            this.set('name.first', split[0]);
            this.set('name.last', split[1]);
          });

        const M = db.model('Test', PersonSchema.clone());

        const doc = new M({ name: { first: 'Axl', last: 'Rose' } });
        assert.equal(doc.name.full, 'Axl Rose');


      });

      it('with alternative option syntaxes (gh-6274)', function() {
        const TestSchema = new Schema({}, { _id: false, id: false });

        TestSchema.virtual('test').get(() => 42);

        TestSchema.set('toJSON', { virtuals: true });
        TestSchema.options.toObject = { virtuals: true };

        const clone = TestSchema.clone();
        assert.deepEqual(clone._userProvidedOptions, {
          toJSON: { virtuals: true },
          _id: false,
          id: false
        });
        const M = db.model('Test', clone);

        const doc = new M({});

        assert.deepEqual(doc.toJSON(), { test: 42 });
        assert.deepEqual(doc.toObject(), { test: 42 });


      });

      it('copies base for using custom types after cloning (gh-7377)', function() {
        const db = new mongoose.Mongoose();

        class MyType extends mongoose.SchemaType {}
        db.Schema.Types.MyType = MyType;

        const schema = new db.Schema({ name: MyType });
        const otherSchema = schema.clone();

        assert.doesNotThrow(function() {
          otherSchema.add({ name2: MyType });
        });
      });

      it('clones schema types (gh-7537)', function() {
        const schema = new Schema({ name: String });

        assert.equal(schema.path('name').validators.length, 0);
        const otherSchema = schema.clone();

        otherSchema.path('name').required();

        assert.equal(otherSchema.path('name').validators.length, 1);
        assert.equal(schema.path('name').validators.length, 0);
      });

      it('correctly copies all child schemas (gh-7537)', function() {
        const l3Schema = new Schema({ name: String });
        const l2Schema = new Schema({ l3: l3Schema });
        const l1Schema = new Schema({ l2: l2Schema });

        assert.equal(l1Schema.childSchemas.length, 1);
        assert.ok(l1Schema.childSchemas[0].schema.path('l3'));

        const otherSchema = l1Schema.clone();

        assert.equal(otherSchema.childSchemas.length, 1);
        assert.ok(otherSchema.childSchemas[0].schema.path('l3'));
      });

      it('copies single embedded discriminators (gh-7894)', function() {
        const colorSchema = new Schema({}, { discriminatorKey: 'type' });
        colorSchema.methods.isYellow = () => false;

        const yellowSchema = new Schema();
        yellowSchema.methods.isYellow = () => true;

        const fruitSchema = new Schema({}, { discriminatorKey: 'type' });

        const bananaSchema = new Schema({ color: { type: colorSchema } });
        bananaSchema.path('color').discriminator('yellow', yellowSchema);
        bananaSchema.methods.isYellow = function() { return this.color.isYellow(); };

        const schema = new Schema({ fruits: [fruitSchema] });

        const clone = bananaSchema.clone();
        schema.path('fruits').discriminator('banana', clone);
        assert.ok(clone.path('color').caster.discriminators);

        const Basket = db.model('Test', schema);
        const b = new Basket({
          fruits: [
            {
              type: 'banana',
              color: { type: 'yellow' }
            }
          ]
        });

        assert.ok(b.fruits[0].isYellow());
      });

      it('copies array discriminators (gh-7954)', function() {
        const eventSchema = Schema({ message: String }, {
          discriminatorKey: 'kind',
          _id: false
        });

        const batchSchema = Schema({ events: [eventSchema] }, {
          _id: false
        });

        const docArray = batchSchema.path('events');
        docArray.discriminator('gh7954_Clicked',
          Schema({ element: String }, { _id: false }));
        docArray.discriminator('gh7954_Purchased',
          Schema({ product: String }, { _id: false }));

        const clone = batchSchema.clone();
        assert.ok(clone.path('events').Constructor.discriminators);
        assert.ok(clone.path('events').Constructor.discriminators['gh7954_Clicked']);
        assert.ok(clone.path('events').Constructor.discriminators['gh7954_Purchased']);
      });

      it('uses Mongoose instance\'s Schema constructor (gh-9426)', function() {
        const db = new mongoose.Mongoose();
        db.Schema.prototype.localTest = function() {
          return 42;
        };
        const test = new db.Schema({});
        assert.equal(test.localTest(), 42);

        const test2 = test.clone();
        assert.equal(test2.localTest(), 42);
      });
    });

    it('childSchemas prop (gh-5695)', function() {
      const schema1 = new Schema({ name: String });
      const schema2 = new Schema({ test: String });
      let schema = new Schema({
        arr: [schema1],
        single: schema2
      });

      assert.equal(schema.childSchemas.length, 2);
      assert.strictEqual(schema.childSchemas[0].schema, schema1);
      assert.strictEqual(schema.childSchemas[1].schema, schema2);

      schema = schema.clone();
      assert.equal(schema.childSchemas.length, 2);
      assert.strictEqual(schema.childSchemas[0].schema, schema1);
      assert.strictEqual(schema.childSchemas[1].schema, schema2);


    });
  });

  it('throws a sane error if passing a schema to `ref` (gh-6915)', function() {
    const testSchema = new Schema({ name: String });

    assert.throws(function() {
      new Schema({ badRef: { type: String, ref: testSchema } });
    }, /Invalid ref at path "badRef"/);

    const parentSchema = new Schema({ name: String });
    assert.throws(function() {
      parentSchema.add({ badRef2: { type: String, ref: testSchema } });
    }, /Invalid ref at path "badRef2"/);

    assert.ok(!parentSchema.tree.badRef2);
    assert.deepEqual(Object.keys(parentSchema.paths).sort(), ['_id', 'name']);

    return Promise.resolve();
  });

  it('allows using ObjectId type as schema path (gh-7049)', function() {
    const testSchema = new Schema({
      p1: mongoose.Types.ObjectId,
      p2: require('mongodb').ObjectId
    });

    assert.ok(testSchema.path('p1') instanceof mongoose.ObjectId);
    assert.ok(testSchema.path('p2') instanceof mongoose.ObjectId);

    return Promise.resolve();
  });

  it('throws error if invalid type (gh-7303)', function() {
    assert.throws(() => {
      new Schema({
        bad: true
      });
    }, /invalid.*true.*bad/i);

    return Promise.resolve();
  });

  it('supports _id: false in paths definition (gh-7480) (gh-7524)', function() {
    const schema = new Schema({ _id: false, name: String });
    assert.ok(schema.path('_id') == null);
    assert.equal(schema.options._id, false);

    const otherSchema = new Schema({ name: String, nested: { _id: false, name: String } });
    assert.ok(otherSchema.path('_id'));
    assert.equal(otherSchema.options._id, true);

    return Promise.resolve();
  });

  it('schema.pathType() with positional path that isnt in schema (gh-7935)', function() {
    const subdocSchema = Schema({
      list: { type: [String], default: ['a'] }
    }, { minimize: false });
    const testSchema = Schema({
      lists: subdocSchema
    });

    assert.strictEqual(testSchema.pathType('subpaths.list.0.options'),
      'adhocOrUndefined');
  });

  it('supports pre(Array, Function) and post(Array, Function) (gh-7803)', function() {
    const schema = Schema({ name: String });
    schema.pre(['save', 'remove'], testMiddleware);
    function testMiddleware() {
      console.log('foo');
    }

    assert.equal(schema.s.hooks._pres.get('save').length, 1);
    assert.equal(schema.s.hooks._pres.get('save')[0].fn, testMiddleware);
    assert.equal(schema.s.hooks._pres.get('remove').length, 1);
    assert.equal(schema.s.hooks._pres.get('remove')[0].fn, testMiddleware);

    schema.post(['save', 'remove'], testMiddleware);
    assert.equal(schema.s.hooks._posts.get('save').length, 1);
    assert.equal(schema.s.hooks._posts.get('save')[0].fn, testMiddleware);
    assert.equal(schema.s.hooks._posts.get('remove').length, 1);
    assert.equal(schema.s.hooks._posts.get('remove')[0].fn, testMiddleware);
  });

  it('supports array with { type: ObjectID } (gh-8034)', function() {
    const schema = Schema({ testId: [{ type: 'ObjectID' }] });
    const path = schema.path('testId');
    assert.ok(path);
    assert.ok(path.caster instanceof Schema.ObjectId);
  });

  it('supports getting path under array (gh-8057)', function() {
    const schema = new Schema({ arr: [{ name: String }] });
    assert.ok(schema.path('arr.name') instanceof SchemaTypes.String);
    assert.ok(schema.path('arr.0.name') instanceof SchemaTypes.String);
  });

  it('required paths with clone() (gh-8111)', function() {
    const schema = Schema({ field: { type: String, required: true } });
    const Model = db.model('Test', schema.clone());

    const doc = new Model({});

    return doc.validate().then(() => assert.ok(false), err => {
      assert.ok(err);
      assert.ok(err.errors['field']);
    });
  });

  it('getters/setters with clone() (gh-8124)', function() {
    const schema = new mongoose.Schema({
      field: { type: String, required: true }
    });

    schema.path('field').set(value => value ? value.toUpperCase() : value);

    const TestKo = db.model('Test', schema.clone());

    const testKo = new TestKo({ field: 'upper' });
    assert.equal(testKo.field, 'UPPER');
  });

  it('required with nullish value (gh-8219)', function() {
    const schema = Schema({
      name: { type: String, required: void 0 },
      age: { type: Number, required: null }
    });
    assert.strictEqual(schema.path('name').isRequired, false);
    assert.strictEqual(schema.path('age').isRequired, false);
  });

  it('SchemaStringOptions line up with schema/string (gh-8256)', function() {
    const SchemaStringOptions = require('../lib/options/SchemaStringOptions');
    const keys = Object.keys(SchemaStringOptions.prototype).
      filter(key => key !== 'constructor' && key !== 'populate');
    const functions = Object.keys(Schema.Types.String.prototype).
      filter(key => ['constructor', 'cast', 'castForQuery', 'checkRequired'].indexOf(key) === -1);
    assert.deepEqual(keys.sort(), functions.sort());
  });

  it('supports passing schema options to `Schema#path()` (gh-8292)', function() {
    const schema = Schema({ title: String });
    const path = schema.path('title');

    const newSchema = Schema({});
    newSchema.add({ title: path.options });

    assert.equal(newSchema.path('title').options.type, String);
  });

  it('supports defining `_id: false` on single nested paths (gh-8137)', function() {
    let childSchema = Schema({ name: String });
    let parentSchema = Schema({
      child: {
        type: childSchema,
        _id: false
      }
    });

    assert.ok(!parentSchema.path('child').schema.options._id);
    assert.ok(childSchema.options._id);

    let Parent = mongoose.model('gh8137', parentSchema);
    let doc = new Parent({ child: { name: 'test' } });
    assert.equal(doc.child._id, null);

    childSchema = Schema({ name: String }, { _id: false });
    parentSchema = Schema({
      child: {
        type: childSchema,
        _id: true
      }
    });

    assert.ok(parentSchema.path('child').schema.options._id);
    assert.ok(parentSchema.path('child').schema.paths['_id']);
    assert.ok(!childSchema.options._id);
    assert.ok(!childSchema.paths['_id']);

    mongoose.deleteModel(/gh8137/);
    Parent = mongoose.model('gh8137', parentSchema);
    doc = new Parent({ child: { name: 'test' } });
    assert.ok(doc.child._id);
  });

  it('supports defining `_id: false` on document arrays (gh-8450)', function() {
    const nestedSchema = Schema({ some: String });
    let parentSchema = Schema({
      arrayed: {
        type: [{
          type: nestedSchema,
          _id: false
        }]
      }
    });

    assert.ok(!parentSchema.path('arrayed').schema.path('_id'));

    parentSchema = Schema({
      arrayed: {
        type: [{
          type: nestedSchema
        }],
        _id: false
      }
    });

    assert.ok(!parentSchema.path('arrayed').schema.path('_id'));

    parentSchema = Schema({
      arrayed: {
        type: [{
          type: nestedSchema
        }]
      }
    });

    assert.ok(parentSchema.path('arrayed').schema.path('_id').auto);
  });

  describe('pick() (gh-8207)', function() {
    it('works with nested paths', function() {
      const schema = Schema({
        name: {
          first: {
            type: String,
            required: true
          },
          last: {
            type: String,
            required: true
          }
        },
        age: {
          type: Number,
          index: true
        }
      });
      assert.ok(schema.path('name.first'));
      assert.ok(schema.path('name.last'));

      let newSchema = schema.pick(['age']);
      assert.ok(!newSchema.path('name.first'));
      assert.ok(newSchema.path('age'));
      assert.ok(newSchema.path('age').index);

      newSchema = schema.pick(['name']);
      assert.ok(newSchema.path('name.first'));
      assert.ok(newSchema.path('name.first').required);
      assert.ok(newSchema.path('name.last'));
      assert.ok(newSchema.path('name.last').required);
      assert.ok(!newSchema.path('age'));

      newSchema = schema.pick(['name.first']);
      assert.ok(newSchema.path('name.first'));
      assert.ok(newSchema.path('name.first').required);
      assert.ok(!newSchema.path('name.last'));
      assert.ok(!newSchema.path('age'));
    });

    it('with single nested paths', function() {
      const schema = Schema({
        name: Schema({
          first: {
            type: String,
            required: true
          },
          last: {
            type: String,
            required: true
          }
        }),
        age: {
          type: Number,
          index: true
        }
      });
      assert.ok(schema.path('name.first'));
      assert.ok(schema.path('name.last'));

      let newSchema = schema.pick(['name']);
      assert.ok(newSchema.path('name.first'));
      assert.ok(newSchema.path('name.first').required);
      assert.ok(newSchema.path('name.last'));
      assert.ok(newSchema.path('name.last').required);
      assert.ok(!newSchema.path('age'));

      newSchema = schema.pick(['name.first']);
      assert.ok(newSchema.path('name.first'));
      assert.ok(newSchema.path('name.first').required);
      assert.ok(!newSchema.path('name.last'));
      assert.ok(!newSchema.path('age'));
    });
  });

  describe('omit() (gh-12931)', function() {
    it('works with nested paths', function() {
      const schema = Schema({
        name: {
          first: {
            type: String,
            required: true
          },
          last: {
            type: String,
            required: true
          }
        },
        age: {
          type: Number,
          index: true
        }
      });
      assert.ok(schema.path('name.first'));
      assert.ok(schema.path('name.last'));

      let newSchema = schema.omit(['name.first']);
      assert.ok(!newSchema.path('name.first'));
      assert.ok(newSchema.path('age'));
      assert.ok(newSchema.path('age').index);

      newSchema = schema.omit(['age']);
      assert.ok(newSchema.path('name.first'));
      assert.ok(newSchema.path('name.first').required);
      assert.ok(newSchema.path('name.last'));
      assert.ok(newSchema.path('name.last').required);
      assert.ok(!newSchema.path('age'));

      newSchema = schema.omit(['name.last', 'age']);
      assert.ok(newSchema.path('name.first'));
      assert.ok(newSchema.path('name.first').required);
      assert.ok(!newSchema.path('name.last'));
      assert.ok(!newSchema.path('age'));
    });

    it('with single nested paths', function() {
      const schema = Schema({
        name: Schema({
          first: {
            type: String,
            required: true
          },
          last: {
            type: String,
            required: true
          }
        }),
        age: {
          type: Number,
          index: true
        }
      });
      assert.ok(schema.path('name.first'));
      assert.ok(schema.path('name.last'));

      let newSchema = schema.omit(['age']);
      assert.ok(newSchema.path('name.first'));
      assert.ok(newSchema.path('name.first').required);
      assert.ok(newSchema.path('name.last'));
      assert.ok(newSchema.path('name.last').required);
      assert.ok(!newSchema.path('age'));

      newSchema = schema.omit(['name.last', 'age']);
      assert.ok(newSchema.path('name.first'));
      assert.ok(newSchema.path('name.first').required);
      assert.ok(!newSchema.path('name.last'));
      assert.ok(!newSchema.path('age'));
    });
  });

  describe('path-level custom cast (gh-8300)', function() {
    it('with numbers', function() {
      const schema = Schema({
        num: {
          type: Number,
          cast: '{VALUE} is not a number'
        }
      });

      let threw = false;
      try {
        schema.path('num').cast('horseradish');
      } catch (err) {
        threw = true;
        assert.equal(err.name, 'CastError');
        assert.equal(err.message, '"horseradish" is not a number');
      }
      assert.ok(threw);
    });

    it('with objectids', function() {
      const schema = Schema({
        userId: {
          type: mongoose.ObjectId,
          cast: 'Invalid user ID'
        }
      });

      let threw = false;
      try {
        schema.path('userId').cast('foo');
      } catch (err) {
        threw = true;
        assert.equal(err.name, 'CastError');
        assert.equal(err.message, 'Invalid user ID');
      }
      assert.ok(threw);
    });

    it('with boolean', function() {
      const schema = Schema({
        vote: {
          type: Boolean,
          cast: '{VALUE} is invalid at path {PATH}'
        }
      });

      let threw = false;
      try {
        schema.path('vote').cast('nay');
      } catch (err) {
        threw = true;
        assert.equal(err.name, 'CastError');
        assert.equal(err.message, '"nay" is invalid at path vote');
      }
      assert.ok(threw);
    });
  });

  it('copies `.add()`-ed paths when calling `.add()` with a schema argument (gh-8429)', function() {
    const ToySchema = Schema();
    ToySchema.add({ name: String, color: String, price: Number });

    const TurboManSchema = Schema();
    TurboManSchema.add(ToySchema).add({ year: Number });

    assert.equal(TurboManSchema.path('name').instance, 'String');
    assert.equal(TurboManSchema.path('color').instance, 'String');
    assert.equal(TurboManSchema.path('price').instance, 'Number');
    assert.equal(TurboManSchema.path('year').instance, 'Number');
  });

  it('copies indexes when calling add() with schema instance (gh-12654)', function() {
    const ToySchema = Schema({ name: String });
    ToySchema.index({ name: 1 });

    const TurboManSchema = Schema();
    TurboManSchema.add(ToySchema);

    assert.deepStrictEqual(TurboManSchema.indexes(), [[{ name: 1 }, { background: true }]]);
  });

  describe('gh-8849', function() {
    it('treats `select: undefined` as not specifying `select` option', async function() {
      const userSchema = new Schema({ name: { type: String, select: undefined } });
      const User = db.model('User', userSchema);


      await User.create({ name: 'Hafez' });
      const user = await User.findOne();

      assert.equal(user.name, 'Hafez');
    });

    it('treats `select: null` as not specifying `select` option', async function() {
      const userSchema = new Schema({ name: { type: String, select: null } });
      const User = db.model('User', userSchema);


      await User.create({ name: 'Hafez' });
      const user = await User.findOne();

      assert.equal(user.name, 'Hafez');
    });
  });

  it('disables `id` virtual if no `_id` path (gh-3936)', function() {
    const schema = Schema({ name: String }, { _id: false });
    applyPlugins(schema, [[idGetter]]);
    assert.ok(!schema.paths._id);
    assert.ok(!schema.virtuals.id);
  });

  describe('mongoose.set(`strictQuery`, value); (gh-6658)', function() {
    it('setting `strictQuery` on base sets strictQuery to schema (gh-6658)', function() {
      // Arrange
      const m = new mongoose.Mongoose();
      m.set('strictQuery', 'some value');

      // Act
      const schema = new m.Schema();

      // Assert
      assert.equal(schema.get('strictQuery'), 'some value');
    });

    it('`strictQuery` set on base gets overwritten by option set on schema (gh-6658)', function() {
      // Arrange
      const m = new mongoose.Mongoose();
      m.set('strictQuery', 'base option');

      // Act
      const schema = new m.Schema({}, { strictQuery: 'schema option' });

      // Assert
      assert.equal(schema.get('strictQuery'), 'schema option');
    });
  });

  it('treats dotted paths with no parent as a nested path (gh-9020)', function() {
    const customerSchema = new Schema({
      'card.brand': String,
      'card.last4': String
    });

    assert.ok(customerSchema.nested['card']);
  });

  it('allows using `mongoose.Schema.Types.Array` as type (gh-9194)', function() {
    const schema = new Schema({
      arr: mongoose.Schema.Types.Array
    });

    assert.equal(schema.path('arr').caster.instance, 'Mixed');
  });

  it('handles using a schematype when defining a path (gh-9370)', function() {
    const schema1 = Schema({
      foo: {
        type: Number,
        min: 4,
        get: get
      }
    });

    function get(v) {
      return Math.floor(v);
    }

    const schema2 = Schema({
      bar: schema1.path('foo')
    });

    const schematype = schema2.path('bar');
    assert.equal(schematype.path, 'bar');
    assert.equal(schematype.options.type, Number);
    assert.equal(schematype.options.min, 4);
    assert.equal(schematype.options.get, get);
  });

  it('applies correct schema to nested primitive arrays (gh-9429)', function() {
    const schema = new Schema({
      ids: [[{ type: 'ObjectId', required: true }]]
    });

    const casted = schema.path('ids').cast([[]]);
    assert.equal(casted[0].$path(), 'ids.0');
  });

  describe('cast option (gh-8407)', function() {
    it('disable casting using `false`', function() {
      const schema = Schema({
        myId: { type: 'ObjectId', cast: false },
        myNum: { type: 'number', cast: false },
        myDate: { type: Date, cast: false },
        myBool: { type: Boolean, cast: false },
        myStr: { type: String, cast: false }
      });

      assert.throws(() => schema.path('myId').cast('12charstring'), /Cast to ObjectId failed/);
      assert.throws(() => schema.path('myNum').cast('foo'), /Cast to Number failed/);
      assert.throws(() => schema.path('myDate').cast('2012'), /Cast to date failed/);
      assert.throws(() => schema.path('myBool').cast('true'), /Cast to Boolean failed/);
      assert.throws(() => schema.path('myStr').cast(55), /Cast to string failed/);

      schema.path('myId').cast(new mongoose.Types.ObjectId());
      schema.path('myNum').cast(42);
      schema.path('myDate').cast(new Date());
      schema.path('myBool').cast(false);
      schema.path('myStr').cast('Hello, World');
    });

    it('custom casters', function() {
      const schema = Schema({
        myId: {
          type: 'ObjectId',
          cast: v => new mongoose.Types.ObjectId(v)
        },
        myNum: {
          type: 'number',
          cast: v => Math.ceil(v)
        },
        myDate: { type: Date, cast: v => new Date(v) },
        myBool: { type: Boolean, cast: v => !!v },
        myStr: { type: String, cast: v => '' + v }
      });

      assert.equal(schema.path('myId').cast('12charstring').toHexString(), '313263686172737472696e67');
      assert.equal(schema.path('myNum').cast(3.14), 4);
      assert.equal(schema.path('myDate').cast('2012-06-01').getFullYear(), 2012);
      assert.equal(schema.path('myBool').cast('hello'), true);
      assert.equal(schema.path('myStr').cast(42), '42');

      assert.throws(() => schema.path('myId').cast('bad'), /Cast to ObjectId failed/);
    });
  });

  it('supports `of` for array type definition (gh-9564)', function() {
    const schema = new Schema({
      nums: { type: Array, of: Number },
      tags: { type: 'array', of: String },
      subdocs: { type: Array, of: Schema({ name: String }) }
    });

    assert.equal(schema.path('nums').caster.instance, 'Number');
    assert.equal(schema.path('tags').caster.instance, 'String');
    assert.equal(schema.path('subdocs').casterConstructor.schema.path('name').instance, 'String');
  });

  it('should use the top-most class\'s getter/setter gh-8892', function() {
    class C1 {
      get hello() {
        return 1;
      }
    }

    class C2 extends C1 {
      get hello() {
        return 2;
      }
    }

    const C1Schema = new mongoose.Schema({});
    C1Schema.loadClass(C1);
    const C1Model = db.model('C1', C1Schema);

    const C2Schema = new mongoose.Schema({});
    C2Schema.loadClass(C2);
    const C2Model = db.model('C2', C2Schema);

    assert.equal((new C1Model()).hello, 1);
    assert.equal((new C2Model()).hello, 2);
  });

  it('handles loadClass with inheritted getters (gh-9975)', function() {
    class User {
      get displayAs() {
        return null;
      }
    }

    class TechnicalUser extends User {
      get displayAs() {
        return this.name;
      }
    }

    const schema = new Schema({ name: String }).loadClass(TechnicalUser);

    assert.equal(schema.virtuals.displayAs.applyGetters(null, { name: 'test' }), 'test');
  });

  it('loadClass with static getter (gh-10436)', function() {
    const schema = new mongoose.Schema({
      firstName: String,
      lastName: String
    });

    class UserClass extends mongoose.Model {
      get fullName() {
        return `${this.firstName} ${this.lastName}`;
      }

      static get greeting() {
        return 'Hello World';
      }
    }

    const User = mongoose.model(UserClass, schema);

    assert.equal(User.greeting, 'Hello World');
  });

  it('supports setting `ref` on array SchemaType (gh-10029)', function() {
    const testSchema = new mongoose.Schema({
      doesntpopulate: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'features'
      },
      populatescorrectly: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'features'
      }]
    });

    assert.equal(testSchema.path('doesntpopulate.$').options.ref, 'features');
    assert.equal(testSchema.path('populatescorrectly.$').options.ref, 'features');
  });

  it('path() gets single nested paths within document arrays (gh-10164)', function() {
    const schema = mongoose.Schema({
      field1: [mongoose.Schema({
        field2: mongoose.Schema({
          field3: Boolean
        })
      })]
    });

    assert.equal(schema.path('field1').instance, 'Array');
    assert.equal(schema.path('field1.field2').instance, 'Embedded');
    assert.equal(schema.path('field1.field2.field3').instance, 'Boolean');
  });

  it('supports creating nested paths underneath document arrays (gh-10193)', function() {
    const DynamicTextMatchFeaturesSchema = new Schema({ css: { color: String } });

    const ElementSchema = new Schema({
      image: { type: String },
      possibleElements: [{
        textMatchFeatures: {
          dynamic: DynamicTextMatchFeaturesSchema
        }
      }]
    });

    assert.ok(ElementSchema.path('possibleElements').schema.path('textMatchFeatures.dynamic').schema.nested['css']);
  });

  it('propagates map `ref` down to individual map elements (gh-10329)', function() {
    const TestSchema = new mongoose.Schema({
      testprop: {
        type: Map,
        of: Number,
        ref: 'OtherModel'
      }
    });

    assert.equal(TestSchema.path('testprop.$*').instance, 'Number');
    assert.equal(TestSchema.path('testprop.$*').options.ref, 'OtherModel');
  });

  it('handles maps of maps (gh-10644)', function() {
    const schema = new mongoose.Schema({
      myMap: {
        type: Map,
        of: {
          type: Map,
          of: String
        }
      }
    });
    assert.equal(schema.path('myMap').$__schemaType.$__schemaType.instance, 'String');
  });

  it('handles `type: { subpath: String }` in document array definitions (gh-10750)', function() {
    const schema = new mongoose.Schema({
      something: [{ type: { somePath: String } }],
      // also, same error message when doing:
      somethingElse: { type: [{ type: { somePath: String } }] }
    });

    assert.equal(schema.path('something').caster.schema.path('somePath').instance, 'String');
    assert.equal(schema.path('somethingElse').caster.schema.path('somePath').instance, 'String');
  });

  it('handles `Date` with `type` (gh-10807)', function() {
    Date.type = Date;
    const schema = new mongoose.Schema({
      something: Date,
      somethingElse: { type: Date, immutable: true }
    });

    assert.equal(schema.path('something').instance, 'Date');
    assert.equal(schema.path('somethingElse').instance, 'Date');
    delete Date.type;
  });
  it('setting path with `Mixed` type to an array after number (gh-11417)', async() => {
    const userSchema = new Schema({ data: {} });
    const User = db.model('User', userSchema);

    const user = await User.create({ data: 2 });
    user.set({ data: [] });
    await user.save();
    assert.ok(Array.isArray(user.data));

    const foundUser = await User.findOne({ _id: user._id });
    assert.ok(Array.isArray(foundUser.data));
  });

  it('sets an _applyDiscriminators property on the schema and add discriminator to appropriate model (gh-7971)', async() => {
    const eventSchema = new mongoose.Schema({ message: String },
      { discriminatorKey: 'kind' });
    const batchSchema = new mongoose.Schema({ name: String }, { discriminatorKey: 'kind' });
    batchSchema.discriminator('event', eventSchema);
    assert(batchSchema._applyDiscriminators);
    assert.ok(!eventSchema._applyDiscriminators);

    const arraySchema = new mongoose.Schema({ array: [batchSchema] });
    const arrayModel = db.model('array', arraySchema);
    const array = await arrayModel.create({
      array: [{ name: 'Array Test', message: 'Please work', kind: 'event' }]
    });
    assert(array.array[0].message);

    const parentSchema = new mongoose.Schema({ sub: batchSchema });
    const Parent = db.model('Parent', parentSchema);
    const parent = await Parent.create({
      sub: { name: 'Sub Test', message: 'I hope I worked!', kind: 'event' }
    });
    assert(parent.sub.message);

    const Batch = db.model('Batch', batchSchema);
    const batch = await Batch.create({
      name: 'Test Testerson',
      message: 'Hello World!',
      kind: 'event'
    });
    assert(batch.message);
  });

  it('can use on as a schema property (gh-11580)', async() => {
    const testSchema = new mongoose.Schema({
      on: String
    });
    const Test = db.model('gh11580', testSchema);
    await Test.create({
      on: 'Test'
    });
    const result = await Test.findOne();
    assert.ok(result);
    assert.ok(result.on);
  });

  it('disallows using schemas with schema-level projections with map subdocuments (gh-11698)', async function() {
    const subSchema = new Schema({
      selected: { type: Number },
      not_selected: { type: Number, select: false }
    });

    assert.throws(() => {
      new Schema({
        subdocument_mapping: {
          type: Map,
          of: subSchema
        }
      });
    }, /Cannot use schema-level projections.*subdocument_mapping.not_selected/);
  });

  it('allows a lean option on schemas so that all documents are lean when running a query (gh-10090)', async function() {
    const testSchema = new mongoose.Schema({
      name: String
    }, { lean: true });
    const Test = db.model('gh10090', testSchema);
    await Test.create({
      name: 'I am a lean doc, fast and small'
    });
    const entry = await Test.findOne();
    assert.equal(entry instanceof mongoose.Document, false);
  });

  it('disallows setting special properties with `add()` or constructor (gh-12085)', function() {
    const maliciousPayload = '{"__proto__.toString": "Number"}';

    assert.throws(() => {
      mongoose.Schema(JSON.parse(maliciousPayload));
    }, /__proto__/);

    assert.ok({}.toString());
  });

  it('enable defining virtual paths by using schema constructor (gh-11908)', async function() {
    function get() {return this.email.slice(this.email.indexOf('@') + 1);}
    function set(v) { this.email = [this.email.slice(0, this.email.indexOf('@')), v].join('@');}
    const options = {
      getters: true
    };

    const definition = {
      email: { type: String }
    };
    const TestSchema1 = new Schema(definition);
    TestSchema1.virtual('domain', options).set(set).get(get);

    const TestSchema2 = new Schema({
      email: { type: String }
    }, {
      virtuals: {
        domain: {
          get,
          set,
          options
        }
      }
    });

    assert.deepEqual(TestSchema2.virtuals, TestSchema1.virtuals);

    const doc1 = new (mongoose.model('schema1', TestSchema1))({ email: 'test@m0_0a.com' });
    const doc2 = new (mongoose.model('schema2', TestSchema2))({ email: 'test@m0_0a.com' });

    assert.equal(doc1.domain, doc2.domain);

    const mongooseDomain = 'mongoose.com';
    doc1.domain = mongooseDomain;
    doc2.domain = mongooseDomain;

    assert.equal(doc1.domain, mongooseDomain);
    assert.equal(doc1.domain, doc2.domain);
  });

  it('allows defining ObjectIds and Decimal128s using Types.* (gh-12205)', function() {
    const schema = new Schema({
      testId: mongoose.Types.ObjectId,
      testId2: {
        type: mongoose.Types.ObjectId
      },
      num: mongoose.Types.Decimal128,
      num2: {
        type: mongoose.Types.Decimal128
      }
    });

    assert.equal(schema.path('testId').instance, 'ObjectId');
    assert.equal(schema.path('testId2').instance, 'ObjectId');
    assert.equal(schema.path('num').instance, 'Decimal128');
    assert.equal(schema.path('num2').instance, 'Decimal128');
  });

  it('_getSchema finds path underneath nested subdocument with map of mixed (gh-12530)', function() {
    const schema = new Schema({
      child: new Schema({
        testMap: {
          type: Map,
          of: 'Mixed'
        }
      })
    });

    assert.equal(schema._getSchema('child.testMap.foo.bar').instance, 'Mixed');
  });

  it('should not allow to create a path with primitive values (gh-7558)', () => {
    assert.throws(() => {
      new Schema({
        foo: false
      });
    }, /invalid.*false.*foo/i);

    assert.throws(() => {
      const schema = new Schema();
      schema.add({ foo: false });
    }, /invalid.*false.*foo/i);

    assert.throws(() => {
      new Schema({
        foo: 1
      });
    }, /invalid.*1.*foo/i);

    assert.throws(() => {
      new Schema({
        foo: 'invalid'
      });
    }, /invalid.*invalid.*foo/i);
  });

  it('should allow deleting a virtual path off the schema gh-8397', async function() {
    const schema = new Schema({
      name: String
    }, {
      virtuals: {
        foo: {
          get() {
            return 42;
          }
        }
      }
    });
    assert.ok(schema.virtuals.foo);
    schema.removeVirtual('foo');
    assert.ok(!schema.virtuals.foo);
    assert.ok(!schema.tree.foo);

    schema.virtual('foo').get(v => v || 99);

    const Test = db.model('gh-8397', schema);
    const doc = new Test({ name: 'Test' });
    assert.equal(doc.foo, 99);
  });

  it('should allow deleting multiple virtuals gh-8397', async function() {
    const schema = new Schema({
      name: String
    }, {
      virtuals: {
        foo: {
          get() {
            return 42;
          }
        },
        bar: {
          get() {
            return 41;
          }
        }
      }
    });
    assert.ok(schema.virtuals.foo);
    assert.ok(schema.virtuals.bar);
    schema.removeVirtual(['foo', 'bar']);
    assert.ok(!schema.virtuals.foo);
    assert.ok(!schema.virtuals.bar);
    const Test = db.model('gh-8397', schema);
    const doc = new Test({ name: 'Test' });
    assert.equal(doc.foo, undefined);
    assert.equal(doc.bar, undefined);
  });

  it('should throw an error if attempting to delete a virtual path that does not exist gh-8397', function() {
    const schema = new Schema({
      name: String
    });
    assert.ok(!schema.virtuals.foo);
    assert.throws(() => {
      schema.removeVirtual('foo');
    }, { message: 'Attempting to remove virtual "foo" that does not exist.' });
  });
  it('should throw an error if using schema with "timeseries" option as a nested schema', function() {
    const subSchema = new Schema({
      name: String
    }, { timeseries: { timeField: 'timestamp', metaField: 'metadata', granularity: 'hours' } });
    assert.throws(() => {
      new Schema({
        name: String,
        array: [subSchema]
      });
    }, { message: 'Cannot create use schema for property "array" because the schema has the timeseries option enabled.' });
    assert.throws(() => {
      new Schema({
        name: String,
        subdoc: subSchema
      });
    }, { message: 'Cannot create use schema for property "subdoc" because the schema has the timeseries option enabled.' });
  });
  it('should allow timestamps on a sub document when having _id field in the main document gh-13343', async function() {
    const ImageSchema = new Schema({
      dimensions: {
        type: new Schema({
          width: { type: Number, required: true },
          height: { type: Number, required: true }
        }, { timestamps: true }),
        required: true
      }
    }, { timestamps: true });

    const DataSchema = new Schema({
      tags: { type: ImageSchema, required: false, _id: false }
    });

    const Test = db.model('gh13343', DataSchema);
    const res = await Test.insertMany([
      {
        tags: {
          dimensions: { width: 960, height: 589 }
        }
      }
    ]);
    assert.ok(res);
    assert.ok(res[0].tags.createdAt);
    assert.ok(res[0].tags.updatedAt);
  });
});
