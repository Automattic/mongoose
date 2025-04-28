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

## Hooks for custom methods no longer support callbacks

Previously, you could use Mongoose middleware with custom methods that took callbacks.
In Mongoose 9, this is no longer supported.
If you want to use Mongoose middleware with a custom method, that custom method must be an async function or return a Promise.

```javascript
const mySchema = new Schema({
  name: String
});

// This is an example of a custom method that uses callbacks. While this method by itself still works in Mongoose 9,
// Mongoose 9 no longer supports hooks for this method.
mySchema.methods.foo = async function(cb) {
  return cb(null, this.name);
};

// This is no longer supported because `foo()` uses callbacks.
mySchema.pre('foo', function() {
  console.log('foo pre hook');
});

// The following is a custom method that uses async functions. The following works correctly in Mongoose 9: `pre('bar')`
// is executed when you call `bar()`.
mySchema.methods.bar = async function bar(arg) {
  return arg;
};
mySchema.pre('bar', async function bar() {
  console.log('bar pre hook');
});
```
