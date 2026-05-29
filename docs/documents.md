# Documents

Mongoose documents are Mongoose Document class instances backed by MongoDB data.
Mongoose's [Document class](https://mongoosejs.com/docs/api/document.html) has built-in support for change tracking, casting, validation, middleware, and persistence.

<ul class="toc">
  <li><a href="#what-is-a-document">What is a Document</a></li>
  <li><a href="#hydrated-documents-vs-lean-documents">Hydrated Documents vs Lean Documents</a></li>
  <li><a href="#updating-using-save">Updating Using <code>save()</code></a></li>
  <li><a href="#setting-nested-properties">Setting Nested Properties</a></li>
  <li><a href="#casting-and-validation">Casting and Validation</a></li>
  <li><a href="#required-properties">Required Properties</a></li>
  <li><a href="#middleware">Middleware</a></li>
</ul>

## What is a Document?

A Mongoose [document](https://mongoosejs.com/docs/api/document.html#Document) is an instance of a [Model class](https://mongoosejs.com/docs/api/model.html#Model).
`Model` and `Document` are separate classes in Mongoose: `Model` extends from `Document`.

```javascript
// `User` is a Model class
const User = mongoose.model('User', new Schema({
  name: String
}));

// `doc` is a document
const doc = new User({ name: 'John Smith' });

// The class hierarchy is User extends from Model extends from Document
doc instanceof User; // true
doc instanceof mongoose.Model; // true
doc instanceof mongoose.Document; // true
```

Mongoose documents represent individual documents stored in a MongoDB collection.
For example, documents created from the `User` model in the above example are stored in the `users` collection by default.

You can create a new document using `new User()` or `await User.create()`; or load an existing document from MongoDB using queries like `findOne()`.

```javascript
// Create a new document in memory
const doc = new User({ name: 'John Smith' });
// Persist the document to MongoDB:
// the document is not persisted to MongoDB until you call `save()`.
await doc.save();

// Load an existing document
const existingDoc = await User.findOne({ name: 'John Smith' });

existingDoc instanceof User; // true
existingDoc instanceof mongoose.Model; // true
existingDoc instanceof mongoose.Document; // true
```

## Hydrated Documents vs Lean Documents

When you create a new document or load a document using a query, Mongoose returns a **hydrated document**.
Mongoose documents are not [plain-old JavaScript objects](https://masteringjs.io/tutorials/fundamentals/pojo): they are an instance of Mongoose's `Document` class.
In particular, Mongoose documents store internal state for:

* change tracking
* validation
* middleware
* document methods
* `save()`
* getters, setters, and virtuals

That means some JavaScript object operations behave differently with documents.
For example, using the [spread operator](https://masteringjs.io/tutorials/fundamentals/spread) on a Mongoose document does not create a shallow clone of the underlying object, you'll get an object with an `_doc` property instead.
If you want a plain-old JavaScript object (POJO) representation of a Mongoose document, use the [`toObject()` method](https://mongoosejs.com/docs/api/document.html#Document.prototype.toObject()).

```javascript
const doc = await User.findOne();

// NOT RECOMMENDED
const copy = { ...doc };
copy.name; // undefined
copy; // { _doc: { name: 'John Smith' }, ... }

// To get a plain object clone of a document, use `toObject()`
const obj = doc.toObject();
obj.name; // 'John Smith'
```

You can use the [`lean()` method](https://mongoosejs.com/docs/api/query.html#Query.prototype.lean()) to make Mongoose queries return POJOs instead of hydrated documents.
Lean queries are often faster and use less memory, making them a good choice for read-only operations where you don't need document functionality.

```javascript
const doc = await User.findOne().lean();

doc instanceof User; // false
doc.name; // 'John Smith'
```

However, keep in mind that `lean()` bypasses many Mongoose document features, including:

* change tracking
* validation
* `save()`
* getters
* defaults
* virtuals (including populated virtuals)

If you need some of these features on lean results, Mongoose provides helpers like [`Model.applyDefaults()`](https://mongoosejs.com/docs/api/model.html#Model.applyDefaults()) and [`Model.applyVirtuals()`](https://mongoosejs.com/docs/api/model.html#Model.applyVirtuals()), and there are plugins that can apply [getters](https://www.npmjs.com/package/mongoose-lean-getters), [virtuals](https://www.npmjs.com/package/mongoose-lean-virtuals), and [defaults](https://www.npmjs.com/package/mongoose-lean-defaults) to lean query results.
When using `lean()`, you are responsible for explicitly enabling any document features that your app needs.

## Updating Using `save()` {#updating-using-save}

Mongoose documents have a `save()` method that persists the current document state to MongoDB.
For new documents, `save()` inserts the document.

```javascript
const doc = new User({ name: 'John Smith' });
// Inserts a new document
await doc.save();
```

For existing documents, `save()` sends an `updateOne()` that updates just the modified paths.

```javascript
const doc = await User.findOne();

doc.name = 'Something else';
// Sends an updateOne with `{ $set: { name: 'Something else' } }` to MongoDB
await doc.save();
```

Mongoose documents track changes.
When you assign to a document property, Mongoose marks that path as modified.
The [`isModified()` method](https://mongoosejs.com/docs/api/document.html#Document.prototype.isModified()) lets you check whether a given path is modified, and the [`$getChanges()` method](https://mongoosejs.com/docs/api/document.html#Document.prototype.$getChanges()) returns the changes that will be sent to MongoDB when you call `save()`.

```javascript
doc.name = 'Something else';

doc.isModified('name'); // true
doc.$getChanges(); // { $set: { name: 'Something else' } }
```

In particular, this means `save()` only updates modified paths: it does **not** overwrite the entire document.

## Setting Nested Properties

Mongoose documents have a `set()` function that you can use to safely set deeply nested properties.

```javascript
const schema = new Schema({
  subdoc: new Schema({
    subdocLevel2: new Schema({
      name: String
    })
  })
});
const TestModel = mongoose.model('Test', schema);

const doc = new TestModel();
doc.set('subdoc.subdocLevel2.name', 'John Smith');
doc.subdoc.subdocLevel2.name; // 'John Smith'
```

Mongoose documents also have a `get()` function that lets you safely read deeply nested properties. `get()` lets you avoid having to explicitly check for nullish values, similar to JavaScript's [optional chaining operator `?.`](https://masteringjs.io/tutorials/fundamentals/optional-chaining-array).

```javascript
const doc2 = new TestModel();

doc2.get('subdoc.subdocLevel2.name'); // undefined
doc2.subdoc?.subdocLevel2?.name; // undefined

doc2.set('subdoc.subdocLevel2.name', 'Will Smith');
doc2.get('subdoc.subdocLevel2.name'); // 'Will Smith'
```

You can use optional chaining `?.` and nullish coalescing `??` with Mongoose documents.
However, be careful when using [nullish coalescing assignments `??=`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_assignment) to create nested paths with Mongoose documents.

```javascript
// The following works fine
const doc3 = new TestModel();
doc3.subdoc.subdocLevel2 ??= {};
doc3.subdoc.subdocLevel2.name = 'John Smythe';

// The following does **NOT** work because `doc4.subdoc.subdocLevel2 ??= {}`
// evaluates to a POJO `{}`, **NOT** the Mongoose value `doc4.subdoc.subdocLevel2`.
// Do not use the following pattern with Mongoose documents.
const doc4 = new TestModel();
(doc4.subdoc.subdocLevel2 ??= {}).name = 'Charlie Smith';
doc4.subdoc.subdocLevel2; // Empty object
doc4.subdoc.subdocLevel2.name; // undefined.
```

## Casting and Validation

Before saving a document, Mongoose:

* casts values to match the schema
* validates the resulting values

Casting and validation are related, but they are different concepts and happen at different times.

**Casting** means converting values to the schema's configured type.
Mongoose handles certain type conversions automatically, like converting the string `'42'` to a number for number paths or converting the number `0` to `false` for boolean paths.

```javascript
const schema = new Schema({
  age: Number,
  isEnabled: Boolean
});
const Person = mongoose.model('Person', schema);

const doc = new Person();
doc.age = '42';
doc.isEnabled = 0;

doc.age; // 42 as a number
doc.isEnabled; // false

doc.isEnabled = 1;
doc.isEnabled; // true
```

If Mongoose cannot convert a value to the expected type, it creates a cast error and stores it on the document.
Most importantly, assigning an invalid value does **not** throw immediately.
Instead, Mongoose will report an error when you [`validate()`](https://mongoosejs.com/docs/api/document.html#Document.prototype.validate()) the document (or call `save()`, which calls `validate()`).

```javascript
// Does **not** throw
doc.age = 'not a number';

// Throws a CastError 'Cast to Number failed for value "not a number"'
await doc.validate();
```

This behavior allows Mongoose to collect multiple validation and casting errors together.
Also, if you set a value multiple times, the last value wins, so if you overwrite an invalid value then validation will succeed.

```javascript
doc.age = 'not a number';
doc.age = 42;

// Validation succeeds
await doc.validate();
```

**Validation** is a separate step that runs when you call the document's `validate()` method.
The `save()` method calls `validate()` internally, so `save()` also triggers validation.
Validation checks whether the document satisfies schema rules, which includes checking for cast errors, but also:

* [required](https://mongoosejs.com/docs/api/schematype.html#SchemaType.prototype.required())
* [min](https://mongoosejs.com/docs/api/schemanumber.html#SchemaNumber.prototype.min())
* [max](https://mongoosejs.com/docs/api/schemanumber.html#SchemaNumber.prototype.max())
* [enum](https://mongoosejs.com/docs/api/schemastring.html#SchemaString.prototype.enum())
* custom validators

If validation fails, Mongoose does **not** save the document.

```javascript
const schema = new Schema({
  age: {
    type: Number,
    min: 0
  }
});

const Person = mongoose.model('Person', schema);

const doc = new Person({ age: -1 });

// Throws an error "Path `age` (-1) is less than minimum allowed value (0)"
await doc.validate();
```

## Required Properties

The most commonly used validator in Mongoose is `required`.
If a required path is missing when you validate or save a document, Mongoose throws a validation error.

```javascript
const schema = new Schema({
  name: {
    type: String,
    required: true
  }
});

const User = mongoose.model('User', schema);

const doc = new User();

// Throws an error "Path `name` is required"
await doc.validate();
```

For most schema types, any value that is not `null` or `undefined` will pass the required validator.
The exceptions are strings and buffers: empty string and empty buffer cause a `ValidationError` if `required` is set.

```javascript
const doc = new User({ name: '' });

// Throws an error "Path `name` is required"
await doc.validate();
```

Note that empty arrays do **not** cause a `ValidationError` if the array is `required`.

## Middleware

Document [middleware](https://mongoosejs.com/docs/middleware.html) lets you run code during key parts of a document's lifecycle.
The most common document middleware hooks are for `validate()` and `save()`.

At a high level, saving a document looks like this:

<img class="theme-aware-image-light" src="/docs/images/save-lifecycle.svg" alt="save document lifecycle diagram">
<img class="theme-aware-image-dark" src="/docs/images/save-lifecycle-dark.svg" alt="save document lifecycle diagram">

For example, the following shows using a `pre('validate')` hook to set a `normalizedName` property.

```javascript
const userSchema = new Schema({
  name: String,
  normalizedName: String
});

userSchema.pre('validate', function() {
  if (this.name != null) {
    this.normalizedName = this.name.trim().toLowerCase();
  }
});

userSchema.pre('save', function() {
  console.log('Saving user:', this.name);
});

const User = mongoose.model('User', userSchema);

const user = new User({ name: '  JOHN SMITH  ' });
await user.save();
user.normalizedName; // 'john smith'
```

Document middleware is a good fit for logic that is closely tied to the document itself, such as:

* normalizing values before validation
* deriving one path from another
* enforcing document-level invariants
* logging or auditing document saves
* updating timestamps or metadata

However, use middleware sparingly.
Middleware is usually not a good place for complex application logic.
In particular, we recommend avoiding code in middleware that:

* makes network calls to unrelated services
* depends heavily on request-specific context
* performs expensive work that should be explicit

Also note that document middleware only runs for document operations.
Query updates like `updateOne()` and `findOneAndUpdate()` do **not** run `save()` middleware.

```javascript
const doc = await User.findOne();

doc.name = 'Jane Doe';
// runs validate and save middleware
await doc.save();

// does not run save middleware
await doc.updateOne({ name: 'John Doe' });
```

## Next Up

Now that we've covered Documents, let's take a look at
[Subdocuments](subdocs.html).
