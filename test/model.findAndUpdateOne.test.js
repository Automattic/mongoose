
/**
 * Test dependencies.
 */

var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
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
  , MongooseArray = mongoose.Types.Array
  , MongooseError = mongoose.Error;

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
  it('returns the edited document', function(done){
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

  it('options/conditions/doc are merged when no callback is passed', function(){
    var db = start()
      , M = db.model(modelname, collection)

    db.close();

    var now = new Date
      , query;

    // Model.findOneAndUpdate
    query = M.findOneAndUpdate({ author: 'aaron' }, { $set: { date: now }}, { new: false, fields: 'author' });
    assert.strictEqual(false, query.options.new);
    assert.strictEqual(1, query._fields.author);
    assert.equal(now, query._updateArg.$set.date);
    assert.strictEqual('aaron', query._conditions.author);

    query = M.findOneAndUpdate({ author: 'aaron' }, { $set: { date: now }});
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now, query._updateArg.$set.date);
    assert.strictEqual('aaron', query._conditions.author);

    query = M.findOneAndUpdate({ $set: { date: now }});
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now, query._updateArg.$set.date);
    assert.strictEqual(undefined, query._conditions.author);

    query = M.findOneAndUpdate();
    assert.strictEqual(undefined, query.options.new);
    assert.equal(undefined, query._updateArg.date);
    assert.strictEqual(undefined, query._conditions.author);

    // Query.findOneAndUpdate
    query = M.where('author', 'aaron').findOneAndUpdate({ date: now });
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now, query._updateArg.date);
    assert.strictEqual('aaron', query._conditions.author);

    query = M.find().findOneAndUpdate({ author: 'aaron' }, { date: now });
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now, query._updateArg.date);
    assert.strictEqual('aaron', query._conditions.author);

    query = M.find().findOneAndUpdate({ date: now });
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now, query._updateArg.date);
    assert.strictEqual(undefined, query._conditions.author);

    query = M.find().findOneAndUpdate();
    assert.strictEqual(undefined, query.options.new);
    assert.equal(undefined, query._updateArg.date);
    assert.strictEqual(undefined, query._conditions.author);
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

  it('executing with only a callback throws', function(){
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

        S.findOneAndUpdate({ _id: s._id }, { ignore: true }, { upsert: true }, function (err, doc) {
          assert.ifError(err);
          assert.ok(!doc.ignore);
          assert.ok(!doc._doc.ignore);
          assert.equal('orange crush', doc.name, 'doc was not overwritten with {} during upsert');

          S.findOneAndUpdate({ _id: s._id }, { ignore: true }, function (err, doc) {
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
  it('executing with just a callback throws', function(){
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

  it('options/conditions/doc are merged when no callback is passed', function(){
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
    assert.equal(now, query._updateArg.$set.date);
    assert.strictEqual(_id.toString(), query._conditions._id.toString());

    query = M.findByIdAndUpdate(_id, { $set: { date: now }});
    assert.strictEqual(undefined, query.options.new);
    assert.equal(now, query._updateArg.$set.date);
    assert.strictEqual(_id.toString(), query._conditions._id.toString());

    query = M.findByIdAndUpdate(_id);
    assert.strictEqual(undefined, query.options.new);
    assert.strictEqual(_id, query._conditions._id);

    query = M.findByIdAndUpdate();
    assert.strictEqual(undefined, query.options.new);
    assert.equal(undefined, query._updateArg.date);
    assert.strictEqual(undefined, query._conditions._id);
  });
})
