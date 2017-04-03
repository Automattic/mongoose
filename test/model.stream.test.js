
/**
 * Test dependencies.
 */

var start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose,
    utils = require('../lib/utils'),
    random = utils.random,
    Schema = mongoose.Schema,
    fs = require('fs');

var names = ('Aaden Aaron Adrian Aditya Agustin Jim Bob Jonah Frank Sally Lucy').split(' ');

describe('query stream:', function() {
  var db = start();
  var Person;
  var collection = 'personforstream_' + random();
  var P;

  before(function() {
    Person = new Schema({
      name: String
    });

    mongoose.model('PersonForStream', Person);
    P = db.model('PersonForStream', collection);
  });

  before(function(done) {
    var people = names.map(function(name) {
      return {name: name};
    });

    P.create(people, function(err) {
      assert.ifError(err);
      done();
    });
  });

  after(function(done) {
    db.close(done);
  });

  it('works', function(done) {
    var i = 0;
    var closed = 0;
    var paused = 0;
    var resumed = 0;
    var seen = {};
    var err;

    var stream = P.find().batchSize(3).stream();

    function cb() {
      assert.strictEqual(undefined, err);
      assert.equal(names.length, i);
      assert.equal(closed, 1);
      assert.equal(paused, 1);
      assert.equal(resumed, 1);
      assert.equal(stream._cursor.isClosed(), true);
      done();
    }

    stream.on('data', function(doc) {
      assert.strictEqual(true, !!doc.name);
      assert.strictEqual(true, !!doc._id);

      // no dup docs emitted
      assert.ok(!seen[doc.id]);
      seen[doc.id] = 1;

      if (paused > 0 && resumed === 0) {
        err = new Error('data emitted during pause');
        return cb();
      }

      ++i;

      if (i === 3) {
        assert.equal(stream.paused, false);
        stream.pause();
        assert.equal(stream.paused, true);
        paused++;

        setTimeout(function() {
          assert.equal(stream.paused, true);
          resumed++;
          stream.resume();
          assert.equal(stream.paused, false);
        }, 20);
      } else if (i === 4) {
        stream.pause();
        assert.equal(stream.paused, true);
        stream.resume();
        assert.equal(stream.paused, false);
      }
    });

    stream.on('error', function(er) {
      err = er;
      cb();
    });

    stream.on('close', function() {
      closed++;
      cb();
    });
  });

  it('immediately destroying a stream prevents the query from executing', function(done) {
    var i = 0;

    var stream = P.where('name', 'Jonah').select('name').findOne().stream();

    function cb(err) {
      assert.ifError(err);
      assert.equal(i, 0);
      process.nextTick(function() {
        assert.strictEqual(null, stream._fields);
        done();
      });
    }

    stream.on('data', function() {
      i++;
    });
    stream.on('close', cb);
    stream.on('error', cb);

    stream.destroy();
  });

  it('destroying a stream stops it', function(done) {
    this.slow(300);

    var finished = 0;
    var i = 0;

    var stream = P.where('name').exists().limit(10).select('_id').stream();

    assert.strictEqual(null, stream._destroyed);
    assert.equal(stream.readable, true);

    function cb(err) {
      ++finished;
      setTimeout(function() {
        assert.strictEqual(undefined, err);
        assert.equal(i, 5);
        assert.equal(finished, 1);
        assert.equal(stream._destroyed, true);
        assert.equal(stream.readable, false);
        assert.equal(stream._cursor.isClosed(), true);
        done();
      }, 100);
    }

    stream.on('data', function(doc) {
      assert.strictEqual(undefined, doc.name);
      if (++i === 5) {
        stream.destroy();
        assert.equal(stream.readable, false);
      }
    });

    stream.on('close', cb);
    stream.on('error', cb);
  });

  it('errors', function(done) {
    this.slow(300);

    var db = start({server: {auto_reconnect: false}});
    var P = db.model('PersonForStream', collection);

    var finished = 0;
    var closed = 0;
    var i = 0;

    var stream = P.find().batchSize(5).stream();

    function cb(err) {
      ++finished;
      setTimeout(function() {
        assert.ok(/destroyed/.test(err.message), err.message);
        assert.equal(i, 5);
        assert.equal(closed, 1);
        assert.equal(finished, 1);
        assert.equal(stream._destroyed, true);
        assert.equal(stream.readable, false);
        assert.equal(stream._cursor.isClosed(), true);
        done();
      }, 100);
    }

    stream.on('data', function() {
      if (++i === 5) {
        db.close();
      }
    });

    stream.on('close', function() {
      closed++;
    });

    stream.on('error', cb);
  });

  it('pipe', function(done) {
    var filename = '/tmp/_mongoose_stream_out.txt';
    var out = fs.createWriteStream(filename);

    var opts = {transform: JSON.stringify};
    var stream = P.find().sort('name').limit(20).stream(opts);
    stream.pipe(out);

    function cb(err) {
      assert.ifError(err);
      var contents = fs.readFileSync(filename, 'utf8');
      assert.ok(/Aaden/.test(contents));
      assert.ok(/Aaron/.test(contents));
      assert.ok(/Adrian/.test(contents));
      assert.ok(/Aditya/.test(contents));
      assert.ok(/Agustin/.test(contents));
      fs.unlink(filename);
      done();
    }

    stream.on('error', cb);
    out.on('close', cb);
  });

  it('lean', function(done) {
    var i = 0;
    var closed = 0;
    var err;

    var stream = P.find({}).lean().stream();

    function cb() {
      assert.strictEqual(undefined, err);
      assert.equal(names.length, i);
      assert.equal(closed, 1);
      assert.equal(stream._cursor.isClosed(), true);
      done();
    }

    stream.on('data', function(doc) {
      assert.strictEqual(false, doc instanceof mongoose.Document);
      i++;

      if (i === 1) {
        stream.pause();
        assert.equal(stream.paused, true);
        stream.resume();
        assert.equal(stream.paused, false);
      } else if (i === 2) {
        stream.pause();
        assert.equal(stream.paused, true);
        process.nextTick(function() {
          assert.equal(stream.paused, true);
          stream.resume();
          assert.equal(stream.paused, false);
        });
      }
    });

    stream.on('error', function(er) {
      err = er;
      cb();
    });

    stream.on('close', function() {
      closed++;
      cb();
    });
  });

  it('supports $elemMatch with $in (gh-1091)', function(done) {
    this.timeout(3000);

    var postSchema = new Schema({
      ids: [{type: Schema.ObjectId}],
      title: String
    });

    var B = db.model('gh-1100-stream', postSchema);
    var _id1 = new mongoose.Types.ObjectId;
    var _id2 = new mongoose.Types.ObjectId;

    B.create({ids: [_id1, _id2]}, function(err, doc) {
      assert.ifError(err);

      var error;

      var stream = B.find({_id: doc._id})
        .select({title: 1, ids: {$elemMatch: {$in: [_id2.toString()]}}})
        .stream();

      stream.
        on('data', function(found) {
          assert.equal(found.id, doc.id);
          assert.equal(found.ids.length, 1);
          assert.equal(_id2.toString(), found.ids[0].toString());
        }).
        on('error', function(err) {
          error = err;
        }).
        on('close', function() {
          done(error);
        });
    });
  });

  it('supports population (gh-1411)', function(done) {
    var barSchema = new Schema({
      value: Number
    });

    var fooSchema = new Schema({
      bar: {type: 'ObjectId', ref: 'Bar'}
    });

    var Foo = db.model('Foo', fooSchema);
    var Bar = db.model('Bar', barSchema);
    var found = [];

    function complete(err) {
      if (!err) {
        assert.ok(~found.indexOf(2));
        assert.ok(~found.indexOf(3));
      }
      done();
    }

    Bar.create({value: 2}, {value: 3}, function(err, bar1, bar2) {
      if (err) return complete(err);

      Foo.create({bar: bar1}, {bar: bar2}, function(err) {
        if (err) return complete(err);

        Foo.
          find().
          populate('bar').
          stream().
          on('data', function(foo) {
            found.push(foo.bar.value);
          }).
          on('end', complete).
          on('error', complete);
      });
    });
  });

  it('respects schema options (gh-1862)', function(done) {
    var schema = new Schema({
      fullname: {type: String},
      password: {type: String, select: false}
    });

    var User = db.model('gh-1862', schema, 'gh-1862');
    User.create({fullname: 'val', password: 'taco'}, function(error) {
      assert.ifError(error);
      User.find().stream().on('data', function(doc) {
        assert.equal(doc.password, void 0);
        done();
      });
    });
  });

  it('works with populate + lean (gh-2841)', function(done) {
    var Sku = db.model('Sku', {}, 'gh2841_0');
    var Item = db.model('Item', {
      sku: {ref: 'Sku', type: Schema.Types.ObjectId}
    }, 'gh2841_1');

    Sku.create({}, function(error, sku) {
      assert.ifError(error);
      Item.create({sku: sku._id}, function(error) {
        assert.ifError(error);

        var found = 0;
        var popOpts = {path: 'sku', options: {lean: true}};
        var stream = Item.find().populate(popOpts).stream();
        stream.on('data', function(doc) {
          ++found;
          assert.equal(doc.sku._id.toString(), sku._id.toString());
        });
        stream.on('end', function() {
          assert.equal(found, 1);
          done();
        });
      });
    });
  });

  it('works with populate + dynref (gh-3108)', function(done) {
    var reviewSchema = new Schema({
      _id: Number,
      text: String,
      item: {
        id: {
          type: Number,
          refPath: 'item.type'
        },
        type: {
          type: String
        }
      },
      items: [
        {
          id: {
            type: Number,
            refPath: 'items.type'
          },
          type: {
            type: String
          }
        }
      ]
    });

    var item1Schema = new Schema({
      _id: Number,
      name: String
    });

    var item2Schema = new Schema({
      _id: Number,
      otherName: String
    });

    var Review = db.model('dynrefReview', reviewSchema, 'gh3108_0');
    var Item1 = db.model('dynrefItem1', item1Schema, 'gh3108_1');
    var Item2 = db.model('dynrefItem2', item2Schema, 'gh3108_2');

    var c = 0;

    var create = function(cb) {
      Item1.create({_id: ++c, name: 'Val'}, function(error) {
        assert.ifError(error);
        Item2.create({_id: ++c, otherName: 'Val'}, function(error) {
          assert.ifError(error);
          var review = {
            _id: c,
            text: 'Test',
            item: {id: c - 1, type: 'dynrefItem1'},
            items: [
              {id: c - 1, type: 'dynrefItem1'},
              {id: c, type: 'dynrefItem2'}
            ]
          };
          Review.create(review, function(error) {
            assert.ifError(error);
            cb();
          });
        });
      });
    };

    var test = function() {
      var stream = Review.find({}).populate('items.id').stream();
      var count = 0;

      stream.on('data', function(doc) {
        ++count;
        assert.equal(doc.items[0].id.name, 'Val');
        assert.equal(doc.items[1].id.otherName, 'Val');
      });

      stream.on('close', function() {
        assert.equal(count, 2);
        done();
      });
    };

    create(function() {
      create(function() {
        test();
      });
    });
  });
});
