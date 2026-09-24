'use strict';

const start = require('./common');
const assert = require('assert');
const mongoose = start.mongoose;
const Schema = mongoose.Schema;

const selections = [
  { name: 'ordinary', options: {}, pre: 1, post: 1 },
  { name: 'disabled', options: { middleware: false }, pre: 0, post: 0 },
  { name: 'pre disabled', options: { middleware: { pre: false } }, pre: 0, post: 1 },
  { name: 'post disabled', options: { middleware: { post: false } }, pre: 1, post: 0 }
];

describe('middleware hydration', function() {
  let db;

  before(function() { db = start(); });
  after(async function() { await db.close(); });
  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  describe('populated virtual hydration', function() {
    const selections = [
      { name: 'default middleware', options: {}, pre: 1, post: 1 },
      { name: 'middleware: false', options: { middleware: false }, pre: 0, post: 0 },
      { name: 'pre: false', options: { middleware: { pre: false } }, pre: 0, post: 1 },
      { name: 'post: false', options: { middleware: { post: false } }, pre: 1, post: 0 }
    ];

    for (const selection of selections) {
      it(`hydrates single and array virtuals with ${selection.name}`, function() {
        const { Post, Author, calls, relatedCalls, createRaw } = createTestContext();

        const doc = Post.hydrate(createRaw(), null, { hydratedPopulatedDocs: true, ...selection.options });

        assert.ok(doc.author instanceof Author);
        assert.ok(doc.authors[0] instanceof Author);
        assert.strictEqual(doc.author.name, 'Ann');
        assert.strictEqual(doc.authors[0].name, 'Ann');
        assert.ok(doc.author._id.equals(doc.authorId));
        assert.deepStrictEqual(doc.populated('authors'), [doc.authorId]);
        assert.strictEqual(doc.isNew, false);
        assert.strictEqual(doc.isModified(), false);
        assert.deepStrictEqual(calls, { pre: selection.pre, post: selection.post });
        assert.deepStrictEqual(relatedCalls, { pre: 2 * selection.pre, post: 2 * selection.post });
      });
    }

    it('retains raw virtuals when related hydration is not requested', function() {
      const { Post, calls, createRaw } = createTestContext();

      const doc = Post.hydrate(createRaw(), null, { middleware: false });

      assert.strictEqual(doc.author.name, 'Ann');
      assert.strictEqual(doc.authors[0].name, 'Ann');
      assert.strictEqual(Object.getPrototypeOf(doc.author), Object.prototype);
      assert.strictEqual(Object.getPrototypeOf(doc.authors[0]), Object.prototype);
      assert.strictEqual(doc.populated('author'), undefined);
      assert.strictEqual(doc.populated('authors'), undefined);
      assert.deepStrictEqual(calls, { pre: 0, post: 0 });
    });

    it('preserves virtual population after a suppressed findOne', async function() {
      const { Post, Author, calls, createRaw } = createTestContext();
      const raw = createRaw();

      await Author.collection.insertOne(raw.author);
      delete raw.author;
      delete raw.authors;
      await Post.collection.insertOne(raw);

      const doc = await Post.findOne({}, null, { middleware: false }).populate(['author', 'authors']);

      assert.ok(doc.author instanceof Author);
      assert.ok(doc.authors[0] instanceof Author);
      assert.strictEqual(doc.author.name, 'Ann');
      assert.strictEqual(doc.authors[0].name, 'Ann');
      assert.deepStrictEqual(calls, { pre: 0, post: 0 });
    });

    function createTestContext() {
      const calls = { pre: 0, post: 0 };
      const relatedCalls = { pre: 0, post: 0 };
      const authorSchema = new Schema({ name: String });
      authorSchema.pre('init', function() { relatedCalls.pre++; });
      authorSchema.post('init', function() { relatedCalls.post++; });
      const Author = db.model('Author', authorSchema);
      const schema = new Schema({ title: String, authorId: Schema.Types.ObjectId });
      schema.virtual('author', { ref: 'Author', localField: 'authorId', foreignField: '_id', justOne: true });
      schema.virtual('authors', { ref: 'Author', localField: 'authorId', foreignField: '_id' });
      schema.pre('init', function() { calls.pre++; });
      schema.post('init', function() { calls.post++; });
      const Post = db.model('Post', schema);
      return { Post, Author, calls, relatedCalls, createRaw };

      function createRaw() {
        const author = { _id: new mongoose.Types.ObjectId(), name: 'Ann' };
        return {
          _id: new mongoose.Types.ObjectId(),
          title: 'Hydration',
          authorId: author._id,
          author,
          authors: [{ ...author }]
        };
      }
    }
  });

  describe('find result hydration', function() {
    const selections = [
      { name: 'default middleware', options: {}, pre: 1, post: 1 },
      { name: 'middleware: false', options: { middleware: false }, pre: 0, post: 0 },
      { name: 'pre: false', options: { middleware: { pre: false } }, pre: 0, post: 1 },
      { name: 'post: false', options: { middleware: { post: false } }, pre: 1, post: 0 }
    ];

    for (const mode of ['find', 'populated find', 'deferred populated find']) {
      for (const selection of mode === 'find' ? selections : selections.slice(2, 3)) {
        it(`${mode} respects ${selection.name} and preserves built-in initialization`, async function() {

          const { User, Team, calls } = await createTestContext();
          const docs = await readDocuments(User, mode, selection.options);

          assert.deepStrictEqual(docs.map(doc => doc.name), ['Alice', 'Bob', 'Cara']);
          for (const doc of docs) {
            assert.ok(doc instanceof User);
            assert.strictEqual(doc.tier, 'basic');
            assert.strictEqual(doc.isNew, false);
            assert.strictEqual(doc.isModified(), false);
            const update = doc.updateOne({ name: doc.name }, { middleware: false });
            await update;
            assert.strictEqual(update.getFilter().tenantId, 'north');
            if (mode === 'populated find') {
              assert.ok(doc.team instanceof Team);
              assert.strictEqual(doc.team.name, 'Core');
            } else {
              assert.ok(doc.team instanceof mongoose.Types.ObjectId);
            }
          }
          assert.deepStrictEqual(calls, { pre: docs.length * selection.pre, post: docs.length * selection.post });

        });
      }
    }

    for (const defaults of [false, null, undefined]) {
      it(`preserves defaults: ${defaults} and the session when init hooks are skipped`, async function() {

        const { User, calls } = await createTestContext();
        const session = await db.startSession();
        try {
          const docs = await User.find().setOptions({ middleware: false, defaults, session });
          assert.strictEqual(docs.length, 3);
          for (const doc of docs) {
            assert.strictEqual(doc.tier, defaults === false ? undefined : 'basic');
            assert.strictEqual(doc.$session(), session);
          }
          assert.deepStrictEqual(calls, { pre: 0, post: 0 });
        } finally {
          await session.endSession();
        }
      });
    }

    it('preserves lean results with population', async function() {

      const { User, calls } = await createTestContext();
      const query = User.find().sort('name').lean().setOptions({ middleware: false });
      query.populate('team');
      const docs = await query;

      assert.deepStrictEqual(docs.map(doc => doc.name), ['Alice', 'Bob', 'Cara']);
      for (const doc of docs) {
        assert.strictEqual(Object.getPrototypeOf(doc), Object.prototype);
        assert.strictEqual(doc.tier, undefined);
        assert.strictEqual(Object.getPrototypeOf(doc.team), Object.prototype);
        assert.strictEqual(doc.team.name, 'Core');
      }
      assert.deepStrictEqual(calls, { pre: 0, post: 0 });
    });

    async function readDocuments(User, mode, options) {
      const query = User.find().sort('name');
      query.setOptions(options);
      if (mode === 'populated find' || mode === 'deferred populated find') {
        query.populate('team');
      }
      if (mode === 'deferred populated find') {
        query.setOptions({ _deferPopulate: true });
      }
      return query;
    }

    async function createTestContext() {
      const calls = { pre: 0, post: 0 };
      const Team = db.model('Team', new Schema({ name: String }));
      const schema = new Schema({
        name: String,
        tenantId: String,
        tier: { type: String, default: 'basic' },
        team: { type: Schema.Types.ObjectId, ref: 'Team' }
      }, { shardKey: { tenantId: 1 } });
      schema.pre('init', function() { calls.pre++; });
      schema.post('init', function() { calls.post++; });
      const User = db.model('User', schema);
      const team = new mongoose.Types.ObjectId();
      await Team.collection.insertOne({ _id: team, name: 'Core' });
      await User.collection.insertMany(['Alice', 'Bob', 'Cara'].map(name => ({ name, tenantId: 'north', team })));
      return { User, Team, calls };
    }
  });

  describe('population clone middleware', function() {
    for (const [entry, middleware, expected] of [
      ['query', false, { pre: 0, post: 0 }],
      ['query', { pre: false }, { pre: 0, post: 3 }],
      ['model', { post: false }, { pre: 3, post: 0 }]
    ]) {
      it(`retains middleware selection when ${entry} population clones documents`, async function() {
        const { Author, authorId, calls, populate } = await createTestContext({ entry });

        const articles = await populate({ middleware });

        assert.deepStrictEqual(calls, expected);
        assert.notStrictEqual(articles[0].author, articles[1].author);
        for (const article of articles) {
          assert.ok(article.author instanceof Author);
          assert.strictEqual(article.author.name, 'Ann');
          assert.strictEqual(article.author.isNew, false);
          assert.deepStrictEqual(article.populated('author'), authorId);
        }
      });
    }

    it('preserves lean clones with hooks disabled', async function() {
      const { Author, calls, populate } = await createTestContext({ entry: 'query' });

      const articles = await populate({ lean: true, middleware: false });

      assert.deepStrictEqual(calls, { pre: 0, post: 0 });
      assert.ok(!(articles[0].author instanceof Author));
      assert.notStrictEqual(articles[0].author, articles[1].author);
      assert.strictEqual(articles[0].author.name, 'Ann');
      assert.deepStrictEqual(articles[0].author, articles[1].author);
    });

    async function createTestContext({ entry }) {
      const calls = { pre: 0, post: 0 };
      const schema = new Schema({ name: String });
      schema.pre('init', function() { ++calls.pre; });
      schema.post('init', function() { ++calls.post; });
      const Author = db.model('Author', schema);
      const Article = db.model('Article', new Schema({ title: String, author: { type: Schema.Types.ObjectId, ref: 'Author' } }));
      const authorId = new mongoose.Types.ObjectId();
      await Author.collection.insertOne({ _id: authorId, name: 'Ann' });
      await Article.collection.insertMany([{ title: 'First', author: authorId }, { title: 'Second', author: authorId }]);
      return { Author, authorId, calls, populate };

      async function populate(options) {
        const query = Article.find().sort({ title: 1 });
        const populateOptions = { path: 'author', clone: true, options };
        return entry === 'query' ? query.populate(populateOptions) : Article.populate(await query, populateOptions);
      }
    }
  });

  describe('default child hydration', function() {
    for (const [middleware, expected] of [[{ pre: false }, { pre: 0, post: 4 }], [{ post: false }, { pre: 4, post: 0 }]]) {
      it(`forwards ${JSON.stringify(middleware)} through literal, function, and dotted defaults`, function() {
        const { User, calls } = createTestContext();

        const doc = User.hydrate({}, null, { middleware });

        assert.deepStrictEqual(calls, expected);
        for (const path of ['children', 'otherChildren', 'profile.children', 'profile.otherChildren']) {
          const child = doc.get(path)[0];
          assert.strictEqual(child.name, 'Ann');
          assert.strictEqual(child.ownerDocument(), doc);
          assert.strictEqual(child.$isDefault('name'), false);
          assert.deepStrictEqual(child.modifiedPaths(), []);
          assert.strictEqual(doc.$isDefault(path), true);
        }
        assert.strictEqual(doc.isNew, false);
      });
    }

    function createTestContext() {
      const calls = { pre: 0, post: 0 };
      const child = new Schema({ name: String });
      child.pre('init', function() { ++calls.pre; });
      child.post('init', function() { ++calls.post; });
      const schema = new Schema({
        children: { type: [child], default: [{ name: 'Ann' }] },
        otherChildren: { type: [child], default: () => [{ name: 'Ann' }] },
        'profile.children': { type: [child], default: [{ name: 'Ann' }] },
        'profile.otherChildren': { type: [child], default: () => [{ name: 'Ann' }] }
      });
      return { User: db.model('User', schema), calls };
    }
  });

  describe('defaults inside hydrated children', function() {
    const cases = [
      ['default array', ['children', 'children.0']],
      ['stored array', ['children', 'children.0', 'children.0.toys', 'children.0.toys.0']],
      ['single nested', ['child', 'child.toys', 'child.toys.0']],
      ['default single nested', ['child', 'child.toys', 'child.toys.0']]
    ];
    for (const [container, modifiedPaths] of cases) {
      it(`${container} forwards selection to default grandchildren`, function() {
        const { User, calls, raw } = createTestContext({ container });
        const doc = User.hydrate(raw, null, { middleware: { pre: false } });

        const child = container.includes('single nested') ? doc.child : doc.children[0];
        assert.strictEqual(child.toys[0].name, 'ball');
        assert.strictEqual(child.toys[0].ownerDocument(), doc);
        assert.strictEqual(child.$isDefault('toys'), true);
        assert.deepStrictEqual(doc.modifiedPaths(), modifiedPaths);
        assert.deepStrictEqual(calls, { pre: 0, post: 1 });
      });
    }

    function createTestContext({ container }) {
      const calls = { pre: 0, post: 0 };
      const toy = new Schema({ name: String });
      toy.pre('init', function() { calls.pre++; });
      toy.post('init', function() { calls.post++; });
      const child = new Schema({ toys: { type: [toy], default: [{ name: 'ball' }] } });
      const schema = new Schema(container.includes('single nested') ? {
        child: { type: child, default: container === 'default single nested' ? {} : undefined }
      } : {
        children: { type: [child], default: container === 'default array' ? [{}] : undefined }
      });
      const raw = container === 'single nested' ? { child: {} } : container === 'stored array' ? { children: [{}] } : {};
      return { User: db.model('User', schema), calls, raw };
    }
  });

  describe('hydration through ordinary refs and nested arrays', function() {
    for (const populated of [false, true]) {
      const selection = populated ? selections[2] : selections[3];
      it(`preserves selection with populated refs ${populated}`, function() {
        const { Article, Author, raw, calls } = createTestContext({ populated });

        const article = Article.hydrate(raw, null, { hydratedPopulatedDocs: populated, ...selection.options });

        assert.deepStrictEqual(calls.article, { pre: selection.pre, post: selection.post });
        assert.deepStrictEqual(calls.author, { pre: populated ? selection.pre * 2 : 0, post: populated ? selection.post * 2 : 0 });
        assert.deepStrictEqual(calls.child, { pre: selection.pre, post: selection.post });
        assert.strictEqual(article.title, 'Middleware');
        assert.strictEqual(article.isNew, false);
        assert.strictEqual(article.isModified(), false);
        assert.strictEqual(article.groups[0][0].name, 'Ann');
        assert.strictEqual(article.groups[0][0].ownerDocument(), article);
        assert.strictEqual(article.groups[0][0].isNew, false);
        if (populated) {
          assert.ok(article.author instanceof Author);
          assert.ok(article.authors[0] instanceof Author);
          assert.strictEqual(article.author.name, 'Sam');
          assert.strictEqual(article.authors[0].name, 'Lee');
          assert.deepStrictEqual(article.populated('author'), raw.author._id);
          assert.deepStrictEqual(article.populated('authors'), [raw.authors[0]._id]);
          assert.strictEqual(article.author.isNew, false);
          assert.strictEqual(article.author.isModified(), false);
        }
      });
    }

    function createTestContext({ populated }) {
      const calls = { article: { pre: 0, post: 0 }, author: { pre: 0, post: 0 }, child: { pre: 0, post: 0 } };
      const authorSchema = new Schema({ name: String });
      const childSchema = new Schema({ name: String });
      const articleSchema = new Schema({
        title: String,
        author: { type: Schema.Types.ObjectId, ref: 'Author' },
        authors: [{ type: Schema.Types.ObjectId, ref: 'Author' }],
        groups: [[childSchema]]
      });
      for (const [name, schema] of [['article', articleSchema], ['author', authorSchema], ['child', childSchema]]) {
        schema.pre('init', function() { ++calls[name].pre; });
        schema.post('init', function() { ++calls[name].post; });
      }
      const Author = db.model('Author', authorSchema);
      const Article = db.model('Article', articleSchema);
      const raw = { _id: new mongoose.Types.ObjectId(), title: 'Middleware', groups: [[{ name: 'Ann' }]] };
      if (populated) {
        raw.author = { _id: new mongoose.Types.ObjectId(), name: 'Sam' };
        raw.authors = [{ _id: new mongoose.Types.ObjectId(), name: 'Lee' }];
      }
      return { Article, Author, raw, calls };
    }
  });
});
