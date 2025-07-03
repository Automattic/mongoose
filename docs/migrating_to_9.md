# Migrating from 8.x to 9.x

<style>
  ul > li {
    padding: 4px 0px;
  }
</style>

There are several backwards-breaking changes you should be aware of when migrating from Mongoose 8.x to Mongoose 9.x.

If you're still on Mongoose 7.x or earlier, please read the [Mongoose 7.x to 8.x migration guide](migrating_to_8.html) and upgrade to Mongoose 8.x first before upgrading to Mongoose 9.

## `Schema.prototype.doValidate()` now returns a promise

`Schema.prototype.doValidate()` now returns a promise that rejects with a validation error if one occurred.
In Mongoose 8.x, `doValidate()` took a callback and did not return a promise.

```javascript
// Mongoose 8.x function signature
function doValidate(value, cb, scope, options) {}

// Mongoose 8.x example usage
schema.doValidate(value, function(error) {
  if (error) {
    // Handle validation error
  }
}, scope, options);

// Mongoose 9.x function signature
async function doValidate(value, scope, options) {}

// Mongoose 9.x example usage
try {
  await schema.doValidate(value, scope, options);
} catch (error) {
  // Handle validation error
}
```

## Errors in middleware functions take priority over `next()` calls

In Mongoose 8.x, if a middleware function threw an error after calling `next()`, that error would be ignored.

```javascript
schema.pre('save', function(next) {
  next();
  // In Mongoose 8, this error will not get reported, because you already called next()
  throw new Error('woops!');
});
```

In Mongoose 9, errors in the middleware function take priority, so the above `save()` would throw an error.

## `next()` no longer supports passing arguments to the next middleware

Previously, you could call `next(null, 'new arg')` in a hook and the args to the next middleware would get overwritten by 'new arg'.

```javascript
schema.pre('save', function(next, options) {
  options; // options passed to `save()`
  next(null, 'new arg');
});

schema.pre('save', function(next, arg) {
  arg; // In Mongoose 8, this would be 'new arg', overwrote the options passed to `save()`
});
```

In Mongoose 9, `next(null, 'new arg')` doesn't overwrite the args to the next middleware.

## Removed background option for indexes

