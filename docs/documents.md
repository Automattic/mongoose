# Documents

Mongoose [documents](api/document.html) represent a one-to-one mapping
to documents as stored in MongoDB. Each document is an instance of its
[Model](models.html).

<ul class="toc">
  <li><a href="#documents-vs-models">Documents vs Models</a></li>
  <li><a href="#retrieving">Retrieving</a></li>
  <li><a href="#updating-using-save">Updating Using <code>save()</code></a></li>
  <li><a href="#setting-nested-properties">Setting Nested Properties</a></li>
  <li><a href="#updating-using-queries">Updating Using Queries</a></li>
  <li><a href="#validating">Validating</a></li>
  <li><a href="#overwriting">Overwriting</a></li>
</ul>

## Documents vs Models {#documents-vs-models}

[Document](api/document.html#Document) and [Model](api/model.html#Model) are distinct
classes in Mongoose. The Model class is a subclass of the Document class.
When you use the [Model constructor](api/model.html#Model), you create a
new document.

```javascript
const MyModel = mongoose.model('Test', new Schema({ name: String }));
const doc = new MyModel();

doc instanceof MyModel; // true
doc instanceof mongoose.Model; // true
doc instanceof mongoose.Document; // true
```

In Mongoose, a "document" generally means an instance of a model.
You should not have to create an instance of the Document class without
going through a model.

## Retrieving {#retrieving}

When you load documents from MongoDB using model functions like [`findOne()`](api/model.html#model_Model-findOne),
you get a Mongoose document back.

```javascript
const doc = await MyModel.findOne();

doc instanceof MyModel; // true
doc instanceof mongoose.Model; // true
doc instanceof mongoose.Document; // true
```

## Updating Using `save()` {#updating-using-save}

Mongoose documents track changes. You can modify a document using vanilla
JavaScript assignments and Mongoose will convert it into [MongoDB update operators](https://www.mongodb.com/docs/manual/reference/operator/update/).

```javascript
doc.name = 'foo';

// Mongoose sends an `updateOne({ _id: doc._id }, { $set: { name: 'foo' } })`
// to MongoDB.
await doc.save();
```

The `save()` method returns a promise. If `save()` succeeds, the promise
resolves to the document that was saved.

```javascript
doc.save().then(savedDoc => {
  savedDoc === doc; // true
});
```

If the document with the corresponding `_id` is not found, Mongoose will
report a `DocumentNotFoundError`:

```javascript
const doc = await MyModel.findOne();

// Delete the document so Mongoose won't be able to save changes
await MyModel.deleteOne({ _id: doc._id });

doc.name = 'foo';
await doc.save(); // Throws DocumentNotFoundError
```

## Setting Nested Properties

Mongoose documents have a `set()` function that you can use to safely set deeply nested properties.

```javascript
const schema = new Schema({
  nested: {
    subdoc: new Schema({
      name: String
    })
  }
});
const TestModel = mongoose.model('Test', schema);

const doc = new TestModel();
doc.set('nested.subdoc.name', 'John Smith');
doc.nested.subdoc.name; // 'John Smith'
```

Mongoose documents also have a `get()` function that lets you safely read deeply nested properties. `get()` lets you avoid having to explicitly check for nullish values, similar to JavaScript's [optional chaining operator `?.`](https://masteringjs.io/tutorials/fundamentals/optional-chaining-array).

```javascript
const doc2 = new TestModel();

doc2.get('nested.subdoc.name'); // undefined
doc2.nested?.subdoc?.name; // undefined

doc2.set('nested.subdoc.name', 'Will Smith');
doc2.get('nested.subdoc.name'); // 'Will Smith'
```

You can use optional chaining `?.` and nullish coalescing `??` with Mongoose documents.
However, be careful when using [nullish coalescing assignments `??=`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing_assignment) to create nested paths with Mongoose documents.

```javascript
// The following works fine
const doc3 = new TestModel();
doc3.nested.subdoc ??= {};
doc3.nested.subdoc.name = 'John Smythe';

// The following does **NOT** work.
// Do not use the following pattern with Mongoose documents.
const doc4 = new TestModel();
(doc4.nested.subdoc ??= {}).name = 'Charlie Smith';
doc.nested.subdoc; // Empty object
doc.nested.subdoc.name; // undefined.
```

## Updating Using Queries {#updating-using-queries}

The [`save()`](api/model.html#model_Model-save) function is generally the right
way to update a document with Mongoose. With `save()`, you get full
[validation](validation.html) and [middleware](middleware.html).

For cases when `save()` isn't flexible enough, Mongoose lets you create
your own [MongoDB updates](https://www.mongodb.com/docs/manual/reference/operator/update/)
with casting, [middleware](middleware.html#notes), and [limited validation](validation.html#update-validators).

```javascript
// Update all documents in the `mymodels` collection
await MyModel.updateMany({}, { $set: { name: 'foo' } });
```

*Note that `update()`, `updateMany()`, `findOneAndUpdate()`, etc. do **not**
execute `save()` middleware. If you need save middleware and full validation,
first query for the document and then `save()` it.*

## Validating {#validating}

Documents are casted and validated before they are saved. Mongoose first casts
values to the specified type and then validates them. Internally, Mongoose
calls the document's [`validate()` method](api/document.html#document_Document-validate)
before saving.

```javascript
const schema = new Schema({ name: String, age: { type: Number, min: 0 } });
const Person = mongoose.model('Person', schema);

const p = new Person({ name: 'foo', age: 'bar' });
// Cast to Number failed for value "bar" at path "age"
await p.validate();

const p2 = new Person({ name: 'foo', age: -1 });
// Path `age` (-1) is less than minimum allowed value (0).
await p2.validate();
```

Mongoose also supports limited validation on updates using the [`runValidators` option](validation.html#update-validators).
Mongoose casts parameters to query functions like `findOne()`, `updateOne()`
by default. However, Mongoose does *not* run validation on query function
parameters by default. You need to set `runValidators: true` for Mongoose
to validate.

```javascript
// Cast to number failed for value "bar" at path "age"
await Person.updateOne({}, { age: 'bar' });

// Path `age` (-1) is less than minimum allowed value (0).
await Person.updateOne({}, { age: -1 }, { runValidators: true });
```

Read the [validation](validation.html) guide for more details.

## Overwriting {#overwriting}

There are 2 different ways to overwrite a document (replacing all keys in the
document). One way is to use the
[`Document#overwrite()` function](api/document.html#document_Document-overwrite)
followed by `save()`.

```javascript
const doc = await Person.findOne({ _id });

// Sets `name` and unsets all other properties
doc.overwrite({ name: 'Jean-Luc Picard' });
await doc.save();
```

The other way is to use [`Model.replaceOne()`](api/model.html#model_Model-replaceOne).

```javascript
// Sets `name` and unsets all other properties
await Person.replaceOne({ _id }, { name: 'Jean-Luc Picard' });
```

## Next Up

Now that we've covered Documents, let's take a look at
[Subdocuments](subdocs.html).
