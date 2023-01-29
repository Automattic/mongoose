## Migrating from 6.x to 7.x

<style>
  ul > li {
    padding: 4px 0px;
  }
</style>

There are several backwards-breaking changes
you should be aware of when migrating from Mongoose 6.x to Mongoose 7.x.

If you're still on Mongoose 5.x, please read the [Mongoose 5.x to 6.x migration guide](migrating_to_6.html) and upgrade to Mongoose 6.x first.

* [`strictQuery`](#strictquery)
* [Removed `remove()`](#removed-remove)
* [Removed `castForQueryWrapper()`, updated `castForQuery()` signature](#removed-castforquerywrapper)

<h3 id="strictquery"><a href="#strictquery"><code>strictQuery</code></a></h3>

`strictQuery` is now false by default.

```javascript
const mySchema = new Schema({ field: Number });
const MyModel = mongoose.model('Test', mySchema);

// Mongoose will not strip out `notInSchema: 1` because `strictQuery` is false by default
const docs = await MyModel.find({ notInSchema: 1 });
// Empty array in Mongoose 7. In Mongoose 6, this would contain all documents in MyModel
docs;
```

<h3 id="removed-remove"><a href="#removed-remove"><code>Removed <code>remove()</code></a></h3>

The `remove()` method on documents and models has been removed.
Use `deleteOne()` or `deleteMany()` instead.

```javascript
const mySchema = new Schema({ field: Number });
const MyModel = mongoose.model('Test', mySchema);

// Change this:
await MyModel.remove(filter);

// To this:
await MyModel.deleteOne(filter);
// Or this, if you want to delete multiple:
await MyModel.deleteMany(filter);

// For documents, change this:
await doc.remove();

// To this:
await doc.deleteOne();
```

Keep in mind that `deleteOne()` hooks are treated as query middleware by default.
So for middleware, please do the following:

```javascript
// Replace this:
schema.pre('remove', function() {
  /* ... */
});

// With this:
schema.pre('deleteOne', { document: true, query: false }, function() {
  /* ... */
});
```

<h3 id="objectids-no-longer-deepstrictequal"><a href="#objectids-no-longer-deepstrictequal">ObjectIds no longer deepStrictEqual</a></h3>

Two ObjectIds are no longer `assert.deepStrictEqual()` even though they have the same string representation.

```javascript
const oid1 = new mongoose.Types.ObjectId();
const oid2 = new mongoose.Types.ObjectId(oid1.toString());

oid1.toHexString() === oid2.toHexString(); // true
assert.deepStrictEqual(oid1, oid2); // Throws "Values have same structure but are not reference-equal"
```

<h3 id="removed-castforquerywrapper"><a href="#removed-castforquerywrapper">Removed <code>castForQueryWrapper</code>, updated <code>castForQuery()</code> signature</a></h3>

Mongoose now always calls SchemaType `castForQuery()` method with 3 arguments: `$conditional`, `value`, and `context`.
If you've implemented a custom schema type that defines its own `castForQuery()` method, you need to update the method as follows.

```javascript
// Mongoose 6.x format:
MySchemaType.prototype.castForQuery = function($conditional, value) {
  if (arguments.length === 2) {
    // Handle casting value with `$conditional` - $eq, $in, $not, etc.
  } else {
    value = $conditional;
    // Handle casting `value` with no conditional
  }
};

// Mongoose 7.x format
MySchemaType.prototype.castForQuery = function($conditional, value, context) {
  if ($conditional != null) {
    // Handle casting value with `$conditional` - $eq, $in, $not, etc.
  } else {
    // Handle casting `value` with no conditional
  }
};
```
