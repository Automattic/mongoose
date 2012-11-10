
/**
 * Module dependencies.
 */

var mongoose = require('./common').mongoose
  , SchemaNumber = mongoose.Schema.Types.Number
  , assert = require('assert')

/**
 * Test.
 */

describe('types.number', function(){

  it('an empty string casts to null', function (done) {
    var n = new SchemaNumber();
    assert.strictEqual(n.cast(''), null);
    done();
  })

  it('a null number should castForQuery to null', function (done) {
    var n = new SchemaNumber();
    assert.strictEqual(n.castForQuery(null), null);
    done();
  })

  it('undefined throws number cast error', function (done) {
    var n = new SchemaNumber();
    var err;
    try {
      n.cast(undefined);
    } catch (e) {
      err = e;
    }
    assert.strictEqual(true, !! err);
    done();
  })

  it('array throws cast number error', function (done) {
    var n = new SchemaNumber();
    var err;
    try {
      n.cast([]);
    } catch (e) {
      err = e;
    }
    assert.strictEqual(true, !! err);
    done();
  })

  it('three throws cast number error', function (done) {
    var n = new SchemaNumber();
    var err;
    try {
      n.cast('three');
    } catch (e) {
      err = e;
    }
    assert.strictEqual(true, !! err);
    done();
  })

  it('{} throws cast number error', function (done) {
    var n = new SchemaNumber();
    var err;
    try {
      n.cast({});
    } catch (e) {
      err = e;
    }
    assert.strictEqual(true, !! err);
    done();
  })

  it('does not throw number cast error', function (done) {
    var n = new SchemaNumber();
    var items = [1, '2', '0', null, '', new String('47'), new Number(5), Number(47), 09, 0x12];
    var err;
    try {
      for (var i = 0, len = items.length; i < len; ++i) {
        n.cast(items[i]);
      }
    } catch (e) {
      err = e;
    }
    assert.strictEqual(false, !! err, err);
    done();
  })

})
