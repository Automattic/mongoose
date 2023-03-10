# Documents

Mongoose [documents](api/document.html) represent a one-to-one mapping
to documents as stored in MongoDB. Each document is an instance of its
[Model](models.html).

<ul class="toc">
  <li><a href="#documents-vs-models">Documents vs Models</a></li>
  <li><a href="#retrieving">Retrieving</a></li>
  <li><a href="#updating-using-save">Updating Using <code>save()</code></a></li>
  <li><a href="#updating-using-queries">Updating Using Queries</a></li>
  <li><a href="#validating">Validating</a></li>
  <li><a href="#overwriting">Overwriting</a></li>
</ul>

<h2 id="documents-vs-models"><a href="#documents-vs-models">Documents vs Models</a></h2>

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

<h2 id="retrieving"><a href="#retrieving">Retrieving</a></h2>

When you load documents from MongoDB using model functions like [`findOne()`](api/model.html#model_Model-findOne),
you get a Mongoose document back.

```javascript
const doc = await MyModel.findOne();

doc instanceof MyModel; // true
doc instanceof mongoose.Model; // true
doc instanceof mongoose.Document; // true
```

<h2 id="updating-using-save"><a href="#updating-using-save">Updating Using <code>save()</code></a></h2>

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

<h2 id="updating-using-queries"><a href="#updating-using-queries">Updating Using Queries</a></h2>

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

_Note that `update()`, `updateMany()`, `findOneAndUpdate()`, etc. do *not*
execute `save()` middleware. If you need save middleware and full validation,
first query for the document and then `save()` it._

<h2 id="validating"><a href="#validating">Validating</a></h2>

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
by default. However, Mongoose does _not_ run validation on query function
parameters by default. You need to set `runValidators: true` for Mongoose
to validate.

```javascript
// Cast to number failed for value "bar" at path "age"
await Person.updateOne({}, { age: 'bar' });

// Path `age` (-1) is less than minimum allowed value (0).
await Person.updateOne({}, { age: -1 }, { runValidators: true });
```

Read the [validation](validation.html) guide for more details.

<h2 id="overwriting"><a href="#overwriting">Overwriting</a></h2>

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
