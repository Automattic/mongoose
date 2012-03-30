
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

  'removeOne returns the original document': function () {
    var db = start()
      , M = db.model(modelname, collection)
      , title = 'remove muah'

    var post = new M({ title: title });
    post.save(function (err) {
      should.strictEqual(err, null);
      M.removeOne({ title: title }, function (err, doc) {
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

  'removeOne: options/conditions/doc are merged when no callback is passed': function () {
    var db = start()
      , M = db.model(modelname, collection)

    db.close();

    var now = new Date
      , query;

    // Model.removeOne
    query = M.removeOne({ author: 'aaron' }, { fields: 'author' });
    should.strictEqual(1, query._fields.author);
    should.strictEqual('aaron', query._conditions.author);

    query = M.removeOne({ author: 'aaron' });
    should.strictEqual(undefined, query._fields);
    should.strictEqual('aaron', query._conditions.author);

    query = M.removeOne();
    should.strictEqual(undefined, query.options.new);
    should.strictEqual(undefined, query._fields);
    should.strictEqual(undefined, query._conditions.author);

    // Query.removeOne
    query = M.where('author', 'aaron').removeOne({ date: now });
    should.strictEqual(undefined, query._fields);
    should.equal(now, query._conditions.date);
    should.strictEqual('aaron', query._conditions.author);

    query = M.find().removeOne({ author: 'aaron' }, { fields: 'author' });
    should.strictEqual(1, query._fields.author);
    should.strictEqual('aaron', query._conditions.author);

    query = M.find().removeOne();
    should.strictEqual(undefined, query._fields);
    should.strictEqual(undefined, query._conditions.author);
  },

  'removeOne executes when a callback is passed': function () {
    var db = start()
      , M = db.model(modelname, collection + random())
      , pending = 4

    M.removeOne({ name: 'aaron1' }, { fields: 'name' }, done);
    M.removeOne({ name: 'aaron1' }, done);
    M.where().removeOne({ name: 'aaron1' }, { fields: 'name' }, done);
    M.where().removeOne({ name: 'aaron1' }, done);

    function done (err, doc) {
      should.strictEqual(null, err);
      should.strictEqual(null, doc); // no previously existing doc
      if (--pending) return;
      db.close();
    }
  },

  'Model.removeOne(callback) throws': function () {
    var db = start()
      , M = db.model(modelname, collection)
      , err

    try {
      M.removeOne(function(){});
    } catch (e) {
      err = e;
    }

    db.close();
    ;/First argument must not be a function/.test(err).should.be.true;
  }
}
