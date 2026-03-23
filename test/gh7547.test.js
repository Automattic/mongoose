'use strict';

const start = require('./common');
const mongoose = start.mongoose;
const assert = require('assert');

describe('Model.__subclass() deprecation (gh-7547)', function() {
  let db;

  before(function() {
    db = start();
  });

  after(async function() {
    await db.close();
  });

  it('emits a warning when Model.__subclass() is called directly', function(done) {
    const schema = new mongoose.Schema({ name: String });
    const MyModel = db.model('gh7547', schema);

    const onWarning = (warning) => {
      if (warning.message.includes('Model.__subclass() is deprecated')) {
        process.removeListener('warning', onWarning);
        done();
      }
    };
    process.on('warning', onWarning);

    MyModel.__subclass(db, schema, 'gh7547_sub');
  });

  it('emits a warning when a dangling model is created via connection.model()', function(done) {
    const schema = new mongoose.Schema({ name: String });
    db.model('gh7547_dangling', schema);

    const onWarning = (warning) => {
      if (warning.message.includes('Calling mongoose.model() with an existing model name and a different collection is deprecated')) {
        process.removeListener('warning', onWarning);
        done();
      }
    };
    process.on('warning', onWarning);

    // This should trigger the warning because 'gh7547_dangling' already exists
    // and we are providing a different collection name.
    db.model('gh7547_dangling', 'different_collection');
  });

  it('emits a warning when a dangling model is created via mongoose.model()', function(done) {
    const schema = new mongoose.Schema({ name: String });
    mongoose.model('gh7547_mongoose', schema);

    const onWarning = (warning) => {
      if (warning.message.includes('Calling mongoose.model() with an existing model name and a different collection is deprecated')) {
        process.removeListener('warning', onWarning);
        done();
      }
    };
    process.on('warning', onWarning);

    mongoose.model('gh7547_mongoose', 'different_collection');
  });
});
