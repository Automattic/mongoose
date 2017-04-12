/* global emit */
/**
 * Test dependencies.
 */

var start = require('./common'),
    mongoose = start.mongoose,
    assert = require('power-assert'),
    random = require('../lib/utils').random,
    Schema = mongoose.Schema,
    ObjectId = Schema.Types.ObjectId;

describe('model: mapreduce:', function() {
  var Comments;
  var BlogPost;
  var collection;

  before(function() {
    Comments = new Schema();

    Comments.add({
      title: String,
      date: Date,
      body: String,
      comments: [Comments]
    });

    BlogPost = new Schema({
      title: String,
      author: String,
      slug: String,
      date: Date,
      meta: {
        date: Date,
        visitors: Number
      },
      published: Boolean,
      mixed: {},
      numbers: [Number],
      owners: [ObjectId],
      comments: [Comments]
    });

    collection = 'mapreduce_' + random();
    mongoose.model('MapReduce', BlogPost);
  });

  it('works', function(done) {
    var db = start(),
        MR = db.model('MapReduce', collection);

    var magicID;
    var id = new mongoose.Types.ObjectId;
    var authors = 'aaron guillermo brian nathan'.split(' ');
    var num = 10;
    var docs = [];
    for (var i = 0; i < num; ++i) {
      docs.push({author: authors[i % authors.length], owners: [id], published: true});
    }

    MR.create(docs, function(err, insertedDocs) {
      assert.ifError(err);

      magicID = insertedDocs[1]._id;

      var o = {
        map: function() {
          emit(this.author, 1);
        },
        reduce: function(k, vals) {
          return vals.length;
        }
      };

      MR.mapReduce(o, function(err, ret, stats) {
        assert.ifError(err);
        assert.ok(Array.isArray(ret));
        assert.ok(stats);
        ret.forEach(function(res) {
          if (res._id === 'aaron') {
            assert.equal(res.value, 3);
          }
          if (res._id === 'guillermo') {
            assert.equal(res.value, 3);
          }
          if (res._id === 'brian') {
            assert.equal(res.value, 2);
          }
          if (res._id === 'nathan') {
            assert.equal(res.value, 2);
          }
        });

        var o = {
          map: function() {
            emit(this.author, 1);
          },
          reduce: function(k, vals) {
            return vals.length;
          },
          query: {author: 'aaron', published: 1, owners: id}
        };

        MR.mapReduce(o, function(err, ret, stats) {
          assert.ifError(err);

          assert.ok(Array.isArray(ret));
          assert.equal(ret.length, 1);
          assert.equal(ret[0]._id, 'aaron');
          assert.equal(ret[0].value, 3);
          assert.ok(stats);

          modeling();
        });
      });

      function modeling() {
        var o = {
          map: function() {
            emit(this.author, {own: magicID});
          },
          scope: {magicID: magicID},
          reduce: function(k, vals) {
            return {own: vals[0].own, count: vals.length};
          },
          out: {replace: '_mapreduce_test_' + random()}
        };

        MR.mapReduce(o, function(err, ret) {
          assert.ifError(err);

          // ret is a model
          assert.ok(!Array.isArray(ret));
          assert.equal(typeof ret.findOne, 'function');
          assert.equal(typeof ret.mapReduce, 'function');

          // queries work
          ret.where('value.count').gt(1).sort({_id: 1}).exec(function(err, docs) {
            assert.ifError(err);
            assert.equal(docs[0]._id, 'aaron');
            assert.equal(docs[1]._id, 'brian');
            assert.equal(docs[2]._id, 'guillermo');
            assert.equal(docs[3]._id, 'nathan');

            // update casting works
            ret.findOneAndUpdate({_id: 'aaron'}, {published: true}, {new: true}, function(err, doc) {
              assert.ifError(err);
              assert.ok(doc);
              assert.equal(doc._id, 'aaron');
              assert.equal(doc.published, true);

              // ad-hoc population works
              ret
              .findOne({_id: 'aaron'})
              .populate({path: 'value.own', model: 'MapReduce'})
              .exec(function(err, doc) {
                db.close();
                assert.ifError(err);
                assert.equal(doc.value.own.author, 'guillermo');
                done();
              });
            });
          });
        });
      }
    });
  });

  it('withholds stats with false verbosity', function(done) {
    var db = start(),
        MR = db.model('MapReduce', collection);

    var o = {
      map: function() {
      },
      reduce: function() {
        return 'test';
      },
      verbose: false
    };

    MR.mapReduce(o, function(err, results, stats) {
      assert.equal(typeof stats, 'undefined');
      db.close(done);
    });
  });

  describe('promises (gh-1628)', function() {
    it('are returned', function(done) {
      var db = start(),
          MR = db.model('MapReduce', collection);

      var o = {
        map: function() {
        },
        reduce: function() {
          return 'test';
        }
      };

      var promise = MR.mapReduce(o, function() {
      });
      assert.ok(promise instanceof mongoose.Promise);

      db.close(done);
    });

    it('allow not passing a callback', function(done) {
      var db = start(),
          MR = db.model('MapReduce', collection);

      var o = {
        map: function() {
          emit(this.author, 1);
        },
        reduce: function(k, vals) {
          return vals.length;
        },
        query: {author: 'aaron', published: 1}
      };

      function validate(ret, stats) {
        assert.ok(Array.isArray(ret));
        assert.equal(ret.length, 1);
        assert.equal(ret[0]._id, 'aaron');
        assert.equal(ret[0].value, 6);
        assert.ok(stats);
      }

      function finish() {
        db.close(done);
      }

      var promise;

      assert.doesNotThrow(function() {
        promise = MR.mapReduce(o);
      });

      promise.then(validate, assert.ifError).then(finish).end();
    });
  });

  it('works using then', function(done) {
    var db = start(),
        MR = db.model('MapReduce', collection);

    var magicID;
    var id = new mongoose.Types.ObjectId;
    var authors = 'aaron guillermo brian nathan'.split(' ');
    var num = 10;
    var docs = [];
    for (var i = 0; i < num; ++i) {
      docs.push({author: authors[i % authors.length], owners: [id], published: true});
    }

    MR.create(docs, function(err, insertedDocs) {
      assert.ifError(err);

      var b = insertedDocs[1];
      magicID = b._id;

      var o = {
        map: function() {
          emit(this.author, 1);
        },
        reduce: function(k, vals) {
          return vals.length;
        }
      };

      MR.mapReduce(o).then(function(ret, stats) {
        assert.ok(Array.isArray(ret));
        assert.ok(stats);
        ret.forEach(function(res) {
          if (res._id === 'aaron') {
            assert.equal(res.value, 6);
          }
          if (res._id === 'guillermo') {
            assert.equal(res.value, 6);
          }
          if (res._id === 'brian') {
            assert.equal(res.value, 4);
          }
          if (res._id === 'nathan') {
            assert.equal(res.value, 4);
          }
        });

        var o = {
          map: function() {
            emit(this.author, 1);
          },
          reduce: function(k, vals) {
            return vals.length;
          },
          query: {author: 'aaron', published: 1, owners: id}
        };

        MR.mapReduce(o).then(function(ret, stats) {
          assert.ok(Array.isArray(ret));
          assert.equal(ret.length, 1);
          assert.equal(ret[0]._id, 'aaron');
          assert.equal(ret[0].value, 3);
          assert.ok(stats);
          modeling();
        });
      });

      function modeling() {
        var o = {
          map: function() {
            emit(this.author, {own: magicID});
          },
          scope: {magicID: magicID},
          reduce: function(k, vals) {
            return {own: vals[0].own, count: vals.length};
          },
          out: {replace: '_mapreduce_test_' + random()}
        };

        MR.mapReduce(o).then(function(ret) {
          // ret is a model
          assert.ok(!Array.isArray(ret));
          assert.equal(typeof ret.findOne, 'function');
          assert.equal(typeof ret.mapReduce, 'function');

          // queries work
          ret.where('value.count').gt(1).sort({_id: 1}).exec(function(err, docs) {
            assert.ifError(err);
            assert.equal(docs[0]._id, 'aaron');
            assert.equal(docs[1]._id, 'brian');
            assert.equal(docs[2]._id, 'guillermo');
            assert.equal(docs[3]._id, 'nathan');

            // update casting works
            ret.findOneAndUpdate({_id: 'aaron'}, {published: true}, {new: true}, function(err, doc) {
              assert.ifError(err);
              assert.ok(doc);
              assert.equal(doc._id, 'aaron');
              assert.equal(doc.published, true);

              // ad-hoc population works
              ret
              .findOne({_id: 'aaron'})
              .populate({path: 'value.own', model: 'MapReduce'})
              .exec(function(err, doc) {
                db.close();
                assert.ifError(err);
                assert.equal(doc.value.own.author, 'guillermo');
                done();
              });
            });
          });
        });
      }
    });
  });

  it('withholds stats with false verbosity using then', function(done) {
    var db = start(),
        MR = db.model('MapReduce', collection);

    var o = {
      map: function() {
      },
      reduce: function() {
        return 'test';
      },
      verbose: false
    };

    MR.mapReduce(o).then(function(results, stats) {
      assert.equal(typeof stats, 'undefined');
      db.close(done);
    });
  });

  it('resolveToObject (gh-4945)', function(done) {
    var db = start();
    var MR = db.model('MapReduce', collection);

    var o = {
      map: function() {
      },
      reduce: function() {
        return 'test';
      },
      verbose: false,
      resolveToObject: true
    };

    MR.create({ title: 'test' }, function(error) {
      assert.ifError(error);
      MR.mapReduce(o).then(function(obj) {
        assert.ok(obj.model);
        db.close(done);
      }).catch(done);
    });
  });
});
