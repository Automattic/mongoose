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
* [Discriminator schemas use base schema options by default](#discriminator-schemas-use-base-schema-options-by-default)
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

<h3 id="discriminator-schemas-use-base-schema-options-by-default"><a href="#discriminator-schemas-use-base-schema-options-by-default">Discriminator schemas use base schema options by default</a></h3>

When you use `Model.discriminator()`, Mongoose will now use the discriminator base schema's options by default.
This means you don't need to explicitly set child schema options to match the base schema's.

```javascript
const baseSchema = Schema({}, { typeKey: '$type' });
const Base = db.model('Base', baseSchema);

// In Mongoose 6.x, the `Base.discriminator()` call would throw because
// no `typeKey` option. In Mongoose 7, Mongoose uses the base schema's
// `typeKey` by default.
const childSchema = new Schema({}, {});
const Test = Base.discriminator('Child', childSchema);

Test.schema.options.typeKey; // '$type'
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
