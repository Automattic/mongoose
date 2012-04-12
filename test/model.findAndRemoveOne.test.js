
/**
 * Test dependencies.
 */

var start = require('./common')
  , should = require('should')
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

module.exports = {

  'findOneAndRemove returns the original document': function () {
    var db = start()
      , M = db.model(modelname, collection)
      , title = 'remove muah'

    var post = new M({ title: title });
    post.save(function (err) {
      should.strictEqual(err, null);
      M.findOneAndRemove({ title: title }, function (err, doc) {
        should.strictEqual(err, null);
        doc.id.should.equal(post.id);
        M.findById(post.id, function (err, gone) {
          db.close();
          should.strictEqual(err, null);
          should.strictEqual(gone, null);
        });
      });
    });
  },

  'findOneAndRemove: options/conditions/doc are merged when no callback is passed': function () {
    var db = start()
      , M = db.model(modelname, collection)

    db.close();

    var now = new Date
      , query;

    // Model.findOneAndRemove
    query = M.findOneAndRemove({ author: 'aaron' }, { select: 'author' });
    should.strictEqual(1, query._fields.author);
    should.strictEqual('aaron', query._conditions.author);

    query = M.findOneAndRemove({ author: 'aaron' });
    should.strictEqual(undefined, query._fields);
    should.strictEqual('aaron', query._conditions.author);

    query = M.findOneAndRemove();
    should.strictEqual(undefined, query.options.new);
    should.strictEqual(undefined, query._fields);
    should.strictEqual(undefined, query._conditions.author);

    // Query.findOneAndRemove
    query = M.where('author', 'aaron').findOneAndRemove({ date: now });
    should.strictEqual(undefined, query._fields);
    should.equal(now, query._conditions.date);
    should.strictEqual('aaron', query._conditions.author);

    query = M.find().findOneAndRemove({ author: 'aaron' }, { select: 'author' });
    should.strictEqual(1, query._fields.author);
    should.strictEqual('aaron', query._conditions.author);

    query = M.find().findOneAndRemove();
    should.strictEqual(undefined, query._fields);
    should.strictEqual(undefined, query._conditions.author);
  },

  'findOneAndRemove executes when a callback is passed': function () {
    var db = start()
      , M = db.model(modelname, collection + random())
      , pending = 5

    M.findOneAndRemove({ name: 'aaron1' }, { select: 'name' }, done);
    M.findOneAndRemove({ name: 'aaron1' }, done);
    M.where().findOneAndRemove({ name: 'aaron1' }, { select: 'name' }, done);
    M.where().findOneAndRemove({ name: 'aaron1' }, done);
    M.where('name', 'aaron1').findOneAndRemove(done);

    function done (err, doc) {
      should.strictEqual(null, err);
      should.strictEqual(null, doc); // no previously existing doc
      if (--pending) return;
      db.close();
    }
  },

  'Model.findOneAndRemove(callback) throws': function () {
    var db = start()
      , M = db.model(modelname, collection)
      , err

    try {
      M.findOneAndRemove(function(){});
    } catch (e) {
      err = e;
    }

    db.close();
    ;/First argument must not be a function/.test(err).should.be.true;
  },

  /// byid

  'Model.findByIdAndRemove(callback) throws': function () {
    var db = start()
      , M = db.model(modelname, collection)
      , err

    try {
      M.findByIdAndRemove(function(){});
    } catch (e) {
      err = e;
    }

    db.close();
    ;/First argument must not be a function/.test(err).should.be.true;
  },

  'findByIdAndRemove executes when a callback is passed': function () {
    var db = start()
      , M = db.model(modelname, collection + random())
      , _id = new DocumentObjectId
      , pending = 2

    M.findByIdAndRemove(_id, { select: 'name' }, done);
    M.findByIdAndRemove(_id, done);

    function done (err, doc) {
      should.strictEqual(null, err);
      should.strictEqual(null, doc); // no previously existing doc
      if (--pending) return;
      db.close();
    }
  },

  'findByIdAndRemove returns the original document': function () {
    var db = start()
      , M = db.model(modelname, collection)
      , title = 'remove muah pleez'

    var post = new M({ title: title });
    post.save(function (err) {
      should.strictEqual(err, null);
      M.findByIdAndRemove(post.id, function (err, doc) {
        should.strictEqual(err, null);
        doc.id.should.equal(post.id);
        M.findById(post.id, function (err, gone) {
          db.close();
          should.strictEqual(err, null);
          should.strictEqual(gone, null);
        });
      });
    });
  },

  'findByIdAndRemove: options/conditions/doc are merged when no callback is passed': function () {
    var db = start()
      , M = db.model(modelname, collection)
      , _id = new DocumentObjectId

    db.close();

    var now = new Date
      , query;

    // Model.findByIdAndRemove
    query = M.findByIdAndRemove(_id, { select: 'author' });
    should.strictEqual(1, query._fields.author);
    should.strictEqual(_id.toString(), query._conditions._id.toString());

    query = M.findByIdAndRemove(_id.toString());
    should.strictEqual(undefined, query._fields);
    should.strictEqual(_id.toString(), query._conditions._id);

    query = M.findByIdAndRemove();
    should.strictEqual(undefined, query.options.new);
    should.strictEqual(undefined, query._fields);
    should.strictEqual(undefined, query._conditions._id);
  }

}
