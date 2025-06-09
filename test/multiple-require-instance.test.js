'use strict';

const start = require('./common');

let mongoose2;

describe('multiple require instance', function() {
  before(function() {
    try {
      mongoose2 = require('mongoose-separate-require-instance');
    } catch (err) {
      return this.skip();
    }
  });

  let db;
  beforeEach(function() {
    db = start();
  });
  afterEach(() => db.close());

  it('supports arrays defined using schemas from separate instance (gh-15466)', async function() {
    const nestedSchema = new mongoose2.Schema(
      { name: String },
      { _id: false }
    );

    const schema = new mongoose2.Schema({
      subDoc: nestedSchema,
      docArray: [nestedSchema] // this array of nestedSchema causes the error
    });

    const document = {
      subDoc: { name: 'Alpha' },
      docArray: [
        { name: 'Bravo' },
        { name: 'Charlie' }
      ]
    };

    const TestModel = db.model('Test', schema);
    const doc = new TestModel(document);
    await doc.validate();

  });
});
