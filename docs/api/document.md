# Document

- [`Document.prototype.$assertPopulated()`](#Document.prototype.$assertPopulated())
- [`Document.prototype.$clearModifiedPaths()`](#Document.prototype.$clearModifiedPaths())
- [`Document.prototype.$clone()`](#Document.prototype.$clone())
- [`Document.prototype.$createModifiedPathsSnapshot()`](#Document.prototype.$createModifiedPathsSnapshot())
- [`Document.prototype.$errors`](#Document.prototype.$errors)
- [`Document.prototype.$getAllSubdocs()`](#Document.prototype.$getAllSubdocs())
- [`Document.prototype.$getChanges()`](#Document.prototype.$getChanges())
- [`Document.prototype.$getPopulatedDocs()`](#Document.prototype.$getPopulatedDocs())
- [`Document.prototype.$ignore()`](#Document.prototype.$ignore())
- [`Document.prototype.$inc()`](#Document.prototype.$inc())
- [`Document.prototype.$init()`](#Document.prototype.$init())
- [`Document.prototype.$isDefault()`](#Document.prototype.$isDefault())
- [`Document.prototype.$isDeleted()`](#Document.prototype.$isDeleted())
- [`Document.prototype.$isEmpty()`](#Document.prototype.$isEmpty())
- [`Document.prototype.$isModified()`](#Document.prototype.$isModified())
- [`Document.prototype.$isNew`](#Document.prototype.$isNew)
- [`Document.prototype.$locals`](#Document.prototype.$locals)
- [`Document.prototype.$markValid()`](#Document.prototype.$markValid())
- [`Document.prototype.$op`](#Document.prototype.$op)
- [`Document.prototype.$parent()`](#Document.prototype.$parent())
- [`Document.prototype.$populated()`](#Document.prototype.$populated())
- [`Document.prototype.$restoreModifiedPathsSnapshot()`](#Document.prototype.$restoreModifiedPathsSnapshot())
- [`Document.prototype.$session()`](#Document.prototype.$session())
- [`Document.prototype.$set()`](#Document.prototype.$set())
- [`Document.prototype.$timestamps()`](#Document.prototype.$timestamps())
- [`Document.prototype.$validate()`](#Document.prototype.$validate())
- [`Document.prototype.$where`](#Document.prototype.$where)
- [`Document.prototype.depopulate()`](#Document.prototype.depopulate())
- [`Document.prototype.directModifiedPaths()`](#Document.prototype.directModifiedPaths())
- [`Document.prototype.equals()`](#Document.prototype.equals())
- [`Document.prototype.errors`](#Document.prototype.errors)
- [`Document.prototype.get()`](#Document.prototype.get())
- [`Document.prototype.getChanges()`](#Document.prototype.getChanges())
- [`Document.prototype.id`](#Document.prototype.id)
- [`Document.prototype.init()`](#Document.prototype.init())
- [`Document.prototype.inspect()`](#Document.prototype.inspect())
- [`Document.prototype.invalidate()`](#Document.prototype.invalidate())
- [`Document.prototype.isDirectModified()`](#Document.prototype.isDirectModified())
- [`Document.prototype.isDirectSelected()`](#Document.prototype.isDirectSelected())
- [`Document.prototype.isInit()`](#Document.prototype.isInit())
- [`Document.prototype.isModified()`](#Document.prototype.isModified())
- [`Document.prototype.isNew`](#Document.prototype.isNew)
- [`Document.prototype.isSelected()`](#Document.prototype.isSelected())
- [`Document.prototype.markModified()`](#Document.prototype.markModified())
- [`Document.prototype.modifiedPaths()`](#Document.prototype.modifiedPaths())
- [`Document.prototype.overwrite()`](#Document.prototype.overwrite())
- [`Document.prototype.parent()`](#Document.prototype.parent())
- [`Document.prototype.populate()`](#Document.prototype.populate())
- [`Document.prototype.populated()`](#Document.prototype.populated())
- [`Document.prototype.replaceOne()`](#Document.prototype.replaceOne())
- [`Document.prototype.save()`](#Document.prototype.save())
- [`Document.prototype.schema`](#Document.prototype.schema)
- [`Document.prototype.set()`](#Document.prototype.set())
- [`Document.prototype.toJSON()`](#Document.prototype.toJSON())
- [`Document.prototype.toObject()`](#Document.prototype.toObject())
- [`Document.prototype.toString()`](#Document.prototype.toString())
- [`Document.prototype.unmarkModified()`](#Document.prototype.unmarkModified())
- [`Document.prototype.updateOne()`](#Document.prototype.updateOne())
- [`Document.prototype.validate()`](#Document.prototype.validate())
- [`Document.prototype.validateSync()`](#Document.prototype.validateSync())

## `Document.prototype.$assertPopulated()`

### Parameters

- `path` \<string|Array[string]\> path or array of paths to check. `$assertPopulated` throws if any of the given paths is not populated.
- `[values]` \<object\> optional values to `$set()`. Convenient if you want to manually populate a path and assert that the path was populated in 1 call.

### Returns

- \<Document\> this

Throws an error if a given path is not populated

#### Example:

    const doc = await Model.findOne().populate('author');

    doc.$assertPopulated('author'); // does not throw
    doc.$assertPopulated('other path'); // throws an error

    // Manually populate and assert in one call. The following does
    // `doc.$set({ likes })` before asserting.
    doc.$assertPopulated('likes', { likes });

## `Document.prototype.$clearModifiedPaths()`

### Returns

- \<Document\> this

Clear the document's modified paths.

#### Example:

    const doc = await TestModel.findOne();

    doc.name = 'test';
    doc.$isModified('name'); // true

    doc.$clearModifiedPaths();
    doc.name; // 'test', `$clearModifiedPaths()` does **not** modify the document's data, only change tracking

## `Document.prototype.$clone()`

### Returns

- \<Document\> a copy of this document

Returns a copy of this document with a deep clone of `_doc` and `$__`.

## `Document.prototype.$createModifiedPathsSnapshot()`

### Returns

- \<ModifiedPathsSnapshot\> a copy of this document's internal change tracking state

Creates a snapshot of this document's internal change tracking state. You can later
reset this document's change tracking state using `$restoreModifiedPathsSnapshot()`.

#### Example:

    const doc = await TestModel.findOne();
    const snapshot = doc.$createModifiedPathsSnapshot();

## `Document.prototype.$errors`

### Type

- \<property\>

Hash containing current validation $errors.

## `Document.prototype.$getAllSubdocs()`

### Parameters

- `[options]` \<object\> options. Currently for internal use.

### Returns

- \<Array\>

Get all subdocs (by bfs)

## `Document.prototype.$getChanges()`

### Returns

- \<object\>

Returns the changes that happened to the document
in the format that will be sent to MongoDB.

#### Example:

    const userSchema = new Schema({
      name: String,
      age: Number,
      country: String
    });
    const User = mongoose.model('User', userSchema);
    const user = await User.create({
      name: 'Hafez',
      age: 25,
      country: 'Egypt'
    });

    // returns an empty object, no changes happened yet
    user.$getChanges(); // { }

    user.country = undefined;
    user.age = 26;

    user.$getChanges(); // { $set: { age: 26 }, { $unset: { country: 1 } } }

    await user.save();

    user.$getChanges(); // { }

Modifying the object that `$getChanges()` returns does not affect the document's
change tracking state. Even if you `delete user.$getChanges().$set`, Mongoose
will still send a `$set` to the server.

## `Document.prototype.$getPopulatedDocs()`

### Returns

- \<Array[Document]\> array of populated documents. Empty array if there are no populated documents associated with this document.

Gets all populated documents associated with this document.

## `Document.prototype.$ignore()`

### Parameters

- `path` \<string\> the path to ignore

Don't run validation on this path or persist changes to this path.

#### Example:

    doc.foo = null;
    doc.$ignore('foo');
    doc.save(); // changes to foo will not be persisted and validators won't be run

## `Document.prototype.$inc()`

### Parameters

- `path` \<string|Array\> path or paths to update
- `val` \<number\> increment `path` by this value

### Returns

- \<Document\> this

Increments the numeric value at `path` by the given `val`.
When you call `save()` on this document, Mongoose will send a
[`$inc`](https://www.mongodb.com/docs/manual/reference/operator/update/inc/)
as opposed to a `$set`.

#### Example:

    const schema = new Schema({ counter: Number });
    const Test = db.model('Test', schema);

    const doc = await Test.create({ counter: 0 });
    doc.$inc('counter', 2);
    await doc.save(); // Sends a `{ $inc: { counter: 2 } }` to MongoDB
    doc.counter; // 2

    doc.counter += 2;
    await doc.save(); // Sends a `{ $set: { counter: 2 } }` to MongoDB

## `Document.prototype.$init()`

Alias for [`.init`](https://mongoosejs.com/docs/api/document.md#Document.prototype.init())

## `Document.prototype.$isDefault()`

### Parameters

- `[path]` \<string\>

### Returns

- \<boolean\>

Checks if a path is set to its default.

#### Example:

    MyModel = mongoose.model('test', { name: { type: String, default: 'Val '} });
    const m = new MyModel();
    m.$isDefault('name'); // true

## `Document.prototype.$isDeleted()`

### Parameters

- `[val]` \<boolean\> optional, overrides whether mongoose thinks the doc is deleted

### Returns

- \<boolean,Document\> whether mongoose thinks this doc is deleted.

Getter/setter, determines whether the document was deleted. The `Model.prototype.deleteOne()` method sets `$isDeleted` if the delete operation succeeded.

#### Example:

    const product = await product.deleteOne();
    product.$isDeleted(); // true
    product.deleteOne(); // no-op, doesn't send anything to the db

    product.$isDeleted(false);
    product.$isDeleted(); // false
    product.deleteOne(); // will execute a remove against the db

## `Document.prototype.$isEmpty()`

### Parameters

- `[path]` \<string\>

### Returns

- \<boolean\>

Returns true if the given path is nullish or only contains empty objects.
Useful for determining whether this subdoc will get stripped out by the
[minimize option](https://mongoosejs.com/docs/guide.html#minimize).

#### Example:

    const schema = new Schema({ nested: { foo: String } });
    const Model = mongoose.model('Test', schema);
    const doc = new Model({});
    doc.$isEmpty('nested'); // true
    doc.nested.$isEmpty(); // true

    doc.nested.foo = 'bar';
    doc.$isEmpty('nested'); // false
    doc.nested.$isEmpty(); // false

## `Document.prototype.$isModified()`

Alias of [`.isModified`](https://mongoosejs.com/docs/api/document.md#Document.prototype.isModified())

## `Document.prototype.$isNew`

### Type

- \<property\>

Boolean flag specifying if the document is new. If you create a document
using `new`, this document will be considered "new". `$isNew` is how
Mongoose determines whether `save()` should use `insertOne()` to create
a new document or `updateOne()` to update an existing document.

#### Example:

    const user = new User({ name: 'John Smith' });
    user.$isNew; // true

    await user.save(); // Sends an `insertOne` to MongoDB

On the other hand, if you load an existing document from the database
using `findOne()` or another [query operation](https://mongoosejs.com/docs/queries.html),
`$isNew` will be false.

#### Example:

    const user = await User.findOne({ name: 'John Smith' });
    user.$isNew; // false

Mongoose sets `$isNew` to `false` immediately after `save()` succeeds.
That means Mongoose sets `$isNew` to false **before** `post('save')` hooks run.
In `post('save')` hooks, `$isNew` will be `false` if `save()` succeeded.

#### Example:

    userSchema.post('save', function() {
      this.$isNew; // false
    });
    await User.create({ name: 'John Smith' });

For subdocuments, `$isNew` is true if either the parent has `$isNew` set,
or if you create a new subdocument.

#### Example:

    // Assume `Group` has a document array `users`
    const group = await Group.findOne();
    group.users[0].$isNew; // false

    group.users.push({ name: 'John Smith' });
    group.users[1].$isNew; // true

## `Document.prototype.$locals`

### Type

- \<property\>

Empty object that you can use for storing properties on the document. This
is handy for passing data to middleware without conflicting with Mongoose
internals.

#### Example:

    schema.pre('save', function() {
      // Mongoose will set `isNew` to `false` if `save()` succeeds
      this.$locals.wasNew = this.isNew;
    });

    schema.post('save', function() {
      // Prints true if `isNew` was set before `save()`
      console.log(this.$locals.wasNew);
    });

## `Document.prototype.$markValid()`

### Parameters

- `path` \<string\> the field to mark as valid

Marks a path as valid, removing existing validation errors.

## `Document.prototype.$op`

### Type

- \<property\>

A string containing the current operation that Mongoose is executing
on this document. May be `null`, `'save'`, `'validate'`, or `'remove'`.

#### Example:

    const doc = new Model({ name: 'test' });
    doc.$op; // null

    const promise = doc.save();
    doc.$op; // 'save'

    await promise;
    doc.$op; // null

## `Document.prototype.$parent()`

### Returns

- \<Document\>

Alias for [`parent()`](https://mongoosejs.com/docs/api/document.md#Document.prototype.parent()). If this document is a subdocument or populated
document, returns the document's parent. Returns `undefined` otherwise.

## `Document.prototype.$populated()`

Alias of [`.populated`](https://mongoosejs.com/docs/api/document.md#Document.prototype.populated()).

## `Document.prototype.$restoreModifiedPathsSnapshot()`

### Parameters

- `snapshot` \<ModifiedPathsSnapshot\> of the document's internal change tracking state snapshot to restore

### Returns

- \<Document\> this

Restore this document's change tracking state to the given snapshot.
Note that `$restoreModifiedPathsSnapshot()` does **not** modify the document's
properties, just resets the change tracking state.

This method is especially useful when writing [custom transaction wrappers](https://github.com/Automattic/mongoose/issues/14268#issuecomment-2100505554) that need to restore change tracking when aborting a transaction.

#### Example:

    const doc = await TestModel.findOne();
    const snapshot = doc.$createModifiedPathsSnapshot();

    doc.name = 'test';
    doc.$restoreModifiedPathsSnapshot(snapshot);
    doc.$isModified('name'); // false because `name` was not modified when snapshot was taken
    doc.name; // 'test', `$restoreModifiedPathsSnapshot()` does **not** modify the document's data, only change tracking

## `Document.prototype.$session()`

### Parameters

- `[session]` \<ClientSession\> overwrite the current session

### Returns

- \<ClientSession\>

Getter/setter around the session associated with this document. Used to
automatically set `session` if you `save()` a doc that you got from a
query with an associated session.

#### Example:

    const session = MyModel.startSession();
    const doc = await MyModel.findOne().session(session);
    doc.$session() === session; // true
    doc.$session(null);
    doc.$session() === null; // true

If this is a top-level document, setting the session propagates to all child
docs.

## `Document.prototype.$set()`

### Parameters

- `path` \<string|object\> path or object of key/vals to set
- `val` \<any\> the value to set
- `[type]` \<Schema|string|number|Buffer|any\> optionally specify a type for "on-the-fly" attributes
- `[options]` \<object\> optionally specify options that modify the behavior of the set
- `[options.merge=false]` \<boolean\> if true, setting a [nested path](https://mongoosejs.com/docs/subdocs.html#subdocuments-versus-nested-paths) will merge existing values rather than overwrite the whole object. So `doc.set('nested', { a: 1, b: 2 })` becomes `doc.set('nested.a', 1); doc.set('nested.b', 2);`

### Returns

- \<Document\> this

Alias for `set()`, used internally to avoid conflicts

## `Document.prototype.$timestamps()`

### Parameters

- `[value]` \<boolean\> overwrite the current session

### Returns

- \<Document,boolean,undefined,void\> When used as a getter (no argument), a boolean will be returned indicating the timestamps option state or if unset "undefined" will be used, otherwise will return "this"

Getter/setter around whether this document will apply timestamps by
default when using `save()` and `bulkSave()`.

#### Example:

    const TestModel = mongoose.model('Test', new Schema({ name: String }, { timestamps: true }));
    const doc = new TestModel({ name: 'John Smith' });

    doc.$timestamps(); // true

    doc.$timestamps(false);
    await doc.save(); // Does **not** apply timestamps

## `Document.prototype.$validate()`

Alias of [`.validate`](https://mongoosejs.com/docs/api/document.md#Document.prototype.validate())

## `Document.prototype.$where`

### Type

- \<property\>

Set this property to add additional query filters when Mongoose saves this document and `isNew` is false.

#### Example:

    // Make sure `save()` never updates a soft deleted document.
    schema.pre('save', function() {
      this.$where = { isDeleted: false };
    });

## `Document.prototype.depopulate()`

### Parameters

- `[path]` \<string|Array[string]\> Specific Path to depopulate. If unset, will depopulate all paths on the Document. Or multiple space-delimited paths.

### Returns

- \<Document\> this

### See

- [Document.populate](https://mongoosejs.com/docs/api/document.md#Document.prototype.populate())

Takes a populated field and returns it to its unpopulated state.

#### Example:

    Model.findOne().populate('author').exec(function (err, doc) {
      console.log(doc.author.name); // Dr.Seuss
      console.log(doc.depopulate('author'));
      console.log(doc.author); // '5144cf8050f071d979c118a7'
    })

If the path was not provided, then all populated fields are returned to their unpopulated state.

## `Document.prototype.directModifiedPaths()`

### Returns

- \<Array[string]\>

Returns the list of paths that have been directly modified. A direct
modified path is a path that you explicitly set, whether via `doc.foo = 'bar'`,
`Object.assign(doc, { foo: 'bar' })`, or `doc.set('foo', 'bar')`.

A path `a` may be in `modifiedPaths()` but not in `directModifiedPaths()`
because a child of `a` was directly modified.

#### Example:

    const schema = new Schema({ foo: String, nested: { bar: String } });
    const Model = mongoose.model('Test', schema);
    await Model.create({ foo: 'original', nested: { bar: 'original' } });

    const doc = await Model.findOne();
    doc.nested.bar = 'modified';
    doc.directModifiedPaths(); // ['nested.bar']
    doc.modifiedPaths(); // ['nested', 'nested.bar']

## `Document.prototype.equals()`

### Parameters

- `[doc]` \<Document\> a document to compare. If falsy, will always return "false".

### Returns

- \<boolean\>

Returns true if this document is equal to another document.

Documents are considered equal when they have matching `_id`s, unless neither
document has an `_id`, in which case this function falls back to using
`deepEqual()`.

## `Document.prototype.errors`

### Type

- \<property\>

Hash containing current validation errors.

## `Document.prototype.get()`

### Parameters

- `path` \<string\>
- `[type]` \<Schema|string|number|Buffer|any\> optionally specify a type for on-the-fly attributes
- `[options]` \<object\>
- `[options.virtuals=false]` \<boolean\> Apply virtuals before getting this path
- `[options.getters=true]` \<boolean\> If false, skip applying getters and just get the raw value

### Returns

- \<any\>

Returns the value of a path.

#### Example:

    // path
    doc.get('age') // 47

    // dynamic casting to a string
    doc.get('age', String) // "47"

## `Document.prototype.getChanges()`

Deprecated.

### Returns

- \<Object\>

**Deprecated.** Use `$getChanges()` instead.

Returns the changes that happened to the document
in the format that will be sent to MongoDB.

## `Document.prototype.id`

### Type

- \<property\>

### See

- [Schema options](https://mongoosejs.com/docs/guide.html#options)

The string version of this documents _id.

#### Note:

This getter exists on all documents by default. The getter can be disabled by setting the `id` [option](https://mongoosejs.com/docs/guide.html#id) of its `Schema` to false at construction time.

    new Schema({ name: String }, { id: false });

## `Document.prototype.init()`

### Parameters

- `doc` \<object\> raw document returned by mongo
- `[opts]` \<object\>
- `[opts.hydratedPopulatedDocs=false]` \<boolean\> If true, hydrate and mark as populated any paths that are populated in the raw document
- `[fn]` \<Function\>

Hydrates this document with the data in `doc`. Does not run setters or mark any paths modified.

Called internally after a document is returned from MongoDB. Normally,
you do **not** need to call this function on your own.

This function triggers `init` [middleware](https://mongoosejs.com/docs/middleware.html).
Note that `init` hooks are [synchronous](https://mongoosejs.com/docs/middleware.html#synchronous).

## `Document.prototype.inspect()`

### Returns

- \<string\>

Helper for console.log

## `Document.prototype.invalidate()`

### Parameters

- `path` \<string\> the field to invalidate. For array elements, use the `array.i.field` syntax, where `i` is the 0-based index in the array.
- `err` \<string|Error\> the error which states the reason `path` was invalid
- `val` \<object|string|number|any\> optional invalid value
- `[kind]` \<string\> optional `kind` property for the error

### Returns

- \<ValidationError\> the current ValidationError, with all currently invalidated paths

Marks a path as invalid, causing validation to fail.

The `errorMsg` argument will become the message of the `ValidationError`.

The `value` argument (if passed) will be available through the `ValidationError.value` property.

    doc.invalidate('size', 'must be less than 20', 14);

    doc.validate(function (err) {
      console.log(err)
      // prints
      { message: 'Validation failed',
        name: 'ValidationError',
        errors:
         { size:
            { message: 'must be less than 20',
              name: 'ValidatorError',
              path: 'size',
              type: 'user defined',
              value: 14 } } }
    })

## `Document.prototype.isDirectModified()`

### Parameters

- `[path]` \<string|Array[string]\>

### Returns

- \<boolean\>

Returns true if `path` was directly set and modified, else false.

#### Example:

    doc.set('documents.0.title', 'changed');
    doc.isDirectModified('documents.0.title') // true
    doc.isDirectModified('documents') // false

## `Document.prototype.isDirectSelected()`

### Parameters

- `path` \<string\>

### Returns

- \<boolean\>

Checks if `path` was explicitly selected. If no projection, always returns
true.

#### Example:

    Thing.findOne().select('nested.name').exec(function (err, doc) {
       doc.isDirectSelected('nested.name') // true
       doc.isDirectSelected('nested.otherName') // false
       doc.isDirectSelected('nested')  // false
    })

## `Document.prototype.isInit()`

### Parameters

- `[path]` \<string\>

### Returns

- \<boolean\>

Checks if `path` is in the `init` state, that is, it was set by `Document#init()` and not modified since.

## `Document.prototype.isModified()`

### Parameters

- `[path]` \<string\> optional
- `[options]` \<object\>
- `[options.ignoreAtomics=false]` \<boolean\> If true, doesn't return true if path is underneath an array that was modified with atomic operations like `push()`

### Returns

- \<boolean\>

Returns true if any of the given paths is modified, else false. If no arguments, returns `true` if any path
in this document is modified.

If `path` is given, checks if a path or any full path containing `path` as part of its path chain has been modified.

#### Example:

    doc.set('documents.0.title', 'changed');
    doc.isModified()                      // true
    doc.isModified('documents')           // true
    doc.isModified('documents.0.title')   // true
    doc.isModified('documents otherProp') // true
    doc.isDirectModified('documents')     // false

## `Document.prototype.isNew`

### Type

- \<property\>

### See

- [$isNew](https://mongoosejs.com/docs/api/document.md#Document.prototype.$isNew)

Legacy alias for `$isNew`.

## `Document.prototype.isSelected()`

### Parameters

- `path` \<string|Array[string]\>

### Returns

- \<boolean\>

Checks if `path` was selected in the source query which initialized this document.

#### Example:

    const doc = await Thing.findOne().select('name');
    doc.isSelected('name') // true
    doc.isSelected('age')  // false

## `Document.prototype.markModified()`

### Parameters

- `path` \<string\> the path to mark modified
- `[scope]` \<Document\> the scope to run validators with

Marks the path as having pending changes to write to the db.

_Very helpful when using [Mixed](https://mongoosejs.com/docs/schematypes.html#mixed) types._

#### Example:

    doc.mixed.type = 'changed';
    doc.markModified('mixed.type');
    doc.save() // changes to mixed.type are now persisted

## `Document.prototype.modifiedPaths()`

### Parameters

- `[options]` \<object\>
- `[options.includeChildren=false]` \<boolean\> if true, returns children of modified paths as well. For example, if false, the list of modified paths for `doc.colors = { primary: 'blue' };` will **not** contain `colors.primary`. If true, `modifiedPaths()` will return an array that contains `colors.primary`.

### Returns

- \<Array[string]\>

Returns the list of paths that have been modified.

## `Document.prototype.overwrite()`

### Parameters

- `obj` \<object\> the object to overwrite this document with

### Returns

- \<Document\> this

Overwrite all values in this document with the values of `obj`, except
for immutable properties. Behaves similarly to `set()`, except for it
unsets all properties that aren't in `obj`.

## `Document.prototype.parent()`

### Returns

- \<Document\>

If this document is a subdocument or populated document, returns the document's
parent. Returns the original document if there is no parent.

## `Document.prototype.populate()`

### Parameters

- `path` \<string|object|Array\> either the path to populate or an object specifying all parameters, or either an array of those
- `[select]` \<object|string\> Field selection for the population query
- `[model]` \<Model\> The model you wish to use for population. If not specified, populate will look up the model by the name in the Schema's `ref` field.
- `[match]` \<object\> Conditions for the population query
- `[options]` \<object\> Options for the population query (sort, etc)
- `[options.path=null]` \<string\> The path to populate.
- `[options.populate=null]` \<string|PopulateOptions\> Recursively populate paths in the populated documents. See [deep populate docs](https://mongoosejs.com/docs/populate.html#deep-populate).
- `[options.retainNullValues=false]` \<boolean\> by default, Mongoose removes null and undefined values from populated arrays. Use this option to make `populate()` retain `null` and `undefined` array entries.
- `[options.getters=false]` \<boolean\> if true, Mongoose will call any getters defined on the `localField`. By default, Mongoose gets the raw value of `localField`. For example, you would need to set this option to `true` if you wanted to [add a `lowercase` getter to your `localField`](https://mongoosejs.com/docs/schematypes.html#schematype-options).
- `[options.clone=false]` \<boolean\> When you do `BlogPost.find().populate('author')`, blog posts with the same author will share 1 copy of an `author` doc. Enable this option to make Mongoose clone populated docs before assigning them.
- `[options.match=null]` \<object|Function\> Add an additional filter to the populate query. Can be a filter object containing [MongoDB query syntax](https://www.mongodb.com/docs/manual/tutorial/query-documents/), or a function that returns a filter object.
- `[options.transform=null]` \<Function\> Function that Mongoose will call on every populated document that allows you to transform the populated document.
- `[options.options=null]` \<object\> Additional options like `limit` and `lean`.
- `[options.forceRepopulate=true]` \<boolean\> Set to `false` to prevent Mongoose from repopulating paths that are already populated
- `[options.ordered=false]` \<boolean\> Set to `true` to execute any populate queries one at a time, as opposed to in parallel. We recommend setting this option to `true` if using transactions, especially if also populating multiple paths or paths with multiple models. MongoDB server does **not** support multiple operations in parallel on a single transaction.
- `[callback]` \<Function\> Callback

### Returns

- \<Promise,null\> Returns a Promise if no `callback` is given.

### See

- [population](https://mongoosejs.com/docs/populate.html)
- [Query#select](https://mongoosejs.com/docs/api/query.md#Query.prototype.select())
- [Model.populate](https://mongoosejs.com/docs/api/model.md#Model.populate())

Populates paths on an existing document.

#### Example:

    // Given a document, `populate()` lets you pull in referenced docs
    await doc.populate([
      'stories',
      { path: 'fans', sort: { name: -1 } }
    ]);
    doc.populated('stories'); // Array of ObjectIds
    doc.stories[0].title; // 'Casino Royale'
    doc.populated('fans'); // Array of ObjectIds

    // If the referenced doc has been deleted, `populate()` will
    // remove that entry from the array.
    await Story.delete({ title: 'Casino Royale' });
    await doc.populate('stories'); // Empty array

    // You can also pass additional query options to `populate()`,
    // like projections:
    await doc.populate('fans', '-email');
    doc.fans[0].email // undefined because of 2nd param `select`

## `Document.prototype.populated()`

### Parameters

- `path` \<string\>
- `[val]` \<any\>
- `[options]` \<object\>

### Returns

- \<Array,ObjectId,number,Buffer,string,undefined,void\>

Gets _id(s) used during population of the given `path`.

#### Example:

    const doc = await Model.findOne().populate('author');

    console.log(doc.author.name); // Dr.Seuss
    console.log(doc.populated('author')); // '5144cf8050f071d979c118a7'

If the path was not populated, returns `undefined`.

## `Document.prototype.replaceOne()`

### Parameters

- `doc` \<object\>
- `[options]` \<object\>
- `[callback]` \<Function\>

### Returns

- \<Query\>

### See

- [Model.replaceOne](https://mongoosejs.com/docs/api/model.md#Model.replaceOne())

Sends a replaceOne command with this document `_id` as the query selector.

#### Valid options:

 - same as in [Model.replaceOne](https://mongoosejs.com/docs/api/model.md#Model.replaceOne())

## `Document.prototype.save()`

### Parameters

- `[options]` \<object\> options optional options
- `[options.session=null]` \<Session\> the [session](https://www.mongodb.com/docs/manual/reference/server-sessions/) associated with this save operation. If not specified, defaults to the [document's associated session](https://mongoosejs.com/docs/api/document.md#Document.prototype.$session()).
- `[options.safe]` \<object\> (DEPRECATED) overrides [schema's safe option](https://mongoosejs.com/docs/guide.html#safe). Use the `w` option instead.
- `[options.validateBeforeSave]` \<boolean\> set to false to save without validating.
- `[options.validateModifiedOnly=false]` \<boolean\> If `true`, Mongoose will only validate modified paths, as opposed to modified paths and `required` paths.
- `[options.w]` \<number|string\> set the [write concern](https://www.mongodb.com/docs/manual/reference/write-concern/#w-option). Overrides the [schema-level `writeConcern` option](https://mongoosejs.com/docs/guide.html#writeConcern)
- `[options.j]` \<boolean\> set to true for MongoDB to wait until this `save()` has been [journaled before resolving the returned promise](https://www.mongodb.com/docs/manual/reference/write-concern/#j-option). Overrides the [schema-level `writeConcern` option](https://mongoosejs.com/docs/guide.html#writeConcern)
- `[options.wtimeout]` \<number\> sets a [timeout for the write concern](https://www.mongodb.com/docs/manual/reference/write-concern/#wtimeout). Overrides the [schema-level `writeConcern` option](https://mongoosejs.com/docs/guide.html#writeConcern).
- `[options.checkKeys=true]` \<boolean\> the MongoDB driver prevents you from saving keys that start with '$' or contain '.' by default. Set this option to `false` to skip that check. See [restrictions on field names](https://www.mongodb.com/docs/manual/reference/limits/#Restrictions-on-Field-Names)
- `[options.timestamps=true]` \<boolean\> if `false` and [timestamps](https://mongoosejs.com/docs/guide.html#timestamps) are enabled, skip timestamps for this `save()`.

### Returns

- \<Promise\>

### See

- [middleware](https://mongoosejs.com/docs/middleware.html)

Saves this document by inserting a new document into the database if [document.isNew](https://mongoosejs.com/docs/api/document.md#Document.prototype.isNew()) is `true`,
or sends an [updateOne](https://mongoosejs.com/docs/api/document.md#Document.prototype.updateOne()) operation **only** with the modifications to the database, it does not replace the whole document in the latter case.

#### Example:

    product.sold = Date.now();
    product = await product.save();

If save is successful, the returned promise will fulfill with the document
saved.

#### Example:

    const newProduct = await product.save();
    newProduct === product; // true

## `Document.prototype.schema`

### Type

- \<property\>

The document's schema.

## `Document.prototype.set()`

### Parameters

- `path` \<string|object\> path or object of key/vals to set
- `val` \<any\> the value to set
- `[type]` \<Schema|string|number|Buffer|any\> optionally specify a type for "on-the-fly" attributes
- `[options]` \<object\> optionally specify options that modify the behavior of the set

### Returns

- \<Document\> this

Sets the value of a path, or many paths.
Alias for [`.$set`](https://mongoosejs.com/docs/api/document.md#Document.prototype.$set()).

#### Example:

    // path, value
    doc.set(path, value)

    // object
    doc.set({
        path  : value
      , path2 : {
           path  : value
        }
    })

    // on-the-fly cast to number
    doc.set(path, value, Number)

    // on-the-fly cast to string
    doc.set(path, value, String)

    // changing strict mode behavior
    doc.set(path, value, { strict: false });

## `Document.prototype.toJSON()`

### Parameters

- `options` \<object\>
- `[options.flattenMaps=true]` \<boolean\> if true, convert Maps to [POJOs](https://masteringjs.io/tutorials/fundamentals/pojo). Useful if you want to `JSON.stringify()` the result.
- `[options.flattenObjectIds=false]` \<boolean\> if true, convert any ObjectIds in the result to 24 character hex strings.
- `[options.flattenUUIDs=false]` \<boolean\> if true, convert any UUIDs in the result to 36-character UUID strings in 8-4-4-4-12 format.
- `[options.schemaFieldsOnly=false]` \<boolean\> - If true, the resulting object will only have fields that are defined in the document's schema. By default, `toJSON()` returns all fields in the underlying document from MongoDB, including ones that are not listed in the schema.

### Returns

- \<object\>

### See

- [Document#toObject](https://mongoosejs.com/docs/api/document.md#Document.prototype.toObject())
- [JSON.stringify() in JavaScript](https://thecodebarbarian.com/the-80-20-guide-to-json-stringify-in-javascript.html)

The return value of this method is used in calls to [`JSON.stringify(doc)`](https://thecodebarbarian.com/the-80-20-guide-to-json-stringify-in-javascript#the-tojson-function).

This method accepts the same options as [Document#toObject](https://mongoosejs.com/docs/api/document.md#Document.prototype.toObject()). To apply the options to every document of your schema by default, set your [schemas](https://mongoosejs.com/docs/api/schema.md#Schema()) `toJSON` option to the same argument.

    schema.set('toJSON', { virtuals: true });

There is one difference between `toJSON()` and `toObject()` options.
When you call `toJSON()`, the [`flattenMaps` option](https://mongoosejs.com/docs/api/document.md#Document.prototype.toObject()) defaults to `true`, because `JSON.stringify()` doesn't convert maps to objects by default.
When you call `toObject()`, the `flattenMaps` option is `false` by default.

See [schema options](https://mongoosejs.com/docs/guide.html#toJSON) for more information on setting `toJSON` option defaults.

## `Document.prototype.toObject()`

### Parameters

- `[options]` \<object\>
- `[options.getters=false]` \<boolean\> if true, apply all getters, including virtuals
- `[options.virtuals=false]` \<boolean|object\> if true, apply virtuals, including aliases. Use `{ getters: true, virtuals: false }` to just apply getters, not virtuals. An object of the form `{ pathsToSkip: ['someVirtual'] }` may also be used to omit specific virtuals.
- `[options.aliases=true]` \<boolean\> if `options.virtuals = true`, you can set `options.aliases = false` to skip applying aliases. This option is a no-op if `options.virtuals = false`.
- `[options.minimize=true]` \<boolean\> if true, omit any empty objects from the output
- `[options.transform=null]` \<Function|null\> if set, mongoose will call this function to allow you to transform the returned object
- `[options.depopulate=false]` \<boolean\> if true, replace any conventionally populated paths with the original id in the output. Has no affect on virtual populated paths.
- `[options.versionKey=true]` \<boolean\> if false, exclude the version key (`__v` by default) from the output
- `[options.flattenMaps=false]` \<boolean\> if true, convert Maps to POJOs. Useful if you want to `JSON.stringify()` the result of `toObject()`.
- `[options.flattenObjectIds=false]` \<boolean\> if true, convert any ObjectIds in the result to 24 character hex strings.
- `[options.flattenUUIDs=false]` \<boolean\> if true, convert any UUIDs in the result to 36-character UUID strings in 8-4-4-4-12 format.
- `[options.useProjection=false]` \<boolean\> - If true, omits fields that are excluded in this document's projection. Unless you specified a projection, this will omit any field that has `select: false` in the schema.
- `[options.schemaFieldsOnly=false]` \<boolean\> - If true, the resulting object will only have fields that are defined in the document's schema. By default, `toObject()` returns all fields in the underlying document from MongoDB, including ones that are not listed in the schema.

### Returns

- \<object\> document as a plain old JavaScript object (POJO). This object may contain ObjectIds, Maps, Dates, mongodb.Binary, Buffers, and other non-POJO values.

### See

- [mongodb.Binary](https://mongodb.github.io/node-mongodb-native/7.0/classes/BSON.Binary.html)

Converts this document into a plain-old JavaScript object ([POJO](https://masteringjs.io/tutorials/fundamentals/pojo)).

Buffers are converted to instances of [mongodb.Binary](https://mongodb.github.io/node-mongodb-native/7.0/classes/BSON.Binary.html) for proper storage.

#### Getters/Virtuals

Example of only applying path getters

    doc.toObject({ getters: true, virtuals: false })

Example of only applying virtual getters

    doc.toObject({ virtuals: true })

Example of applying both path and virtual getters

    doc.toObject({ getters: true })

To apply these options to every document of your schema by default, set your [schemas](https://mongoosejs.com/docs/api/schema.md#Schema()) `toObject` option to the same argument.

    schema.set('toObject', { virtuals: true })

#### Transform:

We may need to perform a transformation of the resulting object based on some criteria, say to remove some sensitive information or return a custom object. In this case we set the optional `transform` function.

Transform functions receive three arguments

    function (doc, ret, options) {}

- `doc` The mongoose document which is being converted
- `ret` The plain object representation which has been converted
- `options` The options in use (either schema options or the options passed inline)

#### Example:

    // specify the transform schema option
    if (!schema.options.toObject) schema.options.toObject = {};
    schema.options.toObject.transform = function (doc, ret, options) {
      // remove the _id of every document before returning the result
      delete ret._id;
      return ret;
    }

    // without the transformation in the schema
    doc.toObject(); // { _id: 'anId', name: 'Wreck-it Ralph' }

    // with the transformation
    doc.toObject(); // { name: 'Wreck-it Ralph' }

With transformations we can do a lot more than remove properties. We can even return completely new customized objects:

    if (!schema.options.toObject) schema.options.toObject = {};
    schema.options.toObject.transform = function (doc, ret, options) {
      return { movie: ret.name }
    }

    // without the transformation in the schema
    doc.toObject(); // { _id: 'anId', name: 'Wreck-it Ralph' }

    // with the transformation
    doc.toObject(); // { movie: 'Wreck-it Ralph' }

_Note: if a transform function returns `undefined`, the return value will be ignored._

Transformations may also be applied inline, overridding any transform set in the schema options.
Any transform function specified in `toObject` options also propagates to any subdocuments.

    function deleteId(doc, ret, options) {
      delete ret._id;
      return ret;
    }

    const schema = mongoose.Schema({ name: String, docArr: [{ name: String }] });
    const TestModel = mongoose.model('Test', schema);

    const doc = new TestModel({ name: 'test', docArr: [{ name: 'test' }] });

    // pass the transform as an inline option. Deletes `_id` property
    // from both the top-level document and the subdocument.
    const obj = doc.toObject({ transform: deleteId });
    obj._id; // undefined
    obj.docArr[0]._id; // undefined

If you want to skip transformations, use `transform: false`:

    schema.options.toObject = {
      hide: '_id',
      transform: function(doc, ret, options) {
        if (options.hide) {
          options.hide.split(' ').forEach(function(prop) {
            delete ret[prop];
          });
        }
        return ret;
      }
    };

    const doc = new Doc({ _id: 'anId', secret: 47, name: 'Wreck-it Ralph' });
    doc.toObject();                                        // { secret: 47, name: 'Wreck-it Ralph' }
    doc.toObject({ hide: 'secret _id', transform: false });// { _id: 'anId', secret: 47, name: 'Wreck-it Ralph' }
    doc.toObject({ hide: 'secret _id', transform: true }); // { name: 'Wreck-it Ralph' }

If you pass a transform in `toObject()` options, Mongoose will apply the transform
to [subdocuments](https://mongoosejs.com/docs/subdocs.html) in addition to the top-level document.
Similarly, `transform: false` skips transforms for all subdocuments.
Note that this behavior is different for transforms defined in the schema:
if you define a transform in `schema.options.toObject.transform`, that transform
will **not** apply to subdocuments.

    const memberSchema = new Schema({ name: String, email: String });
    const groupSchema = new Schema({ members: [memberSchema], name: String, email });
    const Group = mongoose.model('Group', groupSchema);

    const doc = new Group({
      name: 'Engineering',
      email: 'dev@mongoosejs.io',
      members: [{ name: 'Val', email: 'val@mongoosejs.io' }]
    });

    // Removes `email` from both top-level document **and** array elements
    // { name: 'Engineering', members: [{ name: 'Val' }] }
    doc.toObject({ transform: (doc, ret) => { delete ret.email; return ret; } });

Transforms, like all of these options, are also available for `toJSON`. See [this guide to `JSON.stringify()`](https://thecodebarbarian.com/the-80-20-guide-to-json-stringify-in-javascript.html) to learn why `toJSON()` and `toObject()` are separate functions.

See [schema options](https://mongoosejs.com/docs/guide.html#toObject) for some more details.

_During save, no custom options are applied to the document before being sent to the database._

## `Document.prototype.toString()`

### Returns

- \<string\>

Helper for console.log

## `Document.prototype.unmarkModified()`

### Parameters

- `path` \<string\> the path to unmark modified

Clears the modified state on the specified path.

#### Example:

    doc.foo = 'bar';
    doc.unmarkModified('foo');
    doc.save(); // changes to foo will not be persisted

## `Document.prototype.updateOne()`

### Parameters

- `update` \<object\>
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.lean]` \<object\> if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.lean()) and the [Mongoose lean tutorial](https://mongoosejs.com/docs/tutorials/lean.html).
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
- `[options.timestamps=null]` \<boolean\> If set to `false` and [schema-level timestamps](https://mongoosejs.com/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Note that this allows you to overwrite timestamps. Does nothing if schema-level timestamps are not set.
- `[options.middleware=true]` \<boolean|object\> set to `false` to skip all user-defined middleware
- `[options.middleware.pre=true]` \<boolean\> set to `false` to skip only pre hooks
- `[options.middleware.post=true]` \<boolean\> set to `false` to skip only post hooks

### Returns

- \<Query\>

### See

- [Model.updateOne](https://mongoosejs.com/docs/api/model.md#Model.updateOne)

Sends an updateOne command with this document `_id` as the query selector.

#### Example:

    weirdCar.updateOne({$inc: {wheels:1}}, { w: 1 });

#### Valid options:

 - same as in [Model.updateOne](https://mongoosejs.com/docs/api/model.md#Model.updateOne)

## `Document.prototype.validate()`

### Parameters

- `[pathsToValidate]` \<Array|string\> list of paths to validate. If set, Mongoose will validate only the modified paths that are in the given list.
- `[options]` \<object\> internal options
- `[options.validateModifiedOnly=false]` \<boolean\> if `true` mongoose validates only modified paths.
- `[options.pathsToSkip]` \<Array|string\> list of paths to skip. If set, Mongoose will validate every modified path that is not in this list.
- `[options.middleware=true]` \<boolean|object\> set to `false` to skip all user-defined middleware
- `[options.middleware.pre=true]` \<boolean\> set to `false` to skip only pre hooks
- `[options.middleware.post=true]` \<boolean\> set to `false` to skip only post hooks

### Returns

- \<Promise\> Returns a Promise.

Executes registered validation rules for this document.

#### Note:

This method is called `pre` save and if a validation rule is violated, [save](https://mongoosejs.com/docs/api/model.md#Model.prototype.save()) is aborted and the error is thrown.

#### Example:

    await doc.validate({ validateModifiedOnly: false, pathsToSkip: ['name', 'email']});

## `Document.prototype.validateSync()`

Deprecated.

### Parameters

- `[pathsToValidate]` \<Array|string\> only validate the given paths
- `[options]` \<object\> options for validation
- `[options.validateModifiedOnly=false]` \<boolean\> If `true`, Mongoose will only validate modified paths, as opposed to modified paths and `required` paths.
- `[options.pathsToSkip]` \<Array|string\> list of paths to skip. If set, Mongoose will validate every modified path that is not in this list.

### Returns

- \<ValidationError,undefined,void\> ValidationError if there are errors during validation, or undefined if there is no error.

Executes registered validation rules (skipping asynchronous validators) for this document.

**Deprecated.** Use [`validate()`](https://mongoosejs.com/docs/api/document.md#Document.prototype.validate()) instead.
`validateSync()` does not run validation middleware and will be removed in Mongoose 10.

#### Note:

This method is useful if you need synchronous validation.

#### Example:

    const err = doc.validateSync();
    if (err) {
      handleError(err);
    } else {
      // validation passed
    }
