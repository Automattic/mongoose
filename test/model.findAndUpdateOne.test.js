
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

  'findOneAndUpdate returns the edited document': function () {
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
      should.strictEqual(err, null);
      M.findById(post._id, function (err, cf) {
        should.strictEqual(err, null);
        cf.title.should.equal(title);
        cf.author.should.equal(author);
        cf.meta.visitors.valueOf().should.eql(0);
        cf.date.should.eql(post.date);
        cf.published.should.be.true;
        cf.mixed.x.should.equal('ex');
        cf.numbers.toObject().should.eql([4,5,6,7]);
        cf.owners.length.should.equal(2);
        cf.owners[0].toString().should.equal(id0.toString());
        cf.owners[1].toString().should.equal(id1.toString());
        cf.comments.length.should.equal(2);
        cf.comments[0].body.should.eql('been there');
        cf.comments[1].body.should.eql('done that');
        should.exist(cf.comments[0]._id);
        should.exist(cf.comments[1]._id);
        cf.comments[0]._id.should.be.an.instanceof(DocumentObjectId)
        cf.comments[1]._id.should.be.an.instanceof(DocumentObjectId);

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
          should.strictEqual(err, null, err && err.stack);

          up.title.should.equal(newTitle);
          up.author.should.equal(author);
          up.meta.visitors.valueOf().should.equal(2);
          up.date.toString().should.equal(update.$set.date.toString());
          up.published.should.eql(false);
          up.mixed.x.should.equal('ECKS');
          up.mixed.y.should.equal('why');
          up.numbers.toObject().should.eql([5,7]);
          up.owners.length.should.equal(1);
          up.owners[0].toString().should.eql(id1.toString());
          up.comments[0].body.should.equal('been there');
          up.comments[1].body.should.equal('8');
          should.exist(up.comments[0]._id);
          should.exist(up.comments[1]._id);
          up.comments[0]._id.should.be.an.instanceof(DocumentObjectId)
          up.comments[1]._id.should.be.an.instanceof(DocumentObjectId);
        });
      });
    });

  },

  'findOneAndUpdate returns the original document': function () {
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
      should.strictEqual(err, null);
      M.findById(post._id, function (err, cf) {
        should.strictEqual(err, null);

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
          should.strictEqual(err, null, err && err.stack);

          up.title.should.equal(post.title);
          up.author.should.equal(post.author);
          up.meta.visitors.valueOf().should.equal(post.meta.visitors);
          up.date.toString().should.equal(post.date.toString());
          up.published.should.eql(post.published);
          up.mixed.x.should.equal(post.mixed.x);
          should.strictEqual(up.mixed.y, post.mixed.y);
          up.numbers.toObject().should.eql(post.numbers.toObject());
          up.owners.length.should.equal(post.owners.length);
          up.owners[0].toString().should.eql(post.owners[0].toString());
          up.comments[0].body.should.equal(post.comments[0].body);
          up.comments[1].body.should.equal(post.comments[1].body);
          should.exist(up.comments[0]._id);
          should.exist(up.comments[1]._id);
          up.comments[0]._id.should.be.an.instanceof(DocumentObjectId)
          up.comments[1]._id.should.be.an.instanceof(DocumentObjectId);
        });
      });
    });

  },

  'findOneAndUpdate allows upserting': function () {
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
      should.strictEqual(err, null, err && err.stack);

      up.title.should.equal(newTitle);
      up.meta.visitors.valueOf().should.equal(2);
      up.date.toString().should.equal(update.$set.date.toString());
      up.published.should.eql(update.published);
      up.mixed.x.should.equal(update.mixed.x);
      should.strictEqual(up.mixed.y, update.mixed.y);
      Array.isArray(up.numbers).should.be.true;
      Array.isArray(up.owners).should.be.true;
      up.numbers.length.should.equal(0);
      up.owners.length.should.equal(0);
    });
  },

  'options/conditions/doc are merged when no callback is passed': function () {
    var db = start()
      , M = db.model(modelname, collection)

    db.close();

    var now = new Date
      , query;

    // Model.findOneAndUpdate
    query = M.findOneAndUpdate({ author: 'aaron' }, { $set: { date: now }}, { new: false, fields: 'author' });
    should.strictEqual(false, query.options.new);
    should.strictEqual(1, query._fields.author);
    should.equal(now, query._updateArg.$set.date);
    should.strictEqual('aaron', query._conditions.author);

    query = M.findOneAndUpdate({ author: 'aaron' }, { $set: { date: now }});
    should.strictEqual(undefined, query.options.new);
    should.equal(now, query._updateArg.$set.date);
    should.strictEqual('aaron', query._conditions.author);

    query = M.findOneAndUpdate({ $set: { date: now }});
    should.strictEqual(undefined, query.options.new);
    should.equal(now, query._updateArg.$set.date);
    should.strictEqual(undefined, query._conditions.author);

    query = M.findOneAndUpdate();
    should.strictEqual(undefined, query.options.new);
    should.equal(undefined, query._updateArg.date);
    should.strictEqual(undefined, query._conditions.author);

    // Query.findOneAndUpdate
    query = M.where('author', 'aaron').findOneAndUpdate({ date: now });
    should.strictEqual(undefined, query.options.new);
    should.equal(now, query._updateArg.date);
    should.strictEqual('aaron', query._conditions.author);

    query = M.find().findOneAndUpdate({ author: 'aaron' }, { date: now });
    should.strictEqual(undefined, query.options.new);
    should.equal(now, query._updateArg.date);
    should.strictEqual('aaron', query._conditions.author);

    query = M.find().findOneAndUpdate({ date: now });
    should.strictEqual(undefined, query.options.new);
    should.equal(now, query._updateArg.date);
    should.strictEqual(undefined, query._conditions.author);

    query = M.find().findOneAndUpdate();
    should.strictEqual(undefined, query.options.new);
    should.equal(undefined, query._updateArg.date);
    should.strictEqual(undefined, query._conditions.author);
  },

  'findOneAndUpdate executes when a callback is passed': function () {
    var db = start()
      , M = db.model(modelname, collection + random())
      , pending = 6

    M.findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron'}}, { new: false }, done);
    M.findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron'}}, done);
    M.where().findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron'}}, { new: false }, done);
    M.where().findOneAndUpdate({ name: 'aaron' }, { $set: { name: 'Aaron'}}, done);
    M.where().findOneAndUpdate({ $set: { name: 'Aaron'}}, done);
    M.where('name', 'aaron').findOneAndUpdate({ $set: { name: 'Aaron'}}).findOneAndUpdate(done);

    function done (err, doc) {
      should.strictEqual(null, err);
      should.strictEqual(null, doc); // not an upsert, no previously existing doc
      if (--pending) return;
      db.close();
    }
  },

  'Model.findOneAndUpdate(callback) throws': function () {
    var db = start()
      , M = db.model(modelname, collection)
      , err

    try {
      M.findOneAndUpdate(function(){});
    } catch (e) {
      err = e;
    }

    db.close();
    ;/First argument must not be a function/.test(err).should.be.true;
  },

  'findOneAndUpdate updates numbers atomically': function () {
    var db = start()
      , BlogPost = db.model(modelname, collection)
      , totalDocs = 4
      , saveQueue = [];

    var post = new BlogPost();
    post.set('meta.visitors', 5);

    post.save(function(err){
      if (err) throw err;

      for (var i = 0; i < 4; ++i) {
        BlogPost
        .findOneAndUpdate({ _id: post._id }, { $inc: { 'meta.visitors': 1 }}, function (err) {
          if (err) throw err;
          --totalDocs || complete();
        });
      }

      function complete () {
        BlogPost.findOne({ _id: post.get('_id') }, function (err, doc) {
          db.close();
          if (err) throw err;
          doc.get('meta.visitors').should.equal(9);
        });
      };
    });
  },

  'Model.findOneAndUpdate should honor strict schemas': function () {
    var db = start();
    var S = db.model('UpdateOneStrictSchema');
    var s = new S({ name: 'orange crush' });

    s.save(function (err) {
      should.strictEqual(null, err);

      S.findOneAndUpdate({ _id: s._id }, { ignore: true }, function (err, doc) {
        db.close();
        should.strictEqual(null, err);
        should.not.exist(doc.ignore);
        should.not.exist(doc._doc.ignore);
      });
    });
  },

  // by id

  'Model.findByIdAndUpdate(callback) throws': function () {
    var db = start()
      , M = db.model(modelname, collection)
      , err

    try {
      M.findByIdAndUpdate(function(){});
    } catch (e) {
      err = e;
    }

    db.close();
    ;/First argument must not be a function/.test(err).should.be.true;
  },

  'findByIdAndUpdate executes when a callback is passed': function () {
    var db = start()
      , M = db.model(modelname, collection + random())
      , _id = new DocumentObjectId
      , pending = 2

    M.findByIdAndUpdate(_id, { $set: { name: 'Aaron'}}, { new: false }, done);
    M.findByIdAndUpdate(_id, { $set: { name: 'changed' }}, done);

    function done (err, doc) {
      should.strictEqual(null, err);
      should.strictEqual(null, doc); // no previously existing doc
      if (--pending) return;
      db.close();
    }
  },

  'findByIdAndUpdate returns the original document': function () {
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
      should.strictEqual(err, null);
      M.findById(post._id, function (err, cf) {
        should.strictEqual(err, null);

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
          should.strictEqual(err, null, err && err.stack);

          up.title.should.equal(post.title);
          up.author.should.equal(post.author);
          up.meta.visitors.valueOf().should.equal(post.meta.visitors);
          up.date.toString().should.equal(post.date.toString());
          up.published.should.eql(post.published);
          up.mixed.x.should.equal(post.mixed.x);
          should.strictEqual(up.mixed.y, post.mixed.y);
          up.numbers.toObject().should.eql(post.numbers.toObject());
          up.owners.length.should.equal(post.owners.length);
          up.owners[0].toString().should.eql(post.owners[0].toString());
          up.comments[0].body.should.equal(post.comments[0].body);
          up.comments[1].body.should.equal(post.comments[1].body);
          should.exist(up.comments[0]._id);
          should.exist(up.comments[1]._id);
          up.comments[0]._id.should.be.an.instanceof(DocumentObjectId)
          up.comments[1]._id.should.be.an.instanceof(DocumentObjectId);
        });
      });
    });
  },

  'findByIdAndUpdate: options/conditions/doc are merged when no callback is passed': function () {
    var db = start()
      , M = db.model(modelname, collection)
      , _id = new DocumentObjectId

    db.close();

    var now = new Date
      , query;

    // Model.findByIdAndUpdate
    query = M.findByIdAndUpdate(_id, { $set: { date: now }}, { new: false, fields: 'author' });
    should.strictEqual(false, query.options.new);
    should.strictEqual(1, query._fields.author);
    should.equal(now, query._updateArg.$set.date);
    should.strictEqual(_id.toString(), query._conditions._id.toString());

    query = M.findByIdAndUpdate(_id, { $set: { date: now }});
    should.strictEqual(undefined, query.options.new);
    should.equal(now, query._updateArg.$set.date);
    should.strictEqual(_id.toString(), query._conditions._id.toString());

    query = M.findByIdAndUpdate(_id);
    should.strictEqual(undefined, query.options.new);
    should.strictEqual(_id, query._conditions._id);

    query = M.findByIdAndUpdate();
    should.strictEqual(undefined, query.options.new);
    should.equal(undefined, query._updateArg.date);
    should.strictEqual(undefined, query._conditions._id);
  }
}
