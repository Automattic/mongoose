# Schema

- [`Schema()`](#Schema())
- [`Schema.Types`](#Schema.Types)
- [`Schema.create`](#Schema.create)
- [`Schema.indexTypes`](#Schema.indexTypes)
- [`Schema.prototype.add()`](#Schema.prototype.add())
- [`Schema.prototype.alias()`](#Schema.prototype.alias())
- [`Schema.prototype.childSchemas`](#Schema.prototype.childSchemas)
- [`Schema.prototype.clearIndexes()`](#Schema.prototype.clearIndexes())
- [`Schema.prototype.clone()`](#Schema.prototype.clone())
- [`Schema.prototype.discriminator()`](#Schema.prototype.discriminator())
- [`Schema.prototype.eachPath()`](#Schema.prototype.eachPath())
- [`Schema.prototype.encryptionType()`](#Schema.prototype.encryptionType())
- [`Schema.prototype.get()`](#Schema.prototype.get())
- [`Schema.prototype.index()`](#Schema.prototype.index())
- [`Schema.prototype.indexes()`](#Schema.prototype.indexes())
- [`Schema.prototype.loadClass()`](#Schema.prototype.loadClass())
- [`Schema.prototype.method()`](#Schema.prototype.method())
- [`Schema.prototype.obj`](#Schema.prototype.obj)
- [`Schema.prototype.omit()`](#Schema.prototype.omit())
- [`Schema.prototype.path()`](#Schema.prototype.path())
- [`Schema.prototype.pathType()`](#Schema.prototype.pathType())
- [`Schema.prototype.paths`](#Schema.prototype.paths)
- [`Schema.prototype.pick()`](#Schema.prototype.pick())
- [`Schema.prototype.plugin()`](#Schema.prototype.plugin())
- [`Schema.prototype.post()`](#Schema.prototype.post())
- [`Schema.prototype.pre()`](#Schema.prototype.pre())
- [`Schema.prototype.queue()`](#Schema.prototype.queue())
- [`Schema.prototype.remove()`](#Schema.prototype.remove())
- [`Schema.prototype.removeIndex()`](#Schema.prototype.removeIndex())
- [`Schema.prototype.removeVirtual()`](#Schema.prototype.removeVirtual())
- [`Schema.prototype.requiredPaths()`](#Schema.prototype.requiredPaths())
- [`Schema.prototype.searchIndex()`](#Schema.prototype.searchIndex())
- [`Schema.prototype.set()`](#Schema.prototype.set())
- [`Schema.prototype.static()`](#Schema.prototype.static())
- [`Schema.prototype.toJSONSchema()`](#Schema.prototype.toJSONSchema())
- [`Schema.prototype.virtual()`](#Schema.prototype.virtual())
- [`Schema.prototype.virtualpath()`](#Schema.prototype.virtualpath())
- [`Schema.prototype.virtuals`](#Schema.prototype.virtuals)
- [`Schema.reserved`](#Schema.reserved)
- [`buildNestedPath()`](#buildNestedPath())

## `Schema()`

### Parameters

- `[definition]` \<object|Schema|Array\> Can be one of: object describing schema paths, or schema to copy, or array of objects and schemas
- `[options]` \<object\>

### Inherits

- [NodeJS EventEmitter](https://nodejs.org/api/events.html#class-eventemitter)

Schema constructor.

#### Example:

    const child = new Schema({ name: String });
    const schema = new Schema({ name: String, age: Number, children: [child] });
    const Tree = mongoose.model('Tree', schema);

    // setting schema options
    new Schema({ name: String }, { id: false, autoIndex: false })

#### Options:

- [autoIndex](https://mongoosejs.com/docs/guide.html#autoIndex): bool - defaults to null (which means use the connection's autoIndex option)
- [autoCreate](https://mongoosejs.com/docs/guide.html#autoCreate): bool - defaults to null (which means use the connection's autoCreate option)
- [bufferCommands](https://mongoosejs.com/docs/guide.html#bufferCommands): bool - defaults to true
- [bufferTimeoutMS](https://mongoosejs.com/docs/guide.html#bufferTimeoutMS): number - defaults to 10000 (10 seconds). If `bufferCommands` is enabled, the amount of time Mongoose will wait for connectivity to be established before erroring out.
- [capped](https://mongoosejs.com/docs/guide.html#capped): bool | number | object - defaults to false
- [collection](https://mongoosejs.com/docs/guide.html#collection): string - no default
- [discriminatorKey](https://mongoosejs.com/docs/guide.html#discriminatorKey): string - defaults to `__t`
- [id](https://mongoosejs.com/docs/guide.html#id): bool - defaults to true
- [_id](https://mongoosejs.com/docs/guide.html#_id): bool - defaults to true
- [minimize](https://mongoosejs.com/docs/guide.html#minimize): bool - controls [document#toObject](https://mongoosejs.com/docs/api/document.md#Document.prototype.toObject()) behavior when called manually - defaults to true
- [read](https://mongoosejs.com/docs/guide.html#read): string
- [readConcern](https://mongoosejs.com/docs/guide.html#readConcern): object - defaults to null, use to set a default [read concern](https://www.mongodb.com/docs/manual/reference/read-concern/) for all queries.
- [writeConcern](https://mongoosejs.com/docs/guide.html#writeConcern): object - defaults to null, use to override [the MongoDB server's default write concern settings](https://www.mongodb.com/docs/manual/reference/write-concern/)
- [shardKey](https://mongoosejs.com/docs/guide.html#shardKey): object - defaults to `null`
- [strict](https://mongoosejs.com/docs/guide.html#strict): bool - defaults to true
- [strictQuery](https://mongoosejs.com/docs/guide.html#strictQuery): bool - defaults to false
- [toJSON](https://mongoosejs.com/docs/guide.html#toJSON) - object - no default
- [toObject](https://mongoosejs.com/docs/guide.html#toObject) - object - no default
- [typeKey](https://mongoosejs.com/docs/guide.html#typeKey) - string - defaults to 'type'
- [validateBeforeSave](https://mongoosejs.com/docs/guide.html#validateBeforeSave) - bool - defaults to `true`
- [validateModifiedOnly](https://mongoosejs.com/docs/api/document.md#Document.prototype.validate()) - bool - defaults to `false`
- [versionKey](https://mongoosejs.com/docs/guide.html#versionKey): string or object - defaults to "__v"
- [optimisticConcurrency](https://mongoosejs.com/docs/guide.html#optimisticConcurrency): bool or string[] or { exclude: string[] } - defaults to false. Set to true to enable [optimistic concurrency](https://thecodebarbarian.com/whats-new-in-mongoose-5-10-optimistic-concurrency.html) for all fields. Set to a string array to enable optimistic concurrency only for the specified fields; note that this **replaces** the default array versioning behavior. Set to `{ exclude: string[] }` to enable optimistic concurrency for all fields except the specified ones; this also replaces the default array versioning.
- [collation](https://mongoosejs.com/docs/guide.html#collation): object - defaults to null (which means use no collation)
- [timeseries](https://mongoosejs.com/docs/guide.html#timeseries): object - defaults to null (which means this schema's collection won't be a timeseries collection)
- [selectPopulatedPaths](https://mongoosejs.com/docs/guide.html#selectPopulatedPaths): boolean - defaults to `true`
- [skipVersioning](https://mongoosejs.com/docs/guide.html#skipVersioning): object - paths to exclude from versioning
- [timestamps](https://mongoosejs.com/docs/guide.html#timestamps): object or boolean - defaults to `false`. If true, Mongoose adds `createdAt` and `updatedAt` properties to your schema and manages those properties for you.
- [pluginTags](https://mongoosejs.com/docs/guide.html#pluginTags): array of strings - defaults to `undefined`. If set and plugin called with `tags` option, will only apply that plugin to schemas with a matching tag.
- [virtuals](https://mongoosejs.com/docs/tutorials/virtuals.html#virtuals-via-schema-options): object - virtuals to define, alias for [`.virtual`](https://mongoosejs.com/docs/api/schema.md#Schema.prototype.virtual())
- [collectionOptions]: object with options passed to [`createCollection()`](https://www.mongodb.com/docs/manual/reference/method/db.createCollection/) when calling `Model.createCollection()` or `autoCreate` set to true.
- [encryptionType]: the encryption type for the schema.  Valid options are `csfle` or `queryableEncryption`.  See https://mongoosejs.com/docs/field-level-encryption.html.
- [lean]: boolean - set to true to make all queries use [lean](https://mongoosejs.com/docs/tutorials/lean.html) by default. Defaults to false.

#### Options for Nested Schemas:

- `excludeIndexes`: bool - defaults to `false`. If `true`, skip building indexes on this schema's paths.

#### Note:

_When nesting schemas, (`children` in the example above), always declare the child schema first before passing it into its parent._

## `Schema.Types`

### Type

- \<property\>

The various built-in Mongoose Schema Types.

#### Example:

    const mongoose = require('mongoose');
    const ObjectId = mongoose.Schema.Types.ObjectId;

#### Types:

- [String](https://mongoosejs.com/docs/schematypes.html#strings)
- [Number](https://mongoosejs.com/docs/schematypes.html#numbers)
- [Boolean](https://mongoosejs.com/docs/schematypes.html#booleans) | Bool
- [Array](https://mongoosejs.com/docs/schematypes.html#arrays)
- [Buffer](https://mongoosejs.com/docs/schematypes.html#buffers)
- [Date](https://mongoosejs.com/docs/schematypes.html#dates)
- [ObjectId](https://mongoosejs.com/docs/schematypes.html#objectids) | Oid
- [Mixed](https://mongoosejs.com/docs/schematypes.html#mixed)
- [UUID](https://mongoosejs.com/docs/schematypes.html#uuid)
- [BigInt](https://mongoosejs.com/docs/schematypes.html#bigint)
- [Double] (https://mongoosejs.com/docs/schematypes.html#double)
- [Int32](https://mongoosejs.com/docs/schematypes.html#int32)

Using this exposed access to the `Mixed` SchemaType, we can use them in our schema.

    const Mixed = mongoose.Schema.Types.Mixed;
    new mongoose.Schema({ _user: Mixed })

## `Schema.create`

### Parameters

- `definition` \<object\>
- `[options]` \<object\>

### Returns

- \<Schema\> the new schema

### Type

- \<property\>

Creates a new schema with the given definition and options. Equivalent to `new Schema(definition, options)`.

`Schema.create()` is primarily useful for automatic schema type inference in TypeScript.

#### Example:

    const schema = Schema.create({ name: String }, { toObject: { virtuals: true } });
    // Equivalent:
    const schema2 = new Schema({ name: String }, { toObject: { virtuals: true } });

## `Schema.indexTypes`

### Type

- \<property\>

The allowed index types

## `Schema.prototype.add()`

### Parameters

- `obj` \<object|Schema\> plain object with paths to add, or another schema
- `[prefix]` \<string\> path to prefix the newly added paths with

### Returns

- \<Schema\> the Schema instance

Adds key path / schema type pairs to this schema.

#### Example:

    const ToySchema = new Schema();
    ToySchema.add({ name: 'string', color: 'string', price: 'number' });

    const TurboManSchema = new Schema();
    // You can also `add()` another schema and copy over all paths, virtuals,
    // getters, setters, indexes, methods, and statics.
    TurboManSchema.add(ToySchema).add({ year: Number });

## `Schema.prototype.alias()`

### Parameters

- `path` \<string\> real path to alias
- `alias` \<string|Array[string]\> the path(s) to use as an alias for `path`

### Returns

- \<Schema\> the Schema instance

Add an alias for `path`. This means getting or setting the `alias`
is equivalent to getting or setting the `path`.

#### Example:

    const toySchema = new Schema({ n: String });

    // Make 'name' an alias for 'n'
    toySchema.alias('n', 'name');

    const Toy = mongoose.model('Toy', toySchema);
    const turboMan = new Toy({ n: 'Turbo Man' });

    turboMan.name; // 'Turbo Man'
    turboMan.n; // 'Turbo Man'

    turboMan.name = 'Turbo Man Action Figure';
    turboMan.n; // 'Turbo Man Action Figure'

    await turboMan.save(); // Saves { _id: ..., n: 'Turbo Man Action Figure' }

## `Schema.prototype.childSchemas`

### Type

- \<property\>

Array of child schemas (from document arrays and single nested subdocs)
and their corresponding compiled models. Each element of the array is
an object with 2 properties: `schema` and `model`.

This property is typically only useful for plugin authors and advanced users.
You do not need to interact with this property at all to use mongoose.

## `Schema.prototype.clearIndexes()`

### Returns

- \<Schema\> the Schema instance

Remove all indexes from this schema.

clearIndexes only removes indexes from your schema object. Does **not** affect the indexes
in MongoDB.

#### Example:

    const ToySchema = new Schema({ name: String, color: String, price: Number });
    ToySchema.index({ name: 1 });
    ToySchema.index({ color: 1 });

    // Remove all indexes on this schema
    ToySchema.clearIndexes();

    ToySchema.indexes(); // []

## `Schema.prototype.clone()`

### Returns

- \<Schema\> the cloned schema

Returns a deep copy of the schema

#### Example:

    const schema = new Schema({ name: String });
    const clone = schema.clone();
    clone === schema; // false
    clone.path('name'); // SchemaString { ... }

## `Schema.prototype.discriminator()`

### Parameters

- `name` \<string\> the name of the discriminator
- `schema` \<Schema\> the discriminated Schema
- `[options]` \<object\> discriminator options
- `[options.value]` \<string\> the string stored in the `discriminatorKey` property. If not specified, Mongoose uses the `name` parameter.
- `[options.clone=true]` \<boolean\> By default, `discriminator()` clones the given `schema`. Set to `false` to skip cloning.
- `[options.overwriteModels=false]` \<boolean\> by default, Mongoose does not allow you to define a discriminator with the same name as another discriminator. Set this to allow overwriting discriminators with the same name.
- `[options.mergeHooks=true]` \<boolean\> By default, Mongoose merges the base schema's hooks with the discriminator schema's hooks. Set this option to `false` to make Mongoose use the discriminator schema's hooks instead.
- `[options.mergePlugins=true]` \<boolean\> By default, Mongoose merges the base schema's plugins with the discriminator schema's plugins. Set this option to `false` to make Mongoose use the discriminator schema's plugins instead.

### Returns

- \<Schema\> the Schema instance

Inherit a Schema by applying a discriminator on an existing Schema.


#### Example:

    const eventSchema = new mongoose.Schema({ timestamp: Date }, { discriminatorKey: 'kind' });

    const clickedEventSchema = new mongoose.Schema({ element: String }, { discriminatorKey: 'kind' });
    const ClickedModel = eventSchema.discriminator('clicked', clickedEventSchema);

    const Event = mongoose.model('Event', eventSchema);

    Event.discriminators['clicked']; // Model { clicked }

    const doc = await Event.create({ kind: 'clicked', element: '#hero' });
    doc.element; // '#hero'
    doc instanceof ClickedModel; // true

## `Schema.prototype.eachPath()`

### Parameters

- `fn` \<Function\> callback function

### Returns

- \<Schema\> this

Iterates the schemas paths similar to Array#forEach.

The callback is passed the pathname and the schemaType instance.

#### Example:

    const userSchema = new Schema({ name: String, registeredAt: Date });
    userSchema.eachPath((pathname, schematype) => {
      // Prints twice:
      // name SchemaString { ... }
      // registeredAt SchemaDate { ... }
      console.log(pathname, schematype);
    });

## `Schema.prototype.encryptionType()`

### Parameters

- `encryptionType` \<'csfle' | 'queryableEncryption' | null | undefined\> plain object with paths to add, or another schema

Sets the encryption type of the schema, if a value is provided, otherwise
returns the encryption type.

## `Schema.prototype.get()`

### Parameters

- `key` \<string\> The name of the Option to get the current value for

### Returns

- \<any\> the option's value

Gets a schema option.

#### Example:

    schema.get('strict'); // true
    schema.set('strict', false);
    schema.get('strict'); // false

## `Schema.prototype.index()`

### Parameters

- `fields` \<object\> The Fields to index, with the order, available values: `1 | -1 | '2d' | '2dsphere' | 'geoHaystack' | 'hashed' | 'text'`
- `[options]` \<object\> Options to pass to [MongoDB driver's `createIndex()` function](https://mongodb.github.io/node-mongodb-native/7.0/classes/Collection.html#createIndex)
- `[options.expires=null]` \<string|number\> Mongoose-specific syntactic sugar, uses [ms](https://www.npmjs.com/package/ms) to convert `expires` option into seconds for the `expireAfterSeconds` in the above link.
- `[options.language_override=null]` \<string\> Tells mongodb to use the specified field instead of `language` for parsing text indexes.

Defines an index (most likely compound) for this schema.

#### Example:

    schema.index({ first: 1, last: -1 })

## `Schema.prototype.indexes()`

### Returns

- \<Array\> list of indexes defined in the schema

Returns a list of indexes that this schema declares, via `schema.index()` or by `index: true` in a path's options.
Indexes are expressed as an array `[spec, options]`.

#### Example:

    const userSchema = new Schema({
      email: { type: String, required: true, unique: true },
      registeredAt: { type: Date, index: true }
    });

    // [ [ { email: 1 }, { unique: true } ],
    //   [ { registeredAt: 1 }, {} ] ]
    userSchema.indexes();

[Plugins](https://mongoosejs.com/docs/plugins.html) can use the return value of this function to modify a schema's indexes.
For example, the below plugin makes every index unique by default.

    function myPlugin(schema) {
      for (const index of schema.indexes()) {
        if (index[1].unique === undefined) {
          index[1].unique = true;
        }
      }
    }

## `Schema.prototype.loadClass()`

### Parameters

- `model` \<Function\> The Class to load
- `[virtualsOnly]` \<boolean\> if truthy, only pulls virtuals from the class, not methods or statics

Loads an ES6 class into a schema. Maps [setters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set) + [getters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get), [static methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/static),
and [instance methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#Class_body_and_method_definitions)
to schema [virtuals](https://mongoosejs.com/docs/guide.html#virtuals),
[statics](https://mongoosejs.com/docs/guide.html#statics), and
[methods](https://mongoosejs.com/docs/guide.html#methods).

#### Example:

```javascript
const md5 = require('md5');
const userSchema = new Schema({ email: String });
class UserClass {
  // `gravatarImage` becomes a virtual
  get gravatarImage() {
    const hash = md5(this.email.toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}`;
  }

  // `getProfileUrl()` becomes a document method
  getProfileUrl() {
    return `https://mysite.com/${this.email}`;
  }

  // `findByEmail()` becomes a static
  static findByEmail(email) {
    return this.findOne({ email });
  }
}

// `schema` will now have a `gravatarImage` virtual, a `getProfileUrl()` method,
// and a `findByEmail()` static
userSchema.loadClass(UserClass);
```

## `Schema.prototype.method()`

### Parameters

- `name` \<string|object\> The Method Name for a single function, or an Object of "string-function" pairs.
- `[fn]` \<Function\> The Function in a single-function definition.

Adds an instance method to documents constructed from Models compiled from this schema.

#### Example:

    const schema = kittySchema = new Schema(..);

    schema.method('meow', function () {
      console.log('meeeeeoooooooooooow');
    })

    const Kitty = mongoose.model('Kitty', schema);

    const fizz = new Kitty;
    fizz.meow(); // meeeeeooooooooooooow

If a hash of name/fn pairs is passed as the only argument, each name/fn pair will be added as methods.

    schema.method({
        purr: function () {}
      , scratch: function () {}
    });

    // later
    const fizz = new Kitty;
    fizz.purr();
    fizz.scratch();

NOTE: `Schema.method()` adds instance methods to the `Schema.methods` object. You can also add instance methods directly to the `Schema.methods` object as seen in the [guide](https://mongoosejs.com/docs/guide.html#methods)

## `Schema.prototype.obj`

### Type

- \<property\>

The original object passed to the schema constructor

#### Example:

    const schema = new Schema({ a: String }).add({ b: String });
    schema.obj; // { a: String }

## `Schema.prototype.omit()`

### Parameters

- `paths` \<Array[string]\> List of Paths to omit for the new Schema
- `[options]` \<object\> Options to pass to the new Schema Constructor (same as `new Schema(.., Options)`). Defaults to `this.options` if not set.

### Returns

- \<Schema\>

Returns a new schema that has the `paths` from the original schema, minus the omitted ones.

This method is analagous to [Lodash's `omit()` function](https://lodash.com/docs/#omit) for Mongoose schemas.

#### Example:

    const schema = Schema({ name: String, age: Number });
    // Creates a new schema omitting the `age` path
    const newSchema = schema.omit(['age']);

    newSchema.path('name'); // SchemaString { ... }
    newSchema.path('age'); // undefined

## `Schema.prototype.path()`

### Parameters

- `path` \<string\> The name of the Path to get / set
- `[obj]` \<object\> The Type to set the path to, if provided the path will be SET, otherwise the path will be GET

Gets/sets schema paths.

Sets a path (if arity 2)
Gets a path (if arity 1)

#### Example:

    schema.path('name') // returns a SchemaType
    schema.path('name', Number) // changes the schemaType of `name` to Number

## `Schema.prototype.pathType()`

### Parameters

- `path` \<string\>

### Returns

- \<string\>

Returns the pathType of `path` for this schema.

Given a path, returns whether it is a real, virtual, nested, or ad-hoc/undefined path.

#### Example:

    const s = new Schema({ name: String, nested: { foo: String } });
    s.virtual('foo').get(() => 42);
    s.pathType('name'); // "real"
    s.pathType('nested'); // "nested"
    s.pathType('foo'); // "virtual"
    s.pathType('fail'); // "adhocOrUndefined"

## `Schema.prototype.paths`

### Type

- \<property\>

The paths defined on this schema. The keys are the top-level paths
in this schema, and the values are instances of the SchemaType class.

#### Example:

    const schema = new Schema({ name: String }, { _id: false });
    schema.paths; // { name: SchemaString { ... } }

    schema.add({ age: Number });
    schema.paths; // { name: SchemaString { ... }, age: SchemaNumber { ... } }

## `Schema.prototype.pick()`

### Parameters

- `paths` \<Array[string]\> List of Paths to pick for the new Schema
- `[options]` \<object\> Options to pass to the new Schema Constructor (same as `new Schema(.., Options)`). Defaults to `this.options` if not set.

### Returns

- \<Schema\>

Returns a new schema that has the picked `paths` from this schema.

This method is analagous to [Lodash's `pick()` function](https://lodash.com/docs/4.17.15#pick) for Mongoose schemas.

#### Example:

    const schema = Schema({ name: String, age: Number });
    // Creates a new schema with the same `name` path as `schema`,
    // but no `age` path.
    const newSchema = schema.pick(['name']);

    newSchema.path('name'); // SchemaString { ... }
    newSchema.path('age'); // undefined

## `Schema.prototype.plugin()`

### Parameters

- `plugin` \<Function\> The Plugin's callback
- `[opts]` \<object\> Options to pass to the plugin
- `[opts.deduplicate=false]` \<boolean\> If true, ignore duplicate plugins (same `fn` argument using `===`)

### See

- [plugins](https://mongoosejs.com/docs/plugins.html)

Registers a plugin for this schema.

#### Example:

    const s = new Schema({ name: String });
    s.plugin(schema => console.log(schema.path('name').path));
    mongoose.model('Test', s); // Prints 'name'

Or with Options:

    const s = new Schema({ name: String });
    s.plugin((schema, opts) => console.log(opts.text, schema.path('name').path), { text: "Schema Path Name:" });
    mongoose.model('Test', s); // Prints 'Schema Path Name: name'

## `Schema.prototype.post()`

### Parameters

- `methodName` \<string|RegExp|Array[string]\> The method name or regular expression to match method name
- `[options]` \<object\>
- `[options.document]` \<boolean\> If `name` is a hook for both document and query middleware, set to `true` to run on document middleware.
- `[options.query]` \<boolean\> If `name` is a hook for both document and query middleware, set to `true` to run on query middleware.
- `fn` \<Function\> callback

### See

- [middleware](https://mongoosejs.com/docs/middleware.html)
- [kareem](https://npmjs.org/package/kareem)

Defines a post hook for the document

    const schema = new Schema(..);
    schema.post('save', function (doc) {
      console.log('this fired after a document was saved');
    });

    schema.post('find', function(docs) {
      console.log('this fired after you ran a find query');
    });

    schema.post(/Many$/, function(res) {
      console.log('this fired after you ran `updateMany()` or `deleteMany()`');
    });

    const Model = mongoose.model('Model', schema);

    const m = new Model(..);
    await m.save();
    console.log('this fires after the `post` hook');

    await m.find();
    console.log('this fires after the post find hook');

## `Schema.prototype.pre()`

### Parameters

- `methodName` \<string|RegExp|Array[string]\> The method name or regular expression to match method name
- `[options]` \<object\>
- `[options.document]` \<boolean\> If `name` is a hook for both document and query middleware, set to `true` to run on document middleware. For example, set `options.document` to `true` to apply this hook to `Document#deleteOne()` rather than `Query#deleteOne()`.
- `[options.query]` \<boolean\> If `name` is a hook for both document and query middleware, set to `true` to run on query middleware.
- `callback` \<Function\>

Defines a pre hook for the model.

#### Example:

    const toySchema = new Schema({ name: String, created: Date });

    toySchema.pre('save', function() {
      if (!this.created) this.created = new Date;
    });

    toySchema.pre('validate', function() {
      if (this.name !== 'Woody') this.name = 'Woody';
    });

    // Equivalent to calling `pre()` on `find`, `findOne`, `findOneAndUpdate`.
    toySchema.pre(/^find/, function() {
      console.log(this.getFilter());
    });

    // Equivalent to calling `pre()` on `updateOne`, `findOneAndUpdate`.
    toySchema.pre(['updateOne', 'findOneAndUpdate'], function() {
      console.log(this.getFilter());
    });

    toySchema.pre('deleteOne', function() {
      // Runs when you call `Toy.deleteOne()`
    });

    toySchema.pre('deleteOne', { document: true }, function() {
      // Runs when you call `doc.deleteOne()`
    });

## `Schema.prototype.queue()`

### Parameters

- `name` \<string\> name of the document method to call later
- `args` \<Array\> arguments to pass to the method

Adds a method call to the queue.

#### Example:

    schema.methods.print = function() { console.log(this); };
    schema.queue('print', []); // Print the doc every one is instantiated

    const Model = mongoose.model('Test', schema);
    new Model({ name: 'test' }); // Prints '{"_id": ..., "name": "test" }'

## `Schema.prototype.remove()`

### Parameters

- `path` \<string|Array\> The Path(s) to remove

### Returns

- \<Schema\> the Schema instance

Removes the given `path` (or [`paths`]).

#### Example:

    const schema = new Schema({ name: String, age: Number });
    schema.remove('name');
    schema.path('name'); // Undefined
    schema.path('age'); // SchemaNumber { ... }

Or as a Array:

    schema.remove(['name', 'age']);
    schema.path('name'); // Undefined
    schema.path('age'); // Undefined

## `Schema.prototype.removeIndex()`

### Parameters

- `index` \<object|string\> name or index specification

### Returns

- \<Schema\> the Schema instance

Remove an index by name or index specification.

removeIndex only removes indexes from your schema object. Does **not** affect the indexes
in MongoDB.

#### Example:

    const ToySchema = new Schema({ name: String, color: String, price: Number });

    // Add a new index on { name, color }
    ToySchema.index({ name: 1, color: 1 });

    // Remove index on { name, color }
    // Keep in mind that order matters! `removeIndex({ color: 1, name: 1 })` won't remove the index
    ToySchema.removeIndex({ name: 1, color: 1 });

    // Add an index with a custom name
    ToySchema.index({ color: 1 }, { name: 'my custom index name' });
    // Remove index by name
    ToySchema.removeIndex('my custom index name');

## `Schema.prototype.removeVirtual()`

### Parameters

- `path` \<string|Array\> The virutal path(s) to remove.

Removes the given virtual or virtuals from the schema.

## `Schema.prototype.requiredPaths()`

### Parameters

- `invalidate` \<boolean\> Refresh the cache

### Returns

- \<Array\>

Returns an Array of path strings that are required by this schema.

#### Example:

    const s = new Schema({
      name: { type: String, required: true },
      age: { type: String, required: true },
      notes: String
    });
    s.requiredPaths(); // [ 'age', 'name' ]

## `Schema.prototype.searchIndex()`

### Parameters

- `description` \<object\> index options, including `name` and `definition`
- `description.name` \<string\>
- `description.definition` \<object\>

### Returns

- \<Schema\> the Schema instance

Add an [Atlas search index](https://www.mongodb.com/docs/atlas/atlas-search/create-index/) that Mongoose will create using `Model.createSearchIndex()`.
This function only works when connected to MongoDB Atlas.

#### Example:

    const ToySchema = new Schema({ name: String, color: String, price: Number });
    ToySchema.searchIndex({ name: 'test', definition: { mappings: { dynamic: true } } });

## `Schema.prototype.set()`

### Parameters

- `key` \<string\> The name of the option to set the value to
- `[value]` \<object\> The value to set the option to, if not passed, the option will be reset to default
- `[tags]` \<Array[string]\> tags to add to read preference if key === 'read'

### See

- [Schema](https://mongoosejs.com/docs/api/schema.md#Schema())

Sets a schema option.

#### Example:

    schema.set('strict'); // 'true' by default
    schema.set('strict', false); // Sets 'strict' to false
    schema.set('strict'); // 'false'

## `Schema.prototype.static()`

### Parameters

- `name` \<string|object\> The Method Name for a single function, or an Object of "string-function" pairs.
- `[fn]` \<Function\> The Function in a single-function definition.

### See

- [Statics](https://mongoosejs.com/docs/guide.html#statics)

Adds static "class" methods to Models compiled from this schema.

#### Example:

    const schema = new Schema(..);
    // Equivalent to `schema.statics.findByName = function(name) {}`;
    schema.static('findByName', function(name) {
      return this.find({ name: name });
    });

    const Drink = mongoose.model('Drink', schema);
    await Drink.findByName('LaCroix');

If a hash of name/fn pairs is passed as the only argument, each name/fn pair will be added as methods.

    schema.static({
        findByName: function () {..}
      , findByCost: function () {..}
    });

    const Drink = mongoose.model('Drink', schema);
    await Drink.findByName('LaCroix');
    await Drink.findByCost(3);

If a hash of name/fn pairs is passed as the only argument, each name/fn pair will be added as statics.

## `Schema.prototype.toJSONSchema()`

### Parameters

- `[options]` \<object\>
- `[options.useBsonType=false]` \<boolean\> if true, specify each path's type using `bsonType` rather than `type` for MongoDB $jsonSchema support

Returns a JSON schema representation of this Schema.

By default, returns normal [JSON schema representation](https://json-schema.org/learn/getting-started-step-by-step), which is not typically what you want to use with
[MongoDB's `$jsonSchema` collection option](https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/).
Use the `useBsonType: true` option to return MongoDB `$jsonSchema` syntax instead.

In addition to types, `jsonSchema()` supports the following Mongoose validators:
- `enum` for strings and numbers

#### Example:
    const schema = new Schema({ name: String });
    // { required: ['_id'], properties: { name: { type: ['string', 'null'] }, _id: { type: 'string' } } }
    schema.toJSONSchema();

    // { required: ['_id'], properties: { name: { bsonType: ['string', 'null'] }, _id: { bsonType: 'objectId' } } }
    schema.toJSONSchema({ useBsonType: true });

## `Schema.prototype.virtual()`

### Parameters

- `name` \<string\> The name of the Virtual
- `[options]` \<object\>
- `[options.ref]` \<string|Model\> model name or model instance. Marks this as a [populate virtual](https://mongoosejs.com/docs/populate.html#populate-virtuals).
- `[options.localField]` \<string|Function\> Required for populate virtuals. See [populate virtual docs](https://mongoosejs.com/docs/populate.html#populate-virtuals) for more information.
- `[options.foreignField]` \<string|Function\> Required for populate virtuals. See [populate virtual docs](https://mongoosejs.com/docs/populate.html#populate-virtuals) for more information.
- `[options.justOne=false]` \<boolean|Function\> Only works with populate virtuals. If [truthy](https://masteringjs.io/tutorials/fundamentals/truthy), will be a single doc or `null`. Otherwise, the populate virtual will be an array.
- `[options.count=false]` \<boolean\> Only works with populate virtuals. If [truthy](https://masteringjs.io/tutorials/fundamentals/truthy), this populate virtual will contain the number of documents rather than the documents themselves when you `populate()`.
- `[options.get=null]` \<Function|null\> Adds a [getter](https://mongoosejs.com/docs/tutorials/getters-setters.html) to this virtual to transform the populated doc.
- `[options.match=null]` \<object|Function\> Apply a default [`match` option to populate](https://mongoosejs.com/docs/populate.html#match), adding an additional filter to the populate query.
- `[options.applyToArray=false]` \<boolean\> If true and the given `name` is a direct child of an array, apply the virtual to the array rather than the elements.

### Returns

- \<VirtualType\>

Creates a virtual type with the given name.

## `Schema.prototype.virtualpath()`

### Parameters

- `name` \<string\> The name of the Virtual to get

### Returns

- \<VirtualType,null\>

Returns the virtual type with the given `name`.

## `Schema.prototype.virtuals`

### Type

- \<property\>

Object containing all virtuals defined on this schema.
The objects' keys are the virtual paths and values are instances of `VirtualType`.

This property is typically only useful for plugin authors and advanced users.
You do not need to interact with this property at all to use mongoose.

#### Example:

    const schema = new Schema({});
    schema.virtual('answer').get(() => 42);

    console.log(schema.virtuals); // { answer: VirtualType { path: 'answer', ... } }
    console.log(schema.virtuals['answer'].getters[0].call()); // 42

## `Schema.reserved`

### Type

- \<property\>

Reserved document keys.

Keys in this object are names that are warned in schema declarations
because they have the potential to break Mongoose/ Mongoose plugins functionality. If you create a schema
using `new Schema()` with one of these property names, Mongoose will log a warning.

- _posts
- _pres
- collection
- emit
- errors
- get
- init
- isModified
- isNew
- listeners
- modelName
- on
- once
- populated
- prototype
- remove
- removeListener
- save
- schema
- toObject
- validate

_NOTE:_ Use of these terms as method names is permitted, but play at your own risk, as they may be existing mongoose document methods you are stomping on.

     const schema = new Schema(..);
     schema.methods.init = function () {} // potentially breaking

## `buildNestedPath()`

### Parameters

- `path` \<Array[string]\> array of path components
- `object` \<object\> the object in which to build a JSON schema of `path`'s properties
- `value` \<object\> the value to associate with the path in object

`schemaMap`s are JSON schemas, which use the following structure to represent objects:
   { field: { bsonType: 'object', properties: { ... } } }

for example, a schema that looks like this `{ a: { b: int32 } }` would be encoded as
`{ a: { bsonType: 'object', properties: { b: < encryption configuration > } } }`

This function takes an array of path segments, an output object (that gets mutated) and
a value to be associated with the full path, and constructs a valid CSFLE JSON schema path for
the object.  This works for deeply nested properties as well.
