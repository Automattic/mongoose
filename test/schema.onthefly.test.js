var start = require('./common')
  , should = require('should')
  , mongoose = start.mongoose
  , random = require('mongoose/utils').random
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

/**
 * Setup.
 */

var DecoratedSchema = new Schema({
    title     : String
});

mongoose.model('Decorated', DecoratedSchema);

var collection = 'decorated_' + random();

module.exports = {
  'setting on the fly schemas should cache the type schema and cast values appropriately': function () {
    var db = start()
      , Decorated = db.model('Decorated', collection);

    var post = new Decorated();
    post.set('adhoc', '9', Number);
    post.get('adhoc').valueOf().should.eql(9);
    db.close();
  },

  'on the fly schemas should be local to the particular document': function () {
    var db = start()
      , Decorated = db.model('Decorated', collection);

    var postOne = new Decorated();
    postOne.set('adhoc', '9', Number);
    postOne.path('adhoc').should.not.equal(undefined);

    var postTwo = new Decorated();
    postTwo.path('title').should.not.equal(undefined);
    should.strictEqual(undefined, postTwo.path('adhoc'));
    db.close();
  },

  'querying a document that had an on the fly schema should work': function () {
    var db = start()
      , Decorated = db.model('Decorated', collection);

    var post = new Decorated({title: 'AD HOC'});
    // Interpret adhoc as a Number
    post.set('adhoc', '9', Number);
    post.get('adhoc').valueOf().should.eql(9);
    post.save( function (err) {
      should.strictEqual(null, err);
      Decorated.findById(post.id, function (err, found) {
        db.close();
        should.strictEqual(null, err);
        found.get('adhoc').should.eql(9);
        // Interpret adhoc as a String instead of a Number now
        found.get('adhoc', String).should.eql('9');
        found.get('adhoc').should.eql('9');
      });
    });
  },

  'on the fly Embedded Array schemas should cast properly': function () {
    var db = start()
      , Decorated = db.model('Decorated', collection);

    var post = new Decorated();
    post.set('moderators', [{name: 'alex trebek'}], [new Schema({name: String})]);
    post.get('moderators')[0].name.should.eql('alex trebek');
    db.close();
  },

  'on the fly Embedded Array schemas should get from a fresh queried document properly': function () {
    var db = start()
      , Decorated = db.model('Decorated', collection);

    var post = new Decorated()
      , ModeratorSchema = new Schema({name: String, ranking: Number});
    post.set('moderators', [{name: 'alex trebek', ranking: '1'}], [ModeratorSchema]);
    post.get('moderators')[0].name.should.eql('alex trebek');
    post.save( function (err) {
      should.strictEqual(null, err);
      Decorated.findById(post.id, function (err, found) {
        db.close();
        should.strictEqual(null, err);
        var rankingPreCast = found.get('moderators')[0].ranking;
        rankingPreCast.should.eql(1);
        should.strictEqual(undefined, rankingPreCast.increment);
        var rankingPostCast = found.get('moderators', [ModeratorSchema])[0].ranking;
        rankingPostCast.valueOf().should.equal(1);
        rankingPostCast.increment.should.not.equal(undefined);

        var NewModeratorSchema = new Schema({ name: String, ranking: String});
        rankingPostCast = found.get('moderators', [NewModeratorSchema])[0].ranking;
        rankingPostCast.should.equal('1');
      });
    });
  }
};
