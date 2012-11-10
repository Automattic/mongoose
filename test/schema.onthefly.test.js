var start = require('./common')
  , assert = require('assert')
  , mongoose = start.mongoose
  , random = require('../lib/utils').random
  , Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId;

/**
 * Setup.
 */

var DecoratedSchema = new Schema({
    title     : String
}, { strict: false });

mongoose.model('Decorated', DecoratedSchema);

var collection = 'decorated_' + random();

describe('schema.onthefly', function(){
  it('setting should cache the schema type and cast values appropriately', function (done) {
    var db = start()
      , Decorated = db.model('Decorated', collection);

    db.close();
    var post = new Decorated();
    post.set('adhoc', '9', Number);
    assert.equal(9, post.get('adhoc').valueOf());
    done();
  });

  it('should be local to the particular document', function (done) {
    var db = start()
      , Decorated = db.model('Decorated', collection);

    db.close();
    var postOne = new Decorated();
    postOne.set('adhoc', '9', Number);
    assert.notStrictEqual(postOne._path('adhoc'),undefined);

    var postTwo = new Decorated();
    assert.notStrictEqual(postTwo._path('title'),undefined);
    assert.strictEqual(undefined, postTwo._path('adhoc'));
    done();
  });

  it('querying a document that had an on the fly schema should work', function (done) {
    var db = start()
      , Decorated = db.model('Decorated', collection);

    var post = new Decorated({title: 'AD HOC'});
    // Interpret adhoc as a Number
    post.set('adhoc', '9', Number);
    assert.equal(9, post.get('adhoc').valueOf());
    post.save(function (err) {
      assert.ifError(err);
      assert.strictEqual(null, err);
      Decorated.findById(post.id, function (err, found) {
        db.close();
        assert.strictEqual(null, err);
        assert.equal(9, found.get('adhoc'));
        // Interpret adhoc as a String instead of a Number now
        assert.equal('9', found.get('adhoc', String));
        assert.equal('9', found.get('adhoc'));

        // set adhoc as an Object
        found.set('adhoc', '3', Object);
        assert.equal('string', typeof found.get('adhoc'));
        found.set('adhoc', 3, Object);
        assert.equal('number', typeof found.get('adhoc'));

        found.set('adhoc', ['hello'], Object);
        assert.ok(Array.isArray(found.get('adhoc')));
        found.set('adhoc', ['hello'], {});
        assert.ok(Array.isArray(found.get('adhoc')));

        found.set('adhoc', 3, String);
        assert.equal('string', typeof found.get('adhoc'));
        found.set('adhoc', 3, Object);
        assert.equal('number', typeof found.get('adhoc'));
        done();
      });
    });
  });

  it('on the fly Embedded Array schemas should cast properly', function (done) {
    var db = start()
      , Decorated = db.model('Decorated', collection);

    db.close();
    var post = new Decorated();
    post.set('moderators', [{name: 'alex trebek'}], [new Schema({name: String})]);
    assert.equal(post.get('moderators')[0].name,'alex trebek');
    done();
  })

  it('on the fly Embedded Array schemas should get from a fresh queried document properly', function (done) {
    var db = start()
      , Decorated = db.model('Decorated', collection);

    var post = new Decorated()
      , ModeratorSchema = new Schema({name: String, ranking: Number});
    post.set('moderators', [{name: 'alex trebek', ranking: '1'}], [ModeratorSchema]);
    assert.equal(post.get('moderators')[0].name,'alex trebek');
    post.save(function (err) {
      assert.ifError(err);
      Decorated.findById(post.id, function (err, found) {
        db.close();
        assert.ifError(err);
        var rankingPreCast = found.get('moderators')[0].ranking;
        assert.equal(1, rankingPreCast);
        assert.strictEqual(undefined, rankingPreCast.increment);
        var rankingPostCast = found.get('moderators', [ModeratorSchema])[0].ranking;
        assert.equal(1, rankingPostCast);

        var NewModeratorSchema = new Schema({ name: String, ranking: String});
        rankingPostCast = found.get('moderators', [NewModeratorSchema])[0].ranking;
        assert.equal(1, rankingPostCast);
        done();
      });
    });
  })

  it('should support on the fly nested documents', function (done) {
    // TODO
    done();
  });
})
