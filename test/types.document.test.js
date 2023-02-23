
/**
 * Module dependencies.
 */

'use strict';

const start = require('./common');

const assert = require('assert');
const mongoose = start.mongoose;
const ArraySubdocument = require('../lib/types/ArraySubdocument');
const EventEmitter = require('events').EventEmitter;
const DocumentArray = require('../lib/types/DocumentArray');
const Schema = mongoose.Schema;
const ValidationError = mongoose.Document.ValidationError;

const documentArrayParent = require('../lib/helpers/symbols').documentArrayParent;

/**
 * Test.
 */

describe('types.document', function() {
  let Dummy;
  let Subdocument;
  let RatingSchema;
  let MovieSchema;
  let db;

  before(function() {
    function _Dummy() {
      mongoose.Document.call(this, {});
    }
    Dummy = _Dummy;
    Object.setPrototypeOf(Dummy.prototype, mongoose.Document.prototype);
    Dummy.prototype.$__setSchema(new Schema());

    function _Subdocument() {
      const arr = new DocumentArray([], 'jsconf.ar', new Dummy());
      arr[0] = this;
      ArraySubdocument.call(this, {}, arr);
    }
    Subdocument = _Subdocument;

    Object.setPrototypeOf(Subdocument.prototype, ArraySubdocument.prototype);

    for (const i in EventEmitter.prototype) {
      Subdocument[i] = EventEmitter.prototype[i];
    }

    Subdocument.prototype.$__setSchema(new Schema({
      test: { type: String, required: true },
      work: { type: String, validate: /^good/ }
    }));

    RatingSchema = new Schema({
      stars: Number,
      description: { source: { url: String, time: Date } }
    });

    MovieSchema = new Schema({
      title: String,
      ratings: [RatingSchema]
    });

    db = start();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(function() {
    db.deleteModel(/.*/);
  });

  it('test that validate sets errors', async function() {
    const a = new Subdocument();
    a.set('test', '');
    a.set('work', 'nope');
    a.__index = 0;

    await a.validate().catch(() => {});

    assert.ok(a[documentArrayParent].$__.validationError instanceof ValidationError);
    assert.equal(a[documentArrayParent].errors['jsconf.ar.0.work'].name, 'ValidatorError');
  });

  it('objects can be passed to #set', function() {
    const a = new Subdocument();
    a.set({ test: 'paradiddle', work: 'good flam' });
    assert.equal(a.test, 'paradiddle');
    assert.equal(a.work, 'good flam');
  });

  it('Subdocuments can be passed to #set', function() {
    const a = new Subdocument();
    a.set({ test: 'paradiddle', work: 'good flam' });
    assert.equal(a.test, 'paradiddle');
    assert.equal(a.work, 'good flam');
    const b = new Subdocument();
    b.set(a);
    assert.equal(b.test, 'paradiddle');
    assert.equal(b.work, 'good flam');
  });

  it('Subdocument#remove (gh-531)', async function() {
    const Movie = db.model('Movie', MovieSchema);

    const super8 = new Movie({ title: 'Super 8' });

    const id1 = '4e3d5fc7da5d7eb635063c96';
    const id2 = '4e3d5fc7da5d7eb635063c97';
    const id3 = '4e3d5fc7da5d7eb635063c98';
    const id4 = '4e3d5fc7da5d7eb635063c99';

    super8.ratings.push({ stars: 9, _id: id1 });
    super8.ratings.push({ stars: 8, _id: id2 });
    super8.ratings.push({ stars: 7, _id: id3 });
    super8.ratings.push({ stars: 6, _id: id4 });

    await super8.save();

    assert.equal(super8.title, 'Super 8');
    assert.equal(super8.ratings.id(id1).stars.valueOf(), 9);
    assert.equal(super8.ratings.id(id2).stars.valueOf(), 8);
    assert.equal(super8.ratings.id(id3).stars.valueOf(), 7);
    assert.equal(super8.ratings.id(id4).stars.valueOf(), 6);

    super8.ratings.id(id1).stars = 5;
    super8.ratings.id(id2).deleteOne();
    super8.ratings.id(id3).stars = 4;
    super8.ratings.id(id4).stars = 3;

    await super8.save();

    const movie = await Movie.findById(super8._id);

    assert.equal(movie.title, 'Super 8');
    assert.equal(movie.ratings.length, 3);
    assert.equal(movie.ratings.id(id1).stars.valueOf(), 5);
    assert.equal(movie.ratings.id(id3).stars.valueOf(), 4);
    assert.equal(movie.ratings.id(id4).stars.valueOf(), 3);

    movie.ratings.id(id1).stars = 2;
    movie.ratings.id(id3).deleteOne();
    movie.ratings.id(id4).stars = 1;

    await movie.save();


    const modifiedMovie = await Movie.findById(super8._id);

    assert.equal(modifiedMovie.ratings.length, 2);
    assert.equal(modifiedMovie.ratings.id(id1).stars.valueOf(), 2);
    assert.equal(modifiedMovie.ratings.id(id4).stars.valueOf(), 1);

    // gh-531
    modifiedMovie.ratings[0].deleteOne();
    modifiedMovie.ratings[0].deleteOne();
    await modifiedMovie.save();

    const finalMovie = await Movie.findById(super8._id);

    assert.equal(finalMovie.ratings.length, 0);
  });

  describe('setting nested objects', function() {
    it('works (gh-1394)', async function() {
      const Movie = db.model('Movie', MovieSchema);

      const movie = await Movie.create({
        title: 'Life of Pi',
        ratings: [{
          description: {
            source: {
              url: 'http://www.imdb.com/title/tt0454876/',
              time: new Date()
            }
          }
        }]
      });

      const movie2 = await Movie.findById(movie);

      assert.ok(movie2.ratings[0].description.source.time instanceof Date);
      movie2.ratings[0].description.source = { url: 'http://www.lifeofpimovie.com/' };

      await movie2.save();

      const movie3 = await Movie.findById(movie2);

      assert.equal('http://www.lifeofpimovie.com/', movie3.ratings[0].description.source.url);

      // overwritten date
      assert.equal(undefined, movie3.ratings[0].description.source.time);

      const newDate = new Date;
      movie3.ratings[0].set('description.source.time', newDate, { merge: true });
      await movie3.save();


      const movie4 = await Movie.findById(movie3);

      assert.equal(String(newDate), movie4.ratings[0].description.source.time);
      // url not overwritten using merge
      assert.equal('http://www.lifeofpimovie.com/', movie4.ratings[0].description.source.url);
    });
  });
});
