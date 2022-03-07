'use strict';

const assert = require('assert');
const v8Serialize = require('v8').serialize;
const start = require('../common');

// This file is in `es-next` because it uses async/await for convenience

describe('Lean Tutorial', function() {
  let MyModel;
  const mongoose = new start.mongoose.Mongoose();

  before(function() {
    const schema = new mongoose.Schema({ name: String });
    MyModel = mongoose.model('Test1', schema);

    return mongoose.connect(start.uri);
  });

  beforeEach(function() {
    mongoose.deleteModel(/Person/);
    mongoose.deleteModel(/Group/);
  });

  it('compare sizes lean vs not lean', async function() {
    const schema = new mongoose.Schema({ name: String });
    const MyModel = mongoose.model('Test', schema);

    await MyModel.create({ name: 'test' });

    const normalDoc = await MyModel.findOne();
    // To enable the `lean` option for a query, use the `lean()` function.
    const leanDoc = await MyModel.findOne().lean();

    v8Serialize(normalDoc).length; // approximately 300
    v8Serialize(leanDoc).length; // 32, more than 10x smaller!

    // In case you were wondering, the JSON form of a Mongoose doc is the same
    // as the POJO. This additional memory only affects how much memory your
    // Node.js process uses, not how much data is sent over the network.
    JSON.stringify(normalDoc).length === JSON.stringify(leanDoc).length; // true
    // acquit:ignore:start
    assert.ok(v8Serialize(normalDoc).length >= 300 && v8Serialize(normalDoc).length <= 800, v8Serialize(normalDoc).length);
    assert.equal(v8Serialize(leanDoc).length, 32);
    assert.equal(JSON.stringify(normalDoc).length, JSON.stringify(leanDoc).length);
    // acquit:ignore:end
  });

  it('compare types', async function() {
    // acquit:ignore:start
    await MyModel.create({ name: 'test' });
    // acquit:ignore:end
    const normalDoc = await MyModel.findOne();
    const leanDoc = await MyModel.findOne().lean();

    normalDoc instanceof mongoose.Document; // true
    normalDoc.constructor.name; // 'model'

    leanDoc instanceof mongoose.Document; // false
    leanDoc.constructor.name; // 'Object'
    // acquit:ignore:start
    assert.ok(normalDoc instanceof mongoose.Document);
    assert.equal(normalDoc.constructor.name, 'model');
    assert.ok(!(leanDoc instanceof mongoose.Document));
    assert.equal(leanDoc.constructor.name, 'Object');
    // acquit:ignore:end
  });

  it('getters and virtuals', async function() {
    // Define a `Person` model. Schema has 2 custom getters and a `fullName`
    // virtual. Neither the getters nor the virtuals will run if lean is enabled.
    const personSchema = new mongoose.Schema({
      firstName: {
        type: String,
        get: capitalizeFirstLetter
      },
      lastName: {
        type: String,
        get: capitalizeFirstLetter
      }
    });
    personSchema.virtual('fullName').get(function() {
      return `${this.firstName} ${this.lastName}`;
    });
    function capitalizeFirstLetter(v) {
      // Convert 'bob' -> 'Bob'
      return v.charAt(0).toUpperCase() + v.substring(1);
    }
    const Person = mongoose.model('Person', personSchema);
    // acquit:ignore:start
    await Person.deleteMany({});
    // acquit:ignore:end

    // Create a doc and load it as a lean doc
    await Person.create({ firstName: 'benjamin', lastName: 'sisko' });
    const normalDoc = await Person.findOne();
    const leanDoc = await Person.findOne().lean();

    normalDoc.fullName; // 'Benjamin Sisko'
    normalDoc.firstName; // 'Benjamin', because of `capitalizeFirstLetter()`
    normalDoc.lastName; // 'Sisko', because of `capitalizeFirstLetter()`

    leanDoc.fullName; // undefined
    leanDoc.firstName; // 'benjamin', custom getter doesn't run
    leanDoc.lastName; // 'sisko', custom getter doesn't run
    // acquit:ignore:start
    assert.equal(normalDoc.fullName, 'Benjamin Sisko');
    assert.equal(normalDoc.firstName, 'Benjamin');
    assert.equal(normalDoc.lastName, 'Sisko');
    assert.equal(leanDoc.fullName, void 0);
    assert.equal(leanDoc.firstName, 'benjamin');
    assert.equal(leanDoc.lastName, 'sisko');
    // acquit:ignore:end
  });

  it('conventional populate', async function() {
    // Create models
    const Group = mongoose.model('Group', new mongoose.Schema({
      name: String,
      members: [{ type: mongoose.ObjectId, ref: 'Person' }]
    }));
    const Person = mongoose.model('Person', new mongoose.Schema({
      name: String
    }));
    // acquit:ignore:start
    await Group.deleteMany({});
    await Person.deleteMany({});
    // acquit:ignore:end

    // Initialize data
    const people = await Person.create([
      { name: 'Benjamin Sisko' },
      { name: 'Kira Nerys' }
    ]);
    await Group.create({
      name: 'Star Trek: Deep Space Nine Characters',
      members: people.map(p => p._id)
    });

    // Execute a lean query
    const group = await Group.findOne().lean().populate('members');
    group.members[0].name; // 'Benjamin Sisko'
    group.members[1].name; // 'Kira Nerys'

    // Both the `group` and the populated `members` are lean.
    group instanceof mongoose.Document; // false
    group.members[0] instanceof mongoose.Document; // false
    group.members[1] instanceof mongoose.Document; // false
    // acquit:ignore:start
    assert.equal(group.members[0].name, 'Benjamin Sisko');
    assert.equal(group.members[1].name, 'Kira Nerys');
    // acquit:ignore:end
  });

  it('virtual populate', async function() {
    // Create models
    const groupSchema = new mongoose.Schema({ name: String });
    groupSchema.virtual('members', {
      ref: 'Person',
      localField: '_id',
      foreignField: 'groupId'
    });
    const Group = mongoose.model('Group', groupSchema);
    const Person = mongoose.model('Person', new mongoose.Schema({
      name: String,
      groupId: mongoose.ObjectId
    }));
    // acquit:ignore:start
    await Group.deleteMany({});
    await Person.deleteMany({});
    // acquit:ignore:end

    // Initialize data
    const g = await Group.create({ name: 'DS9 Characters' });
    const people = await Person.create([
      { name: 'Benjamin Sisko', groupId: g._id },
      { name: 'Kira Nerys', groupId: g._id }
    ]);

    // Execute a lean query
    const group = await Group.findOne().lean().populate({
      path: 'members',
      options: { sort: { name: 1 } }
    });
    group.members[0].name; // 'Benjamin Sisko'
    group.members[1].name; // 'Kira Nerys'

    // Both the `group` and the populated `members` are lean.
    group instanceof mongoose.Document; // false
    group.members[0] instanceof mongoose.Document; // false
    group.members[1] instanceof mongoose.Document; // false
    // acquit:ignore:start
    assert.equal(group.members[0].name, 'Benjamin Sisko');
    assert.equal(group.members[1].name, 'Kira Nerys');
    // acquit:ignore:end
  });
});
