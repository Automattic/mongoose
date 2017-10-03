var assert = require('assert');
var mongoose = require('../../');

describe('schemaTypes', function () {
  var db;
  var Schema = mongoose.Schema;

  before(function() {
    db = mongoose.createConnection('mongodb://localhost:27017/mongoose_test');
  });

  after(function(done) {
    db.close(done);
  });

  /**
   * _New in Mongoose 4.4.0:_ Mongoose supports custom types. Before you
   * reach for a custom type, however, know that a custom type is overkill
   * for most use cases. You can do most basic tasks with
   * [custom getters/setters](http://mongoosejs.com/docs/2.7.x/docs/getters-setters.html),
   * [virtuals](http://mongoosejs.com/docs/guide.html#virtuals), and
   * [single embedded docs](http://mongoosejs.com/docs/subdocs.html#single-embedded).
   *
   * Let's take a look at an example of a basic schema type: a 1-byte integer.
   * To create a new schema type, you need to inherit from `mongoose.SchemaType`
   * and add the corresponding property to `mongoose.Schema.Types`. The one
   * method you need to implement is the `cast()` method.
   */
  it('Creating a Basic Custom Schema Type', function() {
    function Int8(key, options) {
      mongoose.SchemaType.call(this, key, options, 'Int8');
    }
    Int8.prototype = Object.create(mongoose.SchemaType.prototype);

    // `cast()` takes a parameter that can be anything. You need to
    // validate the provided `val` and throw a `CastError` if you
    // can't convert it.
    Int8.prototype.cast = function(val) {
      var _val = Number(val);
      if (isNaN(_val)) {
        throw new Error('Int8: ' + val + ' is not a number');
      }
      _val = Math.round(_val);
      if (_val < -0x80 || _val > 0x7F) {
        throw new Error('Int8: ' + val +
          ' is outside of the range of valid 8-bit ints');
      }
      return _val;
    };

    // Don't forget to add `Int8` to the type registry
    mongoose.Schema.Types.Int8 = Int8;

    var testSchema = new Schema({ test: Int8 });
    var Test = mongoose.model('CustomTypeExample', testSchema);

    var t = new Test();
    t.test = 'abc';
    assert.ok(t.validateSync());
    assert.equal(t.validateSync().errors['test'].name, 'CastError');
    assert.equal(t.validateSync().errors['test'].message,
      'Cast to Int8 failed for value "abc" at path "test"');
    assert.equal(t.validateSync().errors['test'].reason.message,
      'Int8: abc is not a number');
  });
});
