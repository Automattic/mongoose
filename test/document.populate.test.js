
/**
 * Test dependencies.
 */

'use strict';

const start = require('./common');

const Document = require('../lib/document');
const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

/**
 * Setup.
 */

/**
 * Test Document constructor.
 */

function TestDocument() {
  Document.apply(this, arguments);
}

/**
 * Inherits from Document.
 */

Object.setPrototypeOf(TestDocument.prototype, Document.prototype);

/**
 * Set a dummy schema to simulate compilation.
 */

const em = new Schema({ title: String, body: String });
em.virtual('works').get(function() {
  return 'em virtual works';
});
const schema = new Schema({
  test: String,
  oids: [ObjectId],
  numbers: [Number],
  nested: {
    age: Number,
    cool: ObjectId,
    deep: { x: String },
    path: String,
    setr: String
  },
  nested2: {
    nested: String,
    yup: {
      nested: Boolean,
      yup: String,
      age: Number
    }
  },
  em: [em],
  date: Date
});
TestDocument.prototype.$__setSchema(schema);

/**
 * User schema.
 */

const UserSchema = new Schema({
  name: String,
  email: String,
  gender: { type: String, enum: ['male', 'female'], default: 'male' },
  age: { type: Number, default: 21 },
  blogposts: [{ type: ObjectId, ref: 'BlogPost' }]
});

/**
 * Comment subdocument schema.
 */

const CommentSchema = new Schema({
  asers: [{ type: ObjectId, ref: 'User' }],
  _creator: { type: ObjectId, ref: 'User' },
  content: String
});

/**
 * Blog post schema.
 */

const BlogPostSchema = new Schema({
  _creator: { type: ObjectId, ref: 'User' },
  title: String,
  comments: [CommentSchema],
  fans: [{ type: ObjectId, ref: 'User' }]
});

