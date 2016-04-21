/**
 * Test dependencies.
 */

var CastError = require('../lib/error/cast');
var start = require('./common');
var assert = require('power-assert');
var mongoose = start.mongoose;
var random = require('../lib/utils').random;
var Utils = require('../lib/utils');
var Schema = mongoose.Schema;
var ObjectId = Schema.Types.ObjectId;
var DocumentObjectId = mongoose.Types.ObjectId;
var _ = require('underscore');

/**
 * Setup.
 */

var Comments = new Schema();

Comments.add({
  title: String,
  date: Date,
  body: String,
  comments: [Comments]
});

var BlogPost = new Schema({
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

BlogPost.virtual('titleWithAuthor')
.get(function() {
  return this.get('title') + ' by ' + this.get('author');
})
.set(function(val) {
  var split = val.split(' by ');
  this.set('title', split[0]);
  this.set('author', split[1]);
});

BlogPost.method('cool', function() {
  return this;
});

BlogPost.static('woot', function() {
  return this;
});

var modelname = 'UpdateOneBlogPost';
mongoose.model(modelname, BlogPost);

var collection = 'updateoneblogposts_' + random();

var strictSchema = new Schema({name: String}, {strict: true});
mongoose.model('UpdateOneStrictSchema', strictSchema);

var strictThrowSchema = new Schema({name: String}, {strict: 'throw'});
mongoose.model('UpdateOneStrictThrowSchema', strictThrowSchema);

describe('model: findOneAndUpdate:', function() {
  it('WWW returns the edited document', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        title = 'Tobi ' + random(),
        author = 'Brian ' + random(),
        newTitle = 'Woot ' + random(),
        id0 = new DocumentObjectId,
        id1 = new DocumentObjectId;

    var post = new M;
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date;
    post.published = true;
    post.mixed = {x: 'ex'};
    post.numbers = [4, 5, 6, 7];
    post.owners = [id0, id1];
    post.comments = [{body: 'been there'}, {body: 'done that'}];

    post.save(function(err) {
      assert.ifError(err);
      M.findById(post._id, function(err, cf) {
        assert.ifError(err);
        assert.equal(title, cf.title);
        assert.equal(author, cf.author);
        assert.equal(0, cf.meta.visitors.valueOf());
        assert.equal(post.date.toString(), cf.date);
        assert.equal(true, cf.published);
        assert.equal('ex', cf.mixed.x);
        assert.deepEqual([4, 5, 6, 7], cf.numbers.toObject());
        assert.equal(2, cf.owners.length);
        assert.equal(id0.toString(), cf.owners[0].toString());
        assert.equal(id1.toString(), cf.owners[1].toString());
        assert.equal(2, cf.comments.length);
        assert.equal('been there', cf.comments[0].body);
        assert.equal('done that', cf.comments[1].body);
        assert.ok(cf.comments[0]._id);
        assert.ok(cf.comments[1]._id);
        assert.ok(cf.comments[0]._id instanceof DocumentObjectId);
        assert.ok(cf.comments[1]._id instanceof DocumentObjectId);

        var update = {
          title: newTitle, // becomes $set
          $inc: {'meta.visitors': 2},
          $set: {date: new Date},
          published: false, // becomes $set
          mixed: {x: 'ECKS', y: 'why'}, // $set
          $pullAll: {numbers: [4, 6]},
          $pull: {owners: id0},
          'comments.1.body': 8 // $set
        };

        M.findOneAndUpdate({title: title}, update, {new: true}, function(err, up) {
          db.close();
          assert.equal(err, null, err && err.stack);

          assert.equal(newTitle, up.title);
          assert.equal(author, up.author);
          assert.equal(2, up.meta.visitors.valueOf());
          assert.equal(update.$set.date.toString(), up.date.toString());
          assert.equal(false, up.published);
          assert.equal('ECKS', up.mixed.x);
          assert.equal('why', up.mixed.y);
          assert.deepEqual([5, 7], up.numbers.toObject());
          assert.equal(1, up.owners.length);
          assert.equal(id1.toString(), up.owners[0].toString());
          assert.equal('been there', up.comments[0].body);
          assert.equal('8', up.comments[1].body);
          assert.ok(up.comments[0]._id);
          assert.ok(up.comments[1]._id);
          assert.ok(up.comments[0]._id instanceof DocumentObjectId);
          assert.ok(up.comments[1]._id instanceof DocumentObjectId);
          done();
        });
      });
    });
  });

  describe('will correctly', function() {
    var db, ItemParentModel, ItemChildModel;

    before(function() {
      db = start();
      var itemSpec = new Schema({
        item_id: {
          type: ObjectId, required: true, default: function() {
            return new DocumentObjectId();
          }
        },
        address: {
          street: String,
          zipcode: String
        },
        age: Number
      }, {_id: false});
      var itemSchema = new Schema({
        items: [itemSpec]
      });
      ItemParentModel = db.model('ItemParentModel', itemSchema);
      ItemChildModel = db.model('ItemChildModel', itemSpec);
    });

    after(function() {
      db.close();
    });

    it('update subdocument in array item', function(done) {
      var item1 = new ItemChildModel({
        address: {
          street: 'times square',
          zipcode: '10036'
        }
      });
      var item2 = new ItemChildModel({
        address: {
          street: 'bryant park',
          zipcode: '10030'
        }
      });
      var item3 = new ItemChildModel({
        address: {
          street: 'queens',
          zipcode: '1002?'
        }
      });
      var itemParent = new ItemParentModel({items: [item1, item2, item3]});
      itemParent.save(function(err) {
        assert.ifError(err);
        ItemParentModel.findOneAndUpdate(
            {_id: itemParent._id, 'items.item_id': item1.item_id},
            {$set: {'items.$.address': {}}},
            {new: true},
            function(err, updatedDoc) {
              assert.ifError(err);
              assert.ok(updatedDoc.items);
              assert.ok(updatedDoc.items instanceof Array);
              assert.ok(updatedDoc.items.length, 3);
              assert.ok(Utils.isObject(updatedDoc.items[0].address));
              assert.ok(Object.keys(updatedDoc.items[0].address).length, 0);
              done();
            }
        );
      });
    });
  });

  it('returns the original document', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        title = 'Tobi ' + random(),
        author = 'Brian ' + random(),
        newTitle = 'Woot ' + random(),
        id0 = new DocumentObjectId,
        id1 = new DocumentObjectId;

    var post = new M;
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date;
    post.published = true;
    post.mixed = {x: 'ex'};
    post.numbers = [4, 5, 6, 7];
    post.owners = [id0, id1];
    post.comments = [{body: 'been there'}, {body: 'done that'}];

    post.save(function(err) {
      assert.ifError(err);
      M.findById(post._id, function(err) {
        assert.ifError(err);

        var update = {
          title: newTitle, // becomes $set
          $inc: {'meta.visitors': 2},
          $set: {date: new Date},
          published: false, // becomes $set
          mixed: {x: 'ECKS', y: 'why'}, // $set
          $pullAll: {numbers: [4, 6]},
          $pull: {owners: id0},
          'comments.1.body': 8 // $set
        };

        M.findOneAndUpdate({title: title}, update, {new: false}, function(err, up) {
          db.close();
          assert.ifError(err);

          assert.equal(post.title, up.title);
          assert.equal(post.author, up.author);
          assert.equal(post.meta.visitors, up.meta.visitors.valueOf());
          assert.equal(up.date.toString(), post.date.toString());
          assert.equal(up.published, post.published);
          assert.equal(up.mixed.x, post.mixed.x);
          assert.equal(up.mixed.y, post.mixed.y);
          assert.deepEqual(up.numbers.toObject(), post.numbers.toObject());
          assert.equal(up.owners.length, post.owners.length);
          assert.equal(up.owners[0].toString(), post.owners[0].toString());
          assert.equal(up.comments[0].body, post.comments[0].body);
          assert.equal(up.comments[1].body, post.comments[1].body);
          assert.ok(up.comments[0]._id);
          assert.ok(up.comments[1]._id);
          assert.ok(up.comments[0]._id instanceof DocumentObjectId);
          assert.ok(up.comments[1]._id instanceof DocumentObjectId);
          done();
        });
      });
    });
  });

  it('allows upserting', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        title = 'Tobi ' + random(),
        author = 'Brian ' + random(),
        newTitle = 'Woot ' + random(),
        id0 = new DocumentObjectId,
        id1 = new DocumentObjectId;

    var post = new M;
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date;
    post.published = true;
    post.mixed = {x: 'ex'};
    post.numbers = [4, 5, 6, 7];
    post.owners = [id0, id1];
    post.comments = [{body: 'been there'}, {body: 'done that'}];

    var update = {
      title: newTitle, // becomes $set
      $inc: {'meta.visitors': 2},
      $set: {date: new Date},
      published: false, // becomes $set
      mixed: {x: 'ECKS', y: 'why'}, // $set
      $pullAll: {numbers: [4, 6]},
      $pull: {owners: id0}
    };

    M.findOneAndUpdate({title: title}, update, {upsert: true, new: true}, function(err, up) {
      db.close();
      assert.ifError(err);

      assert.equal(newTitle, up.title);
      assert.equal(2, up.meta.visitors.valueOf());
      assert.equal(up.date.toString(), update.$set.date.toString());
      assert.equal(update.published, up.published);
      assert.deepEqual(update.mixed.x, up.mixed.x);
      assert.strictEqual(up.mixed.y, update.mixed.y);
      assert.ok(Array.isArray(up.numbers));
      assert.ok(Array.isArray(up.owners));
      assert.strictEqual(0, up.numbers.length);
      assert.strictEqual(0, up.owners.length);
      done();
    });
  });

  it('options/conditions/doc are merged when no callback is passed', function(done) {
    var db = start(),
        M = db.model(modelname, collection);

    db.close();

    var now = new Date,
        query;

    // Model.findOneAndUpdate
    query = M.findOneAndUpdate({author: 'aaron'}, {$set: {date: now}}, {new: false, fields: 'author'});
    assert.strictEqual(false, query.options.new);
    assert.strictEqual(1, query._fields.author);
    assert.equal(now.toString(), query._update.$set.date.toString());
    assert.strictEqual('aaron', query._conditions.author);

    query = M.findOneAndUpdate({author: 'aaron'}, {$set: {date: now}});
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now.toString(), query._update.$set.date.toString());
    assert.strictEqual('aaron', query._conditions.author);

    query = M.findOneAndUpdate({$set: {date: now}});
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now.toString(), query._update.$set.date.toString());
    assert.strictEqual(undefined, query._conditions.author);

    query = M.findOneAndUpdate();
    assert.strictEqual(undefined, query.options.new);
    assert.equal(undefined, query._update);
    assert.strictEqual(undefined, query._conditions.author);

    // Query.findOneAndUpdate
    query = M.where('author', 'aaron').findOneAndUpdate({date: now});
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now.toString(), query._update.date.toString());
    assert.strictEqual('aaron', query._conditions.author);

    query = M.find().findOneAndUpdate({author: 'aaron'}, {date: now});
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now.toString(), query._update.date.toString());
    assert.strictEqual('aaron', query._conditions.author);

    query = M.find().findOneAndUpdate({date: now});
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now.toString(), query._update.date.toString());
    assert.strictEqual(undefined, query._conditions.author);

    query = M.find().findOneAndUpdate();
    assert.strictEqual(undefined, query.options.new);
    assert.equal(undefined, query._update);
    assert.strictEqual(undefined, query._conditions.author);
    done();
  });

  it('executes when a callback is passed', function(done) {
    var db = start(),
        M = db.model(modelname, collection + random()),
        pending = 6;

    M.findOneAndUpdate({name: 'aaron'}, {$set: {name: 'Aaron6'}}, {new: false}, cb);
    M.findOneAndUpdate({name: 'aaron'}, {$set: {name: 'Aaron4'}}, cb);
    M.where().findOneAndUpdate({name: 'aaron'}, {$set: {name: 'Aaron1'}}, {new: false}, cb);
    M.where().findOneAndUpdate({name: 'aaron'}, {$set: {name: 'Aaron2'}}, cb);
    M.where().findOneAndUpdate({$set: {name: 'Aaron6'}}, cb);
    M.where('name', 'aaron').findOneAndUpdate({$set: {name: 'Aaron'}}).findOneAndUpdate(cb);

    function cb(err, doc) {
      assert.ifError(err);
      assert.strictEqual(null, doc); // not an upsert, no previously existing doc
      if (--pending) {
        return;
      }
      db.close();
      done();
    }
  });

  it('executes when a callback is passed to a succeeding function', function(done) {
    var db = start(),
        M = db.model(modelname, collection + random()),
        pending = 6;

    M.findOneAndUpdate({name: 'aaron'}, {$set: {name: 'Aaron'}}, {new: false}).exec(cb);
    M.findOneAndUpdate({name: 'aaron'}, {$set: {name: 'Aaron'}}).exec(cb);
    M.where().findOneAndUpdate({name: 'aaron'}, {$set: {name: 'Aaron'}}, {new: false}).exec(cb);
    M.where().findOneAndUpdate({name: 'aaron'}, {$set: {name: 'Aaron'}}).exec(cb);
    M.where().findOneAndUpdate({$set: {name: 'Aaron'}}).exec(cb);
    M.where('name', 'aaron').findOneAndUpdate({$set: {name: 'Aaron'}}).exec(cb);

    function cb(err, doc) {
      assert.ifError(err);
      assert.strictEqual(null, doc); // not an upsert, no previously existing doc
      if (--pending) {
        return;
      }
      db.close();
      done();
    }
  });

  it('executing with only a callback throws', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        err;

    try {
      M.findOneAndUpdate(function() {
      });
    } catch (e) {
      err = e;
    }

    db.close();
    assert.ok(/First argument must not be a function/.test(err));
    done();
  });

  it('updates numbers atomically', function(done) {
    var db = start(),
        BlogPost = db.model(modelname, collection),
        totalDocs = 4;

    var post = new BlogPost();
    post.set('meta.visitors', 5);

    post.save(function(err) {
      assert.ifError(err);

      function callback(err) {
        assert.ifError(err);
        --totalDocs || complete();
      }

      for (var i = 0; i < 4; ++i) {
        BlogPost
        .findOneAndUpdate({_id: post._id}, {$inc: {'meta.visitors': 1}}, callback);
      }

      function complete() {
        BlogPost.findOne({_id: post.get('_id')}, function(err, doc) {
          db.close();
          assert.ifError(err);
          assert.equal(9, doc.get('meta.visitors'));
          done();
        });
      }
    });
  });

  it('honors strict schemas', function(done) {
    var db = start();
    var S = db.model('UpdateOneStrictSchema');
    var s = new S({name: 'orange crush'});

    s.save(function(err) {
      assert.ifError(err);
      var name = Date.now();
      S.findOneAndUpdate({name: name}, {ignore: true}, {upsert: true, new: true}, function(err, doc) {
        assert.ifError(err);
        assert.ok(doc);
        assert.ok(doc._id);
        assert.equal(undefined, doc.ignore);
        assert.equal(undefined, doc._doc.ignore);
        assert.equal(name, doc.name);
        S.findOneAndUpdate({name: 'orange crush'}, {ignore: true}, {upsert: true}, function(err, doc) {
          assert.ifError(err);
          assert.ok(!doc.ignore);
          assert.ok(!doc._doc.ignore);
          assert.equal('orange crush', doc.name);
          S.findOneAndUpdate({name: 'orange crush'}, {ignore: true}, function(err, doc) {
            db.close();
            assert.ifError(err);
            assert.ok(!doc.ignore);
            assert.ok(!doc._doc.ignore);
            assert.equal('orange crush', doc.name);
            done();
          });
        });
      });
    });
  });

  it('returns errors with strict:throw schemas', function(done) {
    var db = start();
    var S = db.model('UpdateOneStrictThrowSchema');
    var s = new S({name: 'orange crush'});

    s.save(function(err) {
      assert.ifError(err);

      var name = Date.now();
      S.findOneAndUpdate({name: name}, {ignore: true}, {upsert: true}, function(err, doc) {
        assert.ok(err);
        assert.ok(/not in schema/.test(err));
        assert.ok(!doc);

        S.findOneAndUpdate({_id: s._id}, {ignore: true}, function(err, doc) {
          db.close();
          assert.ok(err);
          assert.ok(/not in schema/.test(err));
          assert.ok(!doc);
          done();
        });
      });
    });
  });
});

