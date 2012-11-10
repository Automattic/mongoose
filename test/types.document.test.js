
/**
 * Module dependencies.
 */

var assert = require('assert')
  , start = require('./common')
  , mongoose = start.mongoose
  , EmbeddedDocument = require('../lib/types/embedded')
  , DocumentArray = require('../lib/types/documentarray')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , ValidatorError = SchemaType.ValidatorError
  , ValidationError = mongoose.Document.ValidationError

/**
 * Setup.
 */

function Dummy () {
  mongoose.Document.call(this, {});
}
Dummy.prototype.__proto__ = mongoose.Document.prototype;
Dummy.prototype._setSchema(new Schema)

function Subdocument () {
  var arr = new DocumentArray;
  arr._path = 'jsconf.ar'
  arr._parent = new Dummy;
  arr[0] = this;
  EmbeddedDocument.call(this, {}, arr);
};

/**
 * Inherits from EmbeddedDocument.
 */

Subdocument.prototype.__proto__ = EmbeddedDocument.prototype;

/**
 * Set schema.
 */

Subdocument.prototype._setSchema(new Schema({
    test: { type: String, required: true }
  , work: { type: String, validate: /^good/ }
}));

/**
 * Schema.
 */

var RatingSchema = new Schema({
    stars: Number
});

var MovieSchema = new Schema({
    title: String
  , ratings: [RatingSchema]
});

mongoose.model('Movie', MovieSchema);

/**
 * Test.
 */

describe('types.document', function(){

  it('test that save fires errors', function(done){
    var a = new Subdocument();
    a.set('test', '');
    a.set('work', 'nope');

    a.save(function(err){
      assert.ok(a.__parent._validationError instanceof ValidationError);
      assert.equal(a.__parent.errors['jsconf.ar.0.work'].name, 'ValidatorError');
      assert.equal(a.__parent._validationError.toString(), 'ValidationError: Validator "required" failed for path test, Validator failed for path work');
      done();
    });
  });

  it('objects can be passed to #set', function (done) {
    var a = new Subdocument();
    a.set({ test: 'paradiddle', work: 'good flam'});
    assert.equal(a.test, 'paradiddle');
    assert.equal(a.work, 'good flam');
    done();
  })

  it('Subdocuments can be passed to #set', function (done) {
    var a = new Subdocument();
    a.set({ test: 'paradiddle', work: 'good flam'});
    assert.equal(a.test, 'paradiddle');
    assert.equal(a.work, 'good flam');
    var b = new Subdocument();
    b.set(a);
    assert.equal(b.test, 'paradiddle');
    assert.equal(b.work, 'good flam');
    done();
  })

  it('cached _ids', function (done) {
    var db = start();
    var Movie = db.model('Movie');
    db.close();
    var m = new Movie;

    assert.equal(m.id, m.__id);
    var old = m.id;
    m._id = new mongoose.Types.ObjectId;
    assert.equal(m.id, m.__id);
    assert.strictEqual(true, old !== m.__id);

    var m2= new Movie;
    delete m2._doc._id;
    m2.init({ _id: new mongoose.Types.ObjectId });
    assert.equal(m2.id, m2.__id);
    assert.strictEqual(true, m.__id !== m2.__id);
    assert.strictEqual(true, m.id !== m2.id);
    assert.strictEqual(true, m.__id !== m2.__id);
    done();
  });

  it('Subdocument#remove (gh-531)', function (done) {
    var db = start();
    var Movie = db.model('Movie');

    var super8 = new Movie({ title: 'Super 8' });

    var id1 = '4e3d5fc7da5d7eb635063c96';
    var id2 = '4e3d5fc7da5d7eb635063c97';
    var id3 = '4e3d5fc7da5d7eb635063c98';
    var id4 = '4e3d5fc7da5d7eb635063c99';

    super8.ratings.push({ stars: 9, _id: id1 });
    super8.ratings.push({ stars: 8, _id: id2 });
    super8.ratings.push({ stars: 7, _id: id3 });
    super8.ratings.push({ stars: 6, _id: id4 });

    super8.save(function (err) {
      assert.ifError(err);

      assert.equal(super8.title, 'Super 8');
      assert.equal(super8.ratings.id(id1).stars.valueOf(), 9);
      assert.equal(super8.ratings.id(id2).stars.valueOf(), 8);
      assert.equal(super8.ratings.id(id3).stars.valueOf(), 7);
      assert.equal(super8.ratings.id(id4).stars.valueOf(), 6);

      super8.ratings.id(id1).stars = 5;
      super8.ratings.id(id2).remove();
      super8.ratings.id(id3).stars = 4;
      super8.ratings.id(id4).stars = 3;

      super8.save(function (err) {
        assert.ifError(err);

        Movie.findById(super8._id, function (err, movie) {
          assert.ifError(err);

          assert.equal(movie.title, 'Super 8');
          assert.equal(movie.ratings.length,3);
          assert.equal(movie.ratings.id(id1).stars.valueOf(), 5);
          assert.equal(movie.ratings.id(id3).stars.valueOf(), 4);
          assert.equal(movie.ratings.id(id4).stars.valueOf(), 3);

          movie.ratings.id(id1).stars = 2;
          movie.ratings.id(id3).remove();
          movie.ratings.id(id4).stars = 1;

          movie.save(function (err) {
            assert.ifError(err);

            Movie.findById(super8._id, function (err, movie) {
              assert.ifError(err);
              assert.equal(movie.ratings.length,2);
              assert.equal(movie.ratings.id(id1).stars.valueOf(), 2);
              assert.equal(movie.ratings.id(id4).stars.valueOf(), 1);

              // gh-531
              movie.ratings[0].remove();
              movie.ratings[0].remove();
              movie.save(function (err) {
                Movie.findById(super8._id, function (err, movie) {
                  db.close();
                  assert.ifError(err);
                  assert.equal(0, movie.ratings.length);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });
});
