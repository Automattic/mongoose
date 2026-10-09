'use strict';

const assert = require('assert');
const start = require('./common');
const util = require('./util');

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

    await doc.validate();
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

    await doc.validate();
    assert.equal(called.length, 1);
    assert.deepEqual(called[0], { a: 'one', b: 'two', c: 'three' });

    await doc.validate();
    assert.equal(called.length, 2);
    assert.deepEqual(called[1], { a: 'one', b: 'two', c: 'three' });
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

    await doc.validate();
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

    assertValidationError((await doc.validate({ validateAllPaths: true }).then(() => null, err => err)));
    assertValidationError(await doc.validate({ validateAllPaths: true }).then(() => null, error => error));
  });

  it('validates nested children when validating a nested parent path', async function() {
    const User = db.model('NestedParentRepro', new Schema({
      profile: {
        age: { type: Number, min: 18 }
      }
    }));
    const doc = new User({ profile: { age: 15 } });

    const syncError = (await doc.validate(['profile']).then(() => null, err => err));
    assert.ok(syncError?.errors['profile.age'], syncError);

    await assert.rejects(
      () => doc.validate(['profile']),
      /Path `profile\.age` \(15\) is less than minimum allowed value \(18\)/
    );
  });

  describe('document arrays', function() {
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

      const error = await doc.validate().then(() => null, error => error);
      assert.ok(error?.errors['nest.arr']);
      assert.equal(arrayValidatorCalledCount, 1);
      assert.equal(arrayElementPathValidatorCalledCount, 2);
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

      await doc.validate();
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

      await doc.validate();
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

      const error = await doc.validate().then(() => null, error => error);
      assert.ok(error?.errors['arr']);
    });

    it('validateAllPaths validates required document array elements', async function() {
      const personSchema = new Schema({ age: Number });
      const Team = db.model('RequiredElementRepro', new Schema({
        people: [{ type: personSchema, required: true }]
      }));
      const doc = new Team({ people: [null] });

      const syncError = (await doc.validate({ validateAllPaths: true }).then(() => null, err => err));
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

      const syncError = (await doc.validate({ validateAllPaths: true }).then(() => null, err => err));
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

      await assert.rejects(
        () => doc.validate(),
        /Path `teams\.support\.people\.0\.age` \(15\) is less than minimum allowed value \(18\)/
      );
      await assert.rejects(
        () => doc.save(),
        /Path `teams\.support\.people\.0\.age` \(15\) is less than minimum allowed value \(18\)/
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

      await doc.validate();
      await doc.validate();
      await doc.save();

      const saved = await User.findById(doc._id).orFail();
      assert.equal(saved.work[0].age, 31);
    });

    describe('element-level validators', function() {
      it('runs element validators on non-null elements', async function() {
        const childSchema = new Schema({ name: String });
        const Model = db.model('Test', new Schema({
          arr: [{ type: childSchema, validate: v => v == null || v.name !== 'bad' }]
        }));
        const doc = new Model({ arr: [{ name: 'good' }, { name: 'bad' }] });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['arr.1'], error);
        assert.ok(!error.errors['arr.0'], error);

        const allPathsSyncError = (await doc.validate({ validateAllPaths: true }).then(() => null, err => err));
        assert.ok(allPathsSyncError?.errors['arr.1'], allPathsSyncError);

        const allPathsError = await doc.validate({ validateAllPaths: true }).then(() => null, error => error);
        assert.ok(allPathsError?.errors['arr.1'], allPathsError);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('runs element validators when modifying an element of a saved document', async function() {
        const childSchema = new Schema({ name: String });
        const Model = db.model('Test', new Schema({
          arr: [{ type: childSchema, validate: v => v == null || v.name !== 'bad' }]
        }));
        const doc = await Model.create({ arr: [{ name: 'good' }] });
        doc.arr[0].name = 'bad';

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['arr.0'], error);

        const allPathsError = await doc.validate({ validateAllPaths: true }).then(() => null, error => error);
        assert.ok(allPathsError?.errors['arr.0'], allPathsError);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('calls element and subdocument validators exactly once per element', async function() {
        let elementValidatorCalls = 0;
        let childValidatorCalls = 0;
        const childSchema = new Schema({
          name: {
            type: String,
            validate: () => {
              ++childValidatorCalls;
              return true;
            }
          }
        });
        const Model = db.model('Test', new Schema({
          arr: [{
            type: childSchema,
            validate: () => {
              ++elementValidatorCalls;
              return true;
            }
          }]
        }));
        const doc = new Model({ arr: [{ name: 'a' }, { name: 'b' }] });

        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(childValidatorCalls, 2);

        elementValidatorCalls = 0;
        childValidatorCalls = 0;
        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(childValidatorCalls, 2);

        elementValidatorCalls = 0;
        childValidatorCalls = 0;
        assert.ifError((await doc.validate({ validateAllPaths: true }).then(() => null, err => err)));
        assert.equal(elementValidatorCalls, 2);
        assert.equal(childValidatorCalls, 2);

        elementValidatorCalls = 0;
        childValidatorCalls = 0;
        await doc.validate({ validateAllPaths: true });
        assert.equal(elementValidatorCalls, 2);
        assert.equal(childValidatorCalls, 2);

        elementValidatorCalls = 0;
        childValidatorCalls = 0;
        await doc.save();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(childValidatorCalls, 2);
      });

      it('calls subdocument validators exactly once per element with `required` elements', async function() {
        let childValidatorCalls = 0;
        const childSchema = new Schema({
          name: {
            type: String,
            validate: () => {
              ++childValidatorCalls;
              return true;
            }
          }
        });
        const Model = db.model('Test', new Schema({
          arr: [{ type: childSchema, required: true }]
        }));
        const doc = new Model({ arr: [{ name: 'a' }, { name: 'b' }] });

        await doc.validate();
        assert.equal(childValidatorCalls, 2);

        childValidatorCalls = 0;
        await doc.validate();
        assert.equal(childValidatorCalls, 2);

        childValidatorCalls = 0;
        assert.ifError((await doc.validate({ validateAllPaths: true }).then(() => null, err => err)));
        assert.equal(childValidatorCalls, 2);

        childValidatorCalls = 0;
        await doc.validate({ validateAllPaths: true });
        assert.equal(childValidatorCalls, 2);

        childValidatorCalls = 0;
        await doc.save();
        assert.equal(childValidatorCalls, 2);
      });

      it('runs element validators on document arrays underneath nested paths and subdocs', async function() {
        const childSchema = new Schema({ name: String });
        const elementDefinition = [{
          type: childSchema,
          validate: v => v == null || v.name !== 'bad'
        }];
        const Model = db.model('Test', new Schema({
          nested: { arr: elementDefinition },
          single: new Schema({ arr: elementDefinition })
        }));
        const doc = new Model({
          nested: { arr: [{ name: 'bad' }] },
          single: { arr: [{ name: 'bad' }] }
        });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['nested.arr.0'], error);
        assert.ok(error?.errors['single.arr.0'], error);

        const allPathsSyncError = (await doc.validate({ validateAllPaths: true }).then(() => null, err => err));
        assert.ok(allPathsSyncError?.errors['nested.arr.0'], allPathsSyncError);
        assert.ok(allPathsSyncError?.errors['single.arr.0'], allPathsSyncError);

        const allPathsError = await doc.validate({ validateAllPaths: true }).then(() => null, error => error);
        assert.ok(allPathsError?.errors['nested.arr.0'], allPathsError);
        assert.ok(allPathsError?.errors['single.arr.0'], allPathsError);
      });

      it('runs element validators on an unmodified document loaded from the database', async function() {
        const childSchema = new Schema({ name: String });
        const Model = db.model('Test', new Schema({
          arr: [{ type: childSchema, validate: v => v == null || v.name !== 'bad' }]
        }));
        // Insert through the driver so the offending element never passes
        // through validation on the way in.
        await Model.collection.insertOne({ arr: [{ name: 'bad' }] });
        const doc = await Model.findOne().orFail();
        assert.ok(!doc.$isNew);
        assert.ok(!doc.$isModified('arr'));

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['arr.0'], error);

        const allPathsError = await doc.validate({ validateAllPaths: true }).then(() => null, error => error);
        assert.ok(allPathsError?.errors['arr.0'], allPathsError);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('runs `required` element validators on an unmodified document loaded from the database', async function() {
        const childSchema = new Schema({ name: String });
        const Model = db.model('Test', new Schema({
          arr: [{ type: childSchema, required: true }]
        }));
        await Model.collection.insertOne({ arr: [null] });
        const doc = await Model.findOne().orFail();
        assert.ok(!doc.$isModified('arr'));

        const syncError = await doc.validate().then(() => null, err => err);
        assert.ok(syncError?.errors['arr.0'], syncError);

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['arr.0'], error);

        const allPathsError = await doc.validate({ validateAllPaths: true }).then(() => null, error => error);
        assert.ok(allPathsError?.errors['arr.0'], allPathsError);
      });

      it('runs element validators when only a sibling path is modified', async function() {
        const childSchema = new Schema({ name: String });
        const Model = db.model('Test', new Schema({
          other: String,
          arr: [{ type: childSchema, validate: v => v == null || v.name !== 'bad' }]
        }));
        await Model.collection.insertOne({ other: 'a', arr: [{ name: 'bad' }] });
        const doc = await Model.findOne().orFail();
        doc.other = 'b';

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['arr.0'], error);

        const allPathsError = await doc.validate({ validateAllPaths: true }).then(() => null, error => error);
        assert.ok(allPathsError?.errors['arr.0'], allPathsError);
      });

      it('calls element validators exactly once on a document loaded from the database', async function() {
        let elementValidatorCalls = 0;
        let childValidatorCalls = 0;
        const childSchema = new Schema({
          name: {
            type: String,
            validate: () => {
              ++childValidatorCalls;
              return true;
            }
          }
        });
        const Model = db.model('Test', new Schema({
          arr: [{
            type: childSchema,
            validate: () => {
              ++elementValidatorCalls;
              return true;
            }
          }]
        }));
        await Model.collection.insertOne({ arr: [{ name: 'a' }, { name: 'b' }] });
        const doc = await Model.findOne().orFail();

        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(childValidatorCalls, 2);

        elementValidatorCalls = 0;
        childValidatorCalls = 0;
        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(childValidatorCalls, 2);

        elementValidatorCalls = 0;
        childValidatorCalls = 0;
        assert.ifError((await doc.validate({ validateAllPaths: true }).then(() => null, err => err)));
        assert.equal(elementValidatorCalls, 2);
        assert.equal(childValidatorCalls, 2);

        elementValidatorCalls = 0;
        childValidatorCalls = 0;
        await doc.validate({ validateAllPaths: true });
        assert.equal(elementValidatorCalls, 2);
        assert.equal(childValidatorCalls, 2);
      });
    });


    describe('basic document array', function() {
      it('reports validator errors on element subpaths', async function() {
        const elementSchema = new Schema({
          prop: { type: String, validate: v => v !== 'bad' }
        });
        const Model = db.model('Test', new Schema({
          arr: [elementSchema]
        }));
        const doc = new Model({ arr: [{ prop: 'good' }, { prop: 'bad' }] });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['arr.1.prop'], error);
        assert.ok(!error.errors['arr.0.prop'], error);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('reports `required` errors on null elements', async function() {
        const elementSchema = new Schema({ prop: String });
        const Model = db.model('Test', new Schema({
          arr: [{ type: elementSchema, required: true }]
        }));
        const doc = new Model({ arr: [{ prop: 'good' }, null] });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['arr.1'], error);

        const allPathsError = (await doc.validate({ validateAllPaths: true }).then(() => null, err => err));
        assert.ok(allPathsError?.errors['arr.1'], allPathsError);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('calls element and array validators exactly once per validation', async function() {
        let elementValidatorCalls = 0;
        let arrayValidatorCalls = 0;
        const elementSchema = new Schema({
          prop: {
            type: String,
            validate: () => {
              ++elementValidatorCalls;
              return true;
            }
          }
        });
        const Model = db.model('Test', new Schema({
          arr: {
            type: [elementSchema],
            validate: () => {
              ++arrayValidatorCalls;
              return true;
            }
          }
        }));
        const doc = new Model({ arr: [{ prop: 'good' }, { prop: 'good' }] });

        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);

        elementValidatorCalls = 0;
        arrayValidatorCalls = 0;
        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);

        elementValidatorCalls = 0;
        arrayValidatorCalls = 0;
        await doc.save();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);
      });
    });

    describe('document array underneath nested path', function() {
      it('reports validator errors on element subpaths', async function() {
        const elementSchema = new Schema({
          prop: { type: String, validate: v => v !== 'bad' }
        });
        const Model = db.model('Test', new Schema({
          nested: {
            arr: [elementSchema]
          }
        }));
        const doc = new Model({ nested: { arr: [{ prop: 'good' }, { prop: 'bad' }] } });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['nested.arr.1.prop'], error);
        assert.ok(!error.errors['nested.arr.0.prop'], error);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('reports `required` errors on null elements', async function() {
        const elementSchema = new Schema({ prop: String });
        const Model = db.model('Test', new Schema({
          nested: {
            arr: [{ type: elementSchema, required: true }]
          }
        }));
        const doc = new Model({ nested: { arr: [{ prop: 'good' }, null] } });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['nested.arr.1'], error);

        const allPathsError = (await doc.validate({ validateAllPaths: true }).then(() => null, err => err));
        assert.ok(allPathsError?.errors['nested.arr.1'], allPathsError);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('calls element and array validators exactly once per validation', async function() {
        let elementValidatorCalls = 0;
        let arrayValidatorCalls = 0;
        const elementSchema = new Schema({
          prop: {
            type: String,
            validate: () => {
              ++elementValidatorCalls;
              return true;
            }
          }
        });
        const Model = db.model('Test', new Schema({
          nested: {
            arr: {
              type: [elementSchema],
              validate: () => {
                ++arrayValidatorCalls;
                return true;
              }
            }
          }
        }));
        const doc = new Model({ nested: { arr: [{ prop: 'good' }, { prop: 'good' }] } });

        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);

        elementValidatorCalls = 0;
        arrayValidatorCalls = 0;
        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);

        elementValidatorCalls = 0;
        arrayValidatorCalls = 0;
        await doc.save();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);
      });
    });

    describe('document array underneath doubly nested path', function() {
      it('reports validator errors on element subpaths', async function() {
        const elementSchema = new Schema({
          prop: { type: String, validate: v => v !== 'bad' }
        });
        const Model = db.model('Test', new Schema({
          outer: {
            inner: {
              arr: [elementSchema]
            }
          }
        }));
        const doc = new Model({ outer: { inner: { arr: [{ prop: 'good' }, { prop: 'bad' }] } } });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['outer.inner.arr.1.prop'], error);
        assert.ok(!error.errors['outer.inner.arr.0.prop'], error);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('reports `required` errors on null elements', async function() {
        const elementSchema = new Schema({ prop: String });
        const Model = db.model('Test', new Schema({
          outer: {
            inner: {
              arr: [{ type: elementSchema, required: true }]
            }
          }
        }));
        const doc = new Model({ outer: { inner: { arr: [{ prop: 'good' }, null] } } });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['outer.inner.arr.1'], error);

        const allPathsError = (await doc.validate({ validateAllPaths: true }).then(() => null, err => err));
        assert.ok(allPathsError?.errors['outer.inner.arr.1'], allPathsError);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('calls element and array validators exactly once per validation', async function() {
        let elementValidatorCalls = 0;
        let arrayValidatorCalls = 0;
        const elementSchema = new Schema({
          prop: {
            type: String,
            validate: () => {
              ++elementValidatorCalls;
              return true;
            }
          }
        });
        const Model = db.model('Test', new Schema({
          outer: {
            inner: {
              arr: {
                type: [elementSchema],
                validate: () => {
                  ++arrayValidatorCalls;
                  return true;
                }
              }
            }
          }
        }));
        const doc = new Model({ outer: { inner: { arr: [{ prop: 'good' }, { prop: 'good' }] } } });

        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);

        elementValidatorCalls = 0;
        arrayValidatorCalls = 0;
        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);

        elementValidatorCalls = 0;
        arrayValidatorCalls = 0;
        await doc.save();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);
      });
    });

    describe('document array underneath map', function() {
      it('reports validator errors on element subpaths', async function() {
        const elementSchema = new Schema({
          prop: { type: String, validate: v => v !== 'bad' }
        });
        const Model = db.model('Test', new Schema({
          map: {
            type: Map,
            of: new Schema({
              arr: [elementSchema]
            })
          }
        }));
        const doc = new Model({ map: { team: { arr: [{ prop: 'good' }, { prop: 'bad' }] } } });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['map.team.arr.1.prop'], error);
        assert.ok(!error.errors['map.team.arr.0.prop'], error);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('reports `required` errors on null elements', async function() {
        const elementSchema = new Schema({ prop: String });
        const Model = db.model('Test', new Schema({
          map: {
            type: Map,
            of: new Schema({
              arr: [{ type: elementSchema, required: true }]
            })
          }
        }));
        const doc = new Model({ map: { team: { arr: [{ prop: 'good' }, null] } } });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['map.team.arr.1'], error);

        const allPathsError = (await doc.validate({ validateAllPaths: true }).then(() => null, err => err));
        assert.ok(allPathsError?.errors['map.team.arr.1'], allPathsError);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('calls element and array validators exactly once per validation', async function() {
        let elementValidatorCalls = 0;
        let arrayValidatorCalls = 0;
        const elementSchema = new Schema({
          prop: {
            type: String,
            validate: () => {
              ++elementValidatorCalls;
              return true;
            }
          }
        });
        const Model = db.model('Test', new Schema({
          map: {
            type: Map,
            of: new Schema({
              arr: {
                type: [elementSchema],
                validate: () => {
                  ++arrayValidatorCalls;
                  return true;
                }
              }
            })
          }
        }));
        const doc = new Model({ map: { team: { arr: [{ prop: 'good' }, { prop: 'good' }] } } });

        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);

        elementValidatorCalls = 0;
        arrayValidatorCalls = 0;
        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);

        elementValidatorCalls = 0;
        arrayValidatorCalls = 0;
        await doc.save();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);
      });
    });

    describe('document array underneath single nested subdoc', function() {
      it('reports validator errors on element subpaths', async function() {
        const elementSchema = new Schema({
          prop: { type: String, validate: v => v !== 'bad' }
        });
        const Model = db.model('Test', new Schema({
          single: new Schema({
            arr: [elementSchema]
          })
        }));
        const doc = new Model({ single: { arr: [{ prop: 'good' }, { prop: 'bad' }] } });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['single.arr.1.prop'], error);
        assert.ok(!error.errors['single.arr.0.prop'], error);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('reports `required` errors on null elements', async function() {
        const elementSchema = new Schema({ prop: String });
        const Model = db.model('Test', new Schema({
          single: new Schema({
            arr: [{ type: elementSchema, required: true }]
          })
        }));
        const doc = new Model({ single: { arr: [{ prop: 'good' }, null] } });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['single.arr.1'], error);

        const allPathsError = (await doc.validate({ validateAllPaths: true }).then(() => null, err => err));
        assert.ok(allPathsError?.errors['single.arr.1'], allPathsError);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('calls element and array validators exactly once per validation', async function() {
        let elementValidatorCalls = 0;
        let arrayValidatorCalls = 0;
        const elementSchema = new Schema({
          prop: {
            type: String,
            validate: () => {
              ++elementValidatorCalls;
              return true;
            }
          }
        });
        const Model = db.model('Test', new Schema({
          single: new Schema({
            arr: {
              type: [elementSchema],
              validate: () => {
                ++arrayValidatorCalls;
                return true;
              }
            }
          })
        }));
        const doc = new Model({ single: { arr: [{ prop: 'good' }, { prop: 'good' }] } });

        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);

        elementValidatorCalls = 0;
        arrayValidatorCalls = 0;
        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);

        elementValidatorCalls = 0;
        arrayValidatorCalls = 0;
        await doc.save();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);
      });
    });

    describe('document array underneath single nested underneath nested path', function() {
      it('reports validator errors on element subpaths', async function() {
        const elementSchema = new Schema({
          prop: { type: String, validate: v => v !== 'bad' }
        });
        const Model = db.model('Test', new Schema({
          nested: {
            single: new Schema({
              arr: [elementSchema]
            })
          }
        }));
        const doc = new Model({ nested: { single: { arr: [{ prop: 'good' }, { prop: 'bad' }] } } });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['nested.single.arr.1.prop'], error);
        assert.ok(!error.errors['nested.single.arr.0.prop'], error);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('reports `required` errors on null elements', async function() {
        const elementSchema = new Schema({ prop: String });
        const Model = db.model('Test', new Schema({
          nested: {
            single: new Schema({
              arr: [{ type: elementSchema, required: true }]
            })
          }
        }));
        const doc = new Model({ nested: { single: { arr: [{ prop: 'good' }, null] } } });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['nested.single.arr.1'], error);

        const allPathsError = (await doc.validate({ validateAllPaths: true }).then(() => null, err => err));
        assert.ok(allPathsError?.errors['nested.single.arr.1'], allPathsError);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('calls element and array validators exactly once per validation', async function() {
        let elementValidatorCalls = 0;
        let arrayValidatorCalls = 0;
        const elementSchema = new Schema({
          prop: {
            type: String,
            validate: () => {
              ++elementValidatorCalls;
              return true;
            }
          }
        });
        const Model = db.model('Test', new Schema({
          nested: {
            single: new Schema({
              arr: {
                type: [elementSchema],
                validate: () => {
                  ++arrayValidatorCalls;
                  return true;
                }
              }
            })
          }
        }));
        const doc = new Model({ nested: { single: { arr: [{ prop: 'good' }, { prop: 'good' }] } } });

        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);

        elementValidatorCalls = 0;
        arrayValidatorCalls = 0;
        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);

        elementValidatorCalls = 0;
        arrayValidatorCalls = 0;
        await doc.save();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);
      });
    });

    describe('document array underneath another document array', function() {
      it('reports validator errors on element subpaths', async function() {
        const elementSchema = new Schema({
          prop: { type: String, validate: v => v !== 'bad' }
        });
        const Model = db.model('Test', new Schema({
          outer: [new Schema({
            arr: [elementSchema]
          })]
        }));
        const doc = new Model({ outer: [{ arr: [{ prop: 'good' }, { prop: 'bad' }] }] });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['outer.0.arr.1.prop'], error);
        assert.ok(!error.errors['outer.0.arr.0.prop'], error);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('reports `required` errors on null elements', async function() {
        const elementSchema = new Schema({ prop: String });
        const Model = db.model('Test', new Schema({
          outer: [new Schema({
            arr: [{ type: elementSchema, required: true }]
          })]
        }));
        const doc = new Model({ outer: [{ arr: [{ prop: 'good' }, null] }] });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['outer.0.arr.1'], error);

        const allPathsError = (await doc.validate({ validateAllPaths: true }).then(() => null, err => err));
        assert.ok(allPathsError?.errors['outer.0.arr.1'], allPathsError);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('calls element and array validators exactly once per validation', async function() {
        let elementValidatorCalls = 0;
        let arrayValidatorCalls = 0;
        const elementSchema = new Schema({
          prop: {
            type: String,
            validate: () => {
              ++elementValidatorCalls;
              return true;
            }
          }
        });
        const Model = db.model('Test', new Schema({
          outer: [new Schema({
            arr: {
              type: [elementSchema],
              validate: () => {
                ++arrayValidatorCalls;
                return true;
              }
            }
          })]
        }));
        const doc = new Model({ outer: [{ arr: [{ prop: 'good' }, { prop: 'good' }] }] });

        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);

        elementValidatorCalls = 0;
        arrayValidatorCalls = 0;
        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);

        elementValidatorCalls = 0;
        arrayValidatorCalls = 0;
        await doc.save();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);
      });
    });

    describe('document array with a mixed subpath', function() {
      it('reports validator errors on element subpaths', async function() {
        const elementSchema = new Schema({
          prop: { type: {}, validate: v => v.level !== 'bad' }
        });
        const Model = db.model('Test', new Schema({
          arr: [elementSchema]
        }));
        const doc = new Model({ arr: [{ prop: { level: 'good' } }, { prop: { level: 'bad' } }] });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['arr.1.prop'], error);
        assert.ok(!error.errors['arr.0.prop'], error);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('reports `required` errors on null elements', async function() {
        const elementSchema = new Schema({ prop: {} });
        const Model = db.model('Test', new Schema({
          arr: [{ type: elementSchema, required: true }]
        }));
        const doc = new Model({ arr: [{ prop: { level: 'good' } }, null] });

        const error = await doc.validate().then(() => null, error => error);
        assert.ok(error?.errors['arr.1'], error);

        const allPathsError = (await doc.validate({ validateAllPaths: true }).then(() => null, err => err));
        assert.ok(allPathsError?.errors['arr.1'], allPathsError);

        await assert.rejects(() => doc.save(), /ValidationError/);
      });

      it('calls element and array validators exactly once per validation', async function() {
        let elementValidatorCalls = 0;
        let arrayValidatorCalls = 0;
        const elementSchema = new Schema({
          prop: {
            type: {},
            validate: () => {
              ++elementValidatorCalls;
              return true;
            }
          }
        });
        const Model = db.model('Test', new Schema({
          arr: {
            type: [elementSchema],
            validate: () => {
              ++arrayValidatorCalls;
              return true;
            }
          }
        }));
        const doc = new Model({ arr: [{ prop: { level: 'good' } }, { prop: { level: 'good' } }] });

        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);

        elementValidatorCalls = 0;
        arrayValidatorCalls = 0;
        await doc.validate();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);

        elementValidatorCalls = 0;
        arrayValidatorCalls = 0;
        await doc.save();
        assert.equal(elementValidatorCalls, 2);
        assert.equal(arrayValidatorCalls, 1);
      });
    });
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

      assert.ifError((await m.validate().then(() => null, err => err)));
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

      assert.ifError((await m2.validate().then(() => null, err => err)));
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

      assert.ifError((await m.validate().then(() => null, err => err)));
      await m.validate().then(res => res);

      assert.ok((await mBad.validate().then(() => null, err => err)));
      const err = await mBad.validate().then(() => null, err => err);
      assert.ok(err);
    });

    it('doesnt have stale cast errors (gh-2766)', async function() {
      const testSchema = new Schema({ name: String });
      const M = db.model('Test', testSchema);

      const m = new M({ _id: 'this is not a valid _id' });
      assert.ok(!m.$isValid('_id'));
      assert.ok((await m.validate().then(() => null, err => err)).errors['_id'].name, 'CastError');

      m._id = '000000000000000000000001';
      assert.ok(m.$isValid('_id'));
      assert.ifError((await m.validate().then(() => null, err => err)));
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

      const err1 = (await m.validate().then(() => null, err => err));
      const err2 = (await m.validate().then(() => null, err => err));
      assert.equal(err1.errors['_id'].name, 'CastError');
      assert.equal(err2.errors['_id'].name, 'CastError');
    });

    it('returns a promise when there are no validators', async function() {
      const schema = new Schema({ _id: String });

      const M = db.model('Test', schema);
      const m = new M();

      assert.ifError((await m.validate().then(() => null, err => err)));

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

        assert.ok(/Path `arr` is required/.test((await m.validate().then(() => null, err => err))));
        await assert.rejects(() => m.validate(), /Path `arr` is required/);
        await assert.rejects(() => m.save(), /Path `arr` is required/);

        m.arr = null;
        assert.ok(/Path `arr` is required/.test((await m.validate().then(() => null, err => err))));
        await assert.rejects(() => m.validate(), /Path `arr` is required/);
        await assert.rejects(() => m.save(), /Path `arr` is required/);

        m.arr = [];
        m.arr.push('works');
        assert.ifError((await m.validate().then(() => null, err => err)));
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

        assert.equal(String((await m.validate().then(() => null, err => err))), 'ValidationError: arr: BAM');
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
        assert.ifError((await m.validate().then(() => null, err => err)));
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

        assert.equal((await m.validate().then(() => null, err => err)).errors.arr.message, 'Path `arr` is required.');

        let err = await m.validate().then(() => null, err => err);
        assert.equal(err.errors.arr.message, 'Path `arr` is required.');

        err = await m.save().then(() => null, err => err);
        assert.equal(err.errors.arr.message, 'Path `arr` is required.');

        m.arr = [{ nice: true }];

        assert.equal(String((await m.validate().then(() => null, err => err))), 'ValidationError: arr: BAM');

        err = await m.validate().then(() => null, err => err);
        assert.equal(String(err), 'ValidationError: arr: BAM');

        await assert.rejects(() => m.save(), /ValidationError: arr: BAM/);

        m.arr.push(95);
        assert.ifError((await m.validate().then(() => null, err => err)));
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

      assert.ifError((await post.validate().then(() => null, err => err)));
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

      assert.ifError((await post.validate().then(() => null, err => err)));
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

    assertInvalidateError((await post.validate().then(() => null, err => err)));

    invalidate();
    assertInvalidateError(await post.validate().then(() => null, err => err));

    invalidate();
    assertInvalidateError(await post.save().then(() => null, err => err));

    await post.save();
  });

  it('support `pathsToValidate` option for `validate()` and `validate()` (gh-7587)', async function() {
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

    assert.deepEqual(Object.keys((await doc.validate(['name', 'rank']).then(() => null, err => err)).errors), ['name']);
    assert.deepEqual(Object.keys((await doc.validate(['age', 'rank']).then(() => null, err => err)).errors), ['age']);

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

    const syncError = (await doc.validate(['nested.name']).then(() => null, err => err));
    assert.ok(syncError.errors['nested.name']);
    assert.ok(!syncError.errors['nested.age']);

    const error = await doc.validate(['nested.name']).then(() => null, err => err);
    assert.ok(error.errors['nested.name']);
    assert.ok(!error.errors['nested.age']);
  });

  describe('validation `pathsToSkip` (gh-10230)', () => {
    it('support `pathsToSkip` option for `Document#validate()` and `Document#validate()`', async function() {
      const User = getUserModel();
      const user = new User();

      assert.deepEqual(Object.keys((await user.validate({ pathsToSkip: ['age'] }).then(() => null, err => err)).errors), ['name']);
      assert.deepEqual(Object.keys((await user.validate({ pathsToSkip: ['name'] }).then(() => null, err => err)).errors), ['age']);

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

      const err1 = (await user.validate({ pathsToSkip: 'country rank' }).then(() => null, err => err));
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

  it('runs array-level validator on map of document arrays', async function() {
    const personSchema = new Schema({ age: Number });
    const companySchema = new Schema({
      teams: {
        type: Map,
        of: {
          type: [personSchema],
          // Every person's age must be at least 18.
          validate: people => people.every(person => person.age >= 18)
        }
      }
    });
    const Company = db.model('MapArrayRepro', companySchema);
    const company = await Company.create({
      teams: { support: [{ age: 30 }] }
    });

    company.set('teams.support.0.age', 15);
    let err = await company.validate().then(() => null, err => err);
    assert.ok(err);
    assert.ok(err.errors['teams.support']);

    err = (await company.validate().then(() => null, err => err));
    assert.ok(err);
    assert.ok(err.errors['teams.support']);
  });

  describe('container validators after modifying child paths', function() {
    it('runs primitive array element validators but not the array validator', async function() {
      const calls = { array: 0, element: 0 };
      const Model = db.model('PrimitiveArrayValidatorPaths', new Schema({
        values: {
          type: [{ type: Number, validate: () => ++calls.element }],
          validate: () => ++calls.array
        }
      }));
      const doc = await Model.create({ values: [1] });

      doc.set('values.0', 2);
      calls.array = 0;
      calls.element = 0;
      await doc.validate();
      assert.deepEqual(calls, { array: 0, element: 1 });

      calls.array = 0;
      calls.element = 0;
      await doc.validate();
      assert.deepEqual(calls, { array: 0, element: 1 });
    });

    it('runs document array, element, and subpath validators', async function() {
      const calls = { array: 0, element: 0, subpath: 0 };
      const childSchema = new Schema({
        name: { type: String, validate: () => ++calls.subpath }
      });
      const Model = db.model('DocumentArrayValidatorPaths', new Schema({
        values: {
          type: [{ type: childSchema, validate: () => ++calls.element }],
          validate: () => ++calls.array
        }
      }));

      let doc = await Model.create({ values: [{ name: 'before' }] });
      doc.set('values.0', { name: 'after' });
      calls.array = 0;
      calls.element = 0;
      calls.subpath = 0;
      await doc.validate();
      assert.deepEqual(calls, { array: 1, element: 0, subpath: 1 });

      calls.array = 0;
      calls.element = 0;
      calls.subpath = 0;
      await doc.validate();
      assert.deepEqual(calls, { array: 1, element: 0, subpath: 1 });

      doc = await Model.create({ values: [{ name: 'before' }] });
      doc.set('values.0.name', 'after');
      calls.array = 0;
      calls.element = 0;
      calls.subpath = 0;
      await doc.validate();
      assert.deepEqual(calls, { array: 1, element: 0, subpath: 1 });

      calls.array = 0;
      calls.element = 0;
      calls.subpath = 0;
      await doc.validate();
      assert.deepEqual(calls, { array: 1, element: 0, subpath: 1 });
    });

    it('runs nested document array container, element, and subpath validators', async function() {
      const calls = {
        parentArray: 0,
        parentElement: 0,
        childArray: 0,
        childElement: 0,
        subpath: 0
      };
      const personSchema = new Schema({
        age: { type: Number, validate: () => ++calls.subpath }
      });
      const groupSchema = new Schema({
        people: {
          type: [{ type: personSchema, validate: () => ++calls.childElement }],
          validate: () => ++calls.childArray
        }
      });
      const Model = db.model('NestedDocumentArrayValidatorPaths', new Schema({
        groups: {
          type: [{ type: groupSchema, validate: () => ++calls.parentElement }],
          validate: () => ++calls.parentArray
        }
      }));

      let doc = await Model.create({ groups: [{ people: [{ age: 30 }] }] });
      doc.set('groups.0.people.0', { age: 31 });
      calls.parentArray = 0;
      calls.parentElement = 0;
      calls.childArray = 0;
      calls.childElement = 0;
      calls.subpath = 0;
      await doc.validate();
      assert.deepEqual(calls, {
        parentArray: 1,
        parentElement: 0,
        childArray: 1,
        childElement: 0,
        subpath: 1
      });

      calls.parentArray = 0;
      calls.parentElement = 0;
      calls.childArray = 0;
      calls.childElement = 0;
      calls.subpath = 0;
      await doc.validate();
      assert.deepEqual(calls, {
        parentArray: 1,
        parentElement: 0,
        childArray: 1,
        childElement: 0,
        subpath: 1
      });

      doc = await Model.create({ groups: [{ people: [{ age: 30 }] }] });
      doc.set('groups.0.people.0.age', 31);
      calls.parentArray = 0;
      calls.parentElement = 0;
      calls.childArray = 0;
      calls.childElement = 0;
      calls.subpath = 0;
      await doc.validate();
      assert.deepEqual(calls, {
        parentArray: 1,
        parentElement: 0,
        childArray: 1,
        childElement: 0,
        subpath: 1
      });

      calls.parentArray = 0;
      calls.parentElement = 0;
      calls.childArray = 0;
      calls.childElement = 0;
      calls.subpath = 0;
      await doc.validate();
      assert.deepEqual(calls, {
        parentArray: 1,
        parentElement: 0,
        childArray: 1,
        childElement: 0,
        subpath: 1
      });
    });

    it('runs map element validators but not the map validator for primitive values', async function() {
      const calls = { map: 0, element: 0 };
      const Model = db.model('PrimitiveMapValidatorPaths', new Schema({
        values: {
          type: Map,
          of: { type: Number, validate: () => ++calls.element },
          validate: () => ++calls.map
        }
      }));
      const doc = await Model.create({ values: { key: 1 } });

      doc.set('values.key', 2);
      calls.map = 0;
      calls.element = 0;
      await doc.validate();
      assert.deepEqual(calls, { map: 0, element: 1 });

      calls.map = 0;
      calls.element = 0;
      await doc.validate();
      assert.deepEqual(calls, { map: 0, element: 1 });
    });

    it('handles map, element, and subpath validators for subdocument values', async function() {
      const calls = { map: 0, element: 0, subpath: 0 };
      const childSchema = new Schema({
        name: { type: String, validate: () => ++calls.subpath }
      });
      const Model = db.model('SubdocumentMapValidatorPaths', new Schema({
        values: {
          type: Map,
          of: { type: childSchema, validate: () => ++calls.element },
          validate: () => ++calls.map
        }
      }));

      let doc = await Model.create({ values: { key: { name: 'before' } } });
      doc.set('values.key', { name: 'after' });
      calls.map = 0;
      calls.element = 0;
      calls.subpath = 0;
      await doc.validate();
      assert.deepEqual(calls, { map: 0, element: 1, subpath: 1 });

      calls.map = 0;
      calls.element = 0;
      calls.subpath = 0;
      await doc.validate();
      assert.deepEqual(calls, { map: 0, element: 1, subpath: 1 });

      doc = await Model.create({ values: { key: { name: 'before' } } });
      doc.set('values.key.name', 'after');
      calls.map = 0;
      calls.element = 0;
      calls.subpath = 0;
      await doc.validate();
      assert.deepEqual(calls, { map: 0, element: 0, subpath: 1 });

      calls.map = 0;
      calls.element = 0;
      calls.subpath = 0;
      await doc.validate();
      assert.deepEqual(calls, { map: 0, element: 0, subpath: 1 });
    });

    it('handles map, array, element, and subpath validators for document array values', async function() {
      const calls = { map: 0, array: 0, element: 0, subpath: 0 };
      const childSchema = new Schema({
        name: { type: String, validate: () => ++calls.subpath }
      });
      const Model = db.model('DocumentArrayMapValidatorPaths', new Schema({
        values: {
          type: Map,
          of: {
            type: [{ type: childSchema, validate: () => ++calls.element }],
            validate: () => ++calls.array
          },
          validate: () => ++calls.map
        }
      }));

      let doc = await Model.create({ values: { key: [{ name: 'before' }] } });
      doc.set('values.key.0', { name: 'after' });
      calls.map = 0;
      calls.array = 0;
      calls.element = 0;
      calls.subpath = 0;
      await doc.validate();
      assert.deepEqual(calls, { map: 0, array: 1, element: 1, subpath: 1 });

      calls.map = 0;
      calls.array = 0;
      calls.element = 0;
      calls.subpath = 0;
      await doc.validate();
      assert.deepEqual(calls, { map: 0, array: 1, element: 1, subpath: 1 });

      doc = await Model.create({ values: { key: [{ name: 'before' }] } });
      doc.set('values.key.0.name', 'after');
      calls.map = 0;
      calls.array = 0;
      calls.element = 0;
      calls.subpath = 0;
      await doc.validate();
      assert.deepEqual(calls, { map: 0, array: 1, element: 0, subpath: 1 });

      calls.map = 0;
      calls.array = 0;
      calls.element = 0;
      calls.subpath = 0;
      await doc.validate();
      assert.deepEqual(calls, { map: 0, array: 1, element: 0, subpath: 1 });
    });

  });

  it('skips nested document array validation if parent document array is skipped', async function() {
    const companySchema = new Schema({
      groups: [{
        // Age must be at least 18 when this path is validated.
        people: [{ age: { type: Number, min: 18 } }]
      }]
    });
    const Company = db.model('SkipOuterArrayRepro', companySchema);
    const company = new Company({
      groups: [{ people: [{ age: 30 }] }]
    });

    company.set('groups.0.people.0.age', 15);
    await company.validate({ pathsToSkip: ['groups'] });
    assert.ifError((await company.validate({ pathsToSkip: ['groups'] }).then(() => null, err => err)));
  });

  it('does not reject valid data under mixed', async function() {
    const validatedProfiles = [];
    const userSchema = new Schema({
      profile: {
        type: Schema.Types.Mixed,
        // The profile object's age must be at least 18.
        validate: profile => {
          validatedProfiles.push(profile);
          return profile.age >= 18;
        }
      }
    });
    const User = db.model('MixedParentRepro', userSchema);
    const user = await User.create({ profile: { age: 30 } });

    user.set('profile.age', 31);
    validatedProfiles.length = 0;
    let error = await user.validate(['profile']).then(() => null, err => err);
    assert.ifError(error);
    assert.deepEqual(validatedProfiles, []);

    validatedProfiles.length = 0;
    error = (await user.validate(['profile']).then(() => null, err => err));
    assert.ifError(error);
    assert.deepEqual(validatedProfiles, []);

    validatedProfiles.length = 0;
    error = await user.validate().then(() => null, err => err);
    assert.ifError(error);
    assert.deepEqual(validatedProfiles, []);

    error = (await user.validate().then(() => null, err => err));
    assert.ifError(error);
    assert.deepEqual(validatedProfiles, []);
  });
});
