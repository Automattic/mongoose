'use strict';

const assert = require('assert');
const mongoose = require('../../');
const start = require('../common');

describe('defaults docs', function() {
  let db;
  const Schema = mongoose.Schema;

  before(function() {
    db = mongoose.createConnection(start.uri);
  });

  after(async function() {
    await db.close();
  });

  afterEach(function() {
    db.models = {};
  });

  /**
   * Your schemas can define default values for certain paths. If you create
   * a new document without that path set, the default will kick in.
   *
   * Note: Mongoose only applies a default if the value of the path is
   * strictly `undefined`.
   */
  it('Declaring defaults in your schema', async function() {
    const schema = new Schema({
      name: String,
      role: { type: String, default: 'guitarist' }
    });

    const Person = db.model('Person', schema);

    const axl = new Person({ name: 'Axl Rose', role: 'singer' });
    assert.equal(axl.role, 'singer');

    const slash = new Person({ name: 'Slash' });
    assert.equal(slash.role, 'guitarist');

    const izzy = new Person({ name: 'Izzy', role: undefined });
    assert.equal(izzy.role, 'guitarist');

    // Defaults do **not** run on `null`, `''`, or value other than `undefined`.
    const foo = new Person({ name: 'Bar', role: null });
    assert.strictEqual(foo.role, null);

    await Person.create(axl, slash);

    const docs = await Person.find({ role: 'guitarist' });

    assert.equal(docs.length, 1);
    assert.equal(docs[0].name, 'Slash');
  });

  /**
   * You can also set the `default` schema option to a function. Mongoose will
   * execute that function and use the return value as the default.
   */
  it('Default functions', function() {
    const schema = new Schema({
      title: String,
      date: {
        type: Date,
        // `Date.now()` returns the current unix timestamp as a number
        default: Date.now
      }
    });

    const BlogPost = db.model('BlogPost', schema);

    const post = new BlogPost({ title: '5 Best Arnold Schwarzenegger Movies' });

    // The post has a default Date set to now
    assert.ok(post.date.getTime() >= Date.now() - 1000);
    assert.ok(post.date.getTime() <= Date.now());
  });

  /**
   * Mongoose also applies defaults when you upsert a document.
   * Mongoose only applies defaults on upsert if a new document is
   * inserted, not if the upsert updated an existing document.
   *
   */
  it('The `setDefaultsOnInsert` option', async function() {
    const schema = new Schema({
      title: String,
      genre: { type: String, default: 'Action' }
    });

    const Movie = db.model('Movie', schema);
    // acquit:ignore:start
    await Movie.deleteMany({});
    // acquit:ignore:end

    const query = {};
    const update = { title: 'The Terminator' };
    const options = {
      // Return the document after updates are applied
      new: true,
      // Create a document if one isn't found.
      upsert: true
    };

    let doc = await Movie.findOneAndUpdate(query, update, options).lean();
    doc.genre; // 'Action', Mongoose set a default value.
    // acquit:ignore:start
    assert.equal(doc.title, 'The Terminator');
    assert.equal(doc.genre, 'Action');
    // acquit:ignore:end

    await Movie.deleteMany({});

    doc = await Movie.findOneAndUpdate(query, update, { new: true, upsert: true, setDefaultsOnInsert: false }).lean();
    doc.genre; // undefined, Mongoose did not set a default value
    // acquit:ignore:start
    assert.equal(doc.title, 'The Terminator');
    assert.equal(doc.genre, void 0);
    // acquit:ignore:end
  });

  /**
   * Unless it is running on a query with `setDefaultsOnInsert`, a default
   * function's `this` refers to the document.
   */
  it('Default functions and `this`', function() {
    const schema = new Schema({
      title: String,
      released: Boolean,
      releaseDate: {
        type: Date,
        default: function() {
          if (this.released) {
            return Date.now();
          }
          return null;
        }
      }
    });

    const Movie = db.model('Movie', schema);

    const movie1 = new Movie({ title: 'The Terminator', released: true });

    // The post has a default Date set to now
    assert.ok(movie1.releaseDate.getTime() >= Date.now() - 1000);
    assert.ok(movie1.releaseDate.getTime() <= Date.now());

    const movie2 = new Movie({ title: 'The Legend of Conan', released: false });

    // Since `released` is false, the default function will return null
    assert.strictEqual(movie2.releaseDate, null);
  });
});
