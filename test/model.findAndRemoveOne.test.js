
/**
 * Test dependencies.
 */

var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
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

var Comments = new Schema;

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

describe('model: findAndRemoveOne:', function(){
  it('returns the original document', function(done){
    var db = start()
      , M = db.model(modelname, collection)
      , title = 'remove muah'

    var post = new M({ title: title });
    post.save(function (err) {
      assert.ifError(err);
      M.findOneAndRemove({ title: title }, function (err, doc) {
        assert.ifError(err);
        assert.equal(doc.id, post.id);
        M.findById(post.id, function (err, gone) {
          db.close();
          assert.ifError(err);
          assert.equal(null, gone);
          done();
        });
      });
    });
  })

  it('options/conditions/doc are merged when no callback is passed', function(){
    var db = start()
      , M = db.model(modelname, collection)

    db.close();

    var now = new Date
      , query;

    // Model.findOneAndRemove
    query = M.findOneAndRemove({ author: 'aaron' }, { select: 'author' });
    assert.equal(1, query._fields.author);
    assert.equal('aaron', query._conditions.author);

    query = M.findOneAndRemove({ author: 'aaron' });
    assert.equal(undefined, query._fields);
    assert.equal('aaron', query._conditions.author);

    query = M.findOneAndRemove();
    assert.equal(undefined, query.options.new);
    assert.equal(undefined, query._fields);
    assert.equal(undefined, query._conditions.author);

    // Query.findOneAndRemove
    query = M.where('author', 'aaron').findOneAndRemove({ date: now });
    assert.equal(undefined, query._fields);
    assert.equal(now, query._conditions.date);
    assert.equal('aaron', query._conditions.author);

    query = M.find().findOneAndRemove({ author: 'aaron' }, { select: 'author' });
    assert.equal(1, query._fields.author);
    assert.equal('aaron', query._conditions.author);

    query = M.find().findOneAndRemove();
    assert.equal(undefined, query._fields);
    assert.equal(undefined, query._conditions.author);
  });

  it('executes when a callback is passed', function(done){
    var db = start()
      , M = db.model(modelname, collection + random())
      , pending = 5

    M.findOneAndRemove({ name: 'aaron1' }, { select: 'name' }, cb);
    M.findOneAndRemove({ name: 'aaron1' }, cb);
    M.where().findOneAndRemove({ name: 'aaron1' }, { select: 'name' }, cb);
    M.where().findOneAndRemove({ name: 'aaron1' }, cb);
    M.where('name', 'aaron1').findOneAndRemove(cb);

    function cb (err, doc) {
      assert.ifError(err);
      assert.equal(null, doc); // no previously existing doc
      if (--pending) return;
      db.close();
      done();
    }
  });

  it('executed with only a callback throws', function(){
    var db = start()
      , M = db.model(modelname, collection)
      , err

    try {
      M.findOneAndRemove(function(){});
    } catch (e) {
      err = e;
    }

    db.close();
    assert.ok(/First argument must not be a function/.test(err));
  });

})

describe('model: findByIdAndRemove:', function(){
  it('executed with only a callback throws', function(){
    var db = start()
      , M = db.model(modelname, collection)
      , err

    try {
      M.findByIdAndRemove(function(){});
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

    M.findByIdAndRemove(_id, { select: 'name' }, cb);
    M.findByIdAndRemove(_id, cb);

    function cb (err, doc) {
      assert.ifError(err);
      assert.equal(null, doc); // no previously existing doc
      if (--pending) return;
      db.close();
      done();
    }
  });

  it('returns the original document', function(done){
    var db = start()
      , M = db.model(modelname, collection)
      , title = 'remove muah pleez'

    var post = new M({ title: title });
    post.save(function (err) {
      assert.ifError(err);
      M.findByIdAndRemove(post.id, function (err, doc) {
        assert.ifError(err);
        assert.equal(doc.id, post.id);
        M.findById(post.id, function (err, gone) {
          db.close();
          assert.ifError(err);
          assert.equal(null, gone);
          done();
        });
      });
    });
  });

  it('options/conditions/doc are merged when no callback is passed', function(){
    var db = start()
      , M = db.model(modelname, collection)
      , _id = new DocumentObjectId

    db.close();

    var now = new Date
      , query;

    // Model.findByIdAndRemove
    query = M.findByIdAndRemove(_id, { select: 'author' });
    assert.equal(1, query._fields.author);
    assert.equal(_id.toString(), query._conditions._id.toString());

    query = M.findByIdAndRemove(_id.toString());
    assert.equal(undefined, query._fields);
    assert.equal(_id.toString(), query._conditions._id);

    query = M.findByIdAndRemove();
    assert.equal(undefined, query.options.new);
    assert.equal(undefined, query._fields);
    assert.equal(undefined, query._conditions._id);
  })

  it('supports v3 select string syntax', function(){
    var db = start()
      , M = db.model(modelname, collection)
      , _id = new DocumentObjectId

    db.close();

    var now = new Date
      , query;

    query = M.findByIdAndRemove(_id, { select: 'author -title' });
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);

    query = M.findOneAndRemove({}, { select: 'author -title' });
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
  })

  it('supports v3 select object syntax', function(){
    var db = start()
      , M = db.model(modelname, collection)
      , _id = new DocumentObjectId

    db.close();

    var now = new Date
      , query;

    query = M.findByIdAndRemove(_id, { select: { author: 1, title: 0 }});
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);

    query = M.findOneAndRemove({}, { select: { author: 1, title: 0 }});
    assert.strictEqual(1, query._fields.author);
    assert.strictEqual(0, query._fields.title);
  })

  it('supports v3 sort string syntax', function(){
    var db = start()
      , M = db.model(modelname, collection)
      , _id = new DocumentObjectId

    db.close();

    var now = new Date
      , query;

    query = M.findByIdAndRemove(_id, { sort: 'author -title' });
    assert.equal(2, query.options.sort.length);
    assert.equal('author', query.options.sort[0][0]);
    assert.equal(1, query.options.sort[0][1]);
    assert.equal('title', query.options.sort[1][0]);
    assert.equal(-1, query.options.sort[1][1]);

    query = M.findOneAndRemove({}, { sort: 'author -title' });
    assert.equal(2, query.options.sort.length);
    assert.equal('author', query.options.sort[0][0]);
    assert.equal(1, query.options.sort[0][1]);
    assert.equal('title', query.options.sort[1][0]);
    assert.equal(-1, query.options.sort[1][1]);
  })

  it('supports v3 sort object syntax', function(){
    var db = start()
      , M = db.model(modelname, collection)
      , _id = new DocumentObjectId

    db.close();

    var now = new Date
      , query;

    query = M.findByIdAndRemove(_id, { sort: { author: 1, title: -1 }});
    assert.equal(2, query.options.sort.length);
    assert.equal('author', query.options.sort[0][0]);
    assert.equal(1, query.options.sort[0][1]);
    assert.equal('title', query.options.sort[1][0]);
    assert.equal(-1, query.options.sort[1][1]);

    query = M.findOneAndRemove(_id, { sort: { author: 1, title: -1 }});
    assert.equal(2, query.options.sort.length);
    assert.equal('author', query.options.sort[0][0]);
    assert.equal(1, query.options.sort[0][1]);
    assert.equal('title', query.options.sort[1][0]);
    assert.equal(-1, query.options.sort[1][1]);
  });

})
