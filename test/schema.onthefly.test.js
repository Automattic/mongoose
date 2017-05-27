var start = require('./common'),
    assert = require('power-assert'),
    mongoose = start.mongoose,
    random = require('../lib/utils').random,
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

describe('schema.onthefly', function() {
  var DecoratedSchema;
  var collection;

  before(function() {
    DecoratedSchema = new Schema({
      title: String
    }, {strict: false});

    mongoose.model('Decorated', DecoratedSchema);

    collection = 'decorated_' + random();
  });

  it('setting should cache the schema type and cast values appropriately', function(done) {
    var db = start(),
        Decorated = db.model('Decorated', collection);

    db.close();
    var post = new Decorated();
    post.set('adhoc', '9', Number);
    assert.equal(post.get('adhoc').valueOf(), 9);
    done();
  });

  it('should be local to the particular document', function(done) {
    var db = start(),
        Decorated = db.model('Decorated', collection);

    db.close();
    var postOne = new Decorated();
    postOne.set('adhoc', '9', Number);
    assert.notStrictEqual(postOne.$__path('adhoc'), undefined);

    var postTwo = new Decorated();
    assert.notStrictEqual(postTwo.$__path('title'), undefined);
    assert.strictEqual(undefined, postTwo.$__path('adhoc'));
    done();
  });

  it('querying a document that had an on the fly schema should work', function(done) {
    var db = start(),
        Decorated = db.model('Decorated', collection);

    var post = new Decorated({title: 'AD HOC'});
    // Interpret adhoc as a Number
    post.set('adhoc', '9', Number);
    assert.equal(post.get('adhoc').valueOf(), 9);
    post.save(function(err) {
      assert.ifError(err);
      assert.strictEqual(null, err);
      Decorated.findById(post.id, function(err, found) {
        db.close();
        assert.strictEqual(null, err);
        assert.equal(found.get('adhoc'), 9);
        // Interpret adhoc as a String instead of a Number now
        assert.equal(found.get('adhoc', String), '9');
        assert.equal(found.get('adhoc'), '9');

        // set adhoc as an Object
        found.set('adhoc', '3', Object);
        assert.equal(typeof found.get('adhoc'), 'string');
        found.set('adhoc', 3, Object);
        assert.equal(typeof found.get('adhoc'), 'number');

        found.set('adhoc', ['hello'], Object);
        assert.ok(Array.isArray(found.get('adhoc')));
        found.set('adhoc', ['hello'], {});
        assert.ok(Array.isArray(found.get('adhoc')));

        found.set('adhoc', 3, String);
        assert.equal(typeof found.get('adhoc'), 'string');
        found.set('adhoc', 3, Object);
        assert.equal(typeof found.get('adhoc'), 'number');
        done();
      });
    });
  });

  it('on the fly Embedded Array schemas should cast properly', function(done) {
    var db = start(),
        Decorated = db.model('Decorated', collection);

    db.close();
    var post = new Decorated();
    post.set('moderators', [{name: 'alex trebek'}], [new Schema({name: String})]);
    assert.equal(post.get('moderators')[0].name, 'alex trebek');
    done();
  });

  it('on the fly Embedded Array schemas should get from a fresh queried document properly', function(done) {
    var db = start(),
        Decorated = db.model('Decorated', collection);

    var post = new Decorated(),
        ModeratorSchema = new Schema({name: String, ranking: Number});
    post.set('moderators', [{name: 'alex trebek', ranking: '1'}], [ModeratorSchema]);
    assert.equal(post.get('moderators')[0].name, 'alex trebek');
    post.save(function(err) {
      assert.ifError(err);
      Decorated.findById(post.id, function(err, found) {
        db.close();
        assert.ifError(err);
        var rankingPreCast = found.get('moderators')[0].ranking;
        assert.equal(rankingPreCast, 1);
        assert.strictEqual(undefined, rankingPreCast.increment);
        var rankingPostCast = found.get('moderators', [ModeratorSchema])[0].ranking;
        assert.equal(rankingPostCast, 1);

        var NewModeratorSchema = new Schema({name: String, ranking: String});
        rankingPostCast = found.get('moderators', [NewModeratorSchema])[0].ranking;
        assert.equal(rankingPostCast, 1);
        done();
      });
    });
  });

  it('casts on get() (gh-2360)', function(done) {
    var db = start();
    var Decorated = db.model('gh2360', DecoratedSchema, 'gh2360');

    var d = new Decorated({title: '1'});
    assert.equal(typeof d.get('title', Number), 'number');

    d.title = '000000000000000000000001';
    assert.equal(d.get('title', ObjectId).constructor.name, 'ObjectID');

    d.set('title', 1, Number);
    assert.equal(typeof d.get('title'), 'number');

    db.close(done);
  });
});
