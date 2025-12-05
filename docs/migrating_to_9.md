# Migrating from 8.x to 9.x

<style>
  ul > li {
    padding: 4px 0px;
  }
</style>

There are several backwards-breaking changes you should be aware of when migrating from Mongoose 8.x to Mongoose 9.x.

If you're still on Mongoose 7.x or earlier, please read the [Mongoose 7.x to 8.x migration guide](migrating_to_8.html) and upgrade to Mongoose 8.x first before upgrading to Mongoose 9.

## Pre middleware no longer supports `next()`

In Mongoose 9, pre middleware no longer receives a `next()` parameter.
Instead, you should use `async` functions or promises to handle async pre middleware.

```javascript
// Worked in Mongoose 8.x, no longer supported in Mongoose 9!
schema.pre('save', function(next) {
  // Do something async
  next();
});

// Mongoose 9.x example usage
schema.pre('save', async function() {
  // Do something async
});
// or use promises:
schema.pre('save', function() {
  return new Promise((resolve, reject) => {
    // Do something async
    resolve();
  });
});
```

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

## Update pipelines disallowed by default

As of MongoDB 4.2, you can pass an array of pipeline stages to `updateOne()`, `updateMany()`, and `findOneAndUpdate()` to modify the document in multiple stages.
Mongoose does not cast update pipelines at all, so for Mongoose 9 we've made using update pipelines throw an error by default.

```javascript
// Throws in Mongoose 9. Works in Mongoose 8
await Model.updateOne({}, [{ $set: { newProp: 'test2' } }]);
```

Set `updatePipeline: true` to enable update pipelines.

```javascript
// Works in Mongoose 9
await Model.updateOne({}, [{ $set: { newProp: 'test2' } }], { updatePipeline: true });
```

You can also set `updatePipeline` globally to enable update pipelines for all update operations by default.

```javascript
// Enable update pipelines globally
mongoose.set('updatePipeline', true);

// Now update pipelines work without needing to specify the option on each query
await Model.updateOne({}, [{ $set: { newProp: 'test2' } }]);

// You can still override the global setting per query
await Model.updateOne({}, [{ $set: { newProp: 'test2' } }], { updatePipeline: false }); // throws
```

## Removed background option for indexes