describe('document.populate', function() {
  let db, B, User;
  let user1, user2, post, _id;

  before(function() {
    db = start();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  beforeEach(async function() {
    B = db.model('BlogPost', BlogPostSchema);
    User = db.model('User', UserSchema);

    _id = new mongoose.Types.ObjectId();

    const [u1, u2] = await User.create([
      {
        name: 'Phoenix',
        email: 'phx@az.com',
        blogposts: [_id]
      },
      {
        name: 'Newark',
        email: 'ewr@nj.com',
        blogposts: [_id]
      }
    ]);
    user1 = u1;
    user2 = u2;

    post = await B.create({
      title: 'the how and why',
      _creator: user1,
      fans: [user1, user2],
      comments: [{ _creator: user2, content: 'user2' }, { _creator: user1, content: 'user1' }]
    });
  });

  after(async function() {
    await db.close();
  });

  describe('populating two paths', function() {
    it('with space delmited string works', async function() {
      const p = await B.findById(post);
      const creator_id = p._creator;
      const alt_id = p.fans[1];

      await p.populate('_creator fans');

      assert.ok(p._creator);
      assert.equal(String(p._creator._id), String(creator_id));
      assert.equal(String(p.fans[0]._id), String(creator_id));
      assert.equal(String(p.fans[1]._id), String(alt_id));
    });
  });

  it('works with await', async function() {
    const p = await B.findById(post);
    const creator_id = p._creator;
    const alt_id = p.fans[1];

    await p.populate('_creator');

    assert.ok(post._creator);
    assert.equal(String(p._creator._id), String(creator_id));
    assert.equal(String(p.fans[1]), String(alt_id));
  });

  it('populating using space delimited paths with options', async function() {
    const p = await B.findById(post);

    const param = {};
    param.select = '-email';
    param.options = { sort: 'name' };
    param.path = '_creator fans'; // 2 paths

    const creator_id = post._creator._id;
    const alt_id = post.fans[1]._id;

    await p.populate(param);

    assert.equal(p.fans.length, 2);
    assert.equal(String(p._creator._id), String(creator_id));
    assert.equal(String(p.fans[1]._id), String(creator_id));
    assert.equal(String(p.fans[0]._id), String(alt_id));
    assert.ok(!p.fans[0].email);
    assert.ok(!p.fans[1].email);
    assert.ok(!p.fans[0].isInit('email'));
    assert.ok(!p.fans[0].isInit(['email']));
    assert.ok(!p.fans[1].isInit('email'));
  });

  it('using multiple populate calls', async function() {
    const p = await B.findById(post);

    const creator_id = post._creator._id;
    const alt_id = post.fans[1]._id;

    const param = {};
    param.select = '-email';
    param.options = { sort: 'name' };
    param.path = '_creator';
    post.populate(param);
    param.path = 'fans';

    await p.populate(param);

    assert.equal(p.fans.length, 2);
    assert.equal(String(p._creator._id), String(creator_id));
    assert.equal(String(p.fans[1]._id), String(creator_id));
    assert.equal(String(p.fans[0]._id), String(alt_id));
    assert.ok(!p.fans[0].email);
    assert.ok(!p.fans[1].email);
    assert.ok(!p.fans[0].isInit('email'));
    assert.ok(!p.fans[1].isInit('email'));
  });

  it('with custom model selection', async function() {
    const p = await B.findById(post);

    const param = {};
    param.select = '-email';
    param.options = { sort: 'name' };
    param.path = '_creator fans';
    param.model = 'User';

    const creator_id = post._creator._id;
    const alt_id = post.fans[1]._id;

    await p.populate(param);

    assert.equal(p.fans.length, 2);
    assert.equal(String(p._creator._id), String(creator_id));
    assert.equal(String(p.fans[1]._id), String(creator_id));
    assert.equal(String(p.fans[0]._id), String(alt_id));
    assert.ok(!p.fans[0].email);
    assert.ok(!p.fans[1].email);
    assert.ok(!p.fans[0].isInit('email'));
    assert.ok(!p.fans[1].isInit('email'));
  });

  it('one path, model selection as second argument', async function() {
    const b = await B.findById(post);

    const creator_id = b._creator;

    await b.populate('_creator', '-email');

    assert.equal(String(b._creator._id), String(creator_id));

    assert.ok(b.populated('_creator'));
    assert.ok(!b._creator.email);
    assert.ok(b._creator.age);
  });

  it('multiple paths, model selection as second argument', async function() {
    const b = await B.findById(post);

    await b.populate('_creator fans', '-email');

    assert.ok(b.populated('_creator'));
    assert.ok(!b._creator.email);
    assert.ok(b._creator.age);

    assert.ok(b.populated('fans'));
    assert.ok(!b.fans[0].email);
    assert.ok(b.fans[0].age);
  });

  it('multiple paths, mixed argument types', async function() {
    const b = await B.findById(post);

    await b.populate([{ path: '_creator', select: '-email' }, 'fans']);

    assert.ok(b.populated('_creator'));
    assert.ok(!b._creator.email);
    assert.ok(b._creator.age);

    assert.ok(b.populated('fans'));
    assert.ok(b.fans[0].email);
    assert.ok(b.fans[0].age);
  });

  it('multiple paths, multiple options', async function() {
    const b = await B.findById(post);

    await b.populate([
      { path: '_creator', select: '-email' },
      { path: 'fans', sort: 'name', select: { age: 0 } }
    ]);

    assert.ok(b.populated('_creator'));
    assert.ok(!b._creator.email);
    assert.ok(b._creator.age);

    assert.ok(b.populated('fans'));
    assert.ok(!b.fans[0].age);
    assert.ok(b.fans[0].email);
  });

  it('a property not in schema', async function() {
    const p = await B.findById(post);

    const err = await p.populate('idontexist').then(() => null, err => err);
    assert.ok(err);
  });

  it('of empty array', async function() {
    const p = await B.findById(post);
    p.fans = [];
    await p.populate('fans');
  });

  it('of array of null/undefined', async function() {
    const p = await B.findById(post);

    p.fans = [null, undefined];
    await p.populate('fans');
  });

  it('of null property', async function() {
    const p = await B.findById(post);
    p._creator = null;
    await p.populate('_creator');
  });

  it('String _ids', async function() {
    const UserSchema = new Schema({
      _id: String,
      name: String
    });

    const NoteSchema = new Schema({
      author: { type: String, ref: 'User' },
      body: String
    });

    db.deleteModel(/User/);
    const User = db.model('User', UserSchema);
    const Note = db.model('Test', NoteSchema);

    const alice = new User({ _id: 'alice', name: 'Alice In Wonderland' });

    await alice.save();

    const note = new Note({ author: 'alice', body: 'Buy Milk' });
    await note.populate('author');

    assert.ok(note.author);
    assert.equal(note.author._id, 'alice');
    assert.equal(note.author.name, 'Alice In Wonderland');
  });

  it('Buffer _ids', async function() {
    const UserSchema = new Schema({
      _id: Buffer,
      name: String
    });

    const NoteSchema = new Schema({
      author: { type: Buffer, ref: 'User' },
      body: String
    });

    db.deleteModel(/User/);
    const User = db.model('User', UserSchema);
    const Note = db.model('Test', NoteSchema);

    const alice = new User({ _id: new mongoose.Types.Buffer('YWxpY2U=', 'base64'), name: 'Alice' });
    await alice.save();

    let note = new Note({ author: 'alice', body: 'Buy Milk' });
    await note.save();

    note = await Note.findById(note);
    assert.equal(note.author, 'alice');
    await note.populate('author');

    assert.equal(note.body, 'Buy Milk');
    assert.ok(note.author);
    assert.equal(note.author.name, 'Alice');
  });

  it('Number _ids', async function() {
    const UserSchema = new Schema({
      _id: Number,
      name: String
    });

    const NoteSchema = new Schema({
      author: { type: Number, ref: 'User' },
      body: String
    });

    db.deleteModel(/User/);
    const User = db.model('User', UserSchema);
    const Note = db.model('Test', NoteSchema);

    const alice = new User({ _id: 2359, name: 'Alice' });
    await alice.save();

    const note = new Note({ author: 2359, body: 'Buy Milk' });
    await note.populate('author');

    assert.ok(note.author);
    assert.equal(note.author._id, 2359);
    assert.equal('Alice', note.author.name);
  });

  describe('sub-level properties', function() {
    it('with string arg', async function() {
      const p = await B.findById(post);

      const id0 = p.comments[0]._creator;
      const id1 = p.comments[1]._creator;

      await p.populate('comments._creator');

      assert.equal(p.comments.length, 2);
      assert.equal(p.comments[0]._creator.id, id0);
      assert.equal(p.comments[1]._creator.id, id1);
    });
  });

  describe('of new document', function() {
    it('should save just the populated _id (gh-1442)', async function() {
      const b = new B({ _creator: user1 });

      await b.populate('_creator');
      assert.equal(b._creator.name, 'Phoenix');
      await b.save();

      const _b = await B.collection.findOne({ _id: b._id });
      assert.equal(_b._creator.toString(), String(user1._id));

    });
  });

  it('depopulates when setting `_id` (gh-3308)', function() {
    const Person = db.model('Person', {
      name: String
    });

    const Band = db.model('Band', {
      guitarist: { type: Schema.Types.ObjectId, ref: 'Person' }
    });

    const slash = new Person({ name: 'Slash' });
    const gnr = new Band({ guitarist: slash._id });

    gnr.guitarist = slash;
    assert.equal(gnr.guitarist.name, 'Slash');
    assert.ok(gnr.populated('guitarist'));

    const buckethead = new Person({ name: 'Buckethead' });
    gnr.guitarist = buckethead._id;
    assert.ok(!gnr.populated('guitarist'));
  });

  describe('gh-2214', function() {
    it('should return a real document array when populating', async function() {
      const Car = db.model('Car', {
        color: String,
        model: String
      });

      const Person = db.model('Person', {
        name: String,
        cars: [
          {
            type: Schema.Types.ObjectId,
            ref: 'Car'
          }
        ]
      });

      const joe = new Person({
        name: 'Joe'
      });
      let car = new Car({
        model: 'BMW',
        color: 'red'
      });
      joe.cars.push(car);

      await joe.save();
      await car.save();

      const joe2 = await Person.findById(joe.id);
      await joe2.populate('cars');

      car = new Car({
        model: 'BMW',
        color: 'black'
      });
      joe2.cars.push(car);
      assert.ok(joe2.isModified('cars'));
    });
  });

  describe('gh-7889', function() {
    it('should save item added to array after populating the array', function() {
      const Car = db.model('Car', {
        model: Number
      });

      const Person = db.model('Person', {
        cars: [{ type: Schema.Types.ObjectId, ref: 'Car' }]
      });

      let person;

      return Car.create({ model: 0 }).then(car => {
        return Person.create({ cars: [car._id] });
      }).then(() => {
        return Person.findOne({});
      }).then(p => {
        person = p;
        return person.populate('cars');
      }).then(() => {
        return Car.create({ model: 1 });
      }).then(car => {
        person.cars.push(car);
        return person.populate('cars');
      }).then(() => {
        return Car.create({ model: 2 });
      }).then(car => {
        person.cars.push(car);
        return person.save();
      }).then(() => {
        return Person.findOne({});
      }).then(person => {
        assert.equal(person.cars.length, 3);
      });
    });
  });

  describe('depopulate', function() {
    it('can depopulate specific path (gh-2509)', async function() {
      const Person = db.model('Person', {
        name: String
      });

      const Band = db.model('Band', {
        name: String,
        members: [{ type: Schema.Types.ObjectId, ref: 'Person' }],
        lead: { type: Schema.Types.ObjectId, ref: 'Person' }
      });

      const docs = await Person.create([{ name: 'Axl Rose' }, { name: 'Slash' }]);

      const band = await Band.create({
        name: 'Guns N\' Roses',
        members: [docs[0]._id, docs[1]],
        lead: docs[0]._id
      });

      await band.populate('members');

      assert.equal(band.members[0].name, 'Axl Rose');
      band.depopulate('members');
      assert.ok(!band.members[0].name);
      assert.equal(band.members[0].toString(), docs[0]._id.toString());
      assert.equal(band.members[1].toString(), docs[1]._id.toString());
      assert.ok(!band.populated('members'));
      assert.ok(!band.populated('lead'));
      await band.populate('lead');

      assert.equal(band.lead.name, 'Axl Rose');
      band.depopulate('lead');
      assert.ok(!band.lead.name);
      assert.equal(band.lead.toString(), docs[0]._id.toString());
    });

    it('depopulates all (gh-6073)', async function() {
      const Person = db.model('Person', {
        name: String
      });

      const Band = db.model('Band', {
        name: String,
        members: [{ type: Schema.Types.ObjectId, ref: 'Person' }],
        lead: { type: Schema.Types.ObjectId, ref: 'Person' }
      });

      const people = [{ name: 'Axl Rose' }, { name: 'Slash' }];
      const docs = await Person.create(people);

      const band = await Band.create({
        name: 'Guns N\' Roses',
        members: [docs[0]._id, docs[1]],
        lead: docs[0]._id
      });

      await band.populate('members lead');

      assert.ok(band.populated('members'));
      assert.ok(band.populated('lead'));
      assert.equal(band.members[0].name, 'Axl Rose');
      band.depopulate();
      assert.ok(!band.populated('members'));
      assert.ok(!band.populated('lead'));
    });

    it('doesn\'t throw when called on a doc that is not populated (gh-6075)', async function() {
      const Person = db.model('Person', {
        name: String
      });

      const person = new Person({ name: 'Greg Dulli' });
      await person.save();

      await person.depopulate();
    });

    it('depopulates virtuals (gh-6075)', async function() {
      const otherSchema = new Schema({
        val: String,
        prop: String
      });

      const schema = new Schema({
        others: [String],
        single: String
      }, { toJSON: { virtuals: true } });

      schema.virtual('$others', {
        ref: 'Test',
        localField: 'others',
        foreignField: 'val'
      });

      schema.virtual('$single', {
        ref: 'Test',
        localField: 'single',
        foreignField: 'val',
        justOne: true
      });

      schema.virtual('$last', {
        ref: 'Test',
        localField: 'single',
        foreignField: 'val',
        justOne: true
      });

      const Other = db.model('Test', otherSchema);
      const Test = db.model('Test1', schema);

      const others = 'abc'.split('').map(c => {
        return new Other({
          val: `other${c}`,
          prop: `xyz${c}`
        });
      });

      const test = new Test({
        others: others.map(d => d.val),
        single: others[1].val
      });

      await Other.create(others);
      await test.save();
      await test.populate('$others $single');

      assert.strictEqual(test.$others.length, 3);
      assert.strictEqual(test.$single.prop, 'xyzb');
      test.depopulate();
      assert.equal(test.$others, null);
      assert.equal(test.$single, null);

      await test.populate('$last');

      assert.strictEqual(test.$last.prop, 'xyzb');
      test.depopulate('$last');
      assert.equal(test.$last, null);
    });

    it('depopulates field with empty array (gh-7740)', async function() {
      db.model(
        'Book',
        new mongoose.Schema({
          name: String,
          chapters: Number
        })
      );
      const Author = db.model(
        'Person',
        new mongoose.Schema({
          name: String,
          books: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Book' }], default: [] }
        })
      );

      const author = new Author({
        name: 'Fonger',
        books: []
      });
      await author.save();
      await author.populate('books');
      assert.ok(author.books);
      assert.strictEqual(author.books.length, 0);
      author.depopulate('books');
      assert.ok(author.books);
      assert.strictEqual(author.books.length, 0);

    });
  });

  it('does not allow you to call populate() on nested docs (gh-4552)', function() {
    const EmbeddedSchema = new Schema({
      reference: {
        type: mongoose.Schema.ObjectId,
        ref: 'Reference'
      }
    });

    const ModelSchema = new Schema({
      embedded: EmbeddedSchema
    });

    const Model = db.model('Test', ModelSchema);

    const m = new Model({});
    m.embedded = {};
    assert.throws(function() {
      m.embedded.populate('reference');
    }, /on nested docs/);
  });

  it('handles pulling from populated array (gh-3579)', async function() {
    const barSchema = new Schema({ name: String });

    const Bar = db.model('Test', barSchema);

    const fooSchema = new Schema({
      bars: [{
        type: Schema.Types.ObjectId,
        ref: 'Test'
      }]
    });

    const Foo = db.model('Test1', fooSchema);

    const docs = await Bar.create([{ name: 'bar1' }, { name: 'bar2' }]);

    const foo = new Foo({ bars: [docs[0], docs[1]] });
    foo.bars.pull(docs[0]._id);
    await foo.save();

    const foo2 = await Foo.findById(foo._id);

    assert.equal(foo2.bars.length, 1);
    assert.equal(foo2.bars[0].toString(), docs[1]._id.toString());
  });

  describe('#populated() with virtuals (gh-7440)', function() {
    let Team;

    beforeEach(function() {
      const teamSchema = mongoose.Schema({
        name: String,
        captain: String
      });
      Team = db.model('Test', teamSchema);
    });

    it('works with justOne: false', async function() {
      const playerSchema = mongoose.Schema({
        _id: String,
        name: String
      });
      playerSchema.virtual('teams', {
        ref: 'Test',
        localField: '_id',
        foreignField: 'captain'
      });
      const Player = db.model('Person', playerSchema);

      const player = await Player.create({ name: 'Derek Jeter', _id: 'test1' });
      await Team.create({ name: 'Yankees', captain: 'test1' });

      await player.populate('teams');
      assert.deepEqual(player.populated('teams'), ['test1']);

    });

    it('works with justOne: true', async function() {
      const playerSchema = mongoose.Schema({
        _id: String,
        name: String
      });
      playerSchema.virtual('team', {
        ref: 'Test',
        localField: '_id',
        foreignField: 'captain',
        justOne: true
      });
      const Player = db.model('Person', playerSchema);

      const player = await Player.create({ name: 'Derek Jeter', _id: 'test1' });
      await Team.create({ name: 'Yankees', captain: 'test1' });

      await player.populate('team');
      assert.deepEqual(player.populated('team'), 'test1');

    });
  });

  describe('#populated() with getters on embedded schema (gh-7521)', function() {
    let Team;
    let Player;

    beforeEach(function() {
      const playerSchema = mongoose.Schema({
        _id: String
      });

      const teamSchema = mongoose.Schema({
        captain: {
          type: String,
          ref: 'Person',
          get: (v) => {
            if (!v || typeof v !== 'string') {
              return v;
            }

            return v.split(' ')[0];
          }
        },
        players: [new mongoose.Schema({
          player: {
            type: String,
            ref: 'Person',
            get: (v) => {
              if (!v || typeof v !== 'string') {
                return v;
              }

              return v.split(' ')[0];
            }
          }
        })]
      });

      Player = db.model('Person', playerSchema);
      Team = db.model('Test', teamSchema);
    });

    it('works with populate', async function() {
      await Player.create({ _id: 'John' });
      await Player.create({ _id: 'Foo' });
      const createdTeam = await Team.create({ captain: 'John Doe', players: [{ player: 'John Doe' }, { player: 'Foo Bar' }] });

      const team = await Team.findOne({ _id: createdTeam._id })
        .populate({ path: 'captain', options: { getters: true } })
        .populate({ path: 'players.player', options: { getters: true } });

      assert.ok(team.captain);
      assert.strictEqual(team.captain._id, 'John');
      assert.strictEqual(team.players.length, 2);
      assert.ok(team.players[0].player);
      assert.ok(team.players[1].player);
      assert.strictEqual(team.players[0].player._id, 'John');
      assert.strictEqual(team.players[1].player._id, 'Foo');

    });
  });

  it('populated() works with nested subdocs (gh-7685)', async function() {
    const schema = mongoose.Schema({ a: { type: String, default: 'TEST' } });
    const schema2 = mongoose.Schema({
      g: {
        type: mongoose.ObjectId,
        ref: 'Test1'
      }
    });
    const schema3 = mongoose.Schema({
      i: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Test2'
      }
    });

    const M = db.model('Test1', schema);
    const N = db.model('Test2', schema2);
    const O = db.model('Test3', schema3);

    const m = await M.create({ a: 'TEST' });
    const n = await N.create({ g: m._id });
    const o = await O.create({ i: n._id });

    const doc = await O.findOne({ _id: o._id }).populate('i').exec();
    const finalDoc = await doc.populate('i.g');

    assert.ok(finalDoc.populated('i.g'));
    assert.ok(finalDoc.i.populated('g'));
  });

  it('works with single strings (gh-11160)', async() => {
    const bookSchema = mongoose.Schema({
      title: String,
      authorId: { type: Schema.ObjectId, ref: 'Author' }
    });

    const authorSchema = mongoose.Schema({
      name: String,
      websiteId: { type: Schema.ObjectId, ref: 'Website' }
    });

    const websiteSchema = mongoose.Schema({
      url: String
    });

    const Book = db.model('Book', bookSchema);
    const Author = db.model('Author', authorSchema);
    const Website = db.model('Website', websiteSchema);


    const website = new Website({ url: 'http://www.clean-code.com' });
    const author = new Author({ name: 'Robert C. Martin', websiteId: website._id });
    const book = new Book({ title: 'Clean Code', authorId: author._id });
    await Promise.all([
      website.save(),
      author.save(),
      book.save()
    ]);

    const foundBook = await Book.findOne({ _id: book._id });
    await foundBook.populate({ path: 'authorId', populate: 'websiteId' });
    assert.ok(foundBook.populated('authorId'));
    assert.ok(foundBook.authorId.populated('websiteId'));
  });
});
