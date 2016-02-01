var underlyingBuffer = Buffer;

var Schema = mongoose.Schema,
    Document = mongoose.Document,
    VirtualType = mongoose.VirtualType,
    SchemaTypes = Schema.Types,
    ObjectId = SchemaTypes.ObjectId,
    Mixed = SchemaTypes.Mixed,
    Buffer = SchemaTypes.Buffer,
    DocumentObjectId = mongoose.Types.ObjectId;

/**
 * Test Document constructor.
 */

function TestDocument(obj) {
  mongoose.Document.call(this, obj || {}, new Schema({
    test: String
  }));
}

/**
 * Inherits from Document.
 */

TestDocument.prototype = Object.create(Document.prototype);
TestDocument.prototype.constructor = TestDocument;

describe('schema', function() {
  it('can be created without the "new" keyword', function(done) {
    var schema = mongoose.Schema({name: String});
    assert.ok(schema instanceof mongoose.Schema);
    done();
  });

  it('supports different schematypes', function(done) {
    var Checkin = new mongoose.Schema({
      date: Date,
      location: {
        lat: Number,
        lng: Number
      }
    });

    var Ferret = new mongoose.Schema({
      name: String,
      owner: mongoose.Schema.Types.ObjectId,
      fur: String,
      color: {type: String},
      age: Number,
      checkins: [Checkin],
      friends: [mongoose.Schema.Types.ObjectId],
      likes: Array,
      alive: Boolean,
      extra: mongoose.Schema.Types.Mixed
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
      date: 'date',
      location: {
        lat: 'number',
        lng: 'Number'
      }
    });

    assert.ok(Checkin1.path('date') instanceof mongoose.Schema.Types.Date);
    assert.ok(Checkin1.path('location.lat') instanceof mongoose.Schema.Types.Number);
    assert.ok(Checkin1.path('location.lng') instanceof mongoose.Schema.Types.Number);

    var Ferret1 = new mongoose.Schema({
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

    assert.ok(Ferret1.path('name') instanceof mongoose.Schema.Types.String);
    assert.ok(Ferret1.path('owner') instanceof mongoose.Schema.Types.ObjectId);
    assert.ok(Ferret1.path('fur') instanceof mongoose.Schema.Types.String);
    assert.ok(Ferret1.path('color') instanceof mongoose.Schema.Types.String);
    assert.ok(Ferret1.path('checkins') instanceof mongoose.Schema.Types.DocumentArray);
    assert.ok(Ferret1.path('friends') instanceof mongoose.Schema.Types.Array);
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

  it('supports dot notation for path accessors', function(done) {
    var Racoon = new Schema({
      name: {type: String, enum: ['Edwald', 'Tobi']},
      age: Number
    });

    // check for global variable leak
    assert.equal('undefined', typeof errorMessage);

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
      simple: {type: String, default: 'a'},
      array: {type: Array, default: [1, 2, 3, 4, 5]},
      arrayX: {type: Array, default: 9},
      arrayFn: {
        type: Array, default: function() {
          return [8];
        }
      },
      callback: {
        type: Number, default: function() {
          assert.equal('b', this.a);
          return '3';
        }
      }
    });

    assert.equal(Test.path('simple').defaultValue, 'a');
    assert.equal(typeof Test.path('callback').defaultValue, 'function');

    assert.equal(Test.path('simple').getDefault(), 'a');
    assert.equal((+Test.path('callback').getDefault({a: 'b'})), 3);
    assert.equal(typeof Test.path('array').defaultValue, 'function');
    assert.equal(Test.path('array').getDefault(new TestDocument)[3], 4);
    assert.equal(Test.path('arrayX').getDefault(new TestDocument)[0], 9);
    assert.equal(typeof Test.path('arrayFn').defaultValue, 'function');
    assert.ok(Test.path('arrayFn').getDefault(new TestDocument).isMongooseArray);
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
      assert.equal('number', typeof Tobi.path('age').cast('0'));
      assert.equal(0, (+Tobi.path('age').cast('0')));

      assert.equal('number', typeof Tobi.path('age').cast(0));
      assert.equal(0, (+Tobi.path('age').cast(0)));
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
        assert.equal('string', typeof Tobi.path('nickname').cast(0));
        assert.equal('0', Tobi.path('nickname').cast(0));

        // test any object that implements toString
        assert.equal('string', typeof Tobi.path('nickname').cast(new Test));
        assert.equal('woot', Tobi.path('nickname').cast(new Test));
        done();
      });
      /* it('casts undefined to "undefined"', function(done){
        var schema = new Schema({ arr: [String] });
        var M = db.model('castingStringArrayWithUndefined', schema);
        M.find({ arr: { $in: [undefined] }}, function (err) {
          db.close();
          assert.equal(err && err.message, 'Cast to string failed for value "undefined" at path "arr"');
          done();
        });
      }); */
    });

    it('date', function(done) {
      var Loki = new Schema({
        birth_date: {type: Date}
      });

      assert.ok(Loki.path('birth_date').cast(1294525628301) instanceof Date);
      assert.ok(Loki.path('birth_date').cast('8/24/2000') instanceof Date);
      assert.ok(Loki.path('birth_date').cast(new Date) instanceof Date);
      done();
    });

    it('objectid', function(done) {
      var Loki = new Schema({
        owner: {type: ObjectId}
      });

      var doc = new TestDocument,
          id = doc._id.toString();

      assert.ok(Loki.path('owner').cast('4c54f3453e688c000000001a') instanceof DocumentObjectId);

      assert.ok(Loki.path('owner').cast(new DocumentObjectId()) instanceof DocumentObjectId);

      assert.ok(Loki.path('owner').cast(doc) instanceof DocumentObjectId);

      assert.equal(id, Loki.path('owner').cast(doc).toString());
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
      assert.equal('test', strings[0]);

      assert.equal(typeof strings[1], 'string');
      assert.equal('123', strings[1]);

      var buffers = Loki.path('buffers').cast(['\0\0\0', new underlyingBuffer('abc')]);

      assert.ok(underlyingBuffer.isBuffer(buffers[0]));
      assert.ok(underlyingBuffer.isBuffer(buffers[1]));

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

    it('boolean', function(done) {
      var Animal = new Schema({
        isFerret: {type: Boolean, required: true}
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
    assert.equal(3, Object.keys(a.methods).length);
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

      assert.equal('woot', Tobi.path('name').applySetters('WOOT'));
      assert.equal(1, Tobi.path('name').setters.length);

      Tobi.path('name').set(function(v) {
        return v + 'WOOT';
      });

      assert.equal('wootwoot', Tobi.path('name').applySetters('WOOT'));
      assert.equal(2, Tobi.path('name').setters.length);
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
        assert.equal('b', this.a);
        assert.equal('name', self.path);
        return v.toLowerCase();
      }

      var Tobi = new Schema({
        name: {type: String, set: lowercase}
      });

      assert.equal('what', Tobi.path('name').applySetters('WHAT', {a: 'b'}));
      done();
    });

    it('casting', function(done) {
      function last(v) {
        assert.equal('number', typeof v);
        assert.equal(0, v);
        return 'last';
      }

      function first() {
        return 0;
      }

      var Tobi = new Schema({
        name: {type: String, set: last}
      });

      Tobi.path('name').set(first);
      assert.equal('last', Tobi.path('name').applySetters('woot'));
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

        assert.equal('what', Tobi.path('name').applySetters('WHAT'));
        assert.equal('1977', Tobi.path('name').applySetters(1977));
        done();
      });
      it('uppercase', function(done) {
        var Tobi = new Schema({
          name: {type: String, uppercase: true}
        });

        assert.equal('WHAT', Tobi.path('name').applySetters('what'));
        assert.equal('1977', Tobi.path('name').applySetters(1977));
        done();
      });
      it('trim', function(done) {
        var Tobi = new Schema({
          name: {type: String, uppercase: true, trim: true}
        });

        assert.equal('WHAT', Tobi.path('name').applySetters('  what   '));
        assert.equal('1977', Tobi.path('name').applySetters(1977));
        done();
      });
    });

    it('applying when none have been defined', function(done) {
      var Tobi = new Schema({
        name: String
      });

      assert.equal('woot', Tobi.path('name').applySetters('woot'));
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

      assert.equal(1, Tobi.path('name').getters.length);
      assert.equal('test woot', Tobi.path('name').applyGetters('test'));
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

      assert.equal('$30', Tobi.path('name').applyGetters(30, {a: 'b'}));
      done();
    });
    it('scope', function(done) {
      function woot(v, self) {
        assert.equal('b', this.a);
        assert.equal('name', self.path);
        return v.toLowerCase();
      }

      var Tobi = new Schema({
        name: {type: String, get: woot}
      });

      assert.equal('yep', Tobi.path('name').applyGetters('YEP', {a: 'b'}));
      done();
    });
    it('casting', function(done) {
      function last(v) {
        assert.equal('number', typeof v);
        assert.equal(0, v);
        return 'last';
      }

      function first() {
        return 0;
      }

      var Tobi = new Schema({
        name: {type: String, get: last}
      });

      Tobi.path('name').get(first);
      assert.equal('last', Tobi.path('name').applyGetters('woot'));
      done();
    });
    it('applying when none have been defined', function(done) {
      var Tobi = new Schema({
        name: String
      });

      assert.equal('woot', Tobi.path('name').applyGetters('woot'));
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
      assert.equal(undefined, schema.path('_id'));

      // old options
      schema = new Schema({
        name: String
      }, {noId: false});
      assert.ok(schema.path('_id') instanceof Schema.ObjectId);

      schema = new Schema({
        name: String
      }, {noId: true});
      assert.equal(undefined, schema.path('_id'));
      done();
    });

    it('auto id', function(done) {
      var schema = new Schema({
        name: String
      });
      assert.ok(schema.virtualpath('id') instanceof mongoose.VirtualType);

      schema = new Schema({
        name: String
      }, {id: true});
      assert.ok(schema.virtualpath('id') instanceof mongoose.VirtualType);

      schema = new Schema({
        name: String
      }, {id: false});
      assert.equal(undefined, schema.virtualpath('id'));

      // old options
      schema = new Schema({
        name: String
      }, {noVirtualId: false});
      assert.ok(schema.virtualpath('id') instanceof mongoose.VirtualType);

      schema = new Schema({
        name: String
      }, {noVirtualId: true});
      assert.equal(undefined, schema.virtualpath('id'));
      done();
    });
  });

  describe('hooks', function() {
    it('registration', function(done) {
      var Tobi = new Schema();

      Tobi.pre('save', function() {
      });
      assert.equal(2, Tobi.callQueue.length);

      Tobi.post('save', function() {
      });
      assert.equal(3, Tobi.callQueue.length);

      Tobi.pre('save', function() {
      });
      assert.equal(4, Tobi.callQueue.length);
      done();
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

      assert.equal(true, called);
      done();
    });
  });

  describe('options', function() {
    it('defaults are set', function(done) {
      var Tobi = new Schema();

      assert.equal('object', typeof Tobi.options);
      assert.equal(undefined, Tobi.options.safe);
      assert.equal(true, Tobi.options.strict);
      assert.equal(false, Tobi.options.capped);
      assert.equal('__v', Tobi.options.versionKey);
      assert.equal('__t', Tobi.options.discriminatorKey);
      assert.equal(null, Tobi.options.shardKey);
      assert.equal(null, Tobi.options.read);
      assert.equal(true, Tobi.options._id);
      done();
    });

    it('setting', function(done) {
      var Tobi = new Schema({}, {collection: 'users'});

      Tobi.set('a', 'b');
      Tobi.set('safe', false);
      assert.equal('users', Tobi.options.collection);

      assert.equal('b', Tobi.options.a);
      assert.deepEqual(Tobi.options.safe, {w: 0});
      assert.equal(null, Tobi.options.read);

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
          assert.equal('b', this.a);
          assert.equal('name', self.path);
          return v.toLowerCase();
        });

        assert.equal('yep', Tobi.virtualpath('name').applyGetters('YEP', {a: 'b'}));
        done();
      });
    });

    describe('setter', function() {
      it('scope', function(done) {
        var Tobi = new Schema;

        Tobi.virtual('name').set(function(v, self) {
          assert.equal('b', this.a);
          assert.equal('name', self.path);
          return v.toLowerCase();
        });

        assert.equal('yep', Tobi.virtualpath('name').applySetters('YEP', {a: 'b'}));
        done();
      });
    });
  });

  // not other contexts
  // not #add()

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
      var s = new Schema({
        arr: [
          {something: {type: String}}
        ]
      });
      assert.ok(s.path('arr') instanceof SchemaTypes.DocumentArray);
      var m = new mongoose.Document({arr: [{something: 'wicked this way comes'}]}, s);
      assert.equal('wicked this way comes', m.arr[0].something);
      assert.ok(m.arr[0]._id);
      done();
    });

    it('array of object literal with type.type is interpreted as DocumentArray', function(done) {
      var s = new Schema({
        arr: [
          {type: {type: String}}
        ]
      });
      assert.ok(s.path('arr') instanceof SchemaTypes.DocumentArray);
      var m = new mongoose.Document({arr: [{type: 'works'}]}, s);
      assert.equal('works', m.arr[0].type);
      assert.ok(m.arr[0]._id);
      done();
    });

    it('of nested schemas should throw (gh-700)', function(done) {
      var a = new Schema({title: String}),
          err;

      try {
        new Schema({blah: Boolean, a: a});
      } catch (err_) {
        err = err_;
      }

      assert.ok(err);
      assert.ok(/Did you try nesting Schemas/.test(err.message));
      done();
    });

    it('does not alter original argument (gh-1364)', function(done) {
      var schema = {
        ids: [{type: Schema.ObjectId, ref: 'something'}],
        a: {type: Array},
        b: Array,
        c: [Date],
        d: {type: 'Boolean'},
        e: [{a: String, b: [{x: Number}]}]
      };

      new Schema(schema);
      assert.equal(6, Object.keys(schema).length);
      assert.deepEqual([{type: Schema.ObjectId, ref: 'something'}], schema.ids);
      assert.deepEqual({type: Array}, schema.a);
      assert.deepEqual(Array, schema.b);
      assert.deepEqual([Date], schema.c);
      assert.deepEqual({type: 'Boolean'}, schema.d);
      assert.deepEqual([{a: String, b: [{x: Number}]}], schema.e);

      done();
    });

    /* it('properly gets value of plain objects when dealing with refs (gh-1606)', function (done) {
      var el = new Schema({ title : String });
      var so = new Schema({
        title : String,
        obj : { type : Schema.Types.ObjectId, ref : 'Element' }
      });

      var Element = db.model('Element', el);
      var Some = db.model('Some', so);

      var ele = new Element({ title : 'thing' });

      ele.save(function (err) {
        assert.ifError(err);
        var s = new Some({ obj : ele.toObject() });
        s.save(function (err) {
          assert.ifError(err);
          Some.findOne({ _id : s.id }, function (err, ss) {
            assert.ifError(err);
            assert.equal(ss.obj, ele.id);
            done();
          });
        });
      });
    }); */
  });
});
