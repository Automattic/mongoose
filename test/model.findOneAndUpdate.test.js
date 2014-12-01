
/**
 * Test dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , random = require('../lib/utils').random
  , Query = require('../lib/query')
  , Utils = require('../lib/utils')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , ObjectId = Schema.Types.ObjectId
  , DocumentObjectId = mongoose.Types.ObjectId
  , DocumentArray = mongoose.Types.DocumentArray
  , EmbeddedDocument = mongoose.Types.Embedded
  , MongooseArray = mongoose.Types.Array
  , MongooseError = mongoose.Error
  , _ = require('underscore');

/**
 * Setup.
 */

var Comments = new Schema();

Comments.add({
    title     : String
  , date      : Date
  , body      : String
  , comments  : [Comments]
});

var BlogPost = new Schema({
    title     : String
  , author    : String
  , slug      : String
  , date      : Date
  , meta      : {
        date      : Date
      , visitors  : Number
    }
  , published : Boolean
  , mixed     : {}
  , numbers   : [Number]
  , owners    : [ObjectId]
  , comments  : [Comments]
});

BlogPost.virtual('titleWithAuthor')
  .get(function () {
    return this.get('title') + ' by ' + this.get('author');
  })
  .set(function (val) {
    var split = val.split(' by ');
    this.set('title', split[0]);
    this.set('author', split[1]);
  });

BlogPost.method('cool', function(){
  return this;
});

BlogPost.static('woot', function(){
  return this;
});

var modelname = 'UpdateOneBlogPost'
mongoose.model(modelname, BlogPost);

var collection = 'updateoneblogposts_' + random();

var strictSchema = new Schema({ name: String }, { strict: true });
mongoose.model('UpdateOneStrictSchema', strictSchema);

var strictThrowSchema = new Schema({ name: String }, { strict: 'throw'});
mongoose.model('UpdateOneStrictThrowSchema', strictThrowSchema);

