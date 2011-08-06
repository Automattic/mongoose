
/**
 * Module dependencies.
 */

var should = require('should')
  , start = require('./common')
  , mongoose = start.mongoose
  , EmbeddedDocument = require('mongoose/types/document')
  , DocumentArray = require('mongoose/types/documentarray')
  , Schema = mongoose.Schema
  , SchemaType = mongoose.SchemaType
  , ValidatorError = SchemaType.ValidatorError
  , ValidationError = mongoose.Document.ValidationError

/**
 * Setup.
 */

function Subdocument () {
  EmbeddedDocument.call(this, {}, new DocumentArray);
};

/**
 * Inherits from EmbeddedDocument.
 */

Subdocument.prototype.__proto__ = EmbeddedDocument.prototype;

/**
 * Set schema.
 */

Subdocument.prototype.schema = new Schema({
    test: { type: String, required: true }
  , work: { type: String, validate: /^good/ }
});

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

module.exports = {

    'test that save fires errors': function(){
      var a = new Subdocument();
      a.set('test', '');
      a.set('work', 'nope');

      a.save(function(err){
        err.should.be.an.instanceof(ValidationError);
        err.toString().should.eql('ValidationError: Validator "required" failed for path test, Validator failed for path work');
      });
    },

    'test that save fires with null if no errors': function(){
      var a = new Subdocument();
      a.set('test', 'cool');
      a.set('work', 'goods');

      a.save(function(err){
        should.strictEqual(err, null);
      });
    },

    'objects can be passed to #set': function () {
      var a = new Subdocument();
      a.set({ test: 'paradiddle', work: 'good flam'});
      a.test.should.eql('paradiddle');
      a.work.should.eql('good flam');
    },

    'Subdocuments can be passed to #set': function () {
      var a = new Subdocument();
      a.set({ test: 'paradiddle', work: 'good flam'});
      a.test.should.eql('paradiddle');
      a.work.should.eql('good flam');
      var b = new Subdocument();
      b.set(a);
      b.test.should.eql('paradiddle');
      b.work.should.eql('good flam');
    },

    'Subdocument#remove': function (beforeExit) {
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
      console.error('pre save', super8);

      super8.save(function (err) {
        should.strictEqual(err, null);

        super8.title.should.eql('Super 8');
        super8.ratings.id(id1).stars.valueOf().should.eql(9);
        super8.ratings.id(id2).stars.valueOf().should.eql(8);
        super8.ratings.id(id3).stars.valueOf().should.eql(7);
        super8.ratings.id(id4).stars.valueOf().should.eql(6);

        super8.ratings.id(id1).stars = 5;
        super8.ratings.id(id2).remove();
        super8.ratings.id(id3).stars = 4;
        super8.ratings.id(id4).stars = 3;

        super8.save(function (err) {
          should.strictEqual(err, null);

          Movie.findById(super8._id, function (err, movie) {
            should.strictEqual(err, null);

            movie.title.should.eql('Super 8');
            movie.ratings.length.should.equal(3);
            movie.ratings.id(id1).stars.valueOf().should.eql(5);
            movie.ratings.id(id3).stars.valueOf().should.eql(4);
            movie.ratings.id(id4).stars.valueOf().should.eql(3);

            console.error('after save + findbyId', movie);

            movie.ratings.id(id1).stars = 2;
            movie.ratings.id(id3).remove();
            movie.ratings.id(id4).stars = 1;

            console.error('after modified', movie);

            movie.save(function (err) {
              should.strictEqual(err, null);

              Movie.findById(super8._id, function (err, movie) {
                db.close();
                should.strictEqual(err, null);
                movie.ratings.length.should.equal(2);
                movie.ratings.id(id1).stars.valueOf().should.eql(2);
                movie.ratings.id(id4).stars.valueOf().should.eql(1);
                console.error('after resave + findById', movie);
              });
            });
          });
        });
      });

      beforeExit(function () {
        var db = start();
        Movie.remove({}, function (err) {
          db.close();
        });
      });
    }

};
