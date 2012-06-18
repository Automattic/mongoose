
var start = require('./common')
  , mongoose = start.mongoose
  , assert = require('assert')
  , Collection = require('../lib/collection');

describe('collections:', function(){
  it('should buffer commands until connection is established', function(done){
    var db = mongoose.createConnection()
      , collection = db.collection('test-buffering-collection')
      , connected = false
      , inserted = false
      , pending = 2

    function finish () {
      if (--pending) return;
      assert.ok(connected);
      assert.ok(inserted);
      done();
    }

    collection.insert({ }, function(){
      assert.ok(connected);
      inserted = true;
      db.close();
      finish();
    });

    var uri = 'mongodb://localhost/mongoose_test';
    db.open(process.env.MONGOOSE_TEST_URI || uri, function(err){
      connected = !err;
      finish();
    });
  })

  it('methods should that throw (unimplemented)', function(){
    var collection = new Collection('test', mongoose.connection)
      , thrown = false;

    try {
      collection.getIndexes();
    } catch (e) {
      assert.ok(/unimplemented/.test(e.message));
      thrown = true;
    }

    assert.ok(thrown);
    thrown = false;

    try {
      collection.update();
    } catch (e) {
      assert.ok(/unimplemented/.test(e.message));
      thrown = true;
    }

    assert.ok(thrown);
    thrown = false;

    try {
      collection.save();
    } catch (e) {
      assert.ok(/unimplemented/.test(e.message));
      thrown = true;
    }

    assert.ok(thrown);
    thrown = false;

    try {
      collection.insert();
    } catch (e) {
      assert.ok(/unimplemented/.test(e.message));
      thrown = true;
    }

    assert.ok(thrown);
    thrown = false;

    try {
      collection.find();
    } catch (e) {
      assert.ok(/unimplemented/.test(e.message));
      thrown = true;
    }

    assert.ok(thrown);
    thrown = false;

    try {
      collection.findOne();
    } catch (e) {
      assert.ok(/unimplemented/.test(e.message));
      thrown = true;
    }

    assert.ok(thrown);
    thrown = false;

    try {
      collection.findAndModify();
    } catch (e) {
      assert.ok(/unimplemented/.test(e.message));
      thrown = true;
    }

    assert.ok(thrown);
    thrown = false;

    try {
      collection.ensureIndex();
    } catch (e) {
      assert.ok(/unimplemented/.test(e.message));
      thrown = true;
    }

    assert.ok(thrown);
    thrown = false;
  })
})