describe('model: findOneAndUpdate:', function(){
  it('WWW returns the edited document', function(done){
    var db = start()
      , M = db.model(modelname, collection)
      , title = 'Tobi ' + random()
      , author = 'Brian ' + random()
      , newTitle = 'Woot ' + random()
      , id0 = new DocumentObjectId
      , id1 = new DocumentObjectId

    var post = new M;
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date;
    post.published = true;
    post.mixed = { x: 'ex' };
    post.numbers = [4,5,6,7];
    post.owners = [id0, id1];
    post.comments = [{ body: 'been there' }, { body: 'done that' }];

    post.save(function (err) {
      assert.ifError(err);
      M.findById(post._id, function (err, cf) {
        assert.ifError(err);
        assert.equal(title, cf.title);
        assert.equal(author, cf.author);
        assert.equal(0, cf.meta.visitors.valueOf());
        assert.equal(post.date.toString(), cf.date);
        assert.equal(true, cf.published);
        assert.equal('ex', cf.mixed.x);
        assert.deepEqual([4,5,6,7], cf.numbers.toObject());
        assert.equal(2, cf.owners.length);
        assert.equal(id0.toString(),cf.owners[0].toString() );
        assert.equal(id1.toString(),cf.owners[1].toString() );
        assert.equal(2, cf.comments.length);
        assert.equal('been there', cf.comments[0].body);
        assert.equal('done that', cf.comments[1].body);
        assert.ok(cf.comments[0]._id);
        assert.ok(cf.comments[1]._id);
        assert.ok(cf.comments[0]._id instanceof DocumentObjectId);
        assert.ok(cf.comments[1]._id instanceof DocumentObjectId);

        var update = {
            title: newTitle // becomes $set
          , $inc: { 'meta.visitors': 2 }
          , $set: { date: new Date }
          , published: false // becomes $set
          , 'mixed': { x: 'ECKS', y: 'why' } // $set
          , $pullAll: { 'numbers': [4, 6] }
          , $pull: { 'owners': id0 }
          , 'comments.1.body': 8 // $set
        }

        M.findOneAndUpdate({ title: title }, update, function (err, up) {
          db.close();
          assert.equal(err, null, err && err.stack);

          assert.equal(newTitle, up.title);
          assert.equal(author, up.author);
          assert.equal(2, up.meta.visitors.valueOf());
          assert.equal(update.$set.date.toString(),up.date.toString());
          assert.equal(false, up.published);
          assert.equal('ECKS', up.mixed.x);
          assert.equal('why', up.mixed.y);
          assert.deepEqual([5,7], up.numbers.toObject());
          assert.equal(1, up.owners.length);
          assert.equal(id1.toString(),up.owners[0].toString());
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
          type: ObjectId, required: true, default: function() {return new DocumentObjectId();}
        },
        address: {
          street: String,
          zipcode: String
        },
        age: Number
      }, {_id: false});
      var itemSchema = new Schema({
        items: [itemSpec],
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
          street: "times square",
          zipcode: "10036"
        }
      });
      var item2 = new ItemChildModel({
        address: {
          street: "bryant park",
          zipcode: "10030"
        }
      });
      var item3 = new ItemChildModel({
        address: {
          street: "queens",
          zipcode: "1002?"
        }
      });
      var itemParent = new ItemParentModel({items:[item1, item2, item3]});
      itemParent.save(function(err) {
        assert.ifError(err);
        ItemParentModel.findOneAndUpdate(
          {"_id": itemParent._id, "items.item_id": item1.item_id},
          {"$set":{ "items.$.address":{}}},
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

  it('returns the original document', function(done){
    var db = start()
      , M = db.model(modelname, collection)
      , title = 'Tobi ' + random()
      , author = 'Brian ' + random()
      , newTitle = 'Woot ' + random()
      , id0 = new DocumentObjectId
      , id1 = new DocumentObjectId

    var post = new M;
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date;
    post.published = true;
    post.mixed = { x: 'ex' };
    post.numbers = [4,5,6,7];
    post.owners = [id0, id1];
    post.comments = [{ body: 'been there' }, { body: 'done that' }];

    post.save(function (err) {
      assert.ifError(err);
      M.findById(post._id, function (err, cf) {
        assert.ifError(err);

        var update = {
            title: newTitle // becomes $set
          , $inc: { 'meta.visitors': 2 }
          , $set: { date: new Date }
          , published: false // becomes $set
          , 'mixed': { x: 'ECKS', y: 'why' } // $set
          , $pullAll: { 'numbers': [4, 6] }
          , $pull: { 'owners': id0 }
          , 'comments.1.body': 8 // $set
        }

        M.findOneAndUpdate({ title: title }, update, { new: false }, function (err, up) {
          db.close();
          assert.ifError(err);

          assert.equal(post.title, up.title);
          assert.equal(post.author, up.author);
          assert.equal(post.meta.visitors, up.meta.visitors.valueOf());
          assert.equal(up.date.toString(),post.date.toString());
          assert.equal(up.published,post.published);
          assert.equal(up.mixed.x,post.mixed.x);
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
  })

  it('allows upserting', function(done){
    var db = start()
      , M = db.model(modelname, collection)
      , title = 'Tobi ' + random()
      , author = 'Brian ' + random()
      , newTitle = 'Woot ' + random()
      , id0 = new DocumentObjectId
      , id1 = new DocumentObjectId

    var post = new M;
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date;
    post.published = true;
    post.mixed = { x: 'ex' };
    post.numbers = [4,5,6,7];
    post.owners = [id0, id1];
    post.comments = [{ body: 'been there' }, { body: 'done that' }];

    var update = {
        title: newTitle // becomes $set
      , $inc: { 'meta.visitors': 2 }
      , $set: { date: new Date }
      , published: false // becomes $set
      , 'mixed': { x: 'ECKS', y: 'why' } // $set
      , $pullAll: { 'numbers': [4, 6] }
      , $pull: { 'owners': id0 }
    }

    M.findOneAndUpdate({ title: title }, update, { upsert: true, new: true }, function (err, up) {
      db.close();
      assert.ifError(err);

      assert.equal(newTitle, up.title);
      assert.equal(2, up.meta.visitors.valueOf());
      assert.equal(up.date.toString(),update.$set.date.toString());
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

  it('options/conditions/doc are merged when no callback is passed', function(done){
    var db = start()
      , M = db.model(modelname, collection)

    db.close();

    var now = new Date
      , query;

    // Model.findOneAndUpdate
    query = M.findOneAndUpdate({ author: 'aaron' }, { $set: { date: now }}, { new: false, fields: 'author' });
    assert.strictEqual(false, query.options.new);
    assert.strictEqual(1, query._fields.author);
    assert.equal(now.toString(), query._update.$set.date.toString());
    assert.strictEqual('aaron', query._conditions.author);

    query = M.findOneAndUpdate({ author: 'aaron' }, { $set: { date: now }});
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now.toString(), query._update.$set.date.toString());
    assert.strictEqual('aaron', query._conditions.author);

    query = M.findOneAndUpdate({ $set: { date: now }});
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now.toString(), query._update.$set.date.toString());
    assert.strictEqual(undefined, query._conditions.author);

    query = M.findOneAndUpdate();
    assert.strictEqual(undefined, query.options.new);
    assert.equal(undefined, query._update);
    assert.strictEqual(undefined, query._conditions.author);

    // Query.findOneAndUpdate
    query = M.where('author', 'aaron').findOneAndUpdate({ date: now });
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now.toString(), query._update.date.toString());
    assert.strictEqual('aaron', query._conditions.author);

    query = M.find().findOneAndUpdate({ author: 'aaron' }, { date: now });
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now.toString(), query._update.date.toString());
    assert.strictEqual('aaron', query._conditions.author);

    query = M.find().findOneAndUpdate({ date: now });
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now.toString(), query._update.date.toString());
    assert.strictEqual(undefined, query._conditions.author);

    query = M.find().findOneAndUpdate();
    assert.strictEqual(undefined, query.options.new);
    assert.equal(undefined, query._update);
    assert.strictEqual(undefined, query._conditions.author);
    done();
  })

  it('executes when a callback is passed', function(done){
    var db = start()
      , M = db.model(modelname, collection + random())
      , pending = 6

    M.findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron'}}, { new: false }, cb);
    M.findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron'}}, cb);
    M.where().findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron'}}, { new: false }, cb);
    M.where().findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron'}}, cb);
    M.where().findOneAndUpdate({ $set: { name: 'Aaron'}}, cb);
    M.where('name', 'aaron').findOneAndUpdate({ $set: { name: 'Aaron'}}).findOneAndUpdate(cb);

    function cb (err, doc) {
      assert.ifError(err);
      assert.strictEqual(null, doc); // not an upsert, no previously existing doc
      if (--pending) return;
      db.close();
      done();
    }
  });

  it('executes when a callback is passed to a succeeding function', function(done){
    var db = start()
      , M = db.model(modelname, collection + random())
      , pending = 6

    M.findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron'}}, { new: false }).exec(cb);
    M.findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron'}}).exec(cb);
    M.where().findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron'}}, { new: false }).exec(cb);
    M.where().findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron'}}).exec(cb);
    M.where().findOneAndUpdate({ $set: { name: 'Aaron'}}).exec(cb);
    M.where('name', 'aaron').findOneAndUpdate({ $set: { name: 'Aaron'}}).exec(cb);

    function cb (err, doc) {
      assert.ifError(err);
      assert.strictEqual(null, doc); // not an upsert, no previously existing doc
      if (--pending) return;
      db.close();
      done();
    }
  });

  it('executing with only a callback throws', function(done){
    var db = start()
      , M = db.model(modelname, collection)
      , err

    try {
      M.findOneAndUpdate(function(){});
    } catch (e) {
      err = e;
    }

    db.close();
    assert.ok(/First argument must not be a function/.test(err));
    done();
  });

  it('updates numbers atomically', function(done){
    var db = start()
      , BlogPost = db.model(modelname, collection)
      , totalDocs = 4
      , saveQueue = [];

    var post = new BlogPost();
    post.set('meta.visitors', 5);

    post.save(function(err){
      assert.ifError(err);

      for (var i = 0; i < 4; ++i) {
        BlogPost
        .findOneAndUpdate({ _id: post._id }, { $inc: { 'meta.visitors': 1 }}, function (err) {
          assert.ifError(err);
          --totalDocs || complete();
        });
      }

      function complete () {
        BlogPost.findOne({ _id: post.get('_id') }, function (err, doc) {
          db.close();
          assert.ifError(err);
          assert.equal(9, doc.get('meta.visitors'));
          done();
        });
      };
    });
  });

  it('honors strict schemas', function(done){
    var db = start();
    var S = db.model('UpdateOneStrictSchema');
    var s = new S({ name: 'orange crush' });

    s.save(function (err) {
      assert.ifError(err);
      var name = Date.now();
      S.findOneAndUpdate({ name: name }, { ignore: true }, { upsert: true }, function (err, doc) {
        assert.ifError(err);
        assert.ok(doc);
        assert.ok(doc._id);
        assert.equal(undefined, doc.ignore);
        assert.equal(undefined, doc._doc.ignore);
        assert.equal(name, doc.name);
        S.findOneAndUpdate({ name: 'orange crush' }, { ignore: true }, { upsert: true }, function (err, doc) {
          assert.ifError(err);
          assert.ok(!doc.ignore);
          assert.ok(!doc._doc.ignore);
          assert.equal('orange crush', doc.name);
          S.findOneAndUpdate({ name: 'orange crush' }, { ignore: true }, function (err, doc) {
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

  it('returns errors with strict:throw schemas', function(done){
    var db = start();
    var S = db.model('UpdateOneStrictThrowSchema');
    var s = new S({ name: 'orange crush' });

    s.save(function (err) {
      assert.ifError(err);

      var name = Date.now();
      S.findOneAndUpdate({ name: name }, { ignore: true }, { upsert: true }, function (err, doc) {
        assert.ok(err);
        assert.ok(/not in schema/.test(err));
        assert.ok(!doc);

        S.findOneAndUpdate({ _id: s._id }, { ignore: true }, function (err, doc) {
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

describe('model: findByIdAndUpdate:', function(){
  it('executing with just a callback throws', function(done){
    var db = start()
      , M = db.model(modelname, collection)
      , err

    try {
      M.findByIdAndUpdate(function(){});
    } catch (e) {
      err = e;
    }

    db.close();
    assert.ok(/First argument must not be a function/.test(err));
    done();
  });

  it('executes when a callback is passed', function(done){
    var db = start()
      , M = db.model(modelname, collection + random())
      , _id = new DocumentObjectId
      , pending = 2

    M.findByIdAndUpdate(_id, { $set: { name: 'Aaron'}}, { new: false }, cb);
    M.findByIdAndUpdate(_id, { $set: { name: 'changed' }}, cb);

    function cb (err, doc) {
      assert.ifError(err);
      assert.strictEqual(null, doc); // no previously existing doc
      if (--pending) return;
      db.close();
      done();
    }
  });

  it('executes when a callback is passed to a succeeding function', function(done){
    var db = start()
      , M = db.model(modelname, collection + random())
      , _id = new DocumentObjectId
      , pending = 2

    M.findByIdAndUpdate(_id, { $set: { name: 'Aaron'}}, { new: false }).exec(cb);
    M.findByIdAndUpdate(_id, { $set: { name: 'changed' }}).exec(cb);

    function cb (err, doc) {
      assert.ifError(err);
      assert.strictEqual(null, doc); // no previously existing doc
      if (--pending) return;
      db.close();
      done();
    }
  })

  it('returns the original document', function(done){
    var db = start()
      , M = db.model(modelname, collection)
      , title = 'Tobi ' + random()
      , author = 'Brian ' + random()
      , newTitle = 'Woot ' + random()
      , id0 = new DocumentObjectId
      , id1 = new DocumentObjectId

    var post = new M;
    post.set('title', title);
    post.author = author;
    post.meta.visitors = 0;
    post.date = new Date;
    post.published = true;
    post.mixed = { x: 'ex' };
    post.numbers = [4,5,6,7];
    post.owners = [id0, id1];
    post.comments = [{ body: 'been there' }, { body: 'done that' }];

    post.save(function (err) {
      assert.ifError(err);
      M.findById(post._id, function (err, cf) {
        assert.ifError(err);

        var update = {
            title: newTitle // becomes $set
          , $inc: { 'meta.visitors': 2 }
          , $set: { date: new Date }
          , published: false // becomes $set
          , 'mixed': { x: 'ECKS', y: 'why' } // $set
          , $pullAll: { 'numbers': [4, 6] }
          , $pull: { 'owners': id0 }
          , 'comments.1.body': 8 // $set
        }

        M.findByIdAndUpdate(post.id, update, { new: false }, function (err, up) {
          db.close();
          assert.ifError(err);

          assert.equal(up.title,post.title);
          assert.equal(up.author,post.author);
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
          assert.ok(up.comments[0]._id instanceof DocumentObjectId)
          assert.ok(up.comments[1]._id instanceof DocumentObjectId)
          done();
        });
      });
    });
  })

  it('options/conditions/doc are merged when no callback is passed', function(done){
    var db = start()
      , M = db.model(modelname, collection)
      , _id = new DocumentObjectId

    db.close();

    var now = new Date
      , query;

    // Model.findByIdAndUpdate
    query = M.findByIdAndUpdate(_id, { $set: { date: now }}, { new: false, fields: 'author' });
    assert.strictEqual(false, query.options.new);
    assert.strictEqual(1, query._fields.author);
    assert.equal(now.toString(), query._update.$set.date.toString());
    assert.strictEqual(_id.toString(), query._conditions._id.toString());

    query = M.findByIdAndUpdate(_id, { $set: { date: now }});
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
    done();
  });

  it('supports v3 select string syntax', function(done){
    var db = start()
      , M = db.model(modelname, collection)
      , _id = new DocumentObjectId

    db.close();

    var now = new Date
      , query;

    query = M.findByIdAndUpdate(_id, { $set: { date: now }}, { select: 'author -title' });
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);

    query = M.findOneAndUpdate({}, { $set: { date: now }}, { select: 'author -title' });
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
    done();
  })

  it('supports v3 select object syntax', function(done){
    var db = start()
      , M = db.model(modelname, collection)
      , _id = new DocumentObjectId

    db.close();

    var now = new Date
      , query;

    query = M.findByIdAndUpdate(_id, { $set: { date: now }}, { select: { author: 1, title: 0 }});
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);

    query = M.findOneAndUpdate({}, { $set: { date: now }}, { select: { author: 1, title: 0 }});
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
    done();
  })

  it('supports v3 sort string syntax', function(done){
    var db = start()
      , M = db.model(modelname, collection)

    var now = new Date;
    var _id = new DocumentObjectId;
    var query;

    query = M.findByIdAndUpdate(_id, { $set: { date: now }}, { sort: 'author -title' });
    assert.equal(2, Object.keys(query.options.sort).length);
    assert.equal(1, query.options.sort.author);
    assert.equal(-1, query.options.sort.title);

    query = M.findOneAndUpdate({}, { $set: { date: now }}, { sort: 'author -title' });
    assert.equal(2, Object.keys(query.options.sort).length);
    assert.equal(1, query.options.sort.author);
    assert.equal(-1, query.options.sort.title);

    // gh-1887
    M.create(
        { title: 1, meta: {visitors: 0}}
      , { title: 2, meta: {visitors: 10}}
      , { title: 3, meta: {visitors: 5}}
      , function (err, a,b,c) {
      if (err) return done(err);

      M.findOneAndUpdate({}, { title: 'changed' })
      .sort({ 'meta.visitors': -1 })
      .exec(function(err, doc) {
        if (err) return done(err);
        db.close();
        assert.equal(10, doc.meta.visitors);
        done();
      });
    });
  })

  it('supports v3 sort object syntax', function(done){
    var db = start()
      , M = db.model(modelname, collection)
      , _id = new DocumentObjectId

    db.close();

    var now = new Date
      , query;

    query = M.findByIdAndUpdate(_id, { $set: { date: now }}, { sort: { author: 1, title: -1 }});
    assert.equal(2, Object.keys(query.options.sort).length);
    assert.equal(1, query.options.sort.author);
    assert.equal(-1, query.options.sort.title);

    query = M.findOneAndUpdate(_id, { $set: { date: now }}, { sort: { author: 1, title: -1 }});
    assert.equal(2, Object.keys(query.options.sort).length);
    assert.equal(1, query.options.sort.author);
    assert.equal(-1, query.options.sort.title);

    done();
  });

  it('supports $elemMatch with $in (gh-1091 gh-1100)', function(done){
    var db = start()

    var postSchema = new Schema({
        ids: [{type: Schema.ObjectId}]
      , title: String
    });

    var B = db.model('gh-1091+1100', postSchema);
    var _id1 = new mongoose.Types.ObjectId;
    var _id2 = new mongoose.Types.ObjectId;

    B.create({ ids: [_id1, _id2] }, function (err, doc) {
      assert.ifError(err);

      B
      .findByIdAndUpdate(doc._id, { title: 'woot' })
      .select({ title: 1, ids: { $elemMatch: { $in: [_id2.toString()] }}})
      .exec(function (err, found) {
        assert.ifError(err);
        assert.ok(found);
        assert.equal(found.id, doc.id);
        assert.equal('woot', found.title);
        assert.equal(1, found.ids.length);
        assert.equal(_id2.toString(), found.ids[0].toString());
        done();
      });
    })
  })

  it('supports population (gh-1395)', function(done){
    var db = start();
    var M = db.model('A', { name: String });
    var N = db.model('B', { a: { type: Schema.ObjectId, ref: 'A' }, i: Number})

    M.create({ name: 'i am an A' }, function (err, a) {
      if (err) return done(err);
      N.create({ a: a._id, i: 10 }, function (err, b) {
        if (err) return done(err);

        N.findOneAndUpdate({ _id: b._id }, { $inc: { i: 1 }})
        .populate('a')
        .exec(function (err, doc) {
          if (err) return done(err);
          assert.ok(doc);
          assert.ok(doc.a);
          assert.equal(doc.a.name, 'i am an A');
          done();
        })
      })
    })
  })
  it('returns null when doing an upsert & new=false gh-1533', function (done) {
    var db = start();

    var thingSchema = new Schema({
        _id: String,
        flag: {
            type: Boolean,
            "default": false
        }
    });

    var Thing = db.model('Thing', thingSchema);
    var key = 'some-id';

    Thing.findOneAndUpdate({_id: key}, {$set: {flag: false}}, {upsert: true, "new": false}).exec(function(err, thing) {
        assert.ifError(err);
        assert.equal(null, thing);
        Thing.findOneAndUpdate({_id: key}, {$set: {flag: false}}, {upsert: true, "new": false}).exec(function (err, thing2) {
          assert.ifError(err);
          assert.equal(key, thing2.id);
          assert.equal(false, thing2.flag);
          done();
        });
    });
  });

  it('allows properties to be set to null gh-1643', function (done) {
    var db = start();

    var thingSchema = new Schema({
      name:[String]
    });

    var Thing = db.model('Thing', thingSchema);

    Thing.create({name:["Test"]}, function (err, thing) {
      if (err) return done(err);
      Thing.findOneAndUpdate({ _id: thing._id }, {name:null})
        .exec(function (err, doc) {
          if (err) return done(err);
          assert.ok(doc);
          assert.equal(doc.name, null);
          done();
      });
    });
  });

  it('honors the overwrite option (gh-1809)', function(done) {
    var db = start();
    var M = db.model('1809', { name: String, change: Boolean });
    M.create({ name: 'first' }, function(err, doc) {
      if (err) return done(err);
      M.findByIdAndUpdate(doc._id, { change: true }, { overwrite: true }, function(err, doc) {
        if (err) return done(err);
        assert.ok(doc.change);
        assert.equal(undefined, doc.name);
        done();
      });
    });
  });

  it('can do deep equals on object id after findOneAndUpdate (gh-2070)', function(done) {
    var db = start();

    var accountSchema = Schema({
      name: String,
      contacts: [{
        account: { type: Schema.Types.ObjectId, ref: 'Account'},
        name: String
      }]
    });

    var Account = db.model('2070', accountSchema);

    var a1 = new Account({ name: 'parent' });
    var a2 = new Account({ name: 'child' });

    a1.save(function(error, a1) {
      assert.ifError(error);
      a2.save(function(error, a2) {
        assert.ifError(error);
        Account.findOneAndUpdate(
          { name: 'parent' },
          { $push: { contacts: { account: a2._id, name: 'child' } } },
          { 'new': true },
          function(error, doc) {
            assert.ifError(error);
            assert.ok(Utils.deepEqual(doc.contacts[0].account, a2._id));
            assert.ok(_.isEqual(doc.contacts[0].account, a2._id));

            Account.findOne({ name : 'parent' }, function(error, doc) {
              assert.ifError(error);
              assert.ok(Utils.deepEqual(doc.contacts[0].account, a2._id));
              assert.ok(_.isEqual(doc.contacts[0].account, a2._id));
              done();
            });
          });
      });
    });
  });

  it('adds __v on upsert (gh-2122)', function(done) {
    var db = start();

    var accountSchema = Schema({
      name: String,
    });

    var Account = db.model('2122', accountSchema);

    Account.findOneAndUpdate(
      { name: 'account' },
      { },
      { upsert: true, new: true },
      function(error, doc) {
        assert.ifError(error);
        assert.equal(0, doc.__v);
        done();
      });
  });

  it('works with nested schemas and $pull+$or (gh-1932)', function(done) {
    var db = start();

    var TickSchema = Schema({ name: String });
    var TestSchema = Schema({ a: Number, b: Number, ticks: [TickSchema] });

    var TestModel = db.model('gh-1932', TestSchema, 'gh-1932');

    TestModel.create({ a: 1, b: 0, ticks: [{ name: 'eggs' }, { name: 'bacon' }, { name: 'coffee' }] }, function(error) {
      assert.ifError(error);
      TestModel.findOneAndUpdate(
        { a: 1 },
        {
          $pull: {
            ticks: {
              $or: [
                { name: 'eggs' },
                { name: 'bacon' }
              ]
            }
          }
        },
        function(error) {
          assert.ifError(error);
          TestModel.findOne({}, function(error, doc) {
            assert.ifError(error);
            assert.equal(1, doc.ticks.length);
            assert.equal('coffee', doc.ticks[0].name);
            done();
          });
        });
    });
  });
})