[MongoDB no longer supports the `background` option for indexes as of MongoDB 4.2](https://www.mongodb.com/docs/manual/core/index-creation/#index-operations). Mongoose 9 will no longer set the background option by default and Mongoose 9 no longer supports setting the `background` option on `Schema.prototype.index()`.

## `mongoose.isValidObjectId()` returns false for numbers

In Mongoose 8, you could create a new ObjectId from a number, and `isValidObjectId()` would return `true` for numbers. In Mongoose 9, `isValidObjectId()` will return `false` for numbers and you can no longer create a new ObjectId from a number.

```javascript
// true in mongoose 8, false in mongoose 9
mongoose.isValidObjectId(6);

// Works in Mongoose 8, throws in Mongoose 9
new mongoose.Types.ObjectId(6);
```

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

## `Document.prototype.updateOne` no longer accepts a callback

`Document.prototype.updateOne` still supported callbacks in Mongoose 8. In Mongoose 9, the callback parameter was removed.

```javascript
const doc = await TestModel.findOne().orFail();

// Worked in Mongoose 8, no longer supported in Mongoose 9.
doc.updateOne({ name: 'updated' }, null, (err, res) => {
  if (err) throw err;
  console.log(res);
});
```

## Removed `promiseOrCallback`

Mongoose 9 removed the `promiseOrCallback` helper function.

```javascript
const { promiseOrCallback } = require('mongoose');

promiseOrCallback; // undefined in Mongoose 9
```

## `isAsync` middleware no longer supported

Mongoose 9 no longer supports `isAsync` middleware. Middleware functions that use the legacy signature with both `next` and `done` callbacks (i.e., `function(next, done)`) are not supported. We recommend middleware now use promises or async/await.

If you have code that uses `isAsync` middleware, you must refactor it to use async functions or return a promise instead.

```javascript
// ❌ Not supported in Mongoose 9
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

// ✅ Supported in Mongoose 9: use async functions or return a promise
schema.pre('save', async function() {
  execed.first = true;
  await new Promise(resolve => setTimeout(resolve, 5));
});

schema.pre('save', async function() {
  execed.second = true;
  await new Promise(resolve => setTimeout(resolve, 25));
});
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

### SchemaType `caster` and `casterConstructor` properties were removed

In Mongoose 8, certain schema type instances had a `caster` property which contained either the embedded schema type or embedded subdocument constructor.
In Mongoose 9, to make types and internal logic more consistent, we removed the `caster` property in favor of `embeddedSchemaType` and `Constructor`.

```javascript
const schema = new mongoose.Schema({ docArray: [new mongoose.Schema({ name: String })], arr: [String] });

// In Mongoose 8:
console.log(schema.path('arr').caster); // SchemaString
console.log(schema.path('docArray').caster); // EmbeddedDocument constructor

console.log(schema.path('arr').casterConstructor); // SchemaString constructor
console.log(schema.path('docArray').casterConstructor); // EmbeddedDocument constructor

// In Mongoose 9:
console.log(schema.path('arr').embeddedSchemaType); // SchemaString
console.log(schema.path('docArray').embeddedSchemaType); // SchemaDocumentArrayElement

console.log(schema.path('arr').Constructor); // undefined
console.log(schema.path('docArray').Constructor); // EmbeddedDocument constructor
```

In Mongoose 8, there was also an internal `$embeddedSchemaType` property. That property has been replaced with `embeddedSchemaType`, which is now part of the public API.

### Removed `skipId` parameter to `Model()` and `Document()`

In Mongoose 8, the 3rd parameter to `Model()` and `Document()` was either a boolean or `options` object.
If a boolean, Mongoose would interpret the 3rd parameter as the `skipId` option.
In Mongoose 9, the 3rd parameter is always an `options` object, passing a `boolean` is no longer supported.

### Query use$geoWithin removed, now always true

`mongoose.Query` had a `use$geoWithin` property that could configure converting `$geoWithin` to `$within` to support MongoDB versions before 2.4.
That property has been removed in Mongoose 9. `$geoWithin` is now never converted to `$within`, because MongoDB no longer supports `$within`.

### Removed `noListener` option from `useDb()`/connections

The `noListener` option has been removed from connections and from the `useDb()` method. In Mongoose 8.x, you could call `useDb()` with `{ noListener: true }` to prevent the new connection object from listening to state changes on the base connection, which was sometimes useful to reduce memory usage when dynamically creating connections for every request.

In Mongoose 9.x, the `noListener` option is no longer supported or documented. The second argument to `useDb()` now only supports `{ useCache }`.

```javascript
// Mongoose 8.x
conn.useDb('myDb', { noListener: true }); // works

// Mongoose 9.x
conn.useDb('myDb', { noListener: true }); // TypeError: noListener is not a supported option
conn.useDb('myDb', { useCache: true }); // works
```

## TypeScript

### FilterQuery renamed to QueryFilter

In Mongoose 9, `FilterQuery` (the first parameter to `Model.find()`, `Model.findOne()`, etc.) was renamed to `QueryFilter`.

### QueryFilter Properties No Longer Resolve to any

In Mongoose 9, the `QueryFilter` type, which is the type of the first param to `Model.find()`, `Model.findOne()`, etc. now enforces stronger types for top-level keys.

```typescript
const schema = new Schema({ age: Number });
const TestModel = mongoose.model('Test', schema);

TestModel.find({ age: 'not a number' }); // Works in Mongoose 8, TS error in Mongoose 9
TestModel.find({ age: { $notAnOperator: 42 } }); // Works in Mongoose 8, TS error in Mongoose 9
```

This change is backwards breaking if you use generics when creating queries as shown in the following example.
If you run into the following issue or any similar issues, you can use `as QueryFilter`.

```typescript
// From https://stackoverflow.com/questions/56505560/how-to-fix-ts2322-could-be-instantiated-with-a-different-subtype-of-constraint:
// "Never assign a concrete type to a generic type parameter, consider it as read-only!"
// This function is generally something you shouldn't do in TypeScript, can work around it with `as` though.
function findById<ModelType extends {_id: Types.ObjectId | string}>(model: Model<ModelType>, _id: Types.ObjectId | string) {
  return model.find({_id: _id} as QueryFilter<ModelType>); // In Mongoose 8, this `as` was not required
}
```

### No more generic parameter for `create()` and `insertOne()`

In Mongoose 8, `create()` and `insertOne()` accepted a generic parameter, which meant TypeScript let you pass any value to the function.

```ts
const schema = new Schema({ age: Number });
const TestModel = mongoose.model('Test', schema);

// Worked in Mongoose 8, TypeScript error in Mongoose 9
const doc = await TestModel.create({ age: 'not a number', someOtherProperty: 'value' });
```

In Mongoose 9, `create()` and `insertOne()` no longer accept a generic parameter. Instead, they accept `Partial<RawDocType>` with some additional query casting applied that allows objects for maps, strings for ObjectIds, and POJOs for subdocuments and document arrays.

If your parameters to `create()` don't match `Partial<RawDocType>`, you can use `as` to cast as follows.

```ts
const doc = await TestModel.create({ age: 'not a number', someOtherProperty: 'value' } as unknown as Partial<InferSchemaType<typeof schema>>);
```

### Document `id` is no longer `any`

In Mongoose 8 and earlier, `id` was a property on the `Document` class that was set to `any`.
This was inconsistent with runtime behavior, where `id` is a virtual property that returns `_id` as a string, unless there is already an `id` property on the schema or the schema has the `id` option set to `false`.

Mongoose 9 appends `id` as a string property to `TVirtuals`. The `Document` class no longer has an `id` property.

```ts
const schema = new Schema({ age: Number });
const TestModel = mongoose.model('Test', schema);

const doc = new TestModel();
doc.id; // 'string' in Mongoose 9, 'any' in Mongoose 8.
```
