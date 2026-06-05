# Model

- [`Model()`](#Model())
- [`Model.$where()`](#Model.$where())
- [`Model.aggregate()`](#Model.aggregate())
- [`Model.applyDefaults()`](#Model.applyDefaults())
- [`Model.applyTimestamps()`](#Model.applyTimestamps())
- [`Model.applyVirtuals()`](#Model.applyVirtuals())
- [`Model.bulkSave()`](#Model.bulkSave())
- [`Model.bulkWrite()`](#Model.bulkWrite())
- [`Model.castObject()`](#Model.castObject())
- [`Model.cleanIndexes()`](#Model.cleanIndexes())
- [`Model.clientEncryption()`](#Model.clientEncryption())
- [`Model.countDocuments()`](#Model.countDocuments())
- [`Model.create()`](#Model.create())
- [`Model.createCollection()`](#Model.createCollection())
- [`Model.createIndexes()`](#Model.createIndexes())
- [`Model.createSearchIndex()`](#Model.createSearchIndex())
- [`Model.createSearchIndexes()`](#Model.createSearchIndexes())
- [`Model.db`](#Model.db)
- [`Model.deleteMany()`](#Model.deleteMany())
- [`Model.deleteOne()`](#Model.deleteOne())
- [`Model.diffIndexes()`](#Model.diffIndexes())
- [`Model.discriminator()`](#Model.discriminator())
- [`Model.distinct()`](#Model.distinct())
- [`Model.dropSearchIndex()`](#Model.dropSearchIndex())
- [`Model.ensureIndexes()`](#Model.ensureIndexes())
- [`Model.estimatedDocumentCount()`](#Model.estimatedDocumentCount())
- [`Model.events`](#Model.events)
- [`Model.exists()`](#Model.exists())
- [`Model.find()`](#Model.find())
- [`Model.findById()`](#Model.findById())
- [`Model.findByIdAndDelete()`](#Model.findByIdAndDelete())
- [`Model.findByIdAndUpdate()`](#Model.findByIdAndUpdate())
- [`Model.findOne()`](#Model.findOne())
- [`Model.findOneAndDelete()`](#Model.findOneAndDelete())
- [`Model.findOneAndReplace()`](#Model.findOneAndReplace())
- [`Model.findOneAndUpdate()`](#Model.findOneAndUpdate())
- [`Model.hydrate()`](#Model.hydrate())
- [`Model.init()`](#Model.init())
- [`Model.insertMany()`](#Model.insertMany())
- [`Model.insertOne()`](#Model.insertOne())
- [`Model.inspect()`](#Model.inspect())
- [`Model.listIndexes()`](#Model.listIndexes())
- [`Model.listSearchIndexes()`](#Model.listSearchIndexes())
- [`Model.namespace()`](#Model.namespace())
- [`Model.populate()`](#Model.populate())
- [`Model.prototype.$model()`](#Model.prototype.$model())
- [`Model.prototype.$where`](#Model.prototype.$where)
- [`Model.prototype.base`](#Model.prototype.base)
- [`Model.prototype.baseModelName`](#Model.prototype.baseModelName)
- [`Model.prototype.collection`](#Model.prototype.collection)
- [`Model.prototype.collection`](#Model.prototype.collection)
- [`Model.prototype.db`](#Model.prototype.db)
- [`Model.prototype.deleteOne()`](#Model.prototype.deleteOne())
- [`Model.prototype.discriminators`](#Model.prototype.discriminators)
- [`Model.prototype.increment()`](#Model.prototype.increment())
- [`Model.prototype.model()`](#Model.prototype.model())
- [`Model.prototype.modelName`](#Model.prototype.modelName)
- [`Model.prototype.save()`](#Model.prototype.save())
- [`Model.recompileSchema()`](#Model.recompileSchema())
- [`Model.replaceOne()`](#Model.replaceOne())
- [`Model.schema`](#Model.schema)
- [`Model.startSession()`](#Model.startSession())
- [`Model.syncIndexes()`](#Model.syncIndexes())
- [`Model.translateAliases()`](#Model.translateAliases())
- [`Model.updateMany()`](#Model.updateMany())
- [`Model.updateOne()`](#Model.updateOne())
- [`Model.updateSearchIndex()`](#Model.updateSearchIndex())
- [`Model.useConnection()`](#Model.useConnection())
- [`Model.validate()`](#Model.validate())
- [`Model.watch()`](#Model.watch())
- [`Model.where()`](#Model.where())
- [`Model.~standard`](#Model.~standard)

## `Model()`

### Parameters

- `doc` \<object\> values for initial set
- `[fields]` \<object\> optional object containing the fields that were selected in the query which returned this document. You do **not** need to set this parameter to ensure Mongoose handles your [query projection](https://mongoosejs.com/docs/api/query.md#Query.prototype.select()).
- `[options]` \<object\> optional object containing the options for the document.
- `[options.defaults=true]` \<boolean\> if `false`, skip applying default values to this document.
- `[options.skipId=false]` \<boolean\> By default, Mongoose document if one is not provided and the document's schema does not override Mongoose's default `_id`. Set `skipId` to `true` to skip this generation step.

### Inherits

- [Document](https://mongoosejs.com/docs/api/document.md)

A Model is a class that's your primary tool for interacting with MongoDB.
An instance of a Model is called a [Document](https://mongoosejs.com/docs/api/document.md#Document).

In Mongoose, the term "Model" refers to subclasses of the `mongoose.Model`
class. You should not use the `mongoose.Model` class directly. The
[`mongoose.model()`](https://mongoosejs.com/docs/api/mongoose.md#Mongoose.prototype.model()) and
[`connection.model()`](https://mongoosejs.com/docs/api/connection.md#Connection.prototype.model()) functions
create subclasses of `mongoose.Model` as shown below.

#### Example:

    // `UserModel` is a "Model", a subclass of `mongoose.Model`.
    const UserModel = mongoose.model('User', new Schema({ name: String }));

    // You can use a Model to create new documents using `new`:
    const userDoc = new UserModel({ name: 'Foo' });
    await userDoc.save();

    // You also use a model to create queries:
    const userFromDb = await UserModel.findOne({ name: 'Foo' });

## `Model.$where()`

### Parameters

- `argument` \<string|Function\> is a javascript string or anonymous function

### Returns

- \<Query\>

### See

- [Query.$where](https://mongoosejs.com/docs/api/query.md#Query.prototype.$where)

Creates a `Query` and specifies a `$where` condition.

Sometimes you need to query for things in mongodb using a JavaScript expression. You can do so via `find({ $where: javascript })`, or you can use the mongoose shortcut method $where via a Query chain or from your mongoose Model.

    const result = await Blog.$where('this.username.indexOf("val") !== -1').exec();

## `Model.aggregate()`

### Parameters

- `[pipeline]` \<Array\> aggregation pipeline as an array of objects
- `[options]` \<object\> aggregation options

### Returns

- \<Aggregate\>

### See

- [Aggregate](https://mongoosejs.com/docs/api/aggregate.md#Aggregate())
- [MongoDB](https://www.mongodb.com/docs/manual/applications/aggregation/)

Performs [aggregations](https://www.mongodb.com/docs/manual/aggregation/) on the models collection.

The `aggregate` itself is returned.

This function triggers the following middleware.

- `aggregate()`

#### Example:

    // Find the max balance of all accounts
    const res = await Users.aggregate([
      { $group: { _id: null, maxBalance: { $max: '$balance' }}},
      { $project: { _id: 0, maxBalance: 1 }}
    ]);

    console.log(res); // [ { maxBalance: 98000 } ]

    // Or use the aggregation pipeline builder.
    const res = await Users.aggregate().
      group({ _id: null, maxBalance: { $max: '$balance' } }).
      project('-id maxBalance').
      exec();
    console.log(res); // [ { maxBalance: 98 } ]

#### Note:

- Mongoose does **not** cast aggregation pipelines to the model's schema because `$project` and `$group` operators allow redefining the "shape" of the documents at any stage of the pipeline, which may leave documents in an incompatible format. You can use the [mongoose-cast-aggregation plugin](https://github.com/AbdelrahmanHafez/mongoose-cast-aggregation) to enable minimal casting for aggregation pipelines.
- The documents returned are plain javascript objects, not mongoose documents (since any shape of document can be returned).

#### More About Aggregations:

- [Mongoose `Aggregate`](https://mongoosejs.com/docs/api/aggregate.md)
- [An Introduction to Mongoose Aggregate](https://masteringjs.io/tutorials/mongoose/aggregate)
- [MongoDB Aggregation docs](https://www.mongodb.com/docs/manual/applications/aggregation/)

## `Model.applyDefaults()`

### Parameters

- `obj` \<object|Document\> object or document to apply defaults on

Apply defaults to the given document or POJO.

## `Model.applyTimestamps()`

### Parameters

- `obj` \<object\> object or document to apply virtuals on
- `[options]` \<object\>
- `[options.isUpdate=false]` \<boolean\> if true, treat this as an update: just set updatedAt, skip setting createdAt. If false, set both createdAt and updatedAt
- `[options.currentTime]` \<Function\> if set, Mongoose will call this function to get the current time.

Apply this model's timestamps to a given POJO, including subdocument timestamps

#### Example:

    const userSchema = new Schema({ name: String }, { timestamps: true });
    const User = mongoose.model('User', userSchema);

    const obj = { name: 'John' };
    User.applyTimestamps(obj);
    obj.createdAt; // 2024-06-01T18:00:00.000Z
    obj.updatedAt; // 2024-06-01T18:00:00.000Z

## `Model.applyVirtuals()`

### Parameters

- `obj` \<object\> object or document to apply virtuals on
- `[virtualsToApply]` \<Array[string]\> optional whitelist of virtuals to apply

Apply this model's virtuals to a given POJO. Virtuals execute with the POJO as the context `this`.

#### Example:

    const userSchema = new Schema({ name: String });
    userSchema.virtual('upper').get(function() { return this.name.toUpperCase(); });
    const User = mongoose.model('User', userSchema);

    const obj = { name: 'John' };
    User.applyVirtuals(obj);
    obj.name; // 'John'
    obj.upper; // 'JOHN', Mongoose applied the return value of the virtual to the given object

## `Model.bulkSave()`

### Parameters

- `documents` \<Array[Document]\>
- `[options]` \<object\> options passed to the underlying `bulkWrite()`
- `[options.timestamps]` \<boolean\> defaults to `null`, when set to false, mongoose will not add/update timestamps to the documents.
- `[options.session=null]` \<ClientSession\> The session associated with this bulk write. See [transactions docs](https://mongoosejs.com/docs/transactions.html).
- `[options.w=1]` \<string|number\> The [write concern](https://www.mongodb.com/docs/manual/reference/write-concern/). See [`Query#w()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.w()) for more information.
- `[options.wtimeout=null]` \<number\> The [write concern timeout](https://www.mongodb.com/docs/manual/reference/write-concern/#wtimeout).
- `[options.j=true]` \<boolean\> If false, disable [journal acknowledgement](https://www.mongodb.com/docs/manual/reference/write-concern/#j-option)
- `[options.validateBeforeSave=true]` \<boolean\> set to `false` to skip Mongoose validation on all documents
- `[options.middleware=true]` \<boolean|object\> set to `false` to skip all user-defined middleware
- `[options.middleware.pre=true]` \<boolean\> set to `false` to skip only pre hooks
- `[options.middleware.post=true]` \<boolean\> set to `false` to skip only post hooks

### Returns

- \<BulkWriteResult\> the return value from `bulkWrite()`

Takes an array of documents, gets the changes and inserts/updates documents in the database
according to whether or not the document is new, or whether it has changes or not.

`bulkSave` uses `bulkWrite` under the hood, so it's mostly useful when dealing with many documents (10K+)

`bulkSave()` throws errors under the following conditions:

- one of the provided documents fails validation. In this case, `bulkSave()` does not send a `bulkWrite()`, and throws the first validation error.
- `bulkWrite()` fails (for example, due to being unable to connect to MongoDB or due to duplicate key error)
- `bulkWrite()` did not insert or update **any** documents. In this case, `bulkSave()` will throw a DocumentNotFound error.

Note that `bulkSave()` will **not** throw an error if only some of the `save()` calls succeeded.

## `Model.bulkWrite()`

### Parameters

- `ops` \<Array\>
- `[ops.insertOne.document]` \<object\> The document to insert
- `[ops.insertOne.timestamps=true]` \<object\> If false, do not apply [timestamps](https://mongoosejs.com/docs/guide.html#timestamps) to the operation
- `[ops.updateOne.filter]` \<object\> Update the first document that matches this filter
- `[ops.updateOne.update]` \<object\> An object containing [update operators](https://www.mongodb.com/docs/manual/reference/operator/update/)
- `[ops.updateOne.upsert=false]` \<boolean\> If true, insert a doc if none match
- `[ops.updateOne.timestamps=true]` \<boolean\> If false, do not apply [timestamps](https://mongoosejs.com/docs/guide.html#timestamps) to the operation
- `[ops.updateOne.overwriteImmutable=false]` \<boolean\> Mongoose removes updated immutable properties from `update` by default (excluding $setOnInsert). Set `overwriteImmutable` to `true` to allow updating immutable properties using other update operators.
- `[ops.updateOne.collation]` \<object\> The [MongoDB collation](https://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-collations) to use
- `[ops.updateOne.arrayFilters]` \<Array\> The [array filters](https://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-36-array-filters.html) used in `update`
- `[ops.updateMany.filter]` \<object\> Update all the documents that match this filter
- `[ops.updateMany.update]` \<object\> An object containing [update operators](https://www.mongodb.com/docs/manual/reference/operator/update/)
- `[ops.updateMany.upsert=false]` \<boolean\> If true, insert a doc if no documents match `filter`
- `[ops.updateMany.timestamps=true]` \<boolean\> If false, do not apply [timestamps](https://mongoosejs.com/docs/guide.html#timestamps) to the operation
- `[ops.updateMany.overwriteImmutable=false]` \<boolean\> Mongoose removes updated immutable properties from `update` by default (excluding $setOnInsert). Set `overwriteImmutable` to `true` to allow updating immutable properties using other update operators.
- `[ops.updateMany.collation]` \<object\> The [MongoDB collation](https://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-collations) to use
- `[ops.updateMany.arrayFilters]` \<Array\> The [array filters](https://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-36-array-filters.html) used in `update`
- `[ops.deleteOne.filter]` \<object\> Delete the first document that matches this filter
- `[ops.deleteMany.filter]` \<object\> Delete all documents that match this filter
- `[ops.replaceOne.filter]` \<object\> Replace the first document that matches this filter
- `[ops.replaceOne.replacement]` \<object\> The replacement document
- `[ops.replaceOne.upsert=false]` \<boolean\> If true, insert a doc if no documents match `filter`
- `[ops.replaceOne.timestamps=true]` \<object\> If false, do not apply [timestamps](https://mongoosejs.com/docs/guide.html#timestamps) to the operation
- `[options]` \<object\>
- `[options.ordered=true]` \<boolean\> If true, execute writes in order and stop at the first error. If false, execute writes in parallel and continue until all writes have either succeeded or errored.
- `[options.timestamps=true]` \<boolean\> If false, do not apply [timestamps](https://mongoosejs.com/docs/guide.html#timestamps) to any operations. Can be overridden at the operation-level.
- `[options.session=null]` \<ClientSession\> The session associated with this bulk write. See [transactions docs](https://mongoosejs.com/docs/transactions.html).
- `[options.w=1]` \<string|number\> The [write concern](https://www.mongodb.com/docs/manual/reference/write-concern/). See [`Query#w()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.w()) for more information.
- `[options.wtimeout=null]` \<number\> The [write concern timeout](https://www.mongodb.com/docs/manual/reference/write-concern/#wtimeout).
- `[options.j=true]` \<boolean\> If false, disable [journal acknowledgement](https://www.mongodb.com/docs/manual/reference/write-concern/#j-option)
- `[options.skipValidation=false]` \<boolean\> Set to true to skip Mongoose schema validation on bulk write operations. Mongoose currently runs validation on `insertOne` and `replaceOne` operations by default.
- `[options.bypassDocumentValidation=false]` \<boolean\> If true, disable [MongoDB server-side schema validation](https://www.mongodb.com/docs/manual/core/schema-validation/) for all writes in this bulk.
- `[options.throwOnValidationError=false]` \<boolean\> If true and `ordered: false`, throw an error if one of the operations failed validation, but all valid operations completed successfully. Note that Mongoose will still send all valid operations to the MongoDB server.
- `[options.strict=null]` \<boolean | "throw"\> Overwrites the [`strict` option](https://mongoosejs.com/docs/guide.html#strict) on schema. If false, allows filtering and writing fields not defined in the schema for all writes in this bulk.
- `[options.middleware=true]` \<boolean|object\> set to `false` to skip all user-defined middleware
- `[options.middleware.pre=true]` \<boolean\> set to `false` to skip only pre hooks
- `[options.middleware.post=true]` \<boolean\> set to `false` to skip only post hooks

### Returns

- \<Promise\> resolves to a [`BulkWriteOpResult`](https://mongodb.github.io/node-mongodb-native/7.0/classes/BulkWriteResult.html) if the operation succeeds

Sends multiple `insertOne`, `updateOne`, `updateMany`, `replaceOne`,
`deleteOne`, and/or `deleteMany` operations to the MongoDB server in one
command. This is faster than sending multiple independent operations (e.g.
if you use `create()`) because with `bulkWrite()` there is only one round
trip to MongoDB.

Mongoose will perform casting on all operations you provide.
The only exception is [setting the `update` operator for `updateOne` or `updateMany` to a pipeline](https://www.mongodb.com/docs/manual/reference/method/db.collection.bulkWrite/#updateone-and-updatemany): Mongoose does **not** cast update pipelines.

This function does **not** trigger any middleware, neither `save()`, nor `update()`.
If you need to trigger
`save()` middleware for every document use [`create()`](https://mongoosejs.com/docs/api/model.md#Model.create()) instead.

#### Example:

    Character.bulkWrite([
      {
        insertOne: {
          document: {
            name: 'Eddard Stark',
            title: 'Warden of the North'
          }
        }
      },
      {
        updateOne: {
          filter: { name: 'Eddard Stark' },
          // If you were using the MongoDB driver directly, you'd need to do
          // `update: { $set: { title: ... } }` but mongoose adds $set for
          // you.
          update: { title: 'Hand of the King' }
        }
      },
      {
        deleteOne: {
          filter: { name: 'Eddard Stark' }
        }
      }
    ]).then(res => {
     // Prints "1 1 1"
     console.log(res.insertedCount, res.modifiedCount, res.deletedCount);
    });

    // Mongoose does **not** cast update pipelines, so no casting for the `update` option below.
    // Mongoose does still cast `filter`
    await Character.bulkWrite([{
      updateOne: {
        filter: { name: 'Annika Hansen' },
        update: [{ $set: { name: 7 } }] // Array means update pipeline, so Mongoose skips casting
      }
    }]);

The [supported operations](https://www.mongodb.com/docs/manual/reference/method/db.collection.bulkWrite/#db.collection.bulkWrite) are:

- `insertOne`
- `updateOne`
- `updateMany`
- `deleteOne`
- `deleteMany`
- `replaceOne`

## `Model.castObject()`

### Parameters

- `obj` \<object\> object or document to cast
- `options` \<object\> options passed to castObject
- `options.ignoreCastErrors` \<boolean\> If set to `true` will not throw a ValidationError and only return values that were successfully cast.

Cast the given POJO to the model's schema

#### Example:

    const Test = mongoose.model('Test', Schema({ num: Number }));

    const obj = Test.castObject({ num: '42' });
    obj.num; // 42 as a number

    Test.castObject({ num: 'not a number' }); // Throws a ValidationError

## `Model.cleanIndexes()`

### Parameters

- `[options]` \<object\>
- `[options.toDrop]` \<Array[string]\> if specified, contains a list of index names to drop
- `[options.hideIndexes=false]` \<boolean\> set to `true` to hide indexes instead of dropping. Requires MongoDB server 4.4 or higher

### Returns

- \<Promise<Array[string]>\> list of dropped or hidden index names

Deletes all indexes that aren't defined in this model's schema. Used by
`syncIndexes()`.

The returned promise resolves to a list of the dropped indexes' names as an array

## `Model.clientEncryption()`

If auto encryption is enabled, returns a ClientEncryption instance that is configured with the same settings that
Mongoose's underlying MongoClient is using.  If the client has not yet been configured, returns null.

## `Model.countDocuments()`

### Parameters

- `filter` \<object\>

### Returns

- \<Query\>

Counts number of documents matching `filter` in a database collection.

#### Example:

    const count = await Adventure.countDocuments({ type: 'jungle' });
    console.log('there are %d jungle adventures', count);

If you want to count all documents in a large collection,
use the [`estimatedDocumentCount()` function](https://mongoosejs.com/docs/api/model.md#Model.estimatedDocumentCount())
instead. If you call `countDocuments({})`, MongoDB will always execute
a full collection scan and **not** use any indexes.

The `countDocuments()` function is similar to `count()`, but there are a
[few operators that `countDocuments()` does not support](https://mongodb.github.io/node-mongodb-native/7.0/classes/Collection.html#countDocuments).
Below are the operators that `count()` supports but `countDocuments()` does not,
and the suggested replacement:

- `$where`: [`$expr`](https://www.mongodb.com/docs/manual/reference/operator/query/expr/)
- `$near`: [`$geoWithin`](https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/) with [`$center`](https://www.mongodb.com/docs/manual/reference/operator/query/center/#op._S_center)
- `$nearSphere`: [`$geoWithin`](https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/) with [`$centerSphere`](https://www.mongodb.com/docs/manual/reference/operator/query/centerSphere/#op._S_centerSphere)

## `Model.create()`

### Parameters

- `docs` \<Array|object\> Documents to insert, as a spread or array
- `[options]` \<object\> Options passed down to `save()`. To specify `options`, `docs` **must** be an array, not a spread. See [Model.save](https://mongoosejs.com/docs/api/model.md#Model.prototype.save()) for available options.
- `[options.ordered]` \<boolean\> saves the docs in series rather than parallel.
- `[options.aggregateErrors]` \<boolean\> Aggregate Errors instead of throwing the first one that occurs. Default: false

### Returns

- \<Promise\>

Shortcut for saving one or more documents to the database.
`MyModel.create(docs)` does `new MyModel(doc).save()` for every doc in
docs.

This function triggers the following middleware.

- `save()`

#### Example:

    // Insert one new `Character` document
    await Character.create({ name: 'Jean-Luc Picard' });

    // Insert multiple new `Character` documents
    await Character.create([{ name: 'Will Riker' }, { name: 'Geordi LaForge' }]);

    // Create a new character within a transaction. Note that you **must**
    // pass an array as the first parameter to `create()` if you want to
    // specify options.
    await Character.create([{ name: 'Jean-Luc Picard' }], { session });

## `Model.createCollection()`

### Parameters

- `[options]` \<object\> see [MongoDB driver docs](https://mongodb.github.io/node-mongodb-native/7.0/classes/Db.html#createCollection)

Create the collection for this model. By default, if no indexes are specified,
mongoose will not create the collection for the model until any documents are
created. Use this method to create the collection explicitly.

Note 1: You may need to call this before starting a transaction
See https://www.mongodb.com/docs/manual/core/transactions/#transactions-and-operations

Note 2: You don't have to call this if your schema contains index or unique field.
In that case, just use `Model.init()`

#### Example:

    const userSchema = new Schema({ name: String })
    const User = mongoose.model('User', userSchema);

    User.createCollection().then(function(collection) {
      console.log('Collection is created!');
    });

## `Model.createIndexes()`

### Parameters

- `[options]` \<object\> internal options

### Returns

- \<Promise\>

Similar to `ensureIndexes()`, except for it uses the [`createIndex`](https://mongodb.github.io/node-mongodb-native/7.0/classes/Db.html#createIndex)
function.

## `Model.createSearchIndex()`

### Parameters

- `description` \<object\> index options, including `name` and `definition`
- `description.name` \<string\>
- `description.definition` \<object\>

### Returns

- \<Promise\>

Create an [Atlas search index](https://www.mongodb.com/docs/atlas/atlas-search/create-index/).
This function only works when connected to MongoDB Atlas.

#### Example:

    const schema = new Schema({ name: { type: String, unique: true } });
    const Customer = mongoose.model('Customer', schema);
    await Customer.createSearchIndex({ name: 'test', definition: { mappings: { dynamic: true } } });

## `Model.createSearchIndexes()`

### Returns

- \<Promise\> resolves to the results of creating the search indexes

Creates all [Atlas search indexes](https://www.mongodb.com/docs/atlas/atlas-search/create-index/) defined in this model's schema.
This function only works when connected to MongoDB Atlas.

#### Example:

    const schema = new Schema({
      name: String,
      description: String
    });
    schema.searchIndex({ name: 'test', definition: { mappings: { dynamic: true } } });
    const Product = mongoose.model('Product', schema);

    // Creates the search index defined in the schema
    await Product.createSearchIndexes();

## `Model.db`

### Type

- \<property\>

Connection instance the model uses.

## `Model.deleteMany()`

### Parameters

- `conditions` \<object\>
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.

### Returns

- \<Query\>

Deletes all of the documents that match `conditions` from the collection.
It returns an object with the property `deletedCount` containing the number of documents deleted.

#### Example:

    await Character.deleteMany({ name: /Stark/, age: { $gte: 18 } }); // returns {deletedCount: x} where x is the number of documents deleted.

#### Note:

This function triggers `deleteMany` query hooks. Read the
[middleware docs](https://mongoosejs.com/docs/middleware.html#naming) to learn more.

## `Model.deleteOne()`

### Parameters

- `conditions` \<object\>
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.

### Returns

- \<Query\>

Deletes the first document that matches `conditions` from the collection.
It returns an object with the property `deletedCount` indicating how many documents were deleted.

#### Example:

    await Character.deleteOne({ name: 'Eddard Stark' }); // returns {deletedCount: 1}

#### Note:

This function triggers `deleteOne` query hooks. Read the
[middleware docs](https://mongoosejs.com/docs/middleware.html#naming) to learn more.

## `Model.diffIndexes()`

### Parameters

- `[options]` \<object\>
- `[options.indexOptionsToCreate=false]` \<boolean\> If true, `toCreate` will include both the index spec and the index options, not just the index spec

### Returns

- \<Promise<object>\> contains the indexes that would be dropped in MongoDB and indexes that would be created in MongoDB as `{ toDrop: string[], toCreate: string[] }`.

Does a dry-run of `Model.syncIndexes()`, returning the indexes that `syncIndexes()` would drop and create if you were to run `syncIndexes()`.

#### Example:

    const { toDrop, toCreate } = await Model.diffIndexes();
    toDrop; // Array of strings containing names of indexes that `syncIndexes()` will drop
    toCreate; // Array of index specs containing the keys of indexes that `syncIndexes()` will create

## `Model.discriminator()`

### Parameters

- `name` \<string\> discriminator model name
- `schema` \<Schema\> discriminator model schema
- `[options]` \<object|string\> If string, same as `options.value`.
- `[options.value]` \<string\> the string stored in the `discriminatorKey` property. If not specified, Mongoose uses the `name` parameter.
- `[options.clone=true]` \<boolean\> By default, `discriminator()` clones the given `schema`. Set to `false` to skip cloning.
- `[options.overwriteModels=false]` \<boolean\> by default, Mongoose does not allow you to define a discriminator with the same name as another discriminator. Set this to allow overwriting discriminators with the same name.
- `[options.mergeHooks=true]` \<boolean\> By default, Mongoose merges the base schema's hooks with the discriminator schema's hooks. Set this option to `false` to make Mongoose use the discriminator schema's hooks instead.
- `[options.mergePlugins=true]` \<boolean\> By default, Mongoose merges the base schema's plugins with the discriminator schema's plugins. Set this option to `false` to make Mongoose use the discriminator schema's plugins instead.

### Returns

- \<Model\> The newly created discriminator model

Adds a discriminator type.

#### Example:

    function BaseSchema() {
      Schema.apply(this, arguments);

      this.add({
        name: String,
        createdAt: Date
      });
    }
    util.inherits(BaseSchema, Schema);

    const PersonSchema = new BaseSchema();
    const BossSchema = new BaseSchema({ department: String });

    const Person = mongoose.model('Person', PersonSchema);
    const Boss = Person.discriminator('Boss', BossSchema);
    new Boss().__t; // "Boss". `__t` is the default `discriminatorKey`

    const employeeSchema = new Schema({ boss: ObjectId });
    const Employee = Person.discriminator('Employee', employeeSchema, 'staff');
    new Employee().__t; // "staff" because of 3rd argument above

## `Model.distinct()`

### Parameters

- `field` \<string\>
- `[conditions]` \<object\> optional
- `[options]` \<object\> optional

### Returns

- \<Query\>

Creates a Query for a `distinct` operation.

#### Example:

    const query = Link.distinct('url');
    query.exec();

## `Model.dropSearchIndex()`

### Parameters

- `name` \<string\>

### Returns

- \<Promise\>

Delete an existing [Atlas search index](https://www.mongodb.com/docs/atlas/atlas-search/create-index/) by name.
This function only works when connected to MongoDB Atlas.

#### Example:

    const schema = new Schema({ name: { type: String, unique: true } });
    const Customer = mongoose.model('Customer', schema);
    await Customer.dropSearchIndex('test');

## `Model.ensureIndexes()`

### Parameters

- `[options]` \<object\> internal options

### Returns

- \<Promise\>

Sends `createIndex` commands to mongo for each index declared in the schema.
The `createIndex` commands are sent in series.

#### Example:

    await Event.ensureIndexes();

After completion, an `index` event is emitted on this `Model` passing an error if one occurred.

#### Example:

    const eventSchema = new Schema({ thing: { type: 'string', unique: true } })
    const Event = mongoose.model('Event', eventSchema);

    Event.on('index', function (err) {
      if (err) console.error(err); // error occurred during index creation
    });

_NOTE: It is not recommended that you run this in production. Index creation may impact database performance depending on your load. Use with caution._

## `Model.estimatedDocumentCount()`

### Parameters

- `[options]` \<object\>

### Returns

- \<Query\>

Estimates the number of documents in the MongoDB collection. Faster than
using `countDocuments()` for large collections because
`estimatedDocumentCount()` uses collection metadata rather than scanning
the entire collection.

#### Example:

    const numAdventures = await Adventure.estimatedDocumentCount();

## `Model.events`

### Type

- \<property\>

Event emitter that reports any errors that occurred. Useful for global error
handling.

#### Example:

    MyModel.events.on('error', err => console.log(err.message));

    // Prints a 'CastError' because of the above handler
    await MyModel.findOne({ _id: 'Not a valid ObjectId' }).catch(noop);

## `Model.exists()`

### Parameters

- `filter` \<object\>
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())

### Returns

- \<Query\>

Returns a document with `_id` only if at least one document exists in the database that matches
the given `filter`, and `null` otherwise.

Under the hood, `MyModel.exists({ answer: 42 })` is equivalent to
`MyModel.findOne({ answer: 42 }).select({ _id: 1 }).lean()`

#### Example:

    await Character.deleteMany({});
    await Character.create({ name: 'Jean-Luc Picard' });

    await Character.exists({ name: /picard/i }); // { _id: ... }
    await Character.exists({ name: /riker/i }); // null

This function triggers the following middleware.

- `findOne()`

## `Model.find()`

### Parameters

- `filter` \<object|ObjectId\>
- `[projection]` \<object|string|Array[string]\> optional fields to return, see [`Query.prototype.select()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.select())
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.

### Returns

- \<Query\>

### See

- [field selection](https://mongoosejs.com/docs/api/query.md#Query.prototype.select())
- [query casting](https://mongoosejs.com/docs/tutorials/query_casting.html)

Finds documents.

Mongoose casts the `filter` to match the model's schema before the command is sent.
See our [query casting tutorial](https://mongoosejs.com/docs/tutorials/query_casting.html) for
more information on how Mongoose casts `filter`.

#### Example:

    // find all documents
    await MyModel.find({});

    // find all documents named john and at least 18
    await MyModel.find({ name: 'john', age: { $gte: 18 } }).exec();

    // executes, name LIKE john and only selecting the "name" and "friends" fields
    await MyModel.find({ name: /john/i }, 'name friends').exec();

    // passing options
    await MyModel.find({ name: /john/i }, null, { skip: 10 }).exec();

## `Model.findById()`

### Parameters

- `id` \<any\> value of `_id` to query by
- `[projection]` \<object|string|Array[string]\> optional fields to return, see [`Query.prototype.select()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.select())
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())

### Returns

- \<Query\>

### See

- [field selection](https://mongoosejs.com/docs/api/query.md#Query.prototype.select())
- [lean queries](https://mongoosejs.com/docs/tutorials/lean.html)
- [findById in Mongoose](https://masteringjs.io/tutorials/mongoose/find-by-id)

Finds a single document by its _id field. `findById(id)` is equivalent to `findOne({ _id: id })`.

The `id` is cast based on the Schema before sending the command.

This function triggers the following middleware.

- `findOne()`

#### Example:

    // Find the adventure with the given `id`, or `null` if not found
    await Adventure.findById(id).exec();

    // select only the adventures name and length
    await Adventure.findById(id, 'name length').exec();

## `Model.findByIdAndDelete()`

### Parameters

- `id` \<object|number|string\> value of `_id` to query by
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.

### Returns

- \<Query\>

### See

- [Model.findOneAndDelete](https://mongoosejs.com/docs/api/model.md#Model.findOneAndDelete())
- [mongodb](https://www.mongodb.com/docs/manual/reference/command/findAndModify/)

Issue a MongoDB `findOneAndDelete()` command by a document's _id field.
In other words, `findByIdAndDelete(id)` is a shorthand for
`findOneAndDelete({ _id: id })`.

This function triggers the following middleware.

- `findOneAndDelete()`

## `Model.findByIdAndUpdate()`

### Parameters

- `id` \<object|number|string\> value of `_id` to query by
- `[update]` \<object\>
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.returnDocument='before']` \<'before' | 'after'\> Has two possible values, `'before'` and `'after'`. By default, it will return the document before the update was applied.
- `[options.lean]` \<object\> if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.lean()) and [the Mongoose lean tutorial](https://mongoosejs.com/docs/tutorials/lean.html).
- `[options.session=null]` \<ClientSession\> The session associated with this query. See [transactions docs](https://mongoosejs.com/docs/transactions.html).
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
- `[options.timestamps=null]` \<boolean\> If set to `false` and [schema-level timestamps](https://mongoosejs.com/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Note that this allows you to overwrite timestamps. Does nothing if schema-level timestamps are not set.
- `[options.sort]` \<object|string\> if multiple docs are found by the conditions, sets the sort order to choose which doc to update.
- `[options.runValidators]` \<boolean\> if true, runs [update validators](https://mongoosejs.com/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema
- `[options.setDefaultsOnInsert=true]` \<boolean\> If `setDefaultsOnInsert` and `upsert` are true, mongoose will apply the [defaults](https://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created
- `[options.includeResultMetadata]` \<boolean\> if true, returns the full [ModifyResult from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/ModifyResult.html) rather than just the document
- `[options.upsert=false]` \<boolean\> if true, and no documents found, insert a new document
- `[options.new=false]` \<boolean\> if true, return the modified document rather than the original
- `[options.select]` \<object|string\> sets the document fields to return.
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.
- `[options.overwriteDiscriminatorKey=false]` \<boolean\> Mongoose removes discriminator key updates from `update` by default, set `overwriteDiscriminatorKey` to `true` to allow updating the discriminator key

### Returns

- \<Query\>

### See

- [Model.findOneAndUpdate](https://mongoosejs.com/docs/api/model.md#Model.findOneAndUpdate())
- [mongodb](https://www.mongodb.com/docs/manual/reference/command/findAndModify/)

Issues a mongodb findOneAndUpdate command by a document's _id field.
`findByIdAndUpdate(id, ...)` is equivalent to `findOneAndUpdate({ _id: id }, ...)`.

Finds a matching document, updates it according to the `update` arg,
passing any `options`, and returns the found document (if any).

This function triggers the following middleware.

- `findOneAndUpdate()`

#### Example:

    A.findByIdAndUpdate(id, update, options)  // returns Query
    A.findByIdAndUpdate(id, update)           // returns Query
    A.findByIdAndUpdate()                     // returns Query

#### Note:

All top level update keys which are not `atomic` operation names are treated as set operations:

#### Example:

    Model.findByIdAndUpdate(id, { name: 'jason bourne' }, options)

    // is sent as
    Model.findByIdAndUpdate(id, { $set: { name: 'jason bourne' }}, options)

#### Note:

`findOneAndX` and `findByIdAndX` functions support limited validation. You can
enable validation by setting the `runValidators` option.

If you need full-fledged validation, use the traditional approach of first
retrieving the document.

    const doc = await Model.findById(id)
    doc.name = 'jason bourne';
    await doc.save();

## `Model.findOne()`

### Parameters

- `[conditions]` \<object\>
- `[projection]` \<object|string|Array[string]\> optional fields to return, see [`Query.prototype.select()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.select())
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.

### Returns

- \<Query\>

### See

- [field selection](https://mongoosejs.com/docs/api/query.md#Query.prototype.select())
- [lean queries](https://mongoosejs.com/docs/tutorials/lean.html)

Finds one document.

The `conditions` are cast to their respective SchemaTypes before the command is sent.

*Note:* `conditions` is optional, and if `conditions` is null or undefined,
mongoose will send an empty `findOne` command to MongoDB, which will return
an arbitrary document. If you're querying by `_id`, use `findById()` instead.

#### Example:

    // Find one adventure whose `country` is 'Croatia', otherwise `null`
    await Adventure.findOne({ country: 'Croatia' }).exec();

    // Model.findOne() no longer accepts a callback

    // Select only the adventures name and length
    await Adventure.findOne({ country: 'Croatia' }, 'name length').exec();

## `Model.findOneAndDelete()`

### Parameters

- `conditions` \<object\>
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
- `[options.projection=null]` \<object|string|Array[string]\> optional fields to return, see [`Query.prototype.select()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.select())
- `[options.session=null]` \<ClientSession\> The session associated with this query. See [transactions docs](https://mongoosejs.com/docs/transactions.html).
- `[options.includeResultMetadata]` \<boolean\> if true, returns the full [ModifyResult from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/ModifyResult.html) rather than just the document
- `[options.sort]` \<object|string\> if multiple docs are found by the conditions, sets the sort order to choose which doc to update.
- `[options.select]` \<object|string\> sets the document fields to return.
- `[options.maxTimeMS]` \<number\> puts a time limit on the query - requires mongodb >= 2.6.0
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.

### Returns

- \<Query\>

Issue a MongoDB `findOneAndDelete()` command.

Finds a matching document, removes it, and returns the found document (if any).

This function triggers the following middleware.

- `findOneAndDelete()`

#### Example:

    A.findOneAndDelete(conditions, options)  // return Query
    A.findOneAndDelete(conditions) // returns Query
    A.findOneAndDelete()           // returns Query

`findOneAndX` and `findByIdAndX` functions support limited validation. You can
enable validation by setting the `runValidators` option.

If you need full-fledged validation, use the traditional approach of first
retrieving the document.

    const doc = await Model.findById(id)
    doc.name = 'jason bourne';
    await doc.save();

## `Model.findOneAndReplace()`

### Parameters

- `filter` \<object\> Replace the first document that matches this filter
- `[replacement]` \<object\> Replace with this document
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.returnDocument='before']` \<'before' | 'after'\> Has two possible values, `'before'` and `'after'`. By default, it will return the document before the update was applied.
- `[options.lean]` \<object\> if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.lean()) and [the Mongoose lean tutorial](https://mongoosejs.com/docs/tutorials/lean.html).
- `[options.session=null]` \<ClientSession\> The session associated with this query. See [transactions docs](https://mongoosejs.com/docs/transactions.html).
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
- `[options.timestamps=null]` \<boolean\> If set to `false` and [schema-level timestamps](https://mongoosejs.com/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Note that this allows you to overwrite timestamps. Does nothing if schema-level timestamps are not set.
- `[options.projection=null]` \<object|string|Array[string]\> optional fields to return, see [`Query.prototype.select()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.select())
- `[options.sort]` \<object|string\> if multiple docs are found by the conditions, sets the sort order to choose which doc to update.
- `[options.includeResultMetadata]` \<boolean\> if true, returns the full [ModifyResult from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/ModifyResult.html) rather than just the document
- `[options.select]` \<object|string\> sets the document fields to return.
- `[options.maxTimeMS]` \<number\> puts a time limit on the query - requires mongodb >= 2.6.0
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.

### Returns

- \<Query\>

Issue a MongoDB `findOneAndReplace()` command.

Finds a matching document, replaces it with the provided doc, and returns the document.

This function triggers the following query middleware.

- `findOneAndReplace()`

#### Example:

    A.findOneAndReplace(filter, replacement, options)  // return Query
    A.findOneAndReplace(filter, replacement) // returns Query
    A.findOneAndReplace()                    // returns Query

## `Model.findOneAndUpdate()`

### Parameters

- `[conditions]` \<object\>
- `[update]` \<object\>
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.returnDocument='before']` \<'before' | 'after'\> Has two possible values, `'before'` and `'after'`. By default, it will return the document before the update was applied.
- `[options.lean]` \<object\> if truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document. See [`Query.lean()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.lean()) and [the Mongoose lean tutorial](https://mongoosejs.com/docs/tutorials/lean.html).
- `[options.session=null]` \<ClientSession\> The session associated with this query. See [transactions docs](https://mongoosejs.com/docs/transactions.html).
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
- `[options.timestamps=null]` \<boolean\> If set to `false` and [schema-level timestamps](https://mongoosejs.com/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Note that this allows you to overwrite timestamps. Does nothing if schema-level timestamps are not set.
- `[options.upsert=false]` \<boolean\> if true, and no documents found, insert a new document
- `[options.projection=null]` \<object|string|Array[string]\> optional fields to return, see [`Query.prototype.select()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.select())
- `[options.new=false]` \<boolean\> if true, return the modified document rather than the original
- `[options.fields]` \<object|string\> Field selection. Equivalent to `.select(fields).findOneAndUpdate()`
- `[options.maxTimeMS]` \<number\> puts a time limit on the query - requires mongodb >= 2.6.0
- `[options.sort]` \<object|string\> if multiple docs are found by the conditions, sets the sort order to choose which doc to update.
- `[options.runValidators]` \<boolean\> if true, runs [update validators](https://mongoosejs.com/docs/validation.html#update-validators) on this command. Update validators validate the update operation against the model's schema
- `[options.setDefaultsOnInsert=true]` \<boolean\> If `setDefaultsOnInsert` and `upsert` are true, mongoose will apply the [defaults](https://mongoosejs.com/docs/defaults.html) specified in the model's schema if a new document is created
- `[options.includeResultMetadata]` \<boolean\> if true, returns the [raw result from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/ModifyResult.html)
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.
- `[options.overwriteDiscriminatorKey=false]` \<boolean\> Mongoose removes discriminator key updates from `update` by default, set `overwriteDiscriminatorKey` to `true` to allow updating the discriminator key

### Returns

- \<Query\>

### See

- [Tutorial](https://mongoosejs.com/docs/tutorials/findoneandupdate.html)
- [mongodb](https://www.mongodb.com/docs/manual/reference/command/findAndModify/)

Issues a mongodb findOneAndUpdate command.

Finds a matching document, updates it according to the `update` arg, passing any `options`. A Query object is returned.

#### Example:

    A.findOneAndUpdate(filter, update, options);  // returns Query
    A.findOneAndUpdate(filter, update);           // returns Query
    A.findOneAndUpdate(filter);                   // returns Query
    A.findOneAndUpdate();                         // returns Query

    // Other supported syntaxes
    // Note that calling `Query#findOneAndUpdate()` with 1 arg will treat the arg as `update`, NOT `filter`
    A.find(filter).findOneAndUpdate(update);

#### Note:

All top level update keys which are not `atomic` operation names are treated as set operations:

#### Example:

    const query = { name: 'borne' };
    Model.findOneAndUpdate(query, { name: 'jason bourne' }, options);

    // is sent as
    Model.findOneAndUpdate(query, { $set: { name: 'jason bourne' }}, options);

#### Note:

`findOneAndX` and `findByIdAndX` functions support limited validation that
you can enable by setting the `runValidators` option.

If you need full-fledged validation, use the traditional approach of first
retrieving the document.

    const doc = await Model.findById(id);
    doc.name = 'jason bourne';
    await doc.save();

## `Model.hydrate()`

### Parameters

- `obj` \<object\>
- `[projection]` \<object|string|Array[string]\> optional projection containing which fields should be selected for this document
- `[options]` \<object\> optional options
- `[options.setters=false]` \<boolean\> if true, apply schema setters when hydrating
- `[options.hydratedPopulatedDocs=false]` \<boolean\> if true, populates the docs if passing pre-populated data
- `[options.virtuals=false]` \<boolean\> if true, sets any virtuals present on `obj`
- `[options.strict=false]` \<boolean | 'throw'\> configure strict mode for the hydrated document. In particular, if strict is false, fields not in the schema won't be stripped out; if strict is 'throw', `hydrate()` will throw an error if there are any fields that are not in the schema. Defaults to true (silently strip out fields not in the schema).

### Returns

- \<Document\> document instance

Shortcut for creating a new Document from existing raw data, pre-saved in the DB.
The document returned has no paths marked as modified initially.

#### Example:

    // hydrate previous data into a Mongoose document
    const mongooseCandy = Candy.hydrate({ _id: '54108337212ffb6d459f854c', type: 'jelly bean' });

## `Model.init()`

This function is responsible for initializing the underlying connection in MongoDB based on schema options.
This function performs the following operations:

- `createCollection()` unless [`autoCreate`](https://mongoosejs.com/docs/guide.html#autoCreate) option is turned off
- `ensureIndexes()` unless [`autoIndex`](https://mongoosejs.com/docs/guide.html#autoIndex) option is turned off
- `createSearchIndex()` on all schema search indexes if `autoSearchIndex` is enabled.

Mongoose calls this function automatically when a model is a created using
[`mongoose.model()`](https://mongoosejs.com/docs/api/mongoose.md#Mongoose.prototype.model()) or
[`connection.model()`](https://mongoosejs.com/docs/api/connection.md#Connection.prototype.model()), so you
don't need to call `init()` to trigger index builds.

However, you _may_ need to call `init()`  to get back a promise that will resolve when your indexes are finished.
Calling `await Model.init()` is helpful if you need to wait for indexes to build before continuing.
For example, if you want to wait for unique indexes to build before continuing with a test case.

#### Example:

    const eventSchema = new Schema({ thing: { type: 'string', unique: true } })
    // This calls `Event.init()` implicitly, so you don't need to call
    // `Event.init()` on your own.
    const Event = mongoose.model('Event', eventSchema);

    await Event.init();
    console.log('Indexes are done building!');

## `Model.insertMany()`

### Parameters

- `doc(s)` \<Array|object|any\>
- `[options]` \<object\> see the [mongodb driver options](https://mongodb.github.io/node-mongodb-native/7.0/classes/Collection.html#insertMany)
- `[options.ordered=true]` \<boolean\> if true, will fail fast on the first error encountered. If false, will insert all the documents it can and report errors later. An `insertMany()` with `ordered = false` is called an "unordered" `insertMany()`.
- `[options.rawResult=false]` \<boolean\> if false, the returned promise resolves to the documents that passed mongoose document validation. If `true`, will return the [raw result from the MongoDB driver](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/InsertManyResult.html) with a `mongoose` property that contains `validationErrors` and `results` if this is an unordered `insertMany`.
- `[options.lean=false]` \<boolean\> if `true`, skips hydrating the documents. This means Mongoose will **not** cast, validate, or apply defaults to any of the documents passed to `insertMany()`. This option is useful if you need the extra performance, but comes with data integrity risk. Consider using with [`castObject()`](https://mongoosejs.com/docs/api/model.md#Model.castObject()) and [`applyDefaults()`](https://mongoosejs.com/docs/api/model.md#Model.applyDefaults()).
- `[options.limit=null]` \<number\> this limits the number of documents being processed (validation/casting) by mongoose in parallel, this does **NOT** send the documents in batches to MongoDB. Use this option if you're processing a large number of documents and your app is running out of memory.
- `[options.populate=null]` \<string|object|Array\> populates the result documents. This option is a no-op if `rawResult` is set.
- `[options.throwOnValidationError=false]` \<boolean\> If true and `ordered: false`, throw an error if one of the operations failed validation, but all valid operations completed successfully.
- `[options.middleware=true]` \<boolean|object\> set to `false` to skip all user-defined middleware
- `[options.middleware.pre=true]` \<boolean\> set to `false` to skip only pre hooks
- `[options.middleware.post=true]` \<boolean\> set to `false` to skip only post hooks

### Returns

- \<Promise\> resolving to the raw result from the MongoDB driver if `options.rawResult` was `true`, or the documents that passed validation, otherwise

Shortcut for validating an array of documents and inserting them into
MongoDB if they're all valid. This function is faster than `.create()`
because it only sends one operation to the server, rather than one for each
document.

Mongoose always validates each document **before** sending `insertMany`
to MongoDB. So if one document has a validation error, no documents will
be saved, unless you set
[the `ordered` option to false](https://www.mongodb.com/docs/manual/reference/method/db.collection.insertMany/#error-handling).

This function does **not** trigger save middleware.

This function triggers the following middleware.

- `insertMany()`

#### Example:

    const docs = await Movies.insertMany([
      { name: 'Star Wars' },
      { name: 'The Empire Strikes Back' }
    ]);
    docs[0].name; // 'Star Wars'

    // Return raw result from MongoDB
    const result = await Movies.insertMany([
      { name: 'Star Wars' },
      { name: 'The Empire Strikes Back' }
    ], { rawResult: true });

## `Model.insertOne()`

### Parameters

- `doc` \<object|Document\> Document to insert, as a POJO or Mongoose document
- `[options]` \<object\> Options passed down to `save()`.

### Returns

- \<Promise<Document>\> resolves to the saved document

Shortcut for saving one document to the database.
`MyModel.insertOne(obj, options)` is almost equivalent to `new MyModel(obj).save(options)`.
The difference is that `insertOne()` checks if `obj` is already a document, and checks for discriminators.

This function triggers the following middleware.

- `save()`

#### Example:

    // Insert one new `Character` document
    const character = await Character.insertOne({ name: 'Jean-Luc Picard' });
    character.name; // 'Jean-Luc Picard'

    // Create a new character within a transaction.
    await Character.insertOne({ name: 'Jean-Luc Picard' }, { session });

## `Model.inspect()`

Helper for console.log. Given a model named 'MyModel', returns the string
`'Model { MyModel }'`.

#### Example:

    const MyModel = mongoose.model('Test', Schema({ name: String }));
    MyModel.inspect(); // 'Model { Test }'
    console.log(MyModel); // Prints 'Model { Test }'

## `Model.listIndexes()`

### Returns

- \<Promise\>

Lists the indexes currently defined in MongoDB. This may or may not be
the same as the indexes defined in your schema depending on whether you
use the [`autoIndex` option](https://mongoosejs.com/docs/guide.html#autoIndex) and if you
build indexes manually.

## `Model.listSearchIndexes()`

### Parameters

- `[options]` \<object\>

### Returns

- \<Promise<Array>\>

List all [Atlas search indexes](https://www.mongodb.com/docs/atlas/atlas-search/create-index/) on this model's collection.
This function only works when connected to MongoDB Atlas.

#### Example:

    const schema = new Schema({ name: { type: String, unique: true } });
    const Customer = mongoose.model('Customer', schema);

    await Customer.createSearchIndex({ name: 'test', definition: { mappings: { dynamic: true } } });
    const res = await Customer.listSearchIndexes(); // Includes `[{ name: 'test' }]`

## `Model.namespace()`

Return the MongoDB namespace for this model as a string. The namespace is the database name, followed by '.', followed by the collection name.

#### Example:

    const conn = mongoose.createConnection('mongodb://127.0.0.1:27017/mydb');
    const TestModel = conn.model('Test', mongoose.Schema({ name: String }));

    TestModel.namespace(); // 'mydb.tests'

## `Model.populate()`

### Parameters

- `docs` \<Document|Array\> Either a single document or array of documents to populate.
- `options` \<object|string\> Either the paths to populate or an object specifying all parameters
- `[options.path=null]` \<string\> The path to populate.
- `[options.populate=null]` \<string|PopulateOptions\> Recursively populate paths in the populated documents. See [deep populate docs](https://mongoosejs.com/docs/populate.html#deep-populate).
- `[options.retainNullValues=false]` \<boolean\> By default, Mongoose removes null and undefined values from populated arrays. Use this option to make `populate()` retain `null` and `undefined` array entries.
- `[options.getters=false]` \<boolean\> If true, Mongoose will call any getters defined on the `localField`. By default, Mongoose gets the raw value of `localField`. For example, you would need to set this option to `true` if you wanted to [add a `lowercase` getter to your `localField`](https://mongoosejs.com/docs/schematypes.html#schematype-options).
- `[options.clone=false]` \<boolean\> When you do `BlogPost.find().populate('author')`, blog posts with the same author will share 1 copy of an `author` doc. Enable this option to make Mongoose clone populated docs before assigning them.
- `[options.match=null]` \<object|Function\> Add an additional filter to the populate query. Can be a filter object containing [MongoDB query syntax](https://www.mongodb.com/docs/manual/tutorial/query-documents/), or a function that returns a filter object.
- `[options.skipInvalidIds=false]` \<boolean\> By default, Mongoose throws a cast error if `localField` and `foreignField` schemas don't line up. If you enable this option, Mongoose will instead filter out any `localField` properties that cannot be casted to `foreignField`'s schema type.
- `[options.perDocumentLimit=null]` \<number\> For legacy reasons, `limit` with `populate()` may give incorrect results because it only executes a single query for every document being populated. If you set `perDocumentLimit`, Mongoose will ensure correct `limit` per document by executing a separate query for each document to `populate()`. For example, `.find().populate({ path: 'test', perDocumentLimit: 2 })` will execute 2 additional queries if `.find()` returns 2 documents.
- `[options.strictPopulate=true]` \<boolean\> Set to false to allow populating paths that aren't defined in the given model's schema.
- `[options.options=null]` \<object\> Additional options like `limit` and `lean`.
- `[options.transform=null]` \<Function\> Function that Mongoose will call on every populated document that allows you to transform the populated document.
- `[options.forceRepopulate=true]` \<boolean\> Set to `false` to prevent Mongoose from repopulating paths that are already populated
- `[options.ordered=false]` \<boolean\> Set to `true` to execute any populate queries one at a time, as opposed to in parallel. Set this option to `true` if populating multiple paths or paths with multiple models in transactions.

### Returns

- \<Promise\>

Populates document references.

Changed in Mongoose 6: the model you call `populate()` on should be the
"local field" model, **not** the "foreign field" model.

#### Available top-level options:

- path: space delimited path(s) to populate
- select: optional fields to select
- match: optional query conditions to match
- model: optional name of the model to use for population
- options: optional query options like sort, limit, etc
- justOne: optional boolean, if true Mongoose will always set `path` to a document, or `null` if no document was found. If false, Mongoose will always set `path` to an array, which will be empty if no documents are found. Inferred from schema by default.
- strictPopulate: optional boolean, set to `false` to allow populating paths that aren't in the schema.
- forceRepopulate: optional boolean, defaults to `true`. Set to `false` to prevent Mongoose from repopulating paths that are already populated

#### Example:

    const Dog = mongoose.model('Dog', new Schema({ name: String, breed: String }));
    const Person = mongoose.model('Person', new Schema({
      name: String,
      pet: { type: mongoose.ObjectId, ref: 'Dog' }
    }));

    const pets = await Pet.create([
      { name: 'Daisy', breed: 'Beagle' },
      { name: 'Einstein', breed: 'Catalan Sheepdog' }
    ]);

    // populate many plain objects
    const users = [
      { name: 'John Wick', dog: pets[0]._id },
      { name: 'Doc Brown', dog: pets[1]._id }
    ];
    await User.populate(users, { path: 'dog', select: 'name' });
    users[0].dog.name; // 'Daisy'
    users[0].dog.breed; // undefined because of `select`

## `Model.prototype.$model()`

### Parameters

- `[name]` \<string\> model name

### Returns

- \<Model\>

Returns the model instance used to create this document if no `name` specified.
If `name` specified, returns the model with the given `name`.

#### Example:

    const doc = new Tank({});
    doc.$model() === Tank; // true
    await doc.$model('User').findById(id);

## `Model.prototype.$where`

### Type

- \<property\>

Additional properties to attach to the query when calling `save()` and
`isNew` is false.

## `Model.prototype.base`

### Type

- \<property\>

Base Mongoose instance the model uses.

## `Model.prototype.baseModelName`

### Type

- \<property\>

If this is a discriminator model, `baseModelName` is the name of
the base model.

## `Model.prototype.collection`

### Type

- \<property\>

The collection instance this model uses.
A Mongoose collection is a thin wrapper around a [MongoDB Node.js driver collection]([MongoDB Node.js driver collection](https://mongodb.github.io/node-mongodb-native/Next/classes/Collection.html)).
Using `Model.collection` means you bypass Mongoose middleware, validation, and casting.

This property is read-only. Modifying this property is a no-op.

## `Model.prototype.collection`

### Type

- \<property\>

Collection the model uses.

## `Model.prototype.db`

### Type

- \<property\>

Connection the model uses.

## `Model.prototype.deleteOne()`

### Returns

- \<Query\> Query

Delete this document from the db. Returns a Query instance containing a `deleteOne` operation by this document's `_id`.

#### Example:

    await product.deleteOne();
    await Product.findById(product._id); // null

Since `deleteOne()` returns a Query, the `deleteOne()` will **not** execute unless you use either `await`, `.then()`, `.catch()`, or [`.exec()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.exec())

#### Example:

    product.deleteOne(); // Doesn't do anything
    product.deleteOne().exec(); // Deletes the document, returns a promise

## `Model.prototype.discriminators`

### Type

- \<property\>

Registered discriminators for this model.

## `Model.prototype.increment()`

### See

- [versionKeys](https://mongoosejs.com/docs/guide.html#versionKey)

Signal that we desire an increment of this documents version.

#### Example:

    const doc = await Model.findById(id);
    doc.increment();
    await doc.save();

## `Model.prototype.model()`

### Parameters

- `[name]` \<string\> model name

### Returns

- \<Model\>

Returns the model instance used to create this document if no `name` specified.
If `name` specified, returns the model with the given `name`.

#### Example:

    const doc = new Tank({});
    doc.$model() === Tank; // true
    await doc.$model('User').findById(id);

## `Model.prototype.modelName`

### Type

- \<property\>

The name of the model

## `Model.prototype.save()`

### Parameters

- `[options]` \<object\> options optional options
- `[options.session=null]` \<Session\> the [session](https://www.mongodb.com/docs/manual/reference/server-sessions/) associated with this save operation. If not specified, defaults to the [document's associated session](https://mongoosejs.com/docs/api/document.md#Document.prototype.session()).
- `[options.safe]` \<object\> (DEPRECATED) overrides [schema's safe option](https://mongoosejs.com/docs/guide.html#safe). Use the `w` option instead.
- `[options.validateBeforeSave]` \<boolean\> set to false to save without validating.
- `[options.validateModifiedOnly=false]` \<boolean\> if `true`, Mongoose will only validate modified paths, as opposed to modified paths and `required` paths.
- `[options.w]` \<number|string\> set the [write concern](https://www.mongodb.com/docs/manual/reference/write-concern/#w-option). Overrides the [schema-level `writeConcern` option](https://mongoosejs.com/docs/guide.html#writeConcern)
- `[options.j]` \<boolean\> set to true for MongoDB to wait until this `save()` has been [journaled before resolving the returned promise](https://www.mongodb.com/docs/manual/reference/write-concern/#j-option). Overrides the [schema-level `writeConcern` option](https://mongoosejs.com/docs/guide.html#writeConcern)
- `[options.wtimeout]` \<number\> sets a [timeout for the write concern](https://www.mongodb.com/docs/manual/reference/write-concern/#wtimeout). Overrides the [schema-level `writeConcern` option](https://mongoosejs.com/docs/guide.html#writeConcern).
- `[options.checkKeys=true]` \<boolean\> the MongoDB driver prevents you from saving keys that start with '$' or contain '.' by default. Set this option to `false` to skip that check. See [restrictions on field names](https://docs.mongodb.com/manual/reference/limits/#mongodb-limit-Restrictions-on-Field-Names)
- `[options.timestamps=true]` \<boolean\> if `false` and [timestamps](https://mongoosejs.com/docs/guide.html#timestamps) are enabled, skip timestamps for this `save()`.
- `[options.pathsToSave]` \<Array\> An array of paths that tell mongoose to only validate and save the paths in `pathsToSave`.
- `[options.middleware=true]` \<boolean|object\> set to `false` to skip all user-defined middleware
- `[options.middleware.pre=true]` \<boolean\> set to `false` to skip only pre hooks
- `[options.middleware.post=true]` \<boolean\> set to `false` to skip only post hooks

### Returns

- \<Promise\>

### See

- [middleware](https://mongoosejs.com/docs/middleware.html)

Saves this document by inserting a new document into the database if [document.isNew](https://mongoosejs.com/docs/api/document.md#Document.prototype.isNew) is `true`,
or sends an [updateOne](https://mongoosejs.com/docs/api/document.md#Document.prototype.updateOne()) operation with just the modified paths if `isNew` is `false`.

#### Example:

    product.sold = Date.now();
    product = await product.save();

If save is successful, the returned promise will fulfill with the document
saved.

#### Example:

    const newProduct = await product.save();
    newProduct === product; // true

## `Model.recompileSchema()`

### Returns

- \<undefined,void\>

Apply changes made to this model's schema after this model was compiled.
By default, adding virtuals and other properties to a schema after the model is compiled does nothing.
Call this function to apply virtuals and properties that were added later.

#### Example:

    const schema = new mongoose.Schema({ field: String });
    const TestModel = mongoose.model('Test', schema);
    TestModel.schema.virtual('myVirtual').get(function() {
      return this.field + ' from myVirtual';
    });
    const doc = new TestModel({ field: 'Hello' });
    doc.myVirtual; // undefined

    TestModel.recompileSchema();
    doc.myVirtual; // 'Hello from myVirtual'

## `Model.replaceOne()`

### Parameters

- `filter` \<object\>
- `doc` \<object\>
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
- `[options.upsert=false]` \<boolean\> if true, and no documents found, insert a new document
- `[options.writeConcern=null]` \<object\> sets the [write concern](https://www.mongodb.com/docs/manual/reference/write-concern/) for replica sets. Overrides the [schema-level write concern](https://mongoosejs.com/docs/guide.html#writeConcern)
- `[options.timestamps=null]` \<boolean\> If set to `false` and [schema-level timestamps](https://mongoosejs.com/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Does nothing if schema-level timestamps are not set.
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.

### Returns

- \<Query\>

### See

- [Query docs](https://mongoosejs.com/docs/queries.html)
- [UpdateResult](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/UpdateResult.html)

Replace the existing document with the given document (no atomic operators like `$set`).

#### Example:

    const res = await Person.replaceOne({ _id: 24601 }, { name: 'Jean Valjean' });
    res.matchedCount; // Number of documents matched
    res.modifiedCount; // Number of documents modified
    res.acknowledged; // Boolean indicating the MongoDB server received the operation.
    res.upsertedId; // null or an id containing a document that had to be upserted.
    res.upsertedCount; // Number indicating how many documents had to be upserted. Will either be 0 or 1.

This function triggers the following middleware.

- `replaceOne()`

## `Model.schema`

### Type

- \<property\>

Schema the model uses.

## `Model.startSession()`

### Parameters

- `[options]` \<object\> see the [mongodb driver options](https://mongodb.github.io/node-mongodb-native/7.0/classes/MongoClient.html#startSession)
- `[options.causalConsistency=true]` \<boolean\> set to false to disable causal consistency

### Returns

- \<Promise<ClientSession>\> promise that resolves to a MongoDB driver `ClientSession`

_Requires MongoDB >= 3.6.0._ Starts a [MongoDB session](https://www.mongodb.com/docs/manual/release-notes/3.6/#client-sessions)
for benefits like causal consistency, [retryable writes](https://www.mongodb.com/docs/manual/core/retryable-writes/),
and [transactions](https://thecodebarbarian.com/a-node-js-perspective-on-mongodb-4-transactions.html).

Calling `MyModel.startSession()` is equivalent to calling `MyModel.db.startSession()`.

This function does not trigger any middleware.

#### Example:

    const session = await Person.startSession();
    let doc = await Person.findOne({ name: 'Ned Stark' }, null, { session });
    await doc.deleteOne();
    // `doc` will always be null, even if reading from a replica set
    // secondary. Without causal consistency, it is possible to
    // get a doc back from the below query if the query reads from a
    // secondary that is experiencing replication lag.
    doc = await Person.findOne({ name: 'Ned Stark' }, null, { session, readPreference: 'secondary' });

## `Model.syncIndexes()`

### Parameters

- `[options]` \<object\> options to pass to `ensureIndexes()`
- `[options.hideIndexes=false]` \<boolean\> set to `true` to hide indexes instead of dropping. Requires MongoDB server 4.4 or higher

### Returns

- \<Promise\>

Makes the indexes in MongoDB match the indexes defined in this model's
schema. This function will drop any indexes that are not defined in
the model's schema except the `_id` index, and build any indexes that
are in your schema but not in MongoDB.

See the [introductory blog post](https://thecodebarbarian.com/whats-new-in-mongoose-5-2-syncindexes)
for more information.

#### Example:

    const schema = new Schema({ name: { type: String, unique: true } });
    const Customer = mongoose.model('Customer', schema);
    await Customer.collection.createIndex({ age: 1 }); // Index is not in schema
    // Will drop the 'age' index and create an index on `name`
    await Customer.syncIndexes();

You should be careful about running `syncIndexes()` on production applications under heavy load,
because index builds are expensive operations, and unexpected index drops can lead to degraded
performance. Before running `syncIndexes()`, you can use the [`diffIndexes()` function](#Model.diffIndexes())
to check what indexes `syncIndexes()` will drop and create.

#### Example:

    const { toDrop, toCreate } = await Model.diffIndexes();
    toDrop; // Array of strings containing names of indexes that `syncIndexes()` will drop
    toCreate; // Array of strings containing names of indexes that `syncIndexes()` will create

## `Model.translateAliases()`

### Parameters

- `fields` \<object\> fields/conditions that may contain aliased keys
- `[errorOnDuplicates]` \<boolean\> if true, throw an error if there's both a key and an alias for that key in `fields`

### Returns

- \<object\> the translated 'pure' fields/conditions

Translate any aliases fields/conditions so the final query or document object is pure

#### Example:

    await Character.find(Character.translateAliases({
       '名': 'Eddard Stark' // Alias for 'name'
    });

By default, `translateAliases()` overwrites raw fields with aliased fields.
So if `n` is an alias for `name`, `{ n: 'alias', name: 'raw' }` will resolve to `{ name: 'alias' }`.
However, you can set the `errorOnDuplicates` option to throw an error if there are potentially conflicting paths.
The `translateAliases` option for queries uses `errorOnDuplicates`.

#### Note:

Only translate arguments of object type anything else is returned raw

## `Model.updateMany()`

### Parameters

- `filter` \<object\>
- `update.` \<object|Array\> If array, this update will be treated as an update pipeline and not casted.
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
- `[options.upsert=false]` \<boolean\> if true, and no documents found, insert a new document
- `[options.writeConcern=null]` \<object\> sets the [write concern](https://www.mongodb.com/docs/manual/reference/write-concern/) for replica sets. Overrides the [schema-level write concern](https://mongoosejs.com/docs/guide.html#writeConcern)
- `[options.timestamps=null]` \<boolean\> If set to `false` and [schema-level timestamps](https://mongoosejs.com/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Does nothing if schema-level timestamps are not set.
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.
- `[options.overwriteDiscriminatorKey=false]` \<boolean\> Mongoose removes discriminator key updates from `update` by default, set `overwriteDiscriminatorKey` to `true` to allow updating the discriminator key

### Returns

- \<Query\>

### See

- [Query docs](https://mongoosejs.com/docs/queries.html)
- [MongoDB docs](https://www.mongodb.com/docs/manual/reference/command/update/#update-command-output)
- [UpdateResult](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/UpdateResult.html)

Same as `updateOne()`, except MongoDB will update _all_ documents that match
`filter` (as opposed to just the first one) regardless of the value of
the `multi` option.

**Note** updateMany will _not_ fire update middleware. Use `pre('updateMany')`
and `post('updateMany')` instead.

#### Example:

    const res = await Person.updateMany({ name: /Stark$/ }, { isDeleted: true });
    res.matchedCount; // Number of documents matched
    res.modifiedCount; // Number of documents modified
    res.acknowledged; // Boolean indicating the MongoDB server received the operation. This may be false if Mongoose did not send an update to the server because the update was empty.
    res.upsertedId; // null or an id containing a document that had to be upserted.
    res.upsertedCount; // Number indicating how many documents had to be upserted. Will either be 0 or 1.

    // Other supported syntaxes
    await Person.find({ name: /Stark$/ }).updateMany({ isDeleted: true }); // Using chaining syntax
    await Person.find().updateMany({ isDeleted: true }); // Set `isDeleted` on _all_ Person documents

This function triggers the following middleware.

- `updateMany()`

## `Model.updateOne()`

### Parameters

- `filter` \<object\>
- `update.` \<object|Array\> If array, this update will be treated as an update pipeline and not casted.
- `[options]` \<object\> optional see [`Query.prototype.setOptions()`](https://mongoosejs.com/docs/api/query.md#Query.prototype.setOptions())
- `[options.strict]` \<boolean | 'throw'\> overwrites the schema's [strict mode option](https://mongoosejs.com/docs/guide.html#strict)
- `[options.upsert=false]` \<boolean\> if true, and no documents found, insert a new document
- `[options.writeConcern=null]` \<object\> sets the [write concern](https://www.mongodb.com/docs/manual/reference/write-concern/) for replica sets. Overrides the [schema-level write concern](https://mongoosejs.com/docs/guide.html#writeConcern)
- `[options.timestamps=null]` \<boolean\> If set to `false` and [schema-level timestamps](https://mongoosejs.com/docs/guide.html#timestamps) are enabled, skip timestamps for this update. Note that this allows you to overwrite timestamps. Does nothing if schema-level timestamps are not set.
- `[options.translateAliases=null]` \<boolean\> If set to `true`, translates any schema-defined aliases in `filter`, `projection`, `update`, and `distinct`. Throws an error if there are any conflicts where both alias and raw property are defined on the same object.
- `[options.overwriteDiscriminatorKey=false]` \<boolean\> Mongoose removes discriminator key updates from `update` by default, set `overwriteDiscriminatorKey` to `true` to allow updating the discriminator key

### Returns

- \<Query\>

### See

- [Query docs](https://mongoosejs.com/docs/queries.html)
- [MongoDB docs](https://www.mongodb.com/docs/manual/reference/command/update/#update-command-output)
- [UpdateResult](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/UpdateResult.html)

Update _only_ the first document that matches `filter`.

- Use `replaceOne()` if you want to overwrite an entire document rather than using atomic operators like `$set`.

#### Example:

    const res = await Person.updateOne({ name: 'Jean-Luc Picard' }, { ship: 'USS Enterprise' });
    res.matchedCount; // Number of documents matched
    res.modifiedCount; // Number of documents modified
    res.acknowledged; // Boolean indicating the MongoDB server received the operation. This may be false if Mongoose did not send an update to the server because the update was empty.
    res.upsertedId; // null or an id containing a document that had to be upserted.
    res.upsertedCount; // Number indicating how many documents had to be upserted. Will either be 0 or 1.

    // Other supported syntaxes
    await Person.findOne({ name: 'Jean-Luc Picard' }).updateOne({ ship: 'USS Enterprise' }); // Using chaining syntax
    await Person.updateOne({ ship: 'USS Enterprise' }); // Updates first doc's `ship` property

This function triggers the following middleware.

- `updateOne()`

## `Model.updateSearchIndex()`

### Parameters

- `name` \<string\>
- `definition` \<object\>

### Returns

- \<Promise\>

Update an existing [Atlas search index](https://www.mongodb.com/docs/atlas/atlas-search/create-index/).
This function only works when connected to MongoDB Atlas.

#### Example:

    const schema = new Schema({ name: { type: String, unique: true } });
    const Customer = mongoose.model('Customer', schema);
    await Customer.updateSearchIndex('test', { mappings: { dynamic: true } });

## `Model.useConnection()`

### Parameters

- `connection` \<Connection\> The new connection to use

### Returns

- \<Model\> this

Changes the Connection instance this model uses to make requests to MongoDB.
This function is most useful for changing the Connection that a Model defined using `mongoose.model()` uses
after initialization.

#### Example:

    await mongoose.connect('mongodb://127.0.0.1:27017/db1');
    const UserModel = mongoose.model('User', mongoose.Schema({ name: String }));
    UserModel.connection === mongoose.connection; // true

    const conn2 = await mongoose.createConnection('mongodb://127.0.0.1:27017/db2').asPromise();
    UserModel.useConnection(conn2); // `UserModel` now stores documents in `db2`, not `db1`

    UserModel.connection === mongoose.connection; // false
    UserModel.connection === conn2; // true

    conn2.model('User') === UserModel; // true
    mongoose.model('User'); // Throws 'MissingSchemaError'

Note: `useConnection()` does **not** apply any [connection-level plugins](https://mongoosejs.com/docs/api/connection.md#Connection.prototype.plugin()) from the new connection.
If you use `useConnection()` to switch a model's connection, the model will still have the old connection's plugins.

## `Model.validate()`

### Parameters

- `obj` \<object\>
- `pathsOrOptions` \<object|Array|string\>
- `[context]` \<object\>

### Returns

- \<Promise<object>\> casted and validated copy of `obj` if validation succeeded

Casts and validates the given object against this model's schema, passing the
given `context` to custom validators.

#### Example:

    const Model = mongoose.model('Test', Schema({
      name: { type: String, required: true },
      age: { type: Number, required: true }
    });

    // Succeeds
    await Model.validate({ name: 'John Smith', age: 31 });

    try {
      await Model.validate({ name: null });
    } catch (err) {
      err instanceof mongoose.Error.ValidationError; // true
      Object.keys(err.errors); // ['name']
    }

Note: the `pathsToSkip` and `pathsToValidate` options **only** apply to validation, not
casting. This function will still throw an error for values that cannot be casted to the
schema-specified type. Remove any paths you do not want to cast.

    // The following will still throw an error because the value of `age` cannot be
    // casted to a number. Remove the `age` property before calling `validate()`.
    await Model.validate({ name: 'Test', age: 'not a number' }, ['name']);

## `Model.watch()`

### Parameters

- `[pipeline]` \<Array\>
- `[options]` \<object\> see the [mongodb driver options](https://mongodb.github.io/node-mongodb-native/7.0/classes/Collection.html#watch)
- `[options.hydrate=false]` \<boolean\> if true and `fullDocument: 'updateLookup'` is set, Mongoose will automatically hydrate `fullDocument` into a fully fledged Mongoose document

### Returns

- \<ChangeStream\> mongoose-specific change stream wrapper, inherits from EventEmitter

_Requires a replica set running MongoDB >= 3.6.0._ Watches the
underlying collection for changes using
[MongoDB change streams](https://www.mongodb.com/docs/manual/changeStreams/).

This function does **not** trigger any middleware. In particular, it
does **not** trigger aggregate middleware.

The ChangeStream object is an event emitter that emits the following events:

- 'change': A change occurred, see below example
- 'error': An unrecoverable error occurred. In particular, change streams currently error out if they lose connection to the replica set primary. Follow [this GitHub issue](https://github.com/Automattic/mongoose/issues/6799) for updates.
- 'end': Emitted if the underlying stream is closed
- 'close': Emitted if the underlying stream is closed

#### Example:

    const doc = await Person.create({ name: 'Ned Stark' });
    const changeStream = Person.watch().on('change', change => console.log(change));
    // Will print from the above `console.log()`:
    // { _id: { _data: ... },
    //   operationType: 'delete',
    //   ns: { db: 'mydb', coll: 'Person' },
    //   documentKey: { _id: 5a51b125c5500f5aa094c7bd } }
    await doc.deleteOne();

## `Model.where()`

### Parameters

- `path` \<string\>
- `[val]` \<object\> optional value

### Returns

- \<Query\>

Creates a Query, applies the passed conditions, and returns the Query.

For example, instead of writing:

    User.find({ age: { $gte: 21, $lte: 65 } });

we can instead write:

    User.where('age').gte(21).lte(65).exec();

Since the Query class also supports `where` you can continue chaining

    User
    .where('age').gte(21).lte(65)
    .where('name', /^b/i)
    ... etc

## `Model.~standard`

### Type

- \<property\>

Standard Schema adapter for this model.
Calls [`Model.validate()`](https://mongoosejs.com/docs/api/model.md#Model.validate()) internally with the provided `libraryOptions`
to cast and validate the given value.
