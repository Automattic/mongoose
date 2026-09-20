'use strict';

const assert = require('assert');
const start = require('./common');
const util = require('./util');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

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
});