[MongoDB no longer supports the `background` option for indexes as of MongoDB 4.2](https://www.mongodb.com/docs/manual/core/index-creation/#index-operations). Mongoose 9 will no longer set the background option by default.

## Subdocument `deleteOne()` hooks execute only when subdocument is deleted

Currently, calling `deleteOne()` on a subdocument will execute the `deleteOne()` hooks on the subdocument regardless of whether the subdocument is actually deleted.

```javascript
const SubSchema = new Schema({
  myValue: {
    type: String
  }
}, {});
let count = 0;
SubSchema.pre('deleteOne', { document: true, query: false }, function(next) {
  count++;
  next();
});
const schema = new Schema({
  foo: {
    type: String,
    required: true
  },
  mySubdoc: {
    type: [SubSchema],
    required: true
  }
}, { minimize: false, collection: 'test' });

const Model = db.model('TestModel', schema);

const newModel = {
  foo: 'bar',
  mySubdoc: [{ myValue: 'some value' }]
};
const doc = await Model.create(newModel);

// In Mongoose 8, the following would trigger the `deleteOne` hook, even if `doc` is not saved or deleted.
doc.mySubdoc[0].deleteOne();

// In Mongoose 9, you would need to either `save()` or `deleteOne()` on `doc` to trigger the subdocument `deleteOne` hook.
await doc.save();
```

## Hooks for custom methods and statics no longer support callbacks

Previously, you could use Mongoose middleware with custom methods and statics that took callbacks.
In Mongoose 9, this is no longer supported.
If you want to use Mongoose middleware with a custom method or static, that custom method or static must be an async function or return a Promise.

```javascript
const mySchema = new Schema({
  name: String
});

// This is an example of a custom method that uses callbacks. While this method by itself still works in Mongoose 9,
// Mongoose 9 no longer supports hooks for this method.
mySchema.methods.foo = async function(cb) {
  return cb(null, this.name);
};
mySchema.statics.bar = async function(cb) {
  return cb(null, 'bar');
};

// This is no longer supported because `foo()` and `bar()` use callbacks.
mySchema.pre('foo', function() {
  console.log('foo pre hook');
});
mySchema.pre('bar', function() {
  console.log('bar pre hook');
});

// The following code has a custom method and a custom static that use async functions.
// The following works correctly in Mongoose 9: `pre('bar')` is executed when you call `bar()` and
// `pre('qux')` is executed when you call `qux()`.
mySchema.methods.baz = async function baz(arg) {
  return arg;
};
mySchema.pre('baz', async function baz() {
  console.log('baz pre hook');
});
mySchema.statics.qux = async function qux(arg) {
  return arg;
};
mySchema.pre('qux', async function qux() {
  console.log('qux pre hook');
});
```

## Removed `promiseOrCallback`

Mongoose 9 removed the `promiseOrCallback` helper function.

```javascript
const { promiseOrCallback } = require('mongoose');

promiseOrCallback; // undefined in Mongoose 9
```

## In `isAsync` middleware `next()` errors take priority over `done()` errors

Due to Mongoose middleware now relying on promises and async/await, `next()` errors take priority over `done()` errors.
If you use `isAsync` middleware, any errors in `next()` will be thrown first, and `done()` errors will only be thrown if there are no `next()` errors.

```javascript
const schema = new Schema({});

schema.pre('save', true, function(next, done) {
  execed.first = true;
  setTimeout(
    function() {
      done(new Error('first done() error'));
    },
    5);

  next();
});

schema.pre('save', true, function(next, done) {
  execed.second = true;
  setTimeout(
    function() {
      next(new Error('second next() error'));
      done(new Error('second done() error'));
    },
    25);
});

// In Mongoose 8, with the above middleware, `save()` would error with 'first done() error'
// In Mongoose 9, with the above middleware, `save()` will error with 'second next() error'
```

## Removed `skipOriginalStackTraces` option

In Mongoose 8, Mongoose queries store an `_executionStack` property that stores the stack trace of where the query was originally executed for debugging `Query was already executed` errors.
This behavior can cause performance issues with bundlers and source maps.
`skipOriginalStackTraces` was added to work around this behavior.
In Mongoose 9, this option is no longer necessary because Mongoose no longer stores the original stack trace.

## Node.js version support

Mongoose 9 requires Node.js 18 or higher.

## UUID's are now MongoDB UUID objects

Mongoose 9 now returns UUID objects as instances of `bson.UUID`. In Mongoose 8, UUIDs were Mongoose Buffers that were converted to strings via a getter.

```javascript
const schema = new Schema({ uuid: 'UUID' });
const TestModel = mongoose.model('Test', schema);

const test = new TestModel({ uuid: new bson.UUID() });
await test.save();

test.uuid; // string in Mongoose 8, bson.UUID instance in Mongoose 9
```

With this change, UUIDs will be represented in hex string format in JSON, even if `getters: true` is not set.

If you want to convert UUIDs to strings via a getter by default, you can use `mongoose.Schema.Types.UUID.get()`:

```javascript
// Configure all UUIDs to have a getter which converts the UUID to a string
mongoose.Schema.Types.UUID.get(v => v == null ? v : v.toString());

const schema = new Schema({ uuid: 'UUID' });
const TestModel = mongoose.model('Test', schema);

const test = new TestModel({ uuid: new bson.UUID() });
await test.save();

test.uuid; // string
```

## TypeScript

### FilterQuery Properties No Longer Resolve to any

In Mongoose 9, the `FilterQuery` type, which is the type of the first param to `Model.find()`, `Model.findOne()`, etc. now enforces stronger types for top-level keys.

```typescript
const schema = new Schema({ age: Number });
const TestModel = mongoose.model('Test', schema);

TestModel.find({ age: 'not a number' }); // Works in Mongoose 8, TS error in Mongoose 9
TestModel.find({ age: { $notAnOperator: 42 } }); // Works in Mongoose 8, TS error in Mongoose 9
```

This change is backwards breaking if you use generics when creating queries as shown in the following example.
If you run into the following issue or any similar issues, you can use `as FilterQuery`.

```typescript
// From https://stackoverflow.com/questions/56505560/how-to-fix-ts2322-could-be-instantiated-with-a-different-subtype-of-constraint:
// "Never assign a concrete type to a generic type parameter, consider it as read-only!"
// This function is generally something you shouldn't do in TypeScript, can work around it with `as` though.
function findById<ModelType extends {_id: Types.ObjectId | string}>(model: Model<ModelType>, _id: Types.ObjectId | string) {
  return model.find({_id: _id} as FilterQuery<ModelType>); // In Mongoose 8, this `as` was not required
}
```