describe('model: findByIdAndUpdate:', function() {
  it('executing with just a callback throws', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        err;

    try {
      M.findByIdAndUpdate(function() {
      });
    } catch (e) {
      err = e;
    }

    db.close();
    assert.ok(/First argument must not be a function/.test(err));
    done();
  });

  it('executes when a callback is passed', function(done) {
    var db = start(),
        M = db.model(modelname, collection + random()),
        _id = new DocumentObjectId,
        pending = 2;

    M.findByIdAndUpdate(_id, {$set: {name: 'Aaron'}}, {new: false}, cb);
    M.findByIdAndUpdate(_id, {$set: {name: 'changed'}}, cb);

    function cb(err, doc) {
      assert.ifError(err);
      assert.strictEqual(null, doc); // no previously existing doc
      if (--pending) {
        return;
      }
      db.close(done);
    }
  });

  it('executes when a callback is passed to a succeeding function', function(done) {
    var db = start(),
        M = db.model(modelname, collection + random()),
        _id = new DocumentObjectId,
        pending = 2;

    M.findByIdAndUpdate(_id, {$set: {name: 'Aaron'}}, {new: false}).exec(cb);
    M.findByIdAndUpdate(_id, {$set: {name: 'changed'}}).exec(cb);

    function cb(err, doc) {
      assert.ifError(err);
      assert.strictEqual(null, doc); // no previously existing doc
      if (--pending) {
        return;
      }
      db.close(done);
    }
  });

  it('returns the original document', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        title = 'Tobi ' + random(),
        author = 'Brian ' + random(),
        newTitle = 'Woot ' + random(),
        id0 = new DocumentObjectId,
        id1 = new DocumentObjectId;

    var post = new M;
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date;
    post.published = true;
    post.mixed = {x: 'ex'};
    post.numbers = [4, 5, 6, 7];
    post.owners = [id0, id1];
    post.comments = [{body: 'been there'}, {body: 'done that'}];

    post.save(function(err) {
      assert.ifError(err);
      M.findById(post._id, function(err) {
        assert.ifError(err);

        var update = {
          title: newTitle, // becomes $set
          $inc: {'meta.visitors': 2},
          $set: {date: new Date},
          published: false, // becomes $set
          mixed: {x: 'ECKS', y: 'why'}, // $set
          $pullAll: {numbers: [4, 6]},
          $pull: {owners: id0},
          'comments.1.body': 8 // $set
        };

        M.findByIdAndUpdate(post.id, update, {new: false}, function(err, up) {
          assert.ifError(err);

          assert.equal(up.title, post.title);
          assert.equal(up.author, post.author);
          assert.equal(up.meta.visitors.valueOf(), post.meta.visitors);
          assert.equal(up.date.toString(), post.date.toString());
          assert.equal(up.published, post.published);
          assert.equal(up.mixed.x, post.mixed.x);
          assert.strictEqual(up.mixed.y, post.mixed.y);
          assert.deepEqual(up.numbers.toObject(), post.numbers.toObject());
          assert.equal(up.owners.length, post.owners.length);
          assert.equal(up.owners[0].toString(), post.owners[0].toString());
          assert.equal(up.comments[0].body, post.comments[0].body);
          assert.equal(up.comments[1].body, post.comments[1].body);
          assert.ok(up.comments[0]._id);
          assert.ok(up.comments[1]._id);
          assert.ok(up.comments[0]._id instanceof DocumentObjectId);
          assert.ok(up.comments[1]._id instanceof DocumentObjectId);
          db.close(done);
        });
      });
    });
  });

  it('options/conditions/doc are merged when no callback is passed', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        _id = new DocumentObjectId;

    var now = new Date,
        query;

    // Model.findByIdAndUpdate
    query = M.findByIdAndUpdate(_id, {$set: {date: now}}, {new: false, fields: 'author'});
    assert.strictEqual(false, query.options.new);
    assert.strictEqual(1, query._fields.author);
    assert.equal(now.toString(), query._update.$set.date.toString());
    assert.strictEqual(_id.toString(), query._conditions._id.toString());

    query = M.findByIdAndUpdate(_id, {$set: {date: now}});
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now.toString(), query._update.$set.date.toString());
    assert.strictEqual(_id.toString(), query._conditions._id.toString());

    query = M.findByIdAndUpdate(_id);
    assert.strictEqual(undefined, query.options.new);
    assert.strictEqual(_id, query._conditions._id);

    query = M.findByIdAndUpdate();
    assert.strictEqual(undefined, query.options.new);
    assert.equal(undefined, query._update);
    assert.strictEqual(undefined, query._conditions._id);
    db.close(done);
  });

  it('supports v3 select string syntax', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        _id = new DocumentObjectId;

    var now = new Date,
        query;

    query = M.findByIdAndUpdate(_id, {$set: {date: now}}, {select: 'author -title'});
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);

    query = M.findOneAndUpdate({}, {$set: {date: now}}, {select: 'author -title'});
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
    db.close(done);
  });

  it('supports v3 select object syntax', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        _id = new DocumentObjectId;

    var now = new Date,
        query;

    query = M.findByIdAndUpdate(_id, {$set: {date: now}}, {select: {author: 1, title: 0}});
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);

    query = M.findOneAndUpdate({}, {$set: {date: now}}, {select: {author: 1, title: 0}});
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
    db.close(done);
  });

  it('supports v3 sort string syntax', function(done) {
    var db = start(),
        M = db.model(modelname, collection);

    var now = new Date;
    var _id = new DocumentObjectId;
    var query;

    query = M.findByIdAndUpdate(_id, {$set: {date: now}}, {sort: 'author -title'});
    assert.equal(2, Object.keys(query.options.sort).length);
    assert.equal(1, query.options.sort.author);
    assert.equal(-1, query.options.sort.title);

    query = M.findOneAndUpdate({}, {$set: {date: now}}, {sort: 'author -title'});
    assert.equal(2, Object.keys(query.options.sort).length);
    assert.equal(1, query.options.sort.author);
    assert.equal(-1, query.options.sort.title);

    // gh-1887
    M.create(
        {title: 1, meta: {visitors: 0}}
        , {title: 2, meta: {visitors: 10}}
        , {title: 3, meta: {visitors: 5}}
        , function(err) {
          if (err) {
            return done(err);
          }

          M.findOneAndUpdate({}, {title: 'changed'})
          .sort({'meta.visitors': -1})
          .exec(function(err, doc) {
            if (err) {
              return done(err);
            }
            assert.equal(10, doc.meta.visitors);
            db.close(done);
          });
        });
  });

  it('supports v3 sort object syntax', function(done) {
    var db = start(),
        M = db.model(modelname, collection),
        _id = new DocumentObjectId;

    var now = new Date,
        query;

    query = M.findByIdAndUpdate(_id, {$set: {date: now}}, {sort: {author: 1, title: -1}});
    assert.equal(2, Object.keys(query.options.sort).length);
    assert.equal(1, query.options.sort.author);
    assert.equal(-1, query.options.sort.title);

    query = M.findOneAndUpdate(_id, {$set: {date: now}}, {sort: {author: 1, title: -1}});
    assert.equal(2, Object.keys(query.options.sort).length);
    assert.equal(1, query.options.sort.author);
    assert.equal(-1, query.options.sort.title);

    db.close(done);
  });

  it('supports $elemMatch with $in (gh-1091 gh-1100)', function(done) {
    var db = start();

    var postSchema = new Schema({
      ids: [{type: Schema.ObjectId}],
      title: String
    });

    var B = db.model('gh-1091+1100', postSchema);
    var _id1 = new mongoose.Types.ObjectId;
    var _id2 = new mongoose.Types.ObjectId;

    B.create({ids: [_id1, _id2]}, function(err, doc) {
      assert.ifError(err);

      B
      .findByIdAndUpdate(doc._id, {title: 'woot'}, {new: true})
      .select({title: 1, ids: {$elemMatch: {$in: [_id2.toString()]}}})
      .exec(function(err, found) {
        assert.ifError(err);
        assert.ok(found);
        assert.equal(found.id, doc.id);
        assert.equal('woot', found.title);
        assert.equal(1, found.ids.length);
        assert.equal(_id2.toString(), found.ids[0].toString());
        db.close(done);
      });
    });
  });

  it('supports population (gh-1395)', function(done) {
    var db = start();
    var M = db.model('A', {name: String});
    var N = db.model('B', {a: {type: Schema.ObjectId, ref: 'A'}, i: Number});

    M.create({name: 'i am an A'}, function(err, a) {
      if (err) {
        return done(err);
      }
      N.create({a: a._id, i: 10}, function(err, b) {
        if (err) {
          return done(err);
        }

        N.findOneAndUpdate({_id: b._id}, {$inc: {i: 1}})
        .populate('a')
        .exec(function(err, doc) {
          if (err) {
            return done(err);
          }
          assert.ok(doc);
          assert.ok(doc.a);
          assert.equal(doc.a.name, 'i am an A');
          db.close(done);
        });
      });
    });
  });
  it('returns null when doing an upsert & new=false gh-1533', function(done) {
    var db = start();

    var thingSchema = new Schema({
      _id: String,
      flag: {
        type: Boolean,
        default: false
      }
    });

    var Thing = db.model('Thing', thingSchema);
    var key = 'some-id';

    Thing.findOneAndUpdate({_id: key}, {$set: {flag: false}}, {upsert: true, new: false}).exec(function(err, thing) {
      assert.ifError(err);
      assert.equal(null, thing);
      Thing.findOneAndUpdate({_id: key}, {$set: {flag: false}}, {upsert: true, new: false}).exec(function(err, thing2) {
        assert.ifError(err);
        assert.equal(key, thing2.id);
        assert.equal(false, thing2.flag);
        db.close(done);
      });
    });
  });

  it('allows properties to be set to null gh-1643', function(done) {
    var db = start();

    var thingSchema = new Schema({
      name: [String]
    });

    var Thing = db.model('Thing', thingSchema);

    Thing.create({name: ['Test']}, function(err, thing) {
      if (err) {
        return done(err);
      }
      Thing.findOneAndUpdate({_id: thing._id}, {name: null}, {new: true})
      .exec(function(err, doc) {
        if (err) {
          return done(err);
        }
        assert.ok(doc);
        assert.equal(doc.name, null);
        db.close(done);
      });
    });
  });

  it('honors the overwrite option (gh-1809)', function(done) {
    var db = start();
    var M = db.model('1809', {name: String, change: Boolean});
    M.create({name: 'first'}, function(err, doc) {
      if (err) {
        return done(err);
      }
      M.findByIdAndUpdate(doc._id, {change: true}, {overwrite: true, new: true}, function(err, doc) {
        if (err) {
          return done(err);
        }
        assert.ok(doc.change);
        assert.equal(undefined, doc.name);
        db.close(done);
      });
    });
  });

  it('can do deep equals on object id after findOneAndUpdate (gh-2070)', function(done) {
    var db = start();

    var accountSchema = new Schema({
      name: String,
      contacts: [{
        account: {type: Schema.Types.ObjectId, ref: 'Account'},
        name: String
      }]
    });

    var Account = db.model('2070', accountSchema);

    var a1 = new Account({name: 'parent'});
    var a2 = new Account({name: 'child'});

    a1.save(function(error) {
      assert.ifError(error);
      a2.save(function(error, a2) {
        assert.ifError(error);
        Account.findOneAndUpdate(
            {name: 'parent'},
            {$push: {contacts: {account: a2._id, name: 'child'}}},
            {new: true},
            function(error, doc) {
              assert.ifError(error);
              assert.ok(Utils.deepEqual(doc.contacts[0].account, a2._id));
              assert.ok(_.isEqual(doc.contacts[0].account, a2._id));

              Account.findOne({name: 'parent'}, function(error, doc) {
                assert.ifError(error);
                assert.ok(Utils.deepEqual(doc.contacts[0].account, a2._id));
                assert.ok(_.isEqual(doc.contacts[0].account, a2._id));
                db.close(done);
              });
            });
      });
    });
  });

  it('adds __v on upsert (gh-2122)', function(done) {
    var db = start();

    var accountSchema = new Schema({
      name: String
    });

    var Account = db.model('2122', accountSchema);

    Account.findOneAndUpdate(
        {name: 'account'},
        {},
        {upsert: true, new: true},
        function(error, doc) {
          assert.ifError(error);
          assert.equal(0, doc.__v);
          db.close(done);
        });
  });

  it('works with nested schemas and $pull+$or (gh-1932)', function(done) {
    var db = start();

    var TickSchema = new Schema({name: String});
    var TestSchema = new Schema({a: Number, b: Number, ticks: [TickSchema]});

    var TestModel = db.model('gh-1932', TestSchema, 'gh-1932');

    TestModel.create({a: 1, b: 0, ticks: [{name: 'eggs'}, {name: 'bacon'}, {name: 'coffee'}]}, function(error) {
      assert.ifError(error);
      TestModel.findOneAndUpdate({a: 1}, {$pull: {ticks: {$or: [{name: 'eggs'}, {name: 'bacon'}]}}},
          function(error) {
            assert.ifError(error);
            TestModel.findOne({}, function(error, doc) {
              assert.ifError(error);
              assert.equal(1, doc.ticks.length);
              assert.equal('coffee', doc.ticks[0].name);
              db.close(done);
            });
          });
    });
  });

  it('accepts undefined', function(done) {
    var db = start();

    var s = new Schema({
      time: Date,
      base: String
    });

    var Breakfast = db.model('gh-2272', s);

    Breakfast.
    findOneAndUpdate({}, {time: undefined, base: undefined}, {}).
    exec(function(error) {
      assert.ifError(error);
      db.close(done);
    });
  });

  it('cast errors for empty objects as object ids (gh-2732)', function(done) {
    var db = start();

    var s = new Schema({
      base: ObjectId
    });

    var Breakfast = db.model('gh2732', s);

    Breakfast.
    findOneAndUpdate({}, {base: {}}, {}).
    exec(function(error) {
      assert.ok(error);
      db.close(done);
    });
  });

  it('strict mode with objects (gh-2947)', function(done) {
    var db = start();

    var s = new Schema({
      test: String
    }, {strict: true});

    var Breakfast = db.model('gh2947', s);
    var q = Breakfast.findOneAndUpdate({},
        {notInSchema: {a: 1}, test: 'abc'},
        {new: true, strict: true, upsert: true});

    q.lean();
    q.exec(function(error, doc) {
      assert.ok(!doc.notInSchema);
      db.close(done);
    });
  });

  describe('middleware', function() {
    var db;

    beforeEach(function() {
      db = start();
    });

    afterEach(function(done) {
      db.close(done);
    });

    it('works', function(done) {
      var s = new Schema({
        topping: {type: String, default: 'bacon'},
        base: String
      });

      var preCount = 0;
      s.pre('findOneAndUpdate', function() {
        ++preCount;
      });

      var postCount = 0;
      s.post('findOneAndUpdate', function() {
        ++postCount;
      });

      var Breakfast = db.model('gh-964', s);

      Breakfast.findOneAndUpdate(
          {},
          {base: 'eggs'},
          {},
          function(error) {
            assert.ifError(error);
            assert.equal(1, preCount);
            assert.equal(1, postCount);
            done();
          });
    });

    it('works with exec()', function(done) {
      var s = new Schema({
        topping: {type: String, default: 'bacon'},
        base: String
      });

      var preCount = 0;
      s.pre('findOneAndUpdate', function() {
        ++preCount;
      });

      var postCount = 0;
      s.post('findOneAndUpdate', function() {
        ++postCount;
      });

      var Breakfast = db.model('gh-964-2', s);

      Breakfast.
      findOneAndUpdate({}, {base: 'eggs'}, {}).
      exec(function(error) {
        assert.ifError(error);
        assert.equal(1, preCount);
        assert.equal(1, postCount);
        done();
      });
    });
  });

  describe('validators (gh-860)', function() {
    it('applies defaults on upsert', function(done) {
      var db = start();

      var s = new Schema({
        topping: {type: String, default: 'bacon'},
        base: String
      });
      var Breakfast = db.model('fam-gh-860-0', s);

      var updateOptions = {upsert: true, setDefaultsOnInsert: true, new: true};
      Breakfast.findOneAndUpdate(
          {},
          {base: 'eggs'},
          updateOptions,
          function(error, breakfast) {
            assert.ifError(error);
            assert.equal('eggs', breakfast.base);
            assert.equal('bacon', breakfast.topping);
            Breakfast.count({topping: 'bacon'}, function(error, count) {
              assert.ifError(error);
              assert.equal(count, 1);
              db.close(done);
            });
          });
    });

    it('doesnt set default on upsert if query sets it', function(done) {
      var db = start();

      var s = new Schema({
        topping: {type: String, default: 'bacon'},
        base: String
      });
      var Breakfast = db.model('fam-gh-860-1', s);

      var updateOptions = {upsert: true, setDefaultsOnInsert: true, new: true};
      Breakfast.findOneAndUpdate(
          {topping: 'sausage'},
          {base: 'eggs'},
          updateOptions,
          function(error, breakfast) {
            assert.ifError(error);
            assert.equal('eggs', breakfast.base);
            assert.equal('sausage', breakfast.topping);
            db.close();
            done();
          });
    });

    it('properly sets default on upsert if query wont set it', function(done) {
      var db = start();

      var s = new Schema({
        topping: {type: String, default: 'bacon'},
        base: String
      });
      var Breakfast = db.model('fam-gh-860-2', s);

      var updateOptions = {upsert: true, setDefaultsOnInsert: true, new: true};
      Breakfast.findOneAndUpdate(
          {topping: {$ne: 'sausage'}},
          {base: 'eggs'},
          updateOptions,
          function(error, breakfast) {
            assert.ifError(error);
            assert.equal('eggs', breakfast.base);
            assert.equal('bacon', breakfast.topping);
            Breakfast.count({topping: 'bacon'}, function(error, count) {
              assert.ifError(error);
              assert.equal(count, 1);
              db.close(done);
            });
          });
    });

    it('runs validators if theyre set', function(done) {
      var db = start();

      var s = new Schema({
        topping: {
          type: String,
          validate: function() {
            return false;
          }
        },
        base: {
          type: String,
          validate: function() {
            return true;
          }
        }
      });
      var Breakfast = db.model('fam-gh-860-3', s);

      var updateOptions = {
        upsert: true,
        setDefaultsOnInsert: true,
        runValidators: true,
        new: true
      };
      Breakfast.findOneAndUpdate(
          {},
          {topping: 'bacon', base: 'eggs'},
          updateOptions,
          function(error, breakfast) {
            assert.ok(!!error);
            assert.ok(!breakfast);
            assert.equal(1, Object.keys(error.errors).length);
            assert.equal('topping', Object.keys(error.errors)[0]);
            assert.equal('Validator failed for path `topping` with value `bacon`', error.errors.topping.message);

            assert.ok(!breakfast);
            db.close();
            done();
          });
    });

    it('validators handle $unset and $setOnInsert', function(done) {
      var db = start();

      var s = new Schema({
        steak: {type: String, required: true},
        eggs: {
          type: String, validate: function() {
            return false;
          }
        }
      });
      var Breakfast = db.model('fam-gh-860-4', s);

      var updateOptions = {runValidators: true, new: true};
      Breakfast.findOneAndUpdate(
          {},
          {$unset: {steak: ''}, $setOnInsert: {eggs: 'softboiled'}},
          updateOptions,
          function(error, breakfast) {
            assert.ok(!!error);
            assert.ok(!breakfast);
            assert.equal(2, Object.keys(error.errors).length);
            assert.ok(Object.keys(error.errors).indexOf('eggs') !== -1);
            assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
            assert.equal('Validator failed for path `eggs` with value `softboiled`', error.errors.eggs.message);
            assert.equal('Path `steak` is required.', error.errors.steak.message);
            db.close();
            done();
          });
    });

    it('min/max, enum, and regex built-in validators work', function(done) {
      var db = start();

      var s = new Schema({
        steak: {type: String, enum: ['ribeye', 'sirloin']},
        eggs: {type: Number, min: 4, max: 6},
        bacon: {type: String, match: /strips/}
      });
      var Breakfast = db.model('fam-gh-860-5', s);

      var updateOptions = {runValidators: true, new: true};
      Breakfast.findOneAndUpdate(
          {},
          {$set: {steak: 'ribeye', eggs: 3, bacon: '3 strips'}},
          updateOptions,
          function(error) {
            assert.ok(!!error);
            assert.equal(1, Object.keys(error.errors).length);
            assert.equal('eggs', Object.keys(error.errors)[0]);
            assert.equal('Path `eggs` (3) is less than minimum allowed value (4).', error.errors.eggs.message);

            Breakfast.findOneAndUpdate(
                {},
                {$set: {steak: 'tofu', eggs: 5, bacon: '3 strips'}},
                updateOptions,
                function(error) {
                  assert.ok(!!error);
                  assert.equal(1, Object.keys(error.errors).length);
                  assert.equal('steak', Object.keys(error.errors)[0]);
                  assert.equal('`tofu` is not a valid enum value for path `steak`.', error.errors.steak);

                  Breakfast.findOneAndUpdate(
                      {},
                      {$set: {steak: 'sirloin', eggs: 6, bacon: 'none'}},
                      updateOptions,
                      function(error) {
                        assert.ok(!!error);
                        assert.equal(1, Object.keys(error.errors).length);
                        assert.equal('bacon', Object.keys(error.errors)[0]);
                        assert.equal('Path `bacon` is invalid (none).', error.errors.bacon.message);

                        db.close();
                        done();
                      });
                });
          });
    });

    it('multiple validation errors', function(done) {
      var db = start();

      var s = new Schema({
        steak: {type: String, enum: ['ribeye', 'sirloin']},
        eggs: {type: Number, min: 4, max: 6},
        bacon: {type: String, match: /strips/}
      });
      var Breakfast = db.model('fam-gh-860-6', s);

      var updateOptions = {runValidators: true, new: true};
      Breakfast.findOneAndUpdate(
          {},
          {$set: {steak: 'tofu', eggs: 2, bacon: '3 strips'}},
          updateOptions,
          function(error, breakfast) {
            assert.ok(!!error);
            assert.equal(2, Object.keys(error.errors).length);
            assert.ok(Object.keys(error.errors).indexOf('steak') !== -1);
            assert.ok(Object.keys(error.errors).indexOf('eggs') !== -1);
            assert.ok(!breakfast);
            db.close();
            done();
          });
    });

    it('validators ignore $inc', function(done) {
      var db = start();

      var s = new Schema({
        steak: {type: String, required: true},
        eggs: {type: Number, min: 4}
      });
      var Breakfast = db.model('fam-gh-860-7', s);

      var updateOptions = {runValidators: true, upsert: true, new: true};
      Breakfast.findOneAndUpdate(
          {},
          {$inc: {eggs: 1}},
          updateOptions,
          function(error, breakfast) {
            assert.ifError(error);
            assert.ok(!!breakfast);
            assert.equal(1, breakfast.eggs);
            db.close(done);
          });
    });

    it('should work with arrays (gh-3035)', function(done) {
      var db = start();

      var testSchema = new mongoose.Schema({
        id: String,
        name: String,
        a: [String],
        _createdAt: {
          type: Number,
          default: Date.now
        }
      });

      var TestModel = db.model('gh3035', testSchema);
      TestModel.create({id: '1'}, function(error) {
        assert.ifError(error);
        TestModel.findOneAndUpdate({id: '1'}, {$set: {name: 'Joe'}}, {upsert: true, setDefaultsOnInsert: true},
            function(error) {
              assert.ifError(error);
              db.close(done);
            });
      });
    });

    it('should allow null values in query (gh-3135)', function(done) {
      var db = start();

      var testSchema = new mongoose.Schema({
        id: String,
        blob: ObjectId,
        status: String
      });

      var TestModel = db.model('gh3135', testSchema);
      TestModel.create({blob: null, status: 'active'}, function(error) {
        assert.ifError(error);
        TestModel.findOneAndUpdate({id: '1', blob: null}, {$set: {status: 'inactive'}}, {upsert: true, setDefaultsOnInsert: true},
            function(error) {
              assert.ifError(error);
              db.close(done);
            });
      });
    });

    it('should work with array documents (gh-3034)', function(done) {
      var db = start();

      var testSchema = new mongoose.Schema({
        id: String,
        name: String,
        a: [{
          foo: String
        }],
        _createdAt: {
          type: Number,
          default: Date.now
        }
      });

      var TestModel = db.model('gh3034', testSchema);
      TestModel.create({id: '1'}, function(error) {
        assert.ifError(error);
        TestModel.findOneAndUpdate({id: '1'}, {$set: {name: 'Joe'}}, {upsert: true, setDefaultsOnInsert: true},
            function(error) {
              assert.ifError(error);
              db.close(done);
            });
      });
    });

    it('handles setting array (gh-3107)', function(done) {
      var db = start();

      var testSchema = new mongoose.Schema({
        name: String,
        a: [{
          foo: String
        }],
        b: [Number]
      });

      var TestModel = db.model('gh3107', testSchema);
      TestModel
      .findOneAndUpdate({id: '1'}, {$setOnInsert: {a: [{foo: 'bar'}], b: [2]}}, {upsert: true, new: true, setDefaultsOnInsert: true},
          function(error, doc) {
            assert.ifError(error);
            assert.equal(doc.a.length, 1);
            assert.equal(doc.a[0].foo, 'bar');
            assert.equal(doc.b.length, 1);
            assert.equal(doc.b[0], 2);
            db.close(done);
          });
    });


    it('handles nested cast errors (gh-3468)', function(done) {
      var db = start();
      var recordSchema = new mongoose.Schema({
        kind: String,
        amount: Number
      }, {
        _id: false
      });

      var shiftSchema = new mongoose.Schema({
        userId: String,
        records: [recordSchema]
      });

      var Shift = db.model('gh3468', shiftSchema);

      Shift.create({
        userId: 'tom',
        records: []
      }, function(error) {
        assert.ifError(error);
        Shift.findOneAndUpdate({userId: 'tom'}, {
          records: [{kind: 'kind1', amount: NaN}]
        }, {
          new: true
        }, function(error) {
          assert.ok(error);
          assert.ok(error instanceof CastError);
          db.close(done);
        });
      });
    });

    it('cast errors with nested schemas (gh-3580)', function(done) {
      var db = start();

      var nested = new Schema({num: Number});
      var s = new Schema({nested: nested});

      var MyModel = db.model('gh3580', s);

      var update = {nested: {num: 'Not a Number'}};
      MyModel.findOneAndUpdate({}, update, function(error) {
        assert.ok(error);
        db.close(done);
      });
    });

    it('pull with nested schemas (gh-3616)', function(done) {
      var db = start();

      var nested = new Schema({arr: [{num: Number}]});
      var s = new Schema({nested: nested});

      var MyModel = db.model('gh3616', s);

      MyModel.create({nested: {arr: [{num: 5}]}}, function(error) {
        assert.ifError(error);
        var update = {$pull: {'nested.arr': {num: 5}}};
        var options = {new: true};
        MyModel.findOneAndUpdate({}, update, options, function(error, doc) {
          assert.ifError(error);
          assert.equal(doc.nested.arr.length, 0);
          db.close(done);
        });
      });
    });

    it('setting nested schema (gh-3889)', function(done) {
      var db = start();
      var nested = new Schema({ test: String });
      var s = new Schema({ nested: nested });
      var MyModel = db.model('gh3889', s);
      MyModel.findOneAndUpdate(
        {},
        { $set: { nested: { test: 'abc' } } },
        function(error) {
          assert.ifError(error);
          db.close(done);
        });
    });
  });

  describe('bug fixes', function() {
    var db;

    before(function() {
      db = start();
    });

    after(function(done) {
      db.close(done);
    });

    it('passes raw result as 3rd param (gh-3173)', function(done) {
      var testSchema = new mongoose.Schema({
        test: String
      });

      var TestModel = db.model('gh3173', testSchema);
      var options = { upsert: true, new: true, passRawResult: true };
      var update = { $set: { test: 'abc' } };

      TestModel.findOneAndUpdate({}, update, options).
        exec(function(error, doc, res) {
          assert.ifError(error);
          assert.ok(res);
          assert.ok(res.ok);
          done();
        });
    });

    it('raw result as 3rd param w/ no result (gh-4023)', function(done) {
      var testSchema = new mongoose.Schema({
        test: String
      });

      var TestModel = db.model('gh4023', testSchema);
      var options = { upsert: true, new: false, passRawResult: true };
      var update = { $set: { test: 'abc' } };

      TestModel.findOneAndUpdate({}, update, options).
        exec(function(error, doc, res) {
          assert.ifError(error);
          assert.ok(res);
          assert.ok(res.ok);

          done();
        });
    });
  });
});
