# Schemas

If you haven't yet done so, please take a minute to read the [quickstart](index.html) to get an idea of how Mongoose works.
If you are migrating from 6.x to 7.x please take a moment to read the [migration guide](migrating_to_7.html).

<ul class="toc">
  <li><a href="#definition">Defining your schema</a></li>
  <li><a href="#models">Creating a model</a></li>
  <li><a href="#_id">Ids</a></li>
  <li><a href="#methods">Instance methods</a></li>
  <li><a href="#statics">Statics</a></li>
  <li><a href="#query-helpers">Query Helpers</a></li>
  <li><a href="#indexes">Indexes</a></li>
  <li><a href="#virtuals">Virtuals</a></li>
  <li><a href="#aliases">Aliases</a></li>
  <li><a href="#options">Options</a></li>
  <li><a href="#es6-classes">With ES6 Classes</a></li>
  <li><a href="#plugins">Pluggable</a></li>
  <li><a href="#further-reading">Further Reading</a></li>
</ul>

<h2 id="definition"><a href="#definition">Defining your schema</a></h2>

Everything in Mongoose starts with a Schema. Each schema maps to a MongoDB
collection and defines the shape of the documents within that collection.

```javascript
import mongoose from 'mongoose';
const { Schema } = mongoose;

const blogSchema = new Schema({
  title: String, // String is shorthand for {type: String}
  author: String,
  body: String,
  comments: [{ body: String, date: Date }],
  date: { type: Date, default: Date.now },
  hidden: Boolean,
  meta: {
    votes: Number,
    favs: Number
  }
});
```

