'use strict';

const assert = require('assert');
const start = require('./common');
const util = require('./util');
const sinon = require('sinon');
const utils = require('../lib/utils');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;
const ValidatorError = mongoose.SchemaType.ValidatorError;
const ValidationError = mongoose.Document.ValidationError;
const MongooseError = mongoose.Error;

describe('document validation', function() {
  let db;

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  beforeEach(() => db.deleteModel(/.*/));
  afterEach(() => util.clearTestData(db));
  afterEach(() => util.stopRemainingOps(db));

  it('only calls validator once on mixed validator (gh-8067)', async function() {
    let called = 0;
    function validator() {
      ++called;
      return true;
    }

    const itemArray = new Schema({
      timer: {
        time: {
          type: {},
          validate: { validator }
        }
      }
    });
    const Model = db.model('Test', new Schema({ items: [itemArray] }));
    const doc = new Model({
      items: [
        { timer: { time: { type: { hours: 24, allowed: true } } } }
      ]
    });

    assert.ifError(doc.validateSync());
    assert.equal(called, 1);

    await doc.validate();
    assert.equal(called, 2);
  });

  it('only calls validator once on nested mixed validator (gh-8117)', async function() {
    const called = [];
    const Model = db.model('Test', new Schema({
      name: { type: String },
      level1: {
        level2: {
          type: Object,
          validate: {
            validator: value => {
              called.push(value);
              return true;
            }
          }
        }
      }
    }));

    const doc = new Model({ name: 'bob' });
    doc.level1 = { level2: { a: 'one', b: 'two', c: 'three' } };

    assert.ifError(doc.validateSync());
    assert.equal(called.length, 1);
    assert.deepEqual(called[0], { a: 'one', b: 'two', c: 'three' });

    await doc.validate();
    assert.equal(called.length, 2);
    assert.deepEqual(called[1], { a: 'one', b: 'two', c: 'three' });
  });

  it('runs array validators on arrays under nested paths', async function() {
    let arrayValidatorCalledCount = 0;
    let arrayElementPathValidatorCalledCount = 0;
    const Model = db.model('Test', new Schema({
      nest: {
        arr: {
          type: [new Schema({
            name: {
              type: String,
              validate() {
                ++arrayElementPathValidatorCalledCount;
                return true;
              }
            }
          })],
          validate: value => {
            ++arrayValidatorCalledCount;
            return value.length <= 1;
          }
        }
      }
    }));
    const doc = new Model({ nest: { arr: [{ name: 'a' }, { name: 'b' }] } });

    const syncError = doc.validateSync();
    assert.ok(syncError?.errors['nest.arr']);
    assert.equal(arrayValidatorCalledCount, 1);
    assert.equal(arrayElementPathValidatorCalledCount, 2);

    const error = await doc.validate().then(() => null, error => error);
    assert.ok(error?.errors['nest.arr']);
    assert.equal(arrayValidatorCalledCount, 2);
    assert.equal(arrayElementPathValidatorCalledCount, 4);
  });

  it('does not double validate document arrays with passing array validators under nested paths', async function() {
    let arrayValidatorCalledCount = 0;
    let arrayElementPathValidatorCalledCount = 0;
    const Model = db.model('Test', new Schema({
      nest: {
        arr: {
          type: [new Schema({
            name: {
              type: String,
              validate() {
                ++arrayElementPathValidatorCalledCount;
                return true;
              }
            }
          })],
          validate: () => {
            ++arrayValidatorCalledCount;
            return true;
          }
        }
      }
    }));
    const doc = new Model({ nest: { arr: [{ name: 'a' }] } });

    assert.ifError(doc.validateSync());
    assert.equal(arrayValidatorCalledCount, 1);
    assert.equal(arrayElementPathValidatorCalledCount, 1);

    await doc.validate();
    assert.equal(arrayValidatorCalledCount, 2);
    assert.equal(arrayElementPathValidatorCalledCount, 2);
  });

  it('validates elements of document arrays with array validators when the nested path is set directly', async function() {
    let arrayValidatorCalledCount = 0;
    let arrayElementPathValidatorCalledCount = 0;
    const Model = db.model('Test', new Schema({
      nest: {
        arr: {
          type: [new Schema({
            name: {
              type: String,
              validate() {
                ++arrayElementPathValidatorCalledCount;
                return true;
              }
            }
          })],
          validate: () => {
            ++arrayValidatorCalledCount;
            return true;
          }
        }
      },
      other: String
    }));

    const doc = new Model({ other: 'test' });
    doc.nest = { arr: [{ name: 'a' }, { name: 'b' }] };

    assert.ifError(doc.validateSync());
    assert.equal(arrayValidatorCalledCount, 1);
    assert.equal(arrayElementPathValidatorCalledCount, 2);

    await doc.validate();
    assert.equal(arrayValidatorCalledCount, 2);
    assert.equal(arrayElementPathValidatorCalledCount, 4);
  });

  it('reports array validator errors on empty document arrays', async function() {
    const Model = db.model('Test', new Schema({
      arr: {
        type: [new Schema({ name: String })],
        validate: value => value.length > 0
      }
    }));
    const doc = new Model({ arr: [] });

    const syncError = doc.validateSync();
    assert.ok(syncError?.errors['arr']);

    const error = await doc.validate().then(() => null, error => error);
    assert.ok(error?.errors['arr']);
  });

  it('supports validateAllPaths', async function() {
    const schema = new Schema({
      name: {
        type: String,
        validate: value => !!value
      },
      age: {
        type: Number,
        validate: value => value == null || value < 200
      },
      subdoc: {
        type: new Schema({ url: String }, { _id: false }),
        validate: value => value == null || value.url.length > 0
      },
      docArr: [{
        subprop: {
          type: String,
          validate: value => value == null || value.length > 0
        }
      }]
    });
    const TestModel = db.model('Test', schema);
    const doc = await TestModel.create({});
    doc.name = '';
    doc.age = 201;
    doc.subdoc = { url: '' };
    doc.docArr = [{ subprop: '' }];
    await doc.save({ validateBeforeSave: false });

    assert.ifError(doc.validateSync());
    await doc.validate();

    const assertValidationError = error => {
      assert.equal(error?.name, 'ValidationError');
      assert.ok(error.errors['name']);
      assert.ok(
        error.errors['name'].message.includes('Validator failed for path `name` with value ``'),
        error.errors['name'].message
      );
      assert.ok(error.errors['age']);
      assert.ok(
        error.errors['age'].message.includes('Validator failed for path `age` with value `201`'),
        error.errors['age'].message
      );
      assert.ok(error.errors['subdoc']);
      assert.ok(
        error.errors['subdoc'].message.includes('Validator failed for path `subdoc` with value `{ url: \'\' }`'),
        error.errors['subdoc'].message
      );
      assert.ok(error.errors['docArr.0.subprop']);
      assert.ok(
        error.errors['docArr.0.subprop'].message.includes('Validator failed for path `subprop` with value ``'),
        error.errors['docArr.0.subprop'].message
      );
    };

    assertValidationError(doc.validateSync({ validateAllPaths: true }));
    assertValidationError(await doc.validate({ validateAllPaths: true }).then(() => null, error => error));
  });

  it('validateAllPaths validates required document array elements', async function() {
    const personSchema = new Schema({ age: Number });
    const Team = db.model('RequiredElementRepro', new Schema({
      people: [{ type: personSchema, required: true }]
    }));
    const doc = new Team({ people: [null] });

    const syncError = doc.validateSync({ validateAllPaths: true });
    assert.ok(syncError?.errors['people.0'], syncError);

    const error = await doc.validate({ validateAllPaths: true }).then(() => null, error => error);
    assert.ok(error?.errors['people.0'], error);
  });

  it('validateAllPaths validates maps in document array elements', async function() {
    const Company = db.model('ArrayMapRepro', new Schema({
      groups: [{
        people: {
          type: Map,
          of: new Schema({
            age: { type: Number, min: 18 }
          })
        }
      }]
    }));
    const doc = new Company({
      groups: [{ people: { one: { age: 15 } } }]
    });

    const syncError = doc.validateSync({ validateAllPaths: true });
    assert.ok(syncError?.errors['groups.0.people.one.age'], syncError);

    const error = await doc.validate({ validateAllPaths: true }).then(() => null, error => error);
    assert.ok(error?.errors['groups.0.people.one.age'], error);
  });

  it('validates modified document array elements in map subdocuments', async function() {
    const teamSchema = new Schema({
      people: [{ age: { type: Number, min: 18 } }]
    });
    const Company = db.model('MapChildRepro', new Schema({
      teams: { type: Map, of: teamSchema }
    }));
    const doc = await Company.create({
      teams: { support: { people: [{ age: 30 }] } }
    });
    doc.teams.get('support').people[0].age = 15;

    const syncError = doc.validateSync();
    assert.ok(syncError?.errors['teams.support.people.0.age'], syncError);

    await assert.rejects(
      () => doc.validate(),
      /Path `teams\.support\.people\.0\.age` \(15\) is less than minimum allowed value \(18\)/
    );
    await assert.rejects(
      () => doc.save(),
      /Path `teams\.support\.people\.0\.age` \(15\) is less than minimum allowed value \(18\)/
    );
  });

  it('validates nested children when validating a nested parent path', async function() {
    const User = db.model('NestedParentRepro', new Schema({
      profile: {
        age: { type: Number, min: 18 }
      }
    }));
    const doc = new User({ profile: { age: 15 } });

    const syncError = doc.validateSync(['profile']);
    assert.ok(syncError?.errors['profile.age'], syncError);

    await assert.rejects(
      () => doc.validate(['profile']),
      /Path `profile\.age` \(15\) is less than minimum allowed value \(18\)/
    );
  });

  it('validates the correct document array when reusing a child schema', async function() {
    const childSchema = new Schema({ age: Number });
    const User = db.model('SchemaReuseRepro', new Schema({
      home: {
        type: [childSchema],
        validate: values => values.length > 0
      },
      work: {
        type: [childSchema],
        validate: () => true
      }
    }));
    const doc = new User({ home: [], work: [{ age: 30 }] });
    await doc.save({ validateBeforeSave: false });
    doc.work[0].age = 31;

    assert.ifError(doc.validateSync());
    await doc.validate();
    await doc.save();

    const saved = await User.findById(doc._id).orFail();
    assert.equal(saved.work[0].age, 31);
  });

  describe('#validate', function() {
    it('works (gh-891)', async function() {
      let called = false;

      const validate = [function() {
        called = true;
        return true;
      }, 'BAM'];

      const schema = new Schema({
        prop: { type: String, required: true, validate: validate },
        nick: { type: String, required: true }
      });

      const M = db.model('Test', schema);
      const m = new M({ prop: 'gh891', nick: 'validation test' });

      assert.ifError(m.validateSync());
      assert.equal(called, true);
      called = false;

      await m.validate();
      assert.equal(called, true);
      called = false;

      await m.save();
      assert.equal(called, true);
      called = false;

      // `prop` is not selected, so its validators should not run
      const m2 = await M.findById(m, 'nick');
      m2.nick = 'gh-891';

      assert.ifError(m2.validateSync());
      assert.equal(called, false);

      await m2.validate();
      assert.equal(called, false);

      await m2.save();
      assert.equal(called, false);
    });

    it('can return a promise', async function() {
      const validate = [function() {
        return true;
      }, 'BAM'];

      const schema = new Schema({
        prop: { type: String, required: true, validate: validate },
        nick: { type: String, required: true }
      });

      const M = db.model('Test', schema);
      const m = new M({ prop: 'gh891', nick: 'validation test' });
      const mBad = new M({ prop: 'other' });

      assert.ifError(m.validateSync());
      await m.validate().then(res => res);

      assert.ok(mBad.validateSync());
      const err = await mBad.validate().then(() => null, err => err);
      assert.ok(err);
    });

    it('doesnt have stale cast errors (gh-2766)', async function() {
      const testSchema = new Schema({ name: String });
      const M = db.model('Test', testSchema);

      const m = new M({ _id: 'this is not a valid _id' });
      assert.ok(!m.$isValid('_id'));
      assert.ok(m.validateSync().errors['_id'].name, 'CastError');

      m._id = '000000000000000000000001';
      assert.ok(m.$isValid('_id'));
      assert.ifError(m.validateSync());
      await m.validate();
    });

    it('cast errors persist across validate() calls (gh-2766)', async function() {
      const testSchema = new Schema({ name: String });
      const M = db.model('Test', testSchema);

      const m = new M({ _id: 'this is not a valid _id' });
      assert.ok(!m.$isValid('_id'));

      const error = await m.validate().then(() => null, err => err);
      assert.ok(error);
      assert.equal(error.errors['_id'].name, 'CastError');

      const error2 = await m.validate().then(() => null, err => err);
      assert.ok(error2);
      assert.equal(error2.errors['_id'].name, 'CastError');

      const err1 = m.validateSync();
      const err2 = m.validateSync();
      assert.equal(err1.errors['_id'].name, 'CastError');
      assert.equal(err2.errors['_id'].name, 'CastError');
    });

    it('returns a promise when there are no validators', async function() {
      const schema = new Schema({ _id: String });

      const M = db.model('Test', schema);
      const m = new M();

      assert.ifError(m.validateSync());

      const promise = m.validate();
      assert.equal(typeof promise.then, 'function');
      await promise;
    });

    describe('works on arrays', function() {
      it('with required', async function() {
        const schema = new Schema({
          name: String,
          arr: { type: [], required: true }
        });
        const M = db.model('Test', schema);
        const m = new M({ name: 'gh1109-1', arr: null });

        assert.ok(/Path `arr` is required/.test(m.validateSync()));
        await assert.rejects(() => m.validate(), /Path `arr` is required/);
        await assert.rejects(() => m.save(), /Path `arr` is required/);

        m.arr = null;
        assert.ok(/Path `arr` is required/.test(m.validateSync()));
        await assert.rejects(() => m.validate(), /Path `arr` is required/);
        await assert.rejects(() => m.save(), /Path `arr` is required/);

        m.arr = [];
        m.arr.push('works');
        assert.ifError(m.validateSync());
        await m.validate();
        await m.save();
      });

      it('with custom validator', async function() {
        let called = false;

        function validator(val) {
          called = true;
          return val && val.length > 1;
        }

        const validate = [validator, 'BAM'];

        const schema = new Schema({
          arr: { type: [], validate: validate }
        });

        const M = db.model('Test', schema);
        const m = new M({ name: 'gh1109-2', arr: [1] });
        assert.equal(called, false);

        assert.equal(String(m.validateSync()), 'ValidationError: arr: BAM');
        assert.equal(called, true);
        called = false;

        const err = await m.validate().then(() => null, err => err);
        assert.equal(String(err), 'ValidationError: arr: BAM');
        assert.equal(called, true);
        called = false;

        await assert.rejects(() => m.save(), /ValidationError: arr: BAM/);
        assert.equal(called, true);

        m.arr.push(2);

        called = false;
        assert.ifError(m.validateSync());
        assert.equal(called, true);

        called = false;
        await m.validate();
        assert.equal(called, true);

        called = false;
        await m.save();
        assert.equal(called, true);
      });

      it('with both required + custom validator', async function() {
        function validator(val) {
          return val && val.length > 1;
        }

        const validate = [validator, 'BAM'];

        const schema = new Schema({
          arr: { type: [], required: true, validate: validate }
        });

        const M = db.model('Test', schema);
        const m = new M({ name: 'gh1109-3', arr: null });

        assert.equal(m.validateSync().errors.arr.message, 'Path `arr` is required.');

        let err = await m.validate().then(() => null, err => err);
        assert.equal(err.errors.arr.message, 'Path `arr` is required.');

        err = await m.save().then(() => null, err => err);
        assert.equal(err.errors.arr.message, 'Path `arr` is required.');

        m.arr = [{ nice: true }];

        assert.equal(String(m.validateSync()), 'ValidationError: arr: BAM');

        err = await m.validate().then(() => null, err => err);
        assert.equal(String(err), 'ValidationError: arr: BAM');

        await assert.rejects(() => m.save(), /ValidationError: arr: BAM/);

        m.arr.push(95);
        assert.ifError(m.validateSync());
        await m.validate();
        await m.save();
      });
    });

    it('validator should run only once gh-1743', async function() {
      let count = 0;

      const Control = new Schema({
        test: {
          type: String,
          validate: function() {
            count++;
            return true;
          }
        }
      });
      const PostSchema = new Schema({
        controls: [Control]
      });

      const Post = db.model('BlogPost', PostSchema);

      const post = new Post({
        controls: [{
          test: 'xx'
        }]
      });

      assert.ifError(post.validateSync());
      assert.equal(count, 1);

      count = 0;
      await post.validate();
      assert.equal(count, 1);

      count = 0;
      await post.save();
      assert.equal(count, 1);
    });

    it('validator should run only once per sub-doc gh-1743', async function() {
      let count = 0;

      const Control = new Schema({
        test: {
          type: String,
          validate: function() {
            count++;
            return true;
          }
        }
      });
      const PostSchema = new Schema({
        controls: [Control]
      });

      const Post = db.model('BlogPost', PostSchema);

      const post = new Post({
        controls: [
          { test: 'xx' },
          { test: 'yy' }
        ]
      });

      assert.ifError(post.validateSync());
      assert.equal(count, post.controls.length);

      count = 0;
      await post.validate();
      assert.equal(count, post.controls.length);

      count = 0;
      await post.save();
      assert.equal(count, post.controls.length);
    });
  });

  it('#invalidate', async function() {
    const InvalidateSchema = new Schema({ prop: { type: String } },
      { strict: false });

    const Post = db.model('Test', InvalidateSchema);
    const post = new Post();
    post.set({ baz: 'val' });

    const invalidate = () => post.invalidate('baz',
      'validation failed for path {PATH}', 'val', 'custom error');
    const assertInvalidateError = err => {
      assert.ok(err instanceof MongooseError);
      assert.ok(err instanceof ValidationError);
      assert.ok(err.errors.baz instanceof ValidatorError);
      assert.equal(err.errors.baz.message, 'validation failed for path baz');
      assert.equal(err.errors.baz.path, 'baz');
      assert.equal(err.errors.baz.value, 'val');
      assert.equal(err.errors.baz.kind, 'custom error');
    };

    // `invalidate()` returns the error it recorded, and each validation run
    // consumes it, so re-invalidate before checking the next entry point.
    assertInvalidateError(invalidate());

    assertInvalidateError(post.validateSync());

    invalidate();
    assertInvalidateError(await post.validate().then(() => null, err => err));

    invalidate();
    assertInvalidateError(await post.save().then(() => null, err => err));

    await post.save();
  });

  it('support `pathsToValidate` option for `validate()` and `validateSync()` (gh-7587)', async function() {
    const schema = Schema({
      name: {
        type: String,
        required: true
      },
      age: {
        type: Number,
        required: true
      },
      rank: String
    });
    const Model = db.model('Test', schema);

    const doc = new Model({});

    assert.deepEqual(Object.keys(doc.validateSync(['name', 'rank']).errors), ['name']);
    assert.deepEqual(Object.keys(doc.validateSync(['age', 'rank']).errors), ['age']);

    let err = await doc.validate(['name', 'rank']).catch(err => err);
    assert.deepEqual(Object.keys(err.errors), ['name']);

    err = await doc.validate(['age', 'rank']).catch(err => err);
    assert.deepEqual(Object.keys(err.errors), ['age']);
  });

  it('handles validating single nested paths when specified in `pathsToValidate` (gh-8626)', async function() {
    const nestedSchema = Schema({
      name: { type: String, validate: v => v.length > 2 },
      age: { type: Number, validate: v => v < 200 }
    });
    const schema = Schema({ nested: nestedSchema });

    const Model = db.model('Test', schema);

    const doc = new Model({ nested: { name: 'a', age: 9001 } });

    const syncError = doc.validateSync(['nested.name']);
    assert.ok(syncError.errors['nested.name']);
    assert.ok(!syncError.errors['nested.age']);

    const error = await doc.validate(['nested.name']).then(() => null, err => err);
    assert.ok(error.errors['nested.name']);
    assert.ok(!error.errors['nested.age']);
  });

  describe('validation `pathsToSkip` (gh-10230)', () => {
    it('support `pathsToSkip` option for `Document#validate()` and `Document#validateSync()`', async function() {
      const User = getUserModel();
      const user = new User();

      assert.deepEqual(Object.keys(user.validateSync({ pathsToSkip: ['age'] }).errors), ['name']);
      assert.deepEqual(Object.keys(user.validateSync({ pathsToSkip: ['name'] }).errors), ['age']);

      const err1 = await user.validate({ pathsToSkip: ['age'] }).then(() => null, err => err);
      assert.deepEqual(Object.keys(err1.errors), ['name']);

      const err2 = await user.validate({ pathsToSkip: ['name'] }).then(() => null, err => err);
      assert.deepEqual(Object.keys(err2.errors), ['age']);
    });

    it('support `pathsToSkip` option for `Model.validate()`', async function() {
      const User = getUserModel();
      const err1 = await User.validate({}, { pathsToSkip: ['age'] }).then(() => null, err => err);
      assert.deepEqual(Object.keys(err1.errors), ['name']);

      const err2 = await User.validate({}, { pathsToSkip: ['name'] }).then(() => null, err => err);
      assert.deepEqual(Object.keys(err2.errors), ['age']);
    });

    it('`pathsToSkip` accepts space separated paths', async() => {
      const userSchema = Schema({
        name: { type: String, required: true },
        age: { type: Number, required: true },
        country: { type: String, required: true },
        rank: { type: String, required: true }
      });

      const User = db.model('User', userSchema);

      const user = new User({ name: 'Sam', age: 26 });

      const err1 = user.validateSync({ pathsToSkip: 'country rank' });
      assert.ok(err1 == null);

      const err2 = await user.validate({ pathsToSkip: 'country rank' }).then(() => null, err => err);
      assert.ok(err2 == null);
    });

    function getUserModel() {
      const userSchema = Schema({
        name: { type: String, required: true },
        age: { type: Number, required: true },
        rank: String
      });

      const User = db.model('User', userSchema);
      return User;
    }
  });

  describe('validateSync()', () => {
    afterEach(() => sinon.restore());

    it('emits a deprecation warning', async function() {
      // Arrange
      const { User, getWarningCalls } = createTestContext();
      const user = new User({ name: 'Sam' });

      // Act
      user.validateSync();

      // Assert
      const calls = getWarningCalls();
      assert.strictEqual(calls.length, 1);
      assert.ok(calls[0].args[0].includes('`Document.prototype.validateSync()` is deprecated'));

      // `validate()` is the non-deprecated equivalent, so it must stay silent
      await user.validate();
      assert.strictEqual(getWarningCalls().length, 1);
    });

    it('does not emit a deprecation warning for internal bulkSave() validation', async() => {
      // Arrange
      const { User, getWarningCalls } = createTestContext();
      const user = new User();

      // Act
      const err = await User.bulkSave([user]).then(() => null, err => err);

      // Assert
      assert.ok(err);
      assert.strictEqual(err.name, 'ValidationError');
      assert.strictEqual(getWarningCalls().length, 0);
    });

    it('emits one deprecation warning when validating subdocuments and unions', async function() {
      // Arrange
      const { User, getWarningCalls } = createTestContext();
      const user = new User({
        name: 'Sam',
        address: {},
        offices: [{}, {}],
        preference: {}
      });

      // Act
      const err = user.validateSync();

      // Assert
      assert.ok(err);
      assert.ok(err.errors['address.city']);
      assert.ok(err.errors['offices.0.city']);
      assert.ok(err.errors['offices.1.city']);
      assert.ok(err.errors['preference.score']);
      assert.strictEqual(getWarningCalls().length, 1);

      // `validate()` reports the same errors without adding another warning
      const asyncError = await user.validate().then(() => null, err => err);
      assert.ok(asyncError);
      assert.ok(asyncError.errors['address.city']);
      assert.ok(asyncError.errors['offices.0.city']);
      assert.ok(asyncError.errors['offices.1.city']);
      assert.ok(asyncError.errors['preference.score']);
      assert.strictEqual(getWarningCalls().length, 1);
    });

    function createTestContext() {
      sinon.stub(utils, 'warn');
      const addressSchema = Schema({ city: { type: String, required: true } });
      const officeSchema = Schema({ city: { type: String, required: true } });
      const preferenceSchema = Schema({ score: { type: Number, required: true } });
      const User = db.model('ValidateSyncWarning', Schema({
        name: { type: String, required: true },
        address: addressSchema,
        offices: [officeSchema],
        preference: {
          type: 'Union',
          of: [preferenceSchema, Number]
        }
      }));

      return {
        User,
        getWarningCalls: () => utils.warn.getCalls()
      };
    }
  });
});
