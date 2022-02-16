'use strict';
const assert = require('assert');
const mongoose = require('../../');
const start = require('../common');

describe('schemaTypes', function() {
  let db;
  const Schema = mongoose.Schema;

  before(function() {
    db = mongoose.createConnection(start.uri);
  });

  after(async function() {
    await db.close();
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
    class Int8 extends mongoose.SchemaType {
      constructor(key, options) {
        super(key, options, 'Int8');
      }

      // `cast()` takes a parameter that can be anything. You need to
      // validate the provided `val` and throw a `CastError` if you
      // can't convert it.
      cast(val) {
        let _val = Number(val);
        if (isNaN(_val)) {
          throw new Error('Int8: ' + val + ' is not a number');
        }
        _val = Math.round(_val);
        if (_val < -0x80 || _val > 0x7F) {
          throw new Error('Int8: ' + val +
            ' is outside of the range of valid 8-bit ints');
        }
        return _val;
      }
    }

    // Don't forget to add `Int8` to the type registry
    mongoose.Schema.Types.Int8 = Int8;

    const testSchema = new Schema({ test: Int8 });
    const Test = mongoose.model('CustomTypeExample', testSchema);

    const t = new Test();
    t.test = 'abc';
    assert.ok(t.validateSync());
    assert.equal(t.validateSync().errors['test'].name, 'CastError');
    assert.equal(t.validateSync().errors['test'].message,
      'Cast to Int8 failed for value "abc" (type string) at path "test"');
    assert.equal(t.validateSync().errors['test'].reason.message,
      'Int8: abc is not a number');
  });
});
