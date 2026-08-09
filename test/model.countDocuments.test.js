'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('model: countDocuments:', function() {
  let db;

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => require('./util').clearTestData(db));
  afterEach(() => require('./util').stopRemainingOps(db));

  it('counts documents matching the filter', async function() {
    const Test = db.model('Test', new Schema({ username: String, pwd: String }));
    await Test.deleteMany({});
    await Test.create([
      { username: 'val', pwd: 'my secret' },
      { username: 'not val', pwd: 'other secret' }
    ]);

    assert.equal(await Test.countDocuments({ username: 'val' }), 1);
    assert.equal(await Test.countDocuments({}), 2);
  });

  it('applies sanitizeFilter (gh-15720)', async function() {
    const Test = db.model('Test', new Schema({ username: String, pwd: String }));
    await Test.create({ username: 'val', pwd: 'my secret' });

    let q = Test.countDocuments({ username: 'val', pwd: 'my secret' }).
      setOptions({ sanitizeFilter: true });
    assert.equal(await q, 1);
    assert.deepEqual(q._conditions, { username: 'val', pwd: 'my secret' });

    // Operator injection gets wrapped in `$eq`, so casting the object against
    // the `pwd` string path fails rather than matching every document.
    q = Test.countDocuments({ username: 'val', pwd: { $ne: null } }).
      setOptions({ sanitizeFilter: true });
    const err = await q.then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.name, 'CastError');

    q = Test.countDocuments({ username: 'val', pwd: mongoose.trusted({ $ne: null }) }).
      setOptions({ sanitizeFilter: true });
    assert.equal(await q, 1);
    assert.deepEqual(q._conditions, { username: 'val', pwd: { $ne: null } });
  });

  it('sanitizeFilter rejects $where (gh-15720)', async function() {
    const Test = db.model('Test', new Schema({ username: String }));

    const err = await Test.countDocuments({ $where: 'this.username === "val"' }).
      setOptions({ sanitizeFilter: true }).
      then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.message, '$where is not allowed with sanitizeFilter');
  });

  it('sanitizeFilter errors reach the callback (gh-15720)', function(done) {
    const Test = db.model('Test', new Schema({ username: String }));

    Test.countDocuments({ $where: 'this.username === "val"' }).
      setOptions({ sanitizeFilter: true }).
      exec(function(err) {
        assert.ok(err);
        assert.equal(err.message, '$where is not allowed with sanitizeFilter');
        done();
      });
  });

  it('applies sanitizeFilter to deprecated count() (gh-15720)', async function() {
    const Test = db.model('Test', new Schema({ username: String, pwd: String }));
    await Test.create({ username: 'val', pwd: 'my secret' });

    const err = await Test.count({ pwd: { $ne: null } }).
      setOptions({ sanitizeFilter: true }).
      then(() => null, err => err);
    assert.ok(err);
    assert.equal(err.name, 'CastError');
  });

  it('applies sanitizeFilter set on the connection (gh-15720)', async function() {
    const Test = db.model('Test', new Schema({ username: String, pwd: String }));
    await Test.create({ username: 'val', pwd: 'my secret' });

    const prev = db.options;
    db.options = Object.assign({}, prev, { sanitizeFilter: true });

    try {
      const err = await Test.countDocuments({ pwd: { $ne: null } }).
        then(() => null, err => err);
      assert.ok(err);
      assert.equal(err.name, 'CastError');
    } finally {
      db.options = prev;
    }
  });
});
