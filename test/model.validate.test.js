'use strict';

const start = require('./common');

const assert = require('assert');

const mongoose = start.mongoose;
const Schema = mongoose.Schema;

describe('model: validate: ', function() {
  beforeEach(() => mongoose.deleteModel(/.*/));
  after(() => mongoose.deleteModel(/.*/));

  it('Model.validate() (gh-7587)', async function() {
    const Model = mongoose.model('Test', new Schema({
      name: {
        first: {
          type: String,
          required: true
        },
        last: {
          type: String,
          required: true
        }
      },
      age: {
        type: Number,
        required: true
      },
      comments: [{ name: { type: String, required: true } }]
    }));


    let err = null;
    let obj = null;

    err = await Model.validate({ age: null }, ['age']).
      then(() => null, err => err);
    assert.ok(err);
    assert.deepEqual(Object.keys(err.errors), ['age']);

    err = await Model.validate({ name: {} }, ['name']).
      then(() => null, err => err);
    assert.ok(err);
    assert.deepEqual(Object.keys(err.errors), ['name.first', 'name.last']);

    obj = { name: { first: 'foo' } };
    err = await Model.validate(obj, ['name']).
      then(() => null, err => err);
    assert.ok(err);
    assert.deepEqual(Object.keys(err.errors), ['name.last']);

    obj = { comments: [{ name: 'test' }, {}] };
    err = await Model.validate(obj, ['comments']).
      then(() => null, err => err);
    assert.ok(err);
    assert.deepEqual(Object.keys(err.errors), ['comments.name']);

    obj = { age: '42' };
    await Model.validate(obj, ['age']);
    assert.strictEqual(obj.age, 42);
  });

  it('Model.validate(...) validates paths in arrays (gh-8821)', async function() {
    const userSchema = new Schema({
      friends: [{ type: String, required: true, minlength: 3 }]
    });

    const User = mongoose.model('User', userSchema);

    const err = await User.validate({ friends: [null, 'A'] }).catch(err => err);

    assert.ok(err.errors['friends.0']);
    assert.ok(err.errors['friends.1']);
  });

  it('Model.validate(...) respects discriminators (gh-12621)', async function() {
    const CatSchema = new Schema({ meows: { type: Boolean, required: true } });
    const DogSchema = new Schema({ barks: { type: Boolean, required: true } });
    const AnimalSchema = new Schema(
      { id: String },
      { discriminatorKey: 'kind' }
    );
    AnimalSchema.discriminator('cat', CatSchema);
    AnimalSchema.discriminator('dog', DogSchema);

    const Animal = mongoose.model('Test', AnimalSchema);

    const invalidPet1 = new Animal({
      id: '123',
      kind: 'dog',
      meows: true
    });

    const err = await Animal.validate(invalidPet1).then(() => null, err => err);
    assert.ok(err);
    assert.ok(err.errors['barks']);
  });

  it('Model.validate() works with arrays (gh-10669)', async function() {
    const testSchema = new Schema({
      docs: [String]
    });

    const Test = mongoose.model('Test', testSchema);

    const test = { docs: ['6132655f2cdb9d94eaebc09b'] };

    const err = await Test.validate(test);
    assert.ifError(err);
  });

  it('Model.validate(...) uses document instance as context by default (gh-10132)', async function() {
    const userSchema = new Schema({
      name: {
        type: String,
        required: function() {
          return this.nameRequired;
        }
      },
      nameRequired: Boolean
    });

    const User = mongoose.model('User', userSchema);

    const user = new User({ name: 'test', nameRequired: false });
    const err = await User.validate(user).catch(err => err);

    assert.ifError(err);

  });
  it('Model.validate(...) uses object as context by default (gh-10346)', async() => {

    const userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      age: { type: Number, required() {return this && this.name === 'John';} }
    });

    const User = mongoose.model('User', userSchema);

    const err1 = await User.validate({ name: 'John' }).then(() => null, err => err);
    assert.ok(err1);

    const err2 = await User.validate({ name: 'Sam' }).then(() => null, err => err);
    assert.ok(err2 === null);
  });
});