If you want to add additional keys later, use the
[Schema#add](api/schema.html#schema_Schema-add) method.

Each key in our code `blogSchema` defines a property in our documents which
will be cast to its associated [SchemaType](api/schematype.html#schematype_SchemaType).
For example, we've defined a property `title` which will be cast to the
[String](schematypes.html#strings) SchemaType and property `date`
which will be cast to a `Date` SchemaType.

Notice above that if a property only requires a type, it can be specified using
a shorthand notation (contrast the `title` property above with the `date`
property).

Keys may also be assigned nested objects containing further key/type definitions
like the `meta` property above.  This will happen whenever a key's value is a POJO
that doesn't have a `type` property.

In these cases, Mongoose only creates actual schema paths for leaves
in the tree. (like `meta.votes` and `meta.favs` above),
and the branches do not have actual paths.  A side-effect of this is that `meta`
above cannot have its own validation.  If validation is needed up the tree, a path
needs to be created up the tree - see the [Subdocuments](subdocs.html) section
for more information on how to do this.  Also read the [Mixed](schematypes.html)
subsection of the SchemaTypes guide for some gotchas.

The permitted SchemaTypes are:

* [String](schematypes.html#strings)
* [Number](schematypes.html#numbers)
* [Date](schematypes.html#dates)
* [Buffer](schematypes.html#buffers)
* [Boolean](schematypes.html#booleans)
* [Mixed](schematypes.html#mixed)
* [ObjectId](schematypes.html#objectids)
* [Array](schematypes.html#arrays)
* [Decimal128](api/mongoose.html#mongoose_Mongoose-Decimal128)
* [Map](schematypes.html#maps)
* [UUID](schematypes.html#uuid)

Read more about [SchemaTypes here](schematypes.html).

Schemas not only define the structure of your document and casting of
properties, they also define document [instance methods](#methods),
[static Model methods](#statics), [compound indexes](#indexes),
and document lifecycle hooks called [middleware](middleware.html).

<h2 id="models"><a href="#models">Creating a model</a></h2>

To use our schema definition, we need to convert our `blogSchema` into a
[Model](models.html) we can work with.
To do so, we pass it into `mongoose.model(modelName, schema)`:

```javascript
const Blog = mongoose.model('Blog', blogSchema);
// ready to go!
```

<h2 id="_id"><a href="#_id">Ids</a></h2>

By default, Mongoose adds an `_id` property to your schemas.

```javascript
const schema = new Schema();

schema.path('_id'); // ObjectId { ... }
```

When you create a new document with the automatically added
`_id` property, Mongoose creates a new [`_id` of type ObjectId](https://masteringjs.io/tutorials/mongoose/objectid)
to your document.

```javascript
const Model = mongoose.model('Test', schema);

const doc = new Model();
doc._id instanceof mongoose.Types.ObjectId; // true
```

You can also overwrite Mongoose's default `_id` with your
own `_id`. Just be careful: Mongoose will refuse to save a
document that doesn't have an `_id`, so you're responsible
for setting `_id` if you define your own `_id` path.

```javascript
const schema = new Schema({ _id: Number });
const Model = mongoose.model('Test', schema);

const doc = new Model();
await doc.save(); // Throws "document must have an _id before saving"

doc._id = 1;
await doc.save(); // works
```

<h2 id="methods"><a href="#methods">Instance methods</a></h2>

Instances of `Models` are [documents](documents.html). Documents have
many of their own [built-in instance methods](api/document.html).
We may also define our own custom document instance methods.

```javascript
// define a schema
const animalSchema = new Schema({ name: String, type: String },
  {
  // Assign a function to the "methods" object of our animalSchema through schema options.
  // By following this approach, there is no need to create a separate TS type to define the type of the instance functions.
    methods: {
      findSimilarTypes(cb) {
        return mongoose.model('Animal').find({ type: this.type }, cb);
      }
    }
  });

// Or, assign a function to the "methods" object of our animalSchema
animalSchema.methods.findSimilarTypes = function(cb) {
  return mongoose.model('Animal').find({ type: this.type }, cb);
};
```

Now all of our `animal` instances have a `findSimilarTypes` method available
to them.

```javascript
const Animal = mongoose.model('Animal', animalSchema);
const dog = new Animal({ type: 'dog' });

dog.findSimilarTypes((err, dogs) => {
  console.log(dogs); // woof
});
```

* Overwriting a default mongoose document method may lead to unpredictable results. See [this](api/schema.html#schema_Schema-reserved) for more details.
* The example above uses the `Schema.methods` object directly to save an instance method. You can also use the `Schema.method()` helper as described [here](api/schema.html#schema_Schema-method).
* Do **not** declare methods using ES6 arrow functions (`=>`). Arrow functions [explicitly prevent binding `this`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions#No_binding_of_this), so your method will **not** have access to the document and the above examples will not work.

<h2 id="statics"><a href="#statics">Statics</a></h2>

You can also add static functions to your model. There are three equivalent
ways to add a static:

- Add a function property to the second argument of the schema-constructor (`statics`)
- Add a function property to `schema.statics`
- Call the [`Schema#static()` function](api/schema.html#schema_Schema-static)

```javascript

// define a schema
const animalSchema = new Schema({ name: String, type: String },
  {
  // Assign a function to the "statics" object of our animalSchema through schema options.
  // By following this approach, there is no need to create a separate TS type to define the type of the statics functions.
    statics: {
      findByName(name) {
        return this.find({ name: new RegExp(name, 'i') });
      }
    }
  });

// Or, Assign a function to the "statics" object of our animalSchema
animalSchema.statics.findByName = function(name) {
  return this.find({ name: new RegExp(name, 'i') });
};
// Or, equivalently, you can call `animalSchema.static()`.
animalSchema.static('findByBreed', function(breed) { return this.find({ breed }); });

const Animal = mongoose.model('Animal', animalSchema);
let animals = await Animal.findByName('fido');
animals = animals.concat(await Animal.findByBreed('Poodle'));
```

Do **not** declare statics using ES6 arrow functions (`=>`). Arrow functions [explicitly prevent binding `this`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions#No_binding_of_this), so the above examples will not work because of the value of `this`.

<h2 id="query-helpers"><a href="#query-helpers">Query Helpers</a></h2>

You can also add query helper functions, which are like instance methods
but for mongoose queries. Query helper methods let you extend mongoose's
[chainable query builder API](queries.html).

```javascript

// define a schema
const animalSchema = new Schema({ name: String, type: String },
  {
  // Assign a function to the "query" object of our animalSchema through schema options.
  // By following this approach, there is no need to create a separate TS type to define the type of the query functions.
    query: {
      byName(name) {
        return this.where({ name: new RegExp(name, 'i') });
      }
    }
  });

// Or, Assign a function to the "query" object of our animalSchema
animalSchema.query.byName = function(name) {
  return this.where({ name: new RegExp(name, 'i') });
};

const Animal = mongoose.model('Animal', animalSchema);

Animal.find().byName('fido').exec((err, animals) => {
  console.log(animals);
});

Animal.findOne().byName('fido').exec((err, animal) => {
  console.log(animal);
});
```

<h2 id="indexes"><a href="#indexes">Indexes</a></h2>

MongoDB supports [secondary indexes](http://www.mongodb.com/docs/manual/indexes/).
With mongoose, we define these indexes within our `Schema` [at](api/schematype.html#schematype_SchemaType-index) [the](api/schematype.html#schematype_SchemaType-unique) [path](api/schematype.html#schematype_SchemaType-sparse) [level](api/schemadateoptions.html#schemadateoptions_SchemaDateOptions-expires) or the `schema` level.
Defining indexes at the schema level is necessary when creating
[compound indexes](https://www.mongodb.com/docs/manual/core/index-compound/).

```javascript
const animalSchema = new Schema({
  name: String,
  type: String,
  tags: { type: [String], index: true } // path level
});

animalSchema.index({ name: 1, type: -1 }); // schema level
```

See [SchemaType#index()](api/schematype.html#schematype_SchemaType-index) for other index options.

When your application starts up, Mongoose automatically calls [`createIndex`](https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/#db.collection.createIndex) for each defined index in your schema.
Mongoose will call `createIndex` for each index sequentially, and emit an 'index' event on the model when all the `createIndex` calls succeeded or when there was an error.
While nice for development, it is recommended this behavior be disabled in production since index creation can cause a [significant performance impact](https://www.mongodb.com/docs/manual/core/index-creation/#index-build-impact-on-database-performance).
Disable the behavior by setting the `autoIndex` option of your schema to `false`, or globally on the connection by setting the option `autoIndex` to `false`.

```javascript
mongoose.connect('mongodb://user:pass@127.0.0.1:port/database', { autoIndex: false });
// or
mongoose.createConnection('mongodb://user:pass@127.0.0.1:port/database', { autoIndex: false });
// or
mongoose.set('autoIndex', false);
// or
animalSchema.set('autoIndex', false);
// or
new Schema({ /* ... */ }, { autoIndex: false });
```

Mongoose will emit an `index` event on the model when indexes are done
building or an error occurred.

```javascript
// Will cause an error because mongodb has an _id index by default that
// is not sparse
animalSchema.index({ _id: 1 }, { sparse: true });
const Animal = mongoose.model('Animal', animalSchema);

Animal.on('index', error => {
  // "_id index cannot be sparse"
  console.log(error.message);
});
```

See also the [Model#ensureIndexes](api/model.html#model_Model-ensureIndexes) method.

<h2 id="virtuals"><a href="#virtuals">Virtuals</a></h2>

[Virtuals](api/schema.html#schema_Schema-virtual) are document properties that
you can get and set but that do not get persisted to MongoDB. The getters
are useful for formatting or combining fields, while setters are useful for
de-composing a single value into multiple values for storage.

```javascript
// define a schema
const personSchema = new Schema({
  name: {
    first: String,
    last: String
  }
});

// compile our model
const Person = mongoose.model('Person', personSchema);

// create a document
const axl = new Person({
  name: { first: 'Axl', last: 'Rose' }
});
```

Suppose you want to print out the person's full name. You could do it yourself:

```javascript
console.log(axl.name.first + ' ' + axl.name.last); // Axl Rose
```

But [concatenating](https://masteringjs.io/tutorials/fundamentals/string-concat) the first and
last name every time can get cumbersome.
And what if you want to do some extra processing on the name, like
[removing diacritics](https://www.npmjs.com/package/diacritics)? A
[virtual property getter](api/virtualtype.html#virtualtype_VirtualType-get) lets you
define a `fullName` property that won't get persisted to MongoDB.

```javascript
// That can be done either by adding it to schema options:
const personSchema = new Schema({
  name: {
    first: String,
    last: String
  }
}, {
  virtuals: {
    fullName: {
      get() {
        return this.name.first + ' ' + this.name.last;
      }
    }
  }
});

// Or by using the virtual method as following:
personSchema.virtual('fullName').get(function() {
  return this.name.first + ' ' + this.name.last;
});
```

Now, mongoose will call your getter function every time you access the
`fullName` property:

```javascript
console.log(axl.fullName); // Axl Rose
```

If you use `toJSON()` or `toObject()` Mongoose will *not* include virtuals by default.
Pass `{ virtuals: true }` to [`toJSON()`](api/document.html#document_Document-toJSON) or `toObject()` to include virtuals.

```javascript
// Convert `doc` to a POJO, with virtuals attached
doc.toObject({ virtuals: true });

// Equivalent:
doc.toJSON({ virtuals: true });
```

The above caveat for `toJSON()` also includes the output of calling [`JSON.stringify()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify) on a Mongoose document, because [`JSON.stringify()` calls `toJSON()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Description).
To include virtuals in `JSON.stringify()` output, you can either call `toObject({ virtuals: true })` on the document before calling `JSON.stringify()`, or set the `toJSON: { virtuals: true }` option on your schema.

```javascript
// Explicitly add virtuals to `JSON.stringify()` output
JSON.stringify(doc.toObject({ virtuals: true }));

// Or, to automatically attach virtuals to `JSON.stringify()` output:
const personSchema = new Schema({
  name: {
    first: String,
    last: String
  }
}, {
  toJSON: { virtuals: true } // <-- include virtuals in `JSON.stringify()`
});
```

You can also add a custom setter to your virtual that will let you set both
first name and last name via the `fullName` virtual.

```javascript
// Again that can be done either by adding it to schema options:
const personSchema = new Schema({
  name: {
    first: String,
    last: String
  }
}, {
  virtuals: {
    fullName: {
      get() {
        return this.name.first + ' ' + this.name.last;
      },
      set(v) {
        this.name.first = v.substr(0, v.indexOf(' '));
        this.name.last = v.substr(v.indexOf(' ') + 1);
      }
    }
  }
});

// Or by using the virtual method as following:
personSchema.virtual('fullName').
  get(function() {
    return this.name.first + ' ' + this.name.last;
  }).
  set(function(v) {
    this.name.first = v.substr(0, v.indexOf(' '));
    this.name.last = v.substr(v.indexOf(' ') + 1);
  });

axl.fullName = 'William Rose'; // Now `axl.name.first` is "William"
```

Virtual property setters are applied before other validation. So the example
above would still work even if the `first` and `last` name fields were
required.

Only non-virtual properties work as part of queries and for field selection.
Since virtuals are not stored in MongoDB, you can't query with them.

You can [learn more about virtuals here](https://masteringjs.io/tutorials/mongoose/virtuals).

<h2 id="aliases"><a href="#aliases">Aliases</a></h2>

Aliases are a particular type of virtual where the getter and setter
seamlessly get and set another property. This is handy for saving network
bandwidth, so you can convert a short property name stored in the database
into a longer name for code readability.

```javascript
const personSchema = new Schema({
  n: {
    type: String,
    // Now accessing `name` will get you the value of `n`, and setting `name` will set the value of `n`
    alias: 'name'
  }
});

// Setting `name` will propagate to `n`
const person = new Person({ name: 'Val' });
console.log(person); // { n: 'Val' }
console.log(person.toObject({ virtuals: true })); // { n: 'Val', name: 'Val' }
console.log(person.name); // "Val"

person.name = 'Not Val';
console.log(person); // { n: 'Not Val' }
```

You can also declare aliases on nested paths. It is easier to use nested
schemas and [subdocuments](subdocs.html), but you can also declare
nested path aliases inline as long as you use the full nested path
`nested.myProp` as the alias.

```acquit
[require:gh-6671]
```

<h2 id="options"><a href="#options">Options</a></h2>

Schemas have a few configurable options which can be passed to the
constructor or to the `set` method:

```javascript
new Schema({ /* ... */ }, options);

// or

const schema = new Schema({ /* ... */ });
schema.set(option, value);
```

Valid options:

- [autoIndex](#autoIndex)
- [autoCreate](#autoCreate)
- [bufferCommands](#bufferCommands)
- [bufferTimeoutMS](#bufferTimeoutMS)
- [capped](#capped)
- [collection](#collection)
- [discriminatorKey](#discriminatorKey)
- [excludeIndexes](#excludeIndexes)
- [id](#id)
- [_id](#_id)
- [minimize](#minimize)
- [read](#read)
- [writeConcern](#writeConcern)
- [shardKey](#shardKey)
- [statics](#statics)
- [strict](#strict)
- [strictQuery](#strictQuery)
- [toJSON](#toJSON)
- [toObject](#toObject)
- [typeKey](#typeKey)
- [validateBeforeSave](#validateBeforeSave)
- [versionKey](#versionKey)
- [optimisticConcurrency](#optimisticConcurrency)
- [collation](#collation)
- [timeseries](#timeseries)
- [selectPopulatedPaths](#selectPopulatedPaths)
- [skipVersioning](#skipVersioning)
- [timestamps](#timestamps)
- [storeSubdocValidationError](#storeSubdocValidationError)
- [methods](#methods)
- [query](#query-helpers)

<h2 id="autoIndex"><a href="#autoIndex">option: autoIndex</a></h2>

By default, Mongoose's [`init()` function](api/model.html#model_Model-init)
creates all the indexes defined in your model's schema by calling
[`Model.createIndexes()`](api/model.html#model_Model-createIndexes)
after you successfully connect to MongoDB. Creating indexes automatically is
great for development and test environments. But index builds can also create
significant load on your production database. If you want to manage indexes
carefully in production, you can set `autoIndex` to false.

```javascript
const schema = new Schema({ /* ... */ }, { autoIndex: false });
const Clock = mongoose.model('Clock', schema);
Clock.ensureIndexes(callback);
```

The `autoIndex` option is set to `true` by default. You can change this
default by setting [`mongoose.set('autoIndex', false);`](api/mongoose.html#mongoose_Mongoose-set)

<h2 id="autoCreate"><a href="#autoCreate">option: autoCreate</a></h2>

Before Mongoose builds indexes, it calls `Model.createCollection()` to create the underlying collection in MongoDB by default.
Calling `createCollection()` sets the [collection's default collation](https://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-collations) based on the [collation option](#collation) and establishes the collection as
a capped collection if you set the [`capped` schema option](#capped).

You can disable this behavior by setting `autoCreate` to `false` using [`mongoose.set('autoCreate', false)`](api/mongoose.html#mongoose_Mongoose-set).
Like `autoIndex`, `autoCreate` is helpful for development and test environments, but you may want to disable it for production to avoid unnecessary database calls.

Unfortunately, `createCollection()` cannot change an existing collection.
For example, if you add `capped: { size: 1024 }` to your schema and the existing collection is not capped, `createCollection()` will **not** overwrite the existing collection.
That is because the MongoDB server does not allow changing a collection's options without dropping the collection first.

```javascript
const schema = new Schema({ name: String }, {
  autoCreate: false,
  capped: { size: 1024 }
});
const Test = mongoose.model('Test', schema);

// No-op if collection already exists, even if the collection is not capped.
// This means that `capped` won't be applied if the 'tests' collection already exists.
await Test.createCollection();
```

<h2 id="bufferCommands"><a href="#bufferCommands">option: bufferCommands</a></h2>

By default, mongoose buffers commands when the connection goes down until
the driver manages to reconnect. To disable buffering, set `bufferCommands`
to false.

```javascript
const schema = new Schema({ /* ... */ }, { bufferCommands: false });
```

The schema `bufferCommands` option overrides the global `bufferCommands` option.

```javascript
mongoose.set('bufferCommands', true);
// Schema option below overrides the above, if the schema option is set.
const schema = new Schema({ /* ... */ }, { bufferCommands: false });
```

<h2 id="bufferTimeoutMS"><a href="#bufferTimeoutMS">option: bufferTimeoutMS</a></h2>

If `bufferCommands` is on, this option sets the maximum amount of time Mongoose buffering will wait before
throwing an error. If not specified, Mongoose will use 10000 (10 seconds).

```javascript
// If an operation is buffered for more than 1 second, throw an error.
const schema = new Schema({ /* ... */ }, { bufferTimeoutMS: 1000 });
```

<h2 id="capped"><a href="#capped">option: capped</a></h2>

Mongoose supports MongoDBs [capped](https://www.mongodb.com/docs/manual/core/capped-collections/)
collections. To specify the underlying MongoDB collection be `capped`, set
the `capped` option to the maximum size of the collection in
[bytes](https://www.mongodb.com/docs/manual/core/capped-collections/#create-a-capped-collection).

```javascript
new Schema({ /* ... */ }, { capped: 1024 });
```

The `capped` option may also be set to an object if you want to pass
additional options like [max](https://www.mongodb.com/docs/manual/core/capped-collections/#change-the-maximum-number-of-documents-in-a-capped-collection).
In this case you must explicitly pass the `size` option, which is required.

```javascript
new Schema({ /* ... */ }, { capped: { size: 1024, max: 1000, autoIndexId: true } });
```

<h2 id="collection"><a href="#collection">option: collection</a></h2>

Mongoose by default produces a collection name by passing the model name to
the `utils.toCollectionName` method.
This method pluralizes the name. Set this option if you need a different name
for your collection.

```javascript
const dataSchema = new Schema({ /* ... */ }, { collection: 'data' });
```

<h2 id="discriminatorKey"><a href="#discriminatorKey">option: discriminatorKey</a></h2>

When you define a [discriminator](discriminators.html), Mongoose adds a path to your
schema that stores which discriminator a document is an instance of. By default, Mongoose
adds an `__t` path, but you can set `discriminatorKey` to overwrite this default.

```javascript
const baseSchema = new Schema({}, { discriminatorKey: 'type' });
const BaseModel = mongoose.model('Test', baseSchema);

const personSchema = new Schema({ name: String });
const PersonModel = BaseModel.discriminator('Person', personSchema);

const doc = new PersonModel({ name: 'James T. Kirk' });
// Without `discriminatorKey`, Mongoose would store the discriminator
// key in `__t` instead of `type`
doc.type; // 'Person'
```

<h2 id="excludeIndexes"><a href="#excludeIndexes">option: excludeIndexes</a></h2>

When `excludeIndexes` is `true`, Mongoose will not create indexes from the given subdocument schema.
This option only works when the schema is used in a subdocument path or document array path, Mongoose ignores this option if set on the top-level schema for a model.
Defaults to `false`.

```javascript
const childSchema1 = Schema({
  name: { type: String, index: true }
});

const childSchema2 = Schema({
  name: { type: String, index: true }
}, { excludeIndexes: true });

// Mongoose will create an index on `child1.name`, but **not** `child2.name`, because `excludeIndexes`
// is true on `childSchema2`
const User = new Schema({
  name: { type: String, index: true },
  child1: childSchema1,
  child2: childSchema2
});
```

<h2 id="id"><a href="#id">option: id</a></h2>

Mongoose assigns each of your schemas an `id` virtual getter by default
which returns the document's `_id` field cast to a string, or in the case of
ObjectIds, its hexString. If you don't want an `id` getter added to your
schema, you may disable it by passing this option at schema construction time.

```javascript
// default behavior
const schema = new Schema({ name: String });
const Page = mongoose.model('Page', schema);
const p = new Page({ name: 'mongodb.org' });
console.log(p.id); // '50341373e894ad16347efe01'

// disabled id
const schema = new Schema({ name: String }, { id: false });
const Page = mongoose.model('Page', schema);
const p = new Page({ name: 'mongodb.org' });
console.log(p.id); // undefined
```

<h2 id="_id"><a href="#_id">option: _id</a></h2>

Mongoose assigns each of your schemas an `_id` field by default if one
is not passed into the [Schema](api/schema.html#schema_Schema) constructor.
The type assigned is an [ObjectId](api/schema.html#schema_Schema-Types)
to coincide with MongoDB's default behavior. If you don't want an `_id`
added to your schema at all, you may disable it using this option.

You can **only** use this option on subdocuments. Mongoose can't
save a document without knowing its id, so you will get an error if
you try to save a document without an `_id`.

```javascript
// default behavior
const schema = new Schema({ name: String });
const Page = mongoose.model('Page', schema);
const p = new Page({ name: 'mongodb.org' });
console.log(p); // { _id: '50341373e894ad16347efe01', name: 'mongodb.org' }

// disabled _id
const childSchema = new Schema({ name: String }, { _id: false });
const parentSchema = new Schema({ children: [childSchema] });

const Model = mongoose.model('Model', parentSchema);

Model.create({ children: [{ name: 'Luke' }] }, (error, doc) => {
  // doc.children[0]._id will be undefined
});
```

<h2 id="minimize"><a href="#minimize">option: minimize</a></h2>

Mongoose will, by default, "minimize" schemas by removing empty objects.

```javascript
const schema = new Schema({ name: String, inventory: {} });
const Character = mongoose.model('Character', schema);

// will store `inventory` field if it is not empty
const frodo = new Character({ name: 'Frodo', inventory: { ringOfPower: 1 } });
await frodo.save();
let doc = await Character.findOne({ name: 'Frodo' }).lean();
doc.inventory; // { ringOfPower: 1 }

// will not store `inventory` field if it is empty
const sam = new Character({ name: 'Sam', inventory: {} });
await sam.save();
doc = await Character.findOne({ name: 'Sam' }).lean();
doc.inventory; // undefined
```

This behavior can be overridden by setting `minimize` option to `false`. It
will then store empty objects.

```javascript
const schema = new Schema({ name: String, inventory: {} }, { minimize: false });
const Character = mongoose.model('Character', schema);

// will store `inventory` if empty
const sam = new Character({ name: 'Sam', inventory: {} });
await sam.save();
doc = await Character.findOne({ name: 'Sam' }).lean();
doc.inventory; // {}
```

To check whether an object is empty, you can use the `$isEmpty()` helper:

```javascript
const sam = new Character({ name: 'Sam', inventory: {} });
sam.$isEmpty('inventory'); // true

sam.inventory.barrowBlade = 1;
sam.$isEmpty('inventory'); // false
```

<h2 id="read"><a href="#read">option: read</a></h2>

Allows setting [query#read](api/query.html#query_Query-read) options at the
schema level, providing us a way to apply default
[ReadPreferences](http://www.mongodb.com/docs/manual/applications/replication/#replica-set-read-preference)
to all queries derived from a model.

```javascript
const schema = new Schema({ /* ... */ }, { read: 'primary' });            // also aliased as 'p'
const schema = new Schema({ /* ... */ }, { read: 'primaryPreferred' });   // aliased as 'pp'
const schema = new Schema({ /* ... */ }, { read: 'secondary' });          // aliased as 's'
const schema = new Schema({ /* ... */ }, { read: 'secondaryPreferred' }); // aliased as 'sp'
const schema = new Schema({ /* ... */ }, { read: 'nearest' });            // aliased as 'n'
```

The alias of each pref is also permitted so instead of having to type out
'secondaryPreferred' and getting the spelling wrong, we can simply pass 'sp'.

The read option also allows us to specify _tag sets_. These tell the
[driver](https://github.com/mongodb/node-mongodb-native/) from which members
of the replica-set it should attempt to read. Read more about tag sets
[here](http://www.mongodb.com/docs/manual/applications/replication/#tag-sets) and
[here](https://www.mongodb.com/docs/manual/core/read-preference).

_NOTE: you may also specify the driver read preference [strategy](https://www.mongodb.com/docs/manual/core/read-preference/#read-preference-modes)
option when connecting:_

```javascript
// pings the replset members periodically to track network latency
const options = { replset: { strategy: 'ping' } };
mongoose.connect(uri, options);

const schema = new Schema({ /* ... */ }, { read: ['nearest', { disk: 'ssd' }] });
mongoose.model('JellyBean', schema);
```

<h2 id="writeConcern"><a href="#writeConcern">option: writeConcern</a></h2>

Allows setting [write concern](https://www.mongodb.com/docs/manual/reference/write-concern/)
at the schema level.

```javascript
const schema = new Schema({ name: String }, {
  writeConcern: {
    w: 'majority',
    j: true,
    wtimeout: 1000
  }
});
```

<h2 id="shardKey"><a href="#shardKey">option: shardKey</a></h2>

The `shardKey` option is used when we have a [sharded MongoDB architecture](https://www.mongodb.com/docs/manual/sharding/).
Each sharded collection is given a shard key which must be present in all
insert/update operations. We just need to set this schema option to the same
shard key and we’ll be all set.

```javascript
new Schema({ /* ... */ }, { shardKey: { tag: 1, name: 1 } });
```

_Note that Mongoose does not send the `shardcollection` command for you. You
must configure your shards yourself._

<h2 id="strict"><a href="#strict">option: strict</a></h2>

The strict option, (enabled by default), ensures that values passed to our
model constructor that were not specified in our schema do not get saved to
the db.

```javascript
const thingSchema = new Schema({ /* ... */ })
const Thing = mongoose.model('Thing', thingSchema);
const thing = new Thing({ iAmNotInTheSchema: true });
thing.save(); // iAmNotInTheSchema is not saved to the db

// set to false..
const thingSchema = new Schema({ /* ... */ }, { strict: false });
const thing = new Thing({ iAmNotInTheSchema: true });
thing.save(); // iAmNotInTheSchema is now saved to the db!!
```

This also affects the use of `doc.set()` to set a property value.

```javascript
const thingSchema = new Schema({ /* ... */ });
const Thing = mongoose.model('Thing', thingSchema);
const thing = new Thing;
thing.set('iAmNotInTheSchema', true);
thing.save(); // iAmNotInTheSchema is not saved to the db
```

This value can be overridden at the model instance level by passing a second
boolean argument:

```javascript
const Thing = mongoose.model('Thing');
const thing = new Thing(doc, true);  // enables strict mode
const thing = new Thing(doc, false); // disables strict mode
```

The `strict` option may also be set to `"throw"` which will cause errors
to be produced instead of dropping the bad data.

_NOTE: Any key/val set on the instance that does not exist in your schema
is always ignored, regardless of schema option._

```javascript
const thingSchema = new Schema({ /* ... */ });
const Thing = mongoose.model('Thing', thingSchema);
const thing = new Thing;
thing.iAmNotInTheSchema = true;
thing.save(); // iAmNotInTheSchema is never saved to the db
```

<h2 id="strictQuery"><a href="#strictQuery">option: strictQuery</a></h2>

Mongoose supports a separate `strictQuery` option to avoid strict mode for query filters.
This is because empty query filters cause Mongoose to return all documents in the model, which can cause issues.

```javascript
const mySchema = new Schema({ field: Number }, { strict: true });
const MyModel = mongoose.model('Test', mySchema);
// Mongoose will filter out `notInSchema: 1` because `strict: true`, meaning this query will return
// _all_ documents in the 'tests' collection
MyModel.find({ notInSchema: 1 });
```

The `strict` option does apply to updates.
The `strictQuery` option is **just** for query filters.

```javascript
// Mongoose will strip out `notInSchema` from the update if `strict` is
// not `false`
MyModel.updateMany({}, { $set: { notInSchema: 1 } });
```

Mongoose has a separate `strictQuery` option to toggle strict mode for the `filter` parameter to queries.

```javascript
const mySchema = new Schema({ field: Number }, {
  strict: true,
  strictQuery: false // Turn off strict mode for query filters
});
const MyModel = mongoose.model('Test', mySchema);
// Mongoose will not strip out `notInSchema: 1` because `strictQuery` is false
MyModel.find({ notInSchema: 1 });
```

In general, we do **not** recommend passing user-defined objects as query filters:

```javascript
// Don't do this!
const docs = await MyModel.find(req.query);

// Do this instead:
const docs = await MyModel.find({ name: req.query.name, age: req.query.age }).setOptions({ sanitizeFilter: true });
```

In Mongoose 7, `strictQuery` is `false` by default.
However, you can override this behavior globally:

```javascript
// Set `strictQuery` to `true` to omit unknown fields in queries.
mongoose.set('strictQuery', true);
```


<h2 id="toJSON"><a href="#toJSON">option: toJSON</a></h2>

Exactly the same as the [toObject](#toObject) option but only applies when
the document's [`toJSON` method](https://thecodebarbarian.com/what-is-the-tojson-function-in-javascript.html) is called.

```javascript
const schema = new Schema({ name: String });
schema.path('name').get(function(v) {
  return v + ' is my name';
});
schema.set('toJSON', { getters: true, virtuals: false });
const M = mongoose.model('Person', schema);
const m = new M({ name: 'Max Headroom' });
console.log(m.toObject()); // { _id: 504e0cd7dd992d9be2f20b6f, name: 'Max Headroom' }
console.log(m.toJSON()); // { _id: 504e0cd7dd992d9be2f20b6f, name: 'Max Headroom is my name' }
// since we know toJSON is called whenever a js object is stringified:
console.log(JSON.stringify(m)); // { "_id": "504e0cd7dd992d9be2f20b6f", "name": "Max Headroom is my name" }
```

To see all available `toJSON/toObject` options, read [this](api/document.html#document_Document-toObject).

<h2 id="toObject"><a href="#toObject">option: toObject</a></h2>

Documents have a [toObject](api/document.html#document_Document-toObject) method
which converts the mongoose document into a plain JavaScript object. This
method accepts a few options. Instead of applying these options on a
per-document basis, we may declare the options at the schema level and have
them applied to all of the schema's documents by default.

To have all virtuals show up in your `console.log` output, set the
`toObject` option to `{ getters: true }`:

```javascript
const schema = new Schema({ name: String });
schema.path('name').get(function(v) {
  return v + ' is my name';
});
schema.set('toObject', { getters: true });
const M = mongoose.model('Person', schema);
const m = new M({ name: 'Max Headroom' });
console.log(m); // { _id: 504e0cd7dd992d9be2f20b6f, name: 'Max Headroom is my name' }
```

To see all available `toObject` options, read [this](api/document.html#document_Document-toObject).

<h2 id="typeKey"><a href="#typeKey">option: typeKey</a></h2>

By default, if you have an object with key 'type' in your schema, mongoose
will interpret it as a type declaration.

```javascript
// Mongoose interprets this as 'loc is a String'
const schema = new Schema({ loc: { type: String, coordinates: [Number] } });
```

However, for applications like [geoJSON](http://www.mongodb.com/docs/manual/reference/geojson/),
the 'type' property is important. If you want to control which key mongoose
uses to find type declarations, set the 'typeKey' schema option.

```javascript
const schema = new Schema({
  // Mongoose interprets this as 'loc is an object with 2 keys, type and coordinates'
  loc: { type: String, coordinates: [Number] },
  // Mongoose interprets this as 'name is a String'
  name: { $type: String }
}, { typeKey: '$type' }); // A '$type' key means this object is a type declaration
```

<h2 id="validateBeforeSave"><a href="#validateBeforeSave">option: validateBeforeSave</a></h2>

By default, documents are automatically validated before they are saved to
the database. This is to prevent saving an invalid document. If you want to
handle validation manually, and be able to save objects which don't pass
validation, you can set `validateBeforeSave` to false.

```javascript
const schema = new Schema({ name: String });
schema.set('validateBeforeSave', false);
schema.path('name').validate(function(value) {
  return value != null;
});
const M = mongoose.model('Person', schema);
const m = new M({ name: null });
m.validate(function(err) {
  console.log(err); // Will tell you that null is not allowed.
});
m.save(); // Succeeds despite being invalid
```

<h2 id="versionKey"><a href="#versionKey">option: versionKey</a></h2>

The `versionKey` is a property set on each document when first created by
Mongoose. This keys value contains the internal
[revision](http://aaronheckmann.blogspot.com/2012/06/mongoose-v3-part-1-versioning.html)
of the document. The `versionKey` option is a string that represents the
path to use for versioning. The default is `__v`. If this conflicts with
your application you can configure as such:

```javascript
const schema = new Schema({ name: 'string' });
const Thing = mongoose.model('Thing', schema);
const thing = new Thing({ name: 'mongoose v3' });
await thing.save(); // { __v: 0, name: 'mongoose v3' }

// customized versionKey
new Schema({ /* ... */ }, { versionKey: '_somethingElse' })
const Thing = mongoose.model('Thing', schema);
const thing = new Thing({ name: 'mongoose v3' });
thing.save(); // { _somethingElse: 0, name: 'mongoose v3' }
```

Note that Mongoose's default versioning is **not** a full [optimistic concurrency](https://en.wikipedia.org/wiki/Optimistic_concurrency_control)
solution. Mongoose's default versioning only operates on arrays as shown below.

```javascript
// 2 copies of the same document
const doc1 = await Model.findOne({ _id });
const doc2 = await Model.findOne({ _id });

// Delete first 3 comments from `doc1`
doc1.comments.splice(0, 3);
await doc1.save();

// The below `save()` will throw a VersionError, because you're trying to
// modify the comment at index 1, and the above `splice()` removed that
// comment.
doc2.set('comments.1.body', 'new comment');
await doc2.save();
```

If you need optimistic concurrency support for `save()`, you can set the [`optimisticConcurrency` option](#optimisticConcurrency)

Document versioning can also be disabled by setting the `versionKey` to
`false`.
_DO NOT disable versioning unless you [know what you are doing](http://aaronheckmann.blogspot.com/2012/06/mongoose-v3-part-1-versioning.html)._

```javascript
new Schema({ /* ... */ }, { versionKey: false });
const Thing = mongoose.model('Thing', schema);
const thing = new Thing({ name: 'no versioning please' });
thing.save(); // { name: 'no versioning please' }
```

Mongoose _only_ updates the version key when you use [`save()`](api/document.html#document_Document-save).
If you use `update()`, `findOneAndUpdate()`, etc. Mongoose will **not**
update the version key. As a workaround, you can use the below middleware.

```javascript
schema.pre('findOneAndUpdate', function() {
  const update = this.getUpdate();
  if (update.__v != null) {
    delete update.__v;
  }
  const keys = ['$set', '$setOnInsert'];
  for (const key of keys) {
    if (update[key] != null && update[key].__v != null) {
      delete update[key].__v;
      if (Object.keys(update[key]).length === 0) {
        delete update[key];
      }
    }
  }
  update.$inc = update.$inc || {};
  update.$inc.__v = 1;
});
```

<h2 id="optimisticConcurrency"><a href="#optimisticConcurrency">option: optimisticConcurrency</a></h2>

[Optimistic concurrency](https://en.wikipedia.org/wiki/Optimistic_concurrency_control) is a strategy to ensure
the document you're updating didn't change between when you loaded it using `find()` or `findOne()`, and when
you update it using `save()`.

For example, suppose you have a `House` model that contains a list of `photos`, and a `status` that represents
whether this house shows up in searches. Suppose that a house that has status `'APPROVED'` must have at least
two `photos`. You might implement the logic of approving a house document as shown below:

```javascript
async function markApproved(id) {
  const house = await House.findOne({ _id });
  if (house.photos.length < 2) {
    throw new Error('House must have at least two photos!');
  }

  house.status = 'APPROVED';
  await house.save();
}
```

The `markApproved()` function looks right in isolation, but there might be a potential issue: what if another
function removes the house's photos between the `findOne()` call and the `save()` call? For example, the below
code will succeed:

```javascript
const house = await House.findOne({ _id });
if (house.photos.length < 2) {
  throw new Error('House must have at least two photos!');
}

const house2 = await House.findOne({ _id });
house2.photos = [];
await house2.save();

// Marks the house as 'APPROVED' even though it has 0 photos!
house.status = 'APPROVED';
await house.save();
```

If you set the `optimisticConcurrency` option on the `House` model's schema, the above script will throw an
error.

```javascript
const House = mongoose.model('House', Schema({
  status: String,
  photos: [String]
}, { optimisticConcurrency: true }));

const house = await House.findOne({ _id });
if (house.photos.length < 2) {
  throw new Error('House must have at least two photos!');
}

const house2 = await House.findOne({ _id });
house2.photos = [];
await house2.save();

// Throws 'VersionError: No matching document found for id "..." version 0'
house.status = 'APPROVED';
await house.save();
```

<h2 id="collation"><a href="#collation">option: collation</a></h2>

Sets a default [collation](https://www.mongodb.com/docs/manual/reference/collation/)
for every query and aggregation. [Here's a beginner-friendly overview of collations](http://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-collations).

```javascript
const schema = new Schema({
  name: String
}, { collation: { locale: 'en_US', strength: 1 } });

const MyModel = db.model('MyModel', schema);

MyModel.create([{ name: 'val' }, { name: 'Val' }]).
  then(() => {
    return MyModel.find({ name: 'val' });
  }).
  then((docs) => {
    // `docs` will contain both docs, because `strength: 1` means
    // MongoDB will ignore case when matching.
  });
```

<h2 id="timeseries"><a href="#timeseries">option: timeseries</a></h2>

If you set the `timeseries` option on a schema, Mongoose will create a [timeseries collection](https://www.mongodb.com/docs/manual/core/timeseries-collections/) for any model that you create from that schema.

```javascript
const schema = Schema({ name: String, timestamp: Date, metadata: Object }, {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'metadata',
    granularity: 'hours'
  },
  autoCreate: false,
  expireAfterSeconds: 86400
});

// `Test` collection will be a timeseries collection
const Test = db.model('Test', schema);
```

<h2 id="skipVersioning"><a href="#skipVersioning">option: skipVersioning</a></h2>

`skipVersioning` allows excluding paths from versioning (i.e., the internal
revision will not be incremented even if these paths are updated). DO NOT
do this unless you know what you're doing. For subdocuments, include this
on the parent document using the fully qualified path.

```javascript
new Schema({ /* ... */ }, { skipVersioning: { dontVersionMe: true } });
thing.dontVersionMe.push('hey');
thing.save(); // version is not incremented
```

<h2 id="timestamps"><a href="#timestamps">option: timestamps</a></h2>

The `timestamps` option tells Mongoose to assign `createdAt` and `updatedAt` fields
to your schema. The type assigned is [Date](schematypes.html#dates).

By default, the names of the fields are `createdAt` and `updatedAt`. Customize
the field names by setting `timestamps.createdAt` and `timestamps.updatedAt`.

The way `timestamps` works under the hood is:
* If you create a new document, mongoose simply sets `createdAt`, and `updatedAt` to the time of creation.
* If you update a document, mongoose will add `updatedAt` to the `$set` object.
* If you set `upsert: true` on an update operation, mongoose will use [`$setOnInsert`](https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/) operator to add `createdAt` to the document in case the `upsert` operation resulted into a new inserted document.

```javascript
const thingSchema = new Schema({ /* ... */ }, { timestamps: { createdAt: 'created_at' } });
const Thing = mongoose.model('Thing', thingSchema);
const thing = new Thing();
await thing.save(); // `created_at` & `updatedAt` will be included

// With updates, Mongoose will add `updatedAt` to `$set`
await Thing.updateOne({}, { $set: { name: 'Test' } });

// If you set upsert: true, Mongoose will add `created_at` to `$setOnInsert` as well
await Thing.findOneAndUpdate({}, { $set: { name: 'Test2' } });

// Mongoose also adds timestamps to bulkWrite() operations
// See https://mongoosejs.com/docs/api/model.html#model_Model-bulkWrite
await Thing.bulkWrite([
  {
    insertOne: {
      document: {
        name: 'Jean-Luc Picard',
        ship: 'USS Stargazer'
      // Mongoose will add `created_at` and `updatedAt`
      }
    }
  },
  {
    updateOne: {
      filter: { name: 'Jean-Luc Picard' },
      update: {
        $set: {
          ship: 'USS Enterprise'
        // Mongoose will add `updatedAt`
        }
      }
    }
  }
]);
```

By default, Mongoose uses `new Date()` to get the current time.
If you want to overwrite the function
Mongoose uses to get the current time, you can set the
`timestamps.currentTime` option. Mongoose will call the
`timestamps.currentTime` function whenever it needs to get
the current time.

```javascript
const schema = Schema({
  createdAt: Number,
  updatedAt: Number,
  name: String
}, {
  // Make Mongoose use Unix time (seconds since Jan 1, 1970)
  timestamps: { currentTime: () => Math.floor(Date.now() / 1000) }
});
```

<h2 id="pluginTags"><a href="#pluginTags">option: pluginTags</a></h2>

Mongoose supports defining global plugins, plugins that apply to all schemas.

```javascript
// Add a `meta` property to all schemas
mongoose.plugin(function myPlugin(schema) {
  schema.add({ meta: {} });
});
```

Sometimes, you may only want to apply a given plugin to some schemas.
In that case, you can add `pluginTags` to a schema:

```javascript
const schema1 = new Schema({
  name: String
}, { pluginTags: ['useMetaPlugin'] });

const schema2 = new Schema({
  name: String
});
```

If you call `plugin()` with a `tags` option, Mongoose will only apply that plugin to schemas that have a matching entry in `pluginTags`.

```javascript
// Add a `meta` property to all schemas
mongoose.plugin(function myPlugin(schema) {
  schema.add({ meta: {} });
}, { tags: ['useMetaPlugin'] });
```

<h2 id="selectPopulatedPaths">
  <a href="#selectPopulatedPaths">
    option: selectPopulatedPaths
  </a>
</h2>

By default, Mongoose will automatically `select()` any populated paths for
you, unless you explicitly exclude them.

```javascript
const bookSchema = new Schema({
  title: 'String',
  author: { type: 'ObjectId', ref: 'Person' }
});
const Book = mongoose.model('Book', bookSchema);

// By default, Mongoose will add `author` to the below `select()`.
await Book.find().select('title').populate('author');

// In other words, the below query is equivalent to the above
await Book.find().select('title author').populate('author');
```

To opt out of selecting populated fields by default, set `selectPopulatedPaths`
to `false` in your schema.

```javascript
const bookSchema = new Schema({
  title: 'String',
  author: { type: 'ObjectId', ref: 'Person' }
}, { selectPopulatedPaths: false });
const Book = mongoose.model('Book', bookSchema);

// Because `selectPopulatedPaths` is false, the below doc will **not**
// contain an `author` property.
const doc = await Book.findOne().select('title').populate('author');
```

<h2 id="storeSubdocValidationError">
  <a href="#storeSubdocValidationError">
    option: storeSubdocValidationError
  </a>
</h2>

For legacy reasons, when there is a validation error in subpath of a
single nested schema, Mongoose will record that there was a validation error
in the single nested schema path as well. For example:

```javascript
const childSchema = new Schema({ name: { type: String, required: true } });
const parentSchema = new Schema({ child: childSchema });

const Parent = mongoose.model('Parent', parentSchema);

// Will contain an error for both 'child.name' _and_ 'child'
new Parent({ child: {} }).validateSync().errors;
```

Set the `storeSubdocValidationError` to `false` on the child schema to make
Mongoose only reports the parent error.

```javascript
const childSchema = new Schema({
  name: { type: String, required: true }
}, { storeSubdocValidationError: false }); // <-- set on the child schema
const parentSchema = new Schema({ child: childSchema });

const Parent = mongoose.model('Parent', parentSchema);

// Will only contain an error for 'child.name'
new Parent({ child: {} }).validateSync().errors;
```

<h2 id="es6-classes"><a href="#es6-classes">With ES6 Classes</a></h2>

Schemas have a [`loadClass()` method](api/schema.html#schema_Schema-loadClass)
that you can use to create a Mongoose schema from an [ES6 class](https://thecodebarbarian.com/an-overview-of-es6-classes):

* [ES6 class methods](https://masteringjs.io/tutorials/fundamentals/class#methods) become [Mongoose methods](guide.html#methods)
* [ES6 class statics](https://masteringjs.io/tutorials/fundamentals/class#statics) become [Mongoose statics](guide.html#statics)
* [ES6 getters and setters](https://masteringjs.io/tutorials/fundamentals/class#getterssetters) become [Mongoose virtuals](tutorials/virtuals.html)

Here's an example of using `loadClass()` to create a schema from an ES6 class:

```javascript
class MyClass {
  myMethod() { return 42; }
  static myStatic() { return 42; }
  get myVirtual() { return 42; }
}

const schema = new mongoose.Schema();
schema.loadClass(MyClass);

console.log(schema.methods); // { myMethod: [Function: myMethod] }
console.log(schema.statics); // { myStatic: [Function: myStatic] }
console.log(schema.virtuals); // { myVirtual: VirtualType { ... } }
```

<h2 id="plugins"><a href="#plugins">Pluggable</a></h2>

Schemas are also [pluggable](plugins.html) which allows us to package up reusable features into
plugins that can be shared with the community or just between your projects.

<h2 id="further-reading"><a href="#further-reading">Further Reading</a></h2>

Here's an [alternative introduction to Mongoose schemas](https://masteringjs.io/tutorials/mongoose/schema).

To get the most out of MongoDB, you need to learn the basics of MongoDB schema design.
SQL schema design (third normal form) was designed to [minimize storage costs](https://en.wikipedia.org/wiki/Third_normal_form),
whereas MongoDB schema design is about making common queries as fast as possible.
The [_6 Rules of Thumb for MongoDB Schema Design_ blog series](https://www.mongodb.com/blog/post/6-rules-of-thumb-for-mongodb-schema-design-part-1)
is an excellent resource for learning the basic rules for making your queries
fast.

Users looking to master MongoDB schema design in Node.js should look into
[_The Little MongoDB Schema Design Book_](http://bit.ly/mongodb-schema-design)
by Christian Kvalheim, the original author of the [MongoDB Node.js driver](http://npmjs.com/package/mongodb).
This book shows you how to implement performant schemas for a laundry list
of use cases, including e-commerce, wikis, and appointment bookings.

<h2 id="next">Next Up</h2>

Now that we've covered `Schemas`, let's take a look at [SchemaTypes](schematypes.html).
