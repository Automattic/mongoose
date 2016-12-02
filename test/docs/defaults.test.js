var assert = require('power-assert');
var mongoose = require('../../');

describe('defaults docs', function () {
  var db;
  var Schema = mongoose.Schema;

  before(function () {
    db = mongoose.createConnection('mongodb://localhost:27017/mongoose_test');
  });

  after(function (done) {
    db.close(done);
  });

  /**
   * Your schemas can define default values for certain paths. If you create
   * a new document without that path set, the default will kick in.
   */
  it('Declaring defaults in your schema', function(done) {
    var schema = new Schema({
      name: String,
      role: { type: String, default: 'guitarist' }
    });

    var Person = db.model('Person', schema);

    var axl = new Person({ name: 'Axl Rose', role: 'singer' });
    assert.equal(axl.role, 'singer');

    var slash = new Person({ name: 'Slash' });
    assert.equal(slash.role, 'guitarist');

    var izzy = new Person({ name: 'Izzy', role: undefined });
    assert.equal(izzy.role, 'guitarist');

    Person.create(axl, slash, function(error) {
      assert.ifError(error);
      Person.find({ role: 'guitarist' }, function(error, docs) {
        assert.ifError(error);
        assert.equal(docs.length, 1);
        assert.equal(docs[0].name, 'Slash');
        // acquit:ignore:start
        done();
        // acquit:ignore:end
      });
    });
  });

  /**
   * You can also set the `default` schema option to a function. Mongoose will
   * execute that function and use the return value as the default.
   */
  it('Default functions', function() {
    var schema = new Schema({
      title: String,
      date: {
        type: Date,
        // `Date.now()` returns the current unix timestamp as a number
        default: Date.now
      }
    });

    var BlogPost = db.model('BlogPost', schema);

    var post = new BlogPost({title: '5 Best Arnold Schwarzenegger Movies'});

    // The post has a default Date set to now
    assert.ok(post.date.getTime() >= Date.now() - 1000);
    assert.ok(post.date.getTime() <= Date.now());
  });

  /**
   * By default, mongoose only applies defaults when you create a new document.
   * It will **not** set defaults if you use `update()` and
   * `findOneAndUpdate()`. However, mongoose 4.x lets you opt-in to this
   * behavior using the `setDefaultsOnInsert` option.
   *
   * ## Important
   *
   * The `setDefaultsOnInsert` option relies on the
   * [MongoDB `$setOnInsert` operator](https://docs.mongodb.org/manual/reference/operator/update/setOnInsert/).
   * The `$setOnInsert` operator was introduced in MongoDB 2.4. If you're
   * using MongoDB server < 2.4.0, do **not** use `setDefaultsOnInsert`.
   */
  it('The `setDefaultsOnInsert` option', function(done) {
    var schema = new Schema({
      title: String,
      genre: {type: String, default: 'Action'}
    });

    var Movie = db.model('Movie', schema);

    var query = {};
    var update = {title: 'The Terminator'};
    var options = {
      // Return the document after updates are applied
      new: true,
      // Create a document if one isn't found. Required
      // for `setDefaultsOnInsert`
      upsert: true,
      setDefaultsOnInsert: true
    };

    Movie.
      findOneAndUpdate(query, update, options, function (error, doc) {
        assert.ifError(error);
        assert.equal(doc.title, 'The Terminator');
        assert.equal(doc.genre, 'Action');
        // acquit:ignore:start
        done();
        // acquit:ignore:end
      });
  });
});
