var assert = require('assert');
var mongoose = require('../../');

var Promise = global.Promise || require('bluebird');

describe('validation docs', function() {
  var db;
  var Schema = mongoose.Schema;

  before(function() {
    db = mongoose.createConnection('mongodb://localhost:27017/mongoose_test', {
      poolSize: 1
    });
  });

  after(function(done) {
    db.close(done);
  });

  /**
   * Before we get into the specifics of validation syntax, please keep the following rules in mind:
   *
   * - Validation is defined in the [SchemaType](./schematypes.html)
   * - Validation is [middleware](./middleware.html). Mongoose registers validation as a `pre('save')` hook on every schema by default.
   * - You can manually run validation using `doc.validate(callback)` or `doc.validateSync()`
   * - Validators are not run on undefined values. The only exception is the [`required` validator](./api.html#schematype_SchemaType-required).
   * - Validation is asynchronously recursive; when you call [Model#save](./api.html#model_Model-save), sub-document validation is executed as well. If an error occurs, your [Model#save](./api.html#model_Model-save) callback receives it
   * - Validation is customizable
   */

  it('Validation', function(done) {
    var schema = new Schema({
      name: {
        type: String,
        required: true
      }
    });
    var Cat = db.model('Cat', schema);

    // This cat has no name :(
    var cat = new Cat();
    cat.save(function(error) {
      assert.equal(error.errors['name'].message,
        'Path `name` is required.');

      error = cat.validateSync();
      assert.equal(error.errors['name'].message,
        'Path `name` is required.');
      // acquit:ignore:start
      done();
      // acquit:ignore:end
    });
  });

  /**
   * Mongoose has several built-in validators.
   *
   * - All [SchemaTypes](./schematypes.html) have the built-in [required](./api.html#schematype_SchemaType-required) validator. The required validator uses the [SchemaType's `checkRequired()` function](./api.html#schematype_SchemaType-checkRequired) to determine if the value satisfies the required validator.
   * - [Numbers](./api.html#schema-number-js) have [min](./api.html#schema_number_SchemaNumber-min) and [max](./api.html#schema_number_SchemaNumber-max) validators.
   * - [Strings](./api.html#schema-string-js) have [enum](./api.html#schema_string_SchemaString-enum), [match](./api.html#schema_string_SchemaString-match), [maxlength](./api.html#schema_string_SchemaString-maxlength) and [minlength](./api.html#schema_string_SchemaString-minlength) validators.
   *
   * Each of the validator links above provide more information about how to enable them and customize their error messages.
   */

  it('Built-in Validators', function(done) {
    var breakfastSchema = new Schema({
      eggs: {
        type: Number,
        min: [6, 'Too few eggs'],
        max: 12
      },
      bacon: {
        type: Number,
        required: [true, 'Why no bacon?']
      },
      drink: {
        type: String,
        enum: ['Coffee', 'Tea'],
        required: function() {
          return this.bacon > 3;
        }
      }
    });
    var Breakfast = db.model('Breakfast', breakfastSchema);

    var badBreakfast = new Breakfast({
      eggs: 2,
      bacon: 0,
      drink: 'Milk'
    });
    var error = badBreakfast.validateSync();
    assert.equal(error.errors['eggs'].message,
      'Too few eggs');
    assert.ok(!error.errors['bacon']);
    assert.equal(error.errors['drink'].message,
      '`Milk` is not a valid enum value for path `drink`.');

    badBreakfast.bacon = 5;
    badBreakfast.drink = null;

    error = badBreakfast.validateSync();
    assert.equal(error.errors['drink'].message, 'Path `drink` is required.');

    badBreakfast.bacon = null;
    error = badBreakfast.validateSync();
    assert.equal(error.errors['bacon'].message, 'Why no bacon?');
    // acquit:ignore:start
    done();
    // acquit:ignore:end
  });

  /**
   * A common gotcha for beginners is that the `unique` option for schemas
   * is *not* a validator. It's a convenient helper for building [MongoDB unique indexes](https://docs.mongodb.com/manual/core/index-unique/).
   * See the [FAQ](/docs/faq.html) for more information.
   */

  it('The `unique` Option is Not a Validator', function(done) {
    var uniqueUsernameSchema = new Schema({
      username: {
        type: String,
        unique: true
      }
    });
    var U1 = db.model('U1', uniqueUsernameSchema);
    var U2 = db.model('U2', uniqueUsernameSchema);
    // acquit:ignore:start
    var remaining = 3;
    // acquit:ignore:end

    var dup = [{ username: 'Val' }, { username: 'Val' }];
    U1.create(dup, function(error) {
      // Race condition! This may save successfully, depending on whether
      // MongoDB built the index before writing the 2 docs.
      // acquit:ignore:start
      // Avoid ESLint errors
      error;
      --remaining || done();
      // acquit:ignore:end
    });

    // Need to wait for the index to finish building before saving,
    // otherwise unique constraints may be violated.
    U2.once('index', function(error) {
      assert.ifError(error);
      U2.create(dup, function(error) {
        // Will error, but will *not* be a mongoose validation error, it will be
        // a duplicate key error.
        assert.ok(error);
        assert.ok(!error.errors);
        assert.ok(error.message.indexOf('duplicate key error') !== -1);
        // acquit:ignore:start
        --remaining || done();
        // acquit:ignore:end
      });
    });

    // There's also a promise-based equivalent to the event emitter API.
    // The `init()` function is idempotent and returns a promise that
    // will resolve once indexes are done building;
    U2.init().then(function() {
      U2.create(dup, function(error) {
        // Will error, but will *not* be a mongoose validation error, it will be
        // a duplicate key error.
        assert.ok(error);
        assert.ok(!error.errors);
        assert.ok(error.message.indexOf('duplicate key error') !== -1);
        // acquit:ignore:start
        --remaining || done();
        // acquit:ignore:end
      });
    });
  });

  /**
   * If the built-in validators aren't enough, you can define custom validators
   * to suit your needs.
   *
   * Custom validation is declared by passing a validation function.
   * You can find detailed instructions on how to do this in the
   * [`SchemaType#validate()` API docs](./api.html#schematype_SchemaType-validate).
   */
  it('Custom Validators', function(done) {
    var userSchema = new Schema({
      phone: {
        type: String,
        validate: {
          validator: function(v) {
            return /\d{3}-\d{3}-\d{4}/.test(v);
          },
          message: '{VALUE} is not a valid phone number!'
        },
        required: [true, 'User phone number required']
      }
    });

    var User = db.model('user', userSchema);
    var user = new User();
    var error;

    user.phone = '555.0123';
    error = user.validateSync();
    assert.equal(error.errors['phone'].message,
      '555.0123 is not a valid phone number!');

    user.phone = '';
    error = user.validateSync();
    assert.equal(error.errors['phone'].message,
      'User phone number required');

    user.phone = '201-555-0123';
    // Validation succeeds! Phone number is defined
    // and fits `DDD-DDD-DDDD`
    error = user.validateSync();
    assert.equal(error, null);
    // acquit:ignore:start
    done();
    // acquit:ignore:end
  });

  /**
   * Custom validators can also be asynchronous. If your validator function
   * returns a promise (like an `async` function), mongoose will wait for that
   * promise to settle. If you prefer callbacks, set the `isAsync` option,
   * and mongoose will pass a callback as the 2nd argument to your validator
   * function.
   */
  it('Async Custom Validators', function(done) {
    var userSchema = new Schema({
      name: {
        type: String,
        // You can also make a validator async by returning a promise. If you
        // return a promise, do **not** specify the `isAsync` option.
        validate: function(v) {
          return new Promise(function(resolve, reject) {
            setTimeout(function() {
              resolve(false);
            }, 5);
          });
        }
      },
      phone: {
        type: String,
        validate: {
          isAsync: true,
          validator: function(v, cb) {
            setTimeout(function() {
              var phoneRegex = /\d{3}-\d{3}-\d{4}/;
              var msg = v + ' is not a valid phone number!';
              // First argument is a boolean, whether validator succeeded
              // 2nd argument is an optional error message override
              cb(phoneRegex.test(v), msg);
            }, 5);
          },
          // Default error message, overridden by 2nd argument to `cb()` above
          message: 'Default error message'
        },
        required: [true, 'User phone number required']
      }
    });

    var User = db.model('User', userSchema);
    var user = new User();
    var error;

    user.phone = '555.0123';
    user.name = 'test';
    user.validate(function(error) {
      assert.ok(error);
      assert.equal(error.errors['phone'].message,
        '555.0123 is not a valid phone number!');
      assert.equal(error.errors['name'].message,
        'Validator failed for path `name` with value `test`');
      // acquit:ignore:start
      done();
      // acquit:ignore:end
    });
  });

  /**
   * Errors returned after failed validation contain an `errors` object
   * whose values are `ValidatorError` objects. Each
   * [ValidatorError](./api.html#error-validation-js) has `kind`, `path`,
   * `value`, and `message` properties.
   * A ValidatorError also may have a `reason` property. If an error was
   * thrown in the validator, this property will contain the error that was
   * thrown.
   */

  it('Validation Errors', function(done) {
    var toySchema = new Schema({
      color: String,
      name: String
    });

    var validator = function(value) {
      return /red|white|gold/i.test(value);
    };
    toySchema.path('color').validate(validator,
      'Color `{VALUE}` not valid', 'Invalid color');
    toySchema.path('name').validate(function(v) {
      if (v !== 'Turbo Man') {
        throw new Error('Need to get a Turbo Man for Christmas');
      }
      return true;
    }, 'Name `{VALUE}` is not valid');

    var Toy = db.model('Toy', toySchema);

    var toy = new Toy({ color: 'Green', name: 'Power Ranger' });

    toy.save(function (err) {
      // `err` is a ValidationError object
      // `err.errors.color` is a ValidatorError object
      assert.equal(err.errors.color.message, 'Color `Green` not valid');
      assert.equal(err.errors.color.kind, 'Invalid color');
      assert.equal(err.errors.color.path, 'color');
      assert.equal(err.errors.color.value, 'Green');

      // This is new in mongoose 5. If your validator throws an exception,
      // mongoose will use that message. If your validator returns `false`,
      // mongoose will use the 'Name `Power Ranger` is not valid' message.
      assert.equal(err.errors.name.message,
        'Need to get a Turbo Man for Christmas');
      assert.equal(err.errors.name.value, 'Power Ranger');
      // If your validator threw an error, the `reason` property will contain
      // the original error thrown, including the original stack trace.
      assert.equal(err.errors.name.reason.message,
        'Need to get a Turbo Man for Christmas');

      assert.equal(err.name, 'ValidationError');
      // acquit:ignore:start
      done();
      // acquit:ignore:end
    });
  });

  /**
   * Defining validators on nested objects in mongoose is tricky, because
   * nested objects are not fully fledged paths.
   */

  it('Required Validators On Nested Objects', function(done) {
    var personSchema = new Schema({
      name: {
        first: String,
        last: String
      }
    });

    assert.throws(function() {
      // This throws an error, because 'name' isn't a full fledged path
      personSchema.path('name').required(true);
    }, /Cannot.*'required'/);

    // To make a nested object required, use a single nested schema
    var nameSchema = new Schema({
      first: String,
      last: String
    });

    personSchema = new Schema({
      name: {
        type: nameSchema,
        required: true
      }
    });

    var Person = db.model('Person', personSchema);

    var person = new Person();
    var error = person.validateSync();
    assert.ok(error.errors['name']);
    // acquit:ignore:start
    done();
    // acquit:ignore:end
  });

  /**
   * In the above examples, you learned about document validation. Mongoose also
   * supports validation for `update()` and `findOneAndUpdate()` operations.
   * Update validators are off by default - you need to specify
   * the `runValidators` option.
   *
   * To turn on update validators, set the `runValidators` option for
   * `update()` or `findOneAndUpdate()`. Be careful: update validators
   * are off by default because they have several caveats.
   */
  it('Update Validators', function(done) {
    var toySchema = new Schema({
      color: String,
      name: String
    });

    var Toy = db.model('Toys', toySchema);

    Toy.schema.path('color').validate(function (value) {
      return /blue|green|white|red|orange|periwinkle/i.test(value);
    }, 'Invalid color');

    var opts = { runValidators: true };
    Toy.update({}, { color: 'bacon' }, opts, function (err) {
      assert.equal(err.errors.color.message,
        'Invalid color');
      // acquit:ignore:start
      done();
      // acquit:ignore:end
    });
  });

  /**
   * There are a couple of key differences between update validators and
   * document validators. In the color validation function above, `this` refers
   * to the document being validated when using document validation.
   * However, when running update validators, the document being updated
   * may not be in the server's memory, so by default the value of `this` is
   * not defined.
   */

  it('Update Validators and `this`', function(done) {
    var toySchema = new Schema({
      color: String,
      name: String
    });

    toySchema.path('color').validate(function(value) {
      // When running in `validate()` or `validateSync()`, the
      // validator can access the document using `this`.
      // Does **not** work with update validators.
      if (this.name.toLowerCase().indexOf('red') !== -1) {
        return value !== 'red';
      }
      return true;
    });

    var Toy = db.model('ActionFigure', toySchema);

    var toy = new Toy({ color: 'red', name: 'Red Power Ranger' });
    var error = toy.validateSync();
    assert.ok(error.errors['color']);

    var update = { color: 'red', name: 'Red Power Ranger' };
    var opts = { runValidators: true };

    Toy.update({}, update, opts, function(error) {
      // The update validator throws an error:
      // "TypeError: Cannot read property 'toLowerCase' of undefined",
      // because `this` is **not** the document being updated when using
      // update validators
      assert.ok(error);
      // acquit:ignore:start
      done();
      // acquit:ignore:end
    });
  });

  /**
   * The `context` option lets you set the value of `this` in update validators
   * to the underlying query.
   */

  it('The `context` option', function(done) {
    // acquit:ignore:start
    var toySchema = new Schema({
      color: String,
      name: String
    });
    // acquit:ignore:end
    toySchema.path('color').validate(function(value) {
      // When running update validators with the `context` option set to
      // 'query', `this` refers to the query object.
      if (this.getUpdate().$set.name.toLowerCase().indexOf('red') !== -1) {
        return value === 'red';
      }
      return true;
    });

    var Toy = db.model('Figure', toySchema);

    var update = { color: 'blue', name: 'Red Power Ranger' };
    // Note the context option
    var opts = { runValidators: true, context: 'query' };

    Toy.update({}, update, opts, function(error) {
      assert.ok(error.errors['color']);
      // acquit:ignore:start
      done();
      // acquit:ignore:end
    });
  });

  /**
   * The other key difference that update validators only run on the paths
   * specified in the update. For instance, in the below example, because
   * 'name' is not specified in the update operation, update validation will
   * succeed.
   *
   * When using update validators, `required` validators **only** fail when
   * you try to explicitly `$unset` the key.
   */

  it('Update Validator Paths', function(done) {
    // acquit:ignore:start
    var outstanding = 2;
    // acquit:ignore:end
    var kittenSchema = new Schema({
      name: { type: String, required: true },
      age: Number
    });

    var Kitten = db.model('Kitten', kittenSchema);

    var update = { color: 'blue' };
    var opts = { runValidators: true };
    Kitten.update({}, update, opts, function(err) {
      // Operation succeeds despite the fact that 'name' is not specified
      // acquit:ignore:start
      --outstanding || done();
      // acquit:ignore:end
    });

    var unset = { $unset: { name: 1 } };
    Kitten.update({}, unset, opts, function(err) {
      // Operation fails because 'name' is required
      assert.ok(err);
      assert.ok(err.errors['name']);
      // acquit:ignore:start
      --outstanding || done();
      // acquit:ignore:end
    });
  });

  /**
   * One final detail worth noting: update validators **only** run on the
   * following update operators:
   *
   * - `$set`
   * - `$unset`
   * - `$push` (>= 4.8.0)
   * - `$addToSet` (>= 4.8.0)
   * - `$pull` (>= 4.12.0)
   * - `$pullAll` (>= 4.12.0)
   *
   * For instance, the below update will succeed, regardless of the value of
   * `number`, because update validators ignore `$inc`. Also, `$push`,
   * `$addToSet`, `$pull`, and `$pullAll` validation does **not** run any
   * validation on the array itself, only individual elements of the array.
   */

  it('Update Validators Only Run On Specified Paths', function(done) {
    var testSchema = new Schema({
      number: { type: Number, max: 0 },
      arr: [{ message: { type: String, maxLength: 10 } }]
    });

    // Update validators won't check this, so you can still `$push` 2 elements
    // onto the array, so long as they don't have a `message` that's too long.
    testSchema.path('arr').validate(function(v) {
      return v.length < 2;
    });

    var Test = db.model('Test', testSchema);

    var update = { $inc: { number: 1 } };
    var opts = { runValidators: true };
    Test.update({}, update, opts, function(error) {
      // There will never be a validation error here
      update = { $push: [{ message: 'hello' }, { message: 'world' }] };
      Test.update({}, update, opts, function(error) {
        // This will never error either even though the array will have at
        // least 2 elements.
        // acquit:ignore:start
        assert.ifError(error);
        done();
        // acquit:ignore:end
      });
    });
  });

  /**
   * New in 4.8.0: update validators also run on `$push` and `$addToSet`
   */

  it('On $push and $addToSet', function(done) {
    var testSchema = new Schema({
      numbers: [{ type: Number, max: 0 }],
      docs: [{
        name: { type: String, required: true }
      }]
    });

    var Test = db.model('TestPush', testSchema);

    var update = {
      $push: {
        numbers: 1,
        docs: { name: null }
      }
    };
    var opts = { runValidators: true };
    Test.update({}, update, opts, function(error) {
      assert.ok(error.errors['numbers']);
      assert.ok(error.errors['docs']);
      // acquit:ignore:start
      done();
      // acquit:ignore:end
    });
  });
});
