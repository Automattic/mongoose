# Mongoose

- [`Mongoose()`](#Mongoose())
- [`Mongoose.prototype.Aggregate()`](#Mongoose.prototype.Aggregate())
- [`Mongoose.prototype.CastError()`](#Mongoose.prototype.CastError())
- [`Mongoose.prototype.Collection()`](#Mongoose.prototype.Collection())
- [`Mongoose.prototype.Collection()`](#Mongoose.prototype.Collection())
- [`Mongoose.prototype.Connection()`](#Mongoose.prototype.Connection())
- [`Mongoose.prototype.Connection()`](#Mongoose.prototype.Connection())
- [`Mongoose.prototype.ConnectionStates`](#Mongoose.prototype.ConnectionStates)
- [`Mongoose.prototype.Date`](#Mongoose.prototype.Date)
- [`Mongoose.prototype.Decimal128`](#Mongoose.prototype.Decimal128)
- [`Mongoose.prototype.Document()`](#Mongoose.prototype.Document())
- [`Mongoose.prototype.Error()`](#Mongoose.prototype.Error())
- [`Mongoose.prototype.Mixed`](#Mongoose.prototype.Mixed)
- [`Mongoose.prototype.Model()`](#Mongoose.prototype.Model())
- [`Mongoose.prototype.Mongoose()`](#Mongoose.prototype.Mongoose())
- [`Mongoose.prototype.Number`](#Mongoose.prototype.Number)
- [`Mongoose.prototype.ObjectId`](#Mongoose.prototype.ObjectId)
- [`Mongoose.prototype.Query()`](#Mongoose.prototype.Query())
- [`Mongoose.prototype.STATES`](#Mongoose.prototype.STATES)
- [`Mongoose.prototype.Schema()`](#Mongoose.prototype.Schema())
- [`Mongoose.prototype.SchemaType()`](#Mongoose.prototype.SchemaType())
- [`Mongoose.prototype.SchemaTypeOptions()`](#Mongoose.prototype.SchemaTypeOptions())
- [`Mongoose.prototype.SchemaTypes`](#Mongoose.prototype.SchemaTypes)
- [`Mongoose.prototype.Types`](#Mongoose.prototype.Types)
- [`Mongoose.prototype.VirtualType()`](#Mongoose.prototype.VirtualType())
- [`Mongoose.prototype.connect()`](#Mongoose.prototype.connect())
- [`Mongoose.prototype.connection`](#Mongoose.prototype.connection)
- [`Mongoose.prototype.connections`](#Mongoose.prototype.connections)
- [`Mongoose.prototype.createConnection()`](#Mongoose.prototype.createConnection())
- [`Mongoose.prototype.deleteModel()`](#Mongoose.prototype.deleteModel())
- [`Mongoose.prototype.disconnect()`](#Mongoose.prototype.disconnect())
- [`Mongoose.prototype.driver`](#Mongoose.prototype.driver)
- [`Mongoose.prototype.get()`](#Mongoose.prototype.get())
- [`Mongoose.prototype.isObjectIdOrHexString()`](#Mongoose.prototype.isObjectIdOrHexString())
- [`Mongoose.prototype.isValidObjectId()`](#Mongoose.prototype.isValidObjectId())
- [`Mongoose.prototype.model()`](#Mongoose.prototype.model())
- [`Mongoose.prototype.modelNames()`](#Mongoose.prototype.modelNames())
- [`Mongoose.prototype.mquery`](#Mongoose.prototype.mquery)
- [`Mongoose.prototype.now()`](#Mongoose.prototype.now())
- [`Mongoose.prototype.omitUndefined()`](#Mongoose.prototype.omitUndefined())
- [`Mongoose.prototype.overwriteMiddlewareArguments()`](#Mongoose.prototype.overwriteMiddlewareArguments())
- [`Mongoose.prototype.overwriteMiddlewareResult()`](#Mongoose.prototype.overwriteMiddlewareResult())
- [`Mongoose.prototype.plugin()`](#Mongoose.prototype.plugin())
- [`Mongoose.prototype.pluralize()`](#Mongoose.prototype.pluralize())
- [`Mongoose.prototype.sanitizeFilter()`](#Mongoose.prototype.sanitizeFilter())
- [`Mongoose.prototype.set()`](#Mongoose.prototype.set())
- [`Mongoose.prototype.setDriver()`](#Mongoose.prototype.setDriver())
- [`Mongoose.prototype.skipMiddlewareFunction()`](#Mongoose.prototype.skipMiddlewareFunction())
- [`Mongoose.prototype.startSession()`](#Mongoose.prototype.startSession())
- [`Mongoose.prototype.syncIndexes()`](#Mongoose.prototype.syncIndexes())
- [`Mongoose.prototype.trusted()`](#Mongoose.prototype.trusted())
- [`Mongoose.prototype.version`](#Mongoose.prototype.version)

## `Mongoose()`

### Parameters

- `options` \<object\> see [`Mongoose#set()` docs](https://mongoosejs.com/docs/api/mongoose.md#Mongoose.prototype.set())

Mongoose constructor.

The exports object of the `mongoose` module is an instance of this class.
Most apps will only use this one instance.

#### Example:

    const mongoose = require('mongoose');
    mongoose instanceof mongoose.Mongoose; // true

    // Create a new Mongoose instance with its own `connect()`, `set()`, `model()`, etc.
    const m = new mongoose.Mongoose();

## `Mongoose.prototype.Aggregate()`

The Mongoose Aggregate constructor

## `Mongoose.prototype.CastError()`

### Parameters

- `type` \<string\> The name of the type
- `value` \<any\> The value that failed to cast
- `path` \<string\> The path `a.b.c` in the doc where this cast error occurred
- `[reason]` \<Error\> The original error that was thrown

The Mongoose CastError constructor

## `Mongoose.prototype.Collection()`

The Base Mongoose Collection class. `mongoose.Collection` extends from this class.

## `Mongoose.prototype.Collection()`

The Mongoose Collection constructor

## `Mongoose.prototype.Connection()`

The Mongoose [Connection](https://mongoosejs.com/docs/api/connection.md#Connection()) constructor

## `Mongoose.prototype.Connection()`

The Base Mongoose Connection class. `mongoose.Connection` extends from this class.

## `Mongoose.prototype.ConnectionStates`

### Type

- \<property\>

Expose connection states for user-land

## `Mongoose.prototype.Date`

### Type

- \<property\>

The Mongoose Date [SchemaType](https://mongoosejs.com/docs/schematypes.html).

#### Example:

    const schema = new Schema({ test: Date });
    schema.path('test') instanceof mongoose.Date; // true

## `Mongoose.prototype.Decimal128`

### Type

- \<property\>

The Mongoose Decimal128 [SchemaType](https://mongoosejs.com/docs/schematypes.html). Used for
declaring paths in your schema that should be
[128-bit decimal floating points](https://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-decimal.html).
Do not use this to create a new Decimal128 instance, use `mongoose.Types.Decimal128`
instead.

#### Example:

    const vehicleSchema = new Schema({ fuelLevel: mongoose.Decimal128 });

## `Mongoose.prototype.Document()`

The Mongoose [Document](https://mongoosejs.com/docs/api/document.md#Document()) constructor.

## `Mongoose.prototype.Error()`

The [MongooseError](https://mongoosejs.com/docs/api/error.md#Error()) constructor.

## `Mongoose.prototype.Mixed`

### Type

- \<property\>

The Mongoose Mixed [SchemaType](https://mongoosejs.com/docs/schematypes.html). Used for
declaring paths in your schema that Mongoose's change tracking, casting,
and validation should ignore.

#### Example:

    const schema = new Schema({ arbitrary: mongoose.Mixed });

## `Mongoose.prototype.Model()`

The Mongoose [Model](https://mongoosejs.com/docs/api/model.md#Model()) constructor.

## `Mongoose.prototype.Mongoose()`

The Mongoose constructor

The exports of the mongoose module is an instance of this class.

#### Example:

    const mongoose = require('mongoose');
    const mongoose2 = new mongoose.Mongoose();

## `Mongoose.prototype.Number`

### Type

- \<property\>

The Mongoose Number [SchemaType](https://mongoosejs.com/docs/schematypes.html). Used for
declaring paths in your schema that Mongoose should cast to numbers.

#### Example:

    const schema = new Schema({ num: mongoose.Number });
    // Equivalent to:
    const schema = new Schema({ num: 'number' });

## `Mongoose.prototype.ObjectId`

### Type

- \<property\>

The Mongoose ObjectId [SchemaType](https://mongoosejs.com/docs/schematypes.html). Used for
declaring paths in your schema that should be
[MongoDB ObjectIds](https://www.mongodb.com/docs/manual/reference/method/ObjectId/).
Do not use this to create a new ObjectId instance, use `mongoose.Types.ObjectId`
instead.

#### Example:

    const childSchema = new Schema({ parentId: mongoose.ObjectId });

## `Mongoose.prototype.Query()`

The Mongoose [Query](https://mongoosejs.com/docs/api/query.md#Query()) constructor.

## `Mongoose.prototype.STATES`

### Type

- \<property\>

Expose connection states for user-land

## `Mongoose.prototype.Schema()`

The Mongoose [Schema](https://mongoosejs.com/docs/api/schema.md#Schema()) constructor

#### Example:

    const mongoose = require('mongoose');
    const Schema = mongoose.Schema;
    const CatSchema = new Schema(..);

## `Mongoose.prototype.SchemaType()`

The Mongoose [SchemaType](https://mongoosejs.com/docs/api/schematype.md#SchemaType()) constructor

## `Mongoose.prototype.SchemaTypeOptions()`

The constructor used for schematype options

## `Mongoose.prototype.SchemaTypes`

### Type

- \<property\>

### See

- [Schema.SchemaTypes](https://mongoosejs.com/docs/schematypes.html)

The various Mongoose SchemaTypes.

#### Note:

_Alias of mongoose.Schema.Types for backwards compatibility._

## `Mongoose.prototype.Types`

### Type

- \<property\>

The various Mongoose Types.

#### Example:

    const mongoose = require('mongoose');
    const array = mongoose.Types.Array;

#### Types:

- [Array](https://mongoosejs.com/docs/schematypes.html#arrays)
- [Buffer](https://mongoosejs.com/docs/schematypes.html#buffers)
- [Embedded](https://mongoosejs.com/docs/schematypes.html#schemas)
- [DocumentArray](https://mongoosejs.com/docs/api/documentarray.md)
- [Decimal128](https://mongoosejs.com/docs/api/mongoose.md#Mongoose.prototype.Decimal128)
- [ObjectId](https://mongoosejs.com/docs/schematypes.html#objectids)
- [Map](https://mongoosejs.com/docs/schematypes.html#maps)
- [Subdocument](https://mongoosejs.com/docs/schematypes.html#schemas)
- [Int32](https://mongoosejs.com/docs/schematypes.html#int32)

Using this exposed access to the `ObjectId` type, we can construct ids on demand.

    const ObjectId = mongoose.Types.ObjectId;
    const id1 = new ObjectId;

## `Mongoose.prototype.VirtualType()`

The Mongoose [VirtualType](https://mongoosejs.com/docs/api/virtualtype.md#VirtualType()) constructor

## `Mongoose.prototype.connect()`

### Parameters

- `uri` \<string\> mongodb URI to connect to
- `[options]` \<object\> passed down to the [MongoDB driver's `connect()` function](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/MongoClientOptions.html), except for 4 mongoose-specific options explained below.
- `[options.bufferCommands=true]` \<boolean\> Mongoose specific option. Set to false to [disable buffering](https://mongoosejs.com/docs/faq.html#callback_never_executes) on all models associated with this connection.
- `[options.bufferTimeoutMS=10000]` \<number\> Mongoose specific option. If `bufferCommands` is true, Mongoose will throw an error after `bufferTimeoutMS` if the operation is still buffered.
- `[options.dbName]` \<string\> The name of the database we want to use. If not provided, use database name from connection string.
- `[options.user]` \<string\> username for authentication, equivalent to `options.auth.username`. Maintained for backwards compatibility.
- `[options.pass]` \<string\> password for authentication, equivalent to `options.auth.password`. Maintained for backwards compatibility.
- `[options.maxPoolSize=100]` \<number\> The maximum number of sockets the MongoDB driver will keep open for this connection. Keep in mind that MongoDB only allows one operation per socket at a time, so you may want to increase this if you find you have a few slow queries that are blocking faster queries from proceeding. See [Slow Trains in MongoDB and Node.js](https://thecodebarbarian.com/slow-trains-in-mongodb-and-nodejs).
- `[options.minPoolSize=0]` \<number\> The minimum number of sockets the MongoDB driver will keep open for this connection.
- `[options.serverSelectionTimeoutMS]` \<number\> If `useUnifiedTopology = true`, the MongoDB driver will try to find a server to send any given operation to, and keep retrying for `serverSelectionTimeoutMS` milliseconds before erroring out. If not set, the MongoDB driver defaults to using `30000` (30 seconds).
- `[options.heartbeatFrequencyMS]` \<number\> If `useUnifiedTopology = true`, the MongoDB driver sends a heartbeat every `heartbeatFrequencyMS` to check on the status of the connection. A heartbeat is subject to `serverSelectionTimeoutMS`, so the MongoDB driver will retry failed heartbeats for up to 30 seconds by default. Mongoose only emits a `'disconnected'` event after a heartbeat has failed, so you may want to decrease this setting to reduce the time between when your server goes down and when Mongoose emits `'disconnected'`. We recommend you do **not** set this setting below 1000, too many heartbeats can lead to performance degradation.
- `[options.autoIndex=true]` \<boolean\> Mongoose-specific option. Set to false to disable automatic index creation for all models associated with this connection.
- `[options.socketTimeoutMS=0]` \<number\> How long the MongoDB driver will wait before killing a socket due to inactivity _after initial connection_. A socket may be inactive because of either no activity or a long-running operation. `socketTimeoutMS` defaults to 0, which means Node.js will not time out the socket due to inactivity. This option is passed to [Node.js `socket#setTimeout()` function](https://nodejs.org/api/net.html#net_socket_settimeout_timeout_callback) after the MongoDB driver successfully completes.
- `[options.family=0]` \<number\> Passed transparently to [Node.js' `dns.lookup()`](https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback) function. May be either `0`, `4`, or `6`. `4` means use IPv4 only, `6` means use IPv6 only, `0` means try both.
- `[options.autoCreate=false]` \<boolean\> Set to `true` to make Mongoose automatically call `createCollection()` on every model created on this connection.

### Returns

- \<Promise\> resolves to `this` if connection succeeded

### See

- [Mongoose#createConnection](https://mongoosejs.com/docs/api/mongoose.md#Mongoose.prototype.createConnection())

Opens the default mongoose connection.

#### Example:

    mongoose.connect('mongodb://user:pass@127.0.0.1:port/database');

    // replica sets
    const uri = 'mongodb://user:pass@127.0.0.1:port,anotherhost:port,yetanother:port/mydatabase';
    mongoose.connect(uri);

    // with options
    mongoose.connect(uri, options);

    // Using `await` throws "MongooseServerSelectionError: Server selection timed out after 30000 ms"
    // if Mongoose can't connect.
    const uri = 'mongodb://nonexistent.domain:27000';
    await mongoose.connect(uri);

## `Mongoose.prototype.connection`

### Type

- \<Connection\>

The Mongoose module's default connection. Equivalent to `mongoose.connections[0]`, see [`connections`](https://mongoosejs.com/docs/api/mongoose.md#Mongoose.prototype.connections).

#### Example:

    const mongoose = require('mongoose');
    mongoose.connect(...);
    mongoose.connection.on('error', cb);

This is the connection used by default for every model created using [mongoose.model](https://mongoosejs.com/docs/api/mongoose.md#Mongoose.prototype.model()).

To create a new connection, use [`createConnection()`](https://mongoosejs.com/docs/api/mongoose.md#Mongoose.prototype.createConnection()).

## `Mongoose.prototype.connections`

### Type

- \<Array\>

An array containing all [connections](connection.html) associated with this
Mongoose instance. By default, there is 1 connection. Calling
[`createConnection()`](https://mongoosejs.com/docs/api/mongoose.md#Mongoose.prototype.createConnection()) adds a connection
to this array.

#### Example:

    const mongoose = require('mongoose');
    mongoose.connections.length; // 1, just the default connection
    mongoose.connections[0] === mongoose.connection; // true

    mongoose.createConnection('mongodb://127.0.0.1:27017/test');
    mongoose.connections.length; // 2

## `Mongoose.prototype.createConnection()`

### Parameters

- `uri` \<string\> mongodb URI to connect to
- `[options]` \<object\> passed down to the [MongoDB driver's `connect()` function](https://mongodb.github.io/node-mongodb-native/7.0/interfaces/MongoClientOptions.html), except for 4 mongoose-specific options explained below.
- `[options.bufferCommands=true]` \<boolean\> Mongoose specific option. Set to false to [disable buffering](https://mongoosejs.com/docs/faq.html#callback_never_executes) on all models associated with this connection.
- `[options.dbName]` \<string\> The name of the database you want to use. If not provided, Mongoose uses the database name from connection string.
- `[options.user]` \<string\> username for authentication, equivalent to `options.auth.username`. Maintained for backwards compatibility.
- `[options.pass]` \<string\> password for authentication, equivalent to `options.auth.password`. Maintained for backwards compatibility.
- `[options.autoIndex=true]` \<boolean\> Mongoose-specific option. Set to false to disable automatic index creation for all models associated with this connection.
- `[options.maxPoolSize=100]` \<number\> The maximum number of sockets the MongoDB driver will keep open for this connection. Keep in mind that MongoDB only allows one operation per socket at a time, so you may want to increase this if you find you have a few slow queries that are blocking faster queries from proceeding. See [Slow Trains in MongoDB and Node.js](https://thecodebarbarian.com/slow-trains-in-mongodb-and-nodejs).
- `[options.minPoolSize=0]` \<number\> The minimum number of sockets the MongoDB driver will keep open for this connection. Keep in mind that MongoDB only allows one operation per socket at a time, so you may want to increase this if you find you have a few slow queries that are blocking faster queries from proceeding. See [Slow Trains in MongoDB and Node.js](https://thecodebarbarian.com/slow-trains-in-mongodb-and-nodejs).
- `[options.socketTimeoutMS=0]` \<number\> How long the MongoDB driver will wait before killing a socket due to inactivity _after initial connection_. Defaults to 0, which means Node.js will not time out the socket due to inactivity. A socket may be inactive because of either no activity or a long-running operation. This option is passed to [Node.js `socket#setTimeout()` function](https://nodejs.org/api/net.html#net_socket_settimeout_timeout_callback) after the MongoDB driver successfully completes.
- `[options.family=0]` \<number\> Passed transparently to [Node.js' `dns.lookup()`](https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback) function. May be either `0`, `4`, or `6`. `4` means use IPv4 only, `6` means use IPv6 only, `0` means try both.

### Returns

- \<Connection\> the created Connection object. Connections are not thenable, so you can't do `await mongoose.createConnection()`. To await use `mongoose.createConnection(uri).asPromise()` instead.

Creates a Connection instance.

Each `connection` instance maps to a single database. This method is helpful when managing multiple db connections.


_Options passed take precedence over options included in connection strings._

#### Example:

    // with mongodb:// URI
    db = mongoose.createConnection('mongodb://user:pass@127.0.0.1:port/database');

    // and options
    const opts = { db: { native_parser: true }}
    db = mongoose.createConnection('mongodb://user:pass@127.0.0.1:port/database', opts);

    // replica sets
    db = mongoose.createConnection('mongodb://user:pass@127.0.0.1:port,anotherhost:port,yetanother:port/database');

    // and options
    const opts = { replset: { strategy: 'ping', rs_name: 'testSet' }}
    db = mongoose.createConnection('mongodb://user:pass@127.0.0.1:port,anotherhost:port,yetanother:port/database', opts);

    // initialize now, connect later
    db = mongoose.createConnection();
    await db.openUri('mongodb://127.0.0.1:27017/database');

## `Mongoose.prototype.deleteModel()`

### Parameters

- `name` \<string|RegExp\> if string, the name of the model to remove. If regexp, removes all models whose name matches the regexp.

### Returns

- \<Mongoose\> this

Removes the model named `name` from the default connection, if it exists.
You can use this function to clean up any models you created in your tests to
prevent OverwriteModelErrors.

Equivalent to `mongoose.connection.deleteModel(name)`.

#### Example:

    mongoose.model('User', new Schema({ name: String }));
    console.log(mongoose.model('User')); // Model object
    mongoose.deleteModel('User');
    console.log(mongoose.model('User')); // undefined

    // Usually useful in a Mocha `afterEach()` hook
    afterEach(function() {
      mongoose.deleteModel(/.+/); // Delete every model
    });

## `Mongoose.prototype.disconnect()`

### Returns

- \<Promise\> resolves when all connections are closed, or rejects with the first error that occurred.

Runs `.close()` on all connections in parallel.

## `Mongoose.prototype.driver`

Deprecated.

### Type

- \<property\>

Object with `get()` and `set()` containing the underlying driver this Mongoose instance
uses to communicate with the database. A driver is a Mongoose-specific interface that defines functions
like `find()`.

## `Mongoose.prototype.get()`

### Parameters

- `key` \<string\>

Gets mongoose options

#### Example:

    mongoose.get('test') // returns the 'test' value

## `Mongoose.prototype.isObjectIdOrHexString()`

### Parameters

- `v` \<any\>

Returns true if the given value is a Mongoose ObjectId (using `instanceof`) or if the
given value is a 24 character hex string, which is the most commonly used string representation
of an ObjectId.

This function is similar to `isValidObjectId()`, but considerably more strict, because
`isValidObjectId()` will return `true` for _any_ value that Mongoose can convert to an
ObjectId. That includes Mongoose documents, any string of length 12, and any number.
`isObjectIdOrHexString()` returns true only for `ObjectId` instances or 24 character hex
strings, and will return false for numbers, documents, and strings of length 12.

#### Example:

    mongoose.isObjectIdOrHexString(new mongoose.Types.ObjectId()); // true
    mongoose.isObjectIdOrHexString('62261a65d66c6be0a63c051f'); // true

    mongoose.isObjectIdOrHexString('0123456789ab'); // false
    mongoose.isObjectIdOrHexString(6); // false
    mongoose.isObjectIdOrHexString(new User({ name: 'test' })); // false
    mongoose.isObjectIdOrHexString({ test: 42 }); // false

## `Mongoose.prototype.isValidObjectId()`

### Parameters

- `v` \<any\>

Returns true if Mongoose can cast the given value to an ObjectId, or
false otherwise.

#### Example:

    mongoose.isValidObjectId(new mongoose.Types.ObjectId()); // true
    mongoose.isValidObjectId('0123456789ab'); // true
    mongoose.isValidObjectId(6); // true
    mongoose.isValidObjectId(new User({ name: 'test' })); // true

    mongoose.isValidObjectId({ test: 42 }); // false

## `Mongoose.prototype.model()`

### Parameters

- `name` \<string|Function\> model name or class extending Model
- `[schema]` \<Schema\> the schema to use.
- `[collection]` \<string\> name (optional, inferred from model name)
- `[options]` \<object\>
- `[options.overwriteModels=false]` \<boolean\> If true, overwrite existing models with the same name to avoid `OverwriteModelError`

### Returns

- \<Model\> The model associated with `name`. Mongoose will create the model if it doesn't already exist.

Defines a model or retrieves it.

Models defined on the `mongoose` instance are available to all connection
created by the same `mongoose` instance.

If you call `mongoose.model()` with twice the same name but a different schema,
you will get an `OverwriteModelError`. If you call `mongoose.model()` with
the same name and same schema, you'll get the same schema back.

#### Example:

    const mongoose = require('mongoose');

    // define an Actor model with this mongoose instance
    const schema = new Schema({ name: String });
    mongoose.model('Actor', schema);

    // create a new connection
    const conn = mongoose.createConnection(..);

    // create Actor model
    const Actor = conn.model('Actor', schema);
    conn.model('Actor') === Actor; // true
    conn.model('Actor', schema) === Actor; // true, same schema
    conn.model('Actor', schema, 'actors') === Actor; // true, same schema and collection name

    // This throws an `OverwriteModelError` because the schema is different.
    conn.model('Actor', new Schema({ name: String }));

_When no `collection` argument is passed, Mongoose uses the model name. If you don't like this behavior, either pass a collection name, use `mongoose.pluralize()`, or set your schemas collection name option._

#### Example:

    const schema = new Schema({ name: String }, { collection: 'actor' });

    // or

    schema.set('collection', 'actor');

    // or

    const collectionName = 'actor';
    const M = mongoose.model('Actor', schema, collectionName);

## `Mongoose.prototype.modelNames()`

### Returns

- \<Array\>

Returns an array of model names created on this instance of Mongoose.

#### Note:

_Does not include names of models created using `connection.model()`._

## `Mongoose.prototype.mquery`

### Type

- \<property\>

The [mquery](https://github.com/aheckmann/mquery) query builder Mongoose uses.

## `Mongoose.prototype.now()`

Mongoose uses this function to get the current time when setting
[timestamps](https://mongoosejs.com/docs/guide.html#timestamps). You may stub out this function
using a tool like [Sinon](https://www.npmjs.com/package/sinon) for testing.

## `Mongoose.prototype.omitUndefined()`

### Parameters

- `[val]` \<object\> the object to remove undefined keys from

Takes in an object and deletes any keys from the object whose values
are strictly equal to `undefined`.
This function is useful for query filters because Mongoose treats
`TestModel.find({ name: undefined })` as `TestModel.find({ name: null })`.

#### Example:

    const filter = { name: 'John', age: undefined, status: 'active' };
    mongoose.omitUndefined(filter); // { name: 'John', status: 'active' }
    filter; // { name: 'John', status: 'active' }

    await UserModel.findOne(mongoose.omitUndefined(filter));

## `Mongoose.prototype.overwriteMiddlewareArguments()`

### Parameters

- `...args` \<any\> The new arguments to be passed to the next middleware. Pass multiple arguments as a spread, **not** as an array.

Use this function in `pre()` middleware to replace the arguments passed to the next middleware or hook.

#### Example:

    // Suppose you have a schema for time in "HH:MM" string format, but you want to store it as an object { hours, minutes }
    const timeStringToObject = (time) => {
      if (typeof time !== 'string') return time;
      const [hours, minutes] = time.split(':');
      return { hours: parseInt(hours), minutes: parseInt(minutes) };
    };

    const timeSchema = new Schema({
      hours: { type: Number, required: true },
      minutes: { type: Number, required: true },
    });

    // In a pre('init') hook, replace raw string doc with custom object form
    timeSchema.pre('init', function(doc) {
      if (typeof doc === 'string') {
        return mongoose.overwriteMiddlewareArguments(timeStringToObject(doc));
      }
    });

    // Now, initializing with a time string gets auto-converted by the hook
    const userSchema = new Schema({ time: timeSchema });
    const User = mongoose.model('User', userSchema);
    const doc = new User({});
    doc.$init({ time: '12:30' });

## `Mongoose.prototype.overwriteMiddlewareResult()`

### Parameters

- `result` \<any\>

Use this function in `post()` middleware to replace the result

#### Example:

    schema.post('find', function(res) {
      // Normally you have to modify `res` in place. But with
      // `overwriteMiddlewarResult()`, you can make `find()` return a
      // completely different value.
      return mongoose.overwriteMiddlewareResult(res.filter(doc => !doc.isDeleted));
    });

## `Mongoose.prototype.plugin()`

### Parameters

- `fn` \<Function\> plugin callback
- `[opts]` \<object\> optional options

### Returns

- \<Mongoose\> this

### See

- [plugins](https://mongoosejs.com/docs/plugins.html)

Declares a global plugin executed on all Schemas.

Equivalent to calling `.plugin(fn)` on each Schema you create.

## `Mongoose.prototype.pluralize()`

### Parameters

- `[fn]` \<Function|null\> overwrites the function used to pluralize collection names

### Returns

- \<Function,null\> the current function used to pluralize collection names, defaults to the legacy function from `mongoose-legacy-pluralize`.

Getter/setter around function for pluralizing collection names.

## `Mongoose.prototype.sanitizeFilter()`

### Parameters

- `filter` \<object\>

Sanitizes query filters against [query selector injection attacks](https://thecodebarbarian.com/2014/09/04/defending-against-query-selector-injection-attacks.html)
by wrapping any nested objects that have a property whose name starts with `$` in a `$eq`.

```javascript
const obj = { username: 'val', pwd: { $ne: null } };
sanitizeFilter(obj);
obj; // { username: 'val', pwd: { $eq: { $ne: null } } });
```

## `Mongoose.prototype.set()`

### Parameters

- `key` \<string|object\> The name of the option or an object of multiple key-value pairs
- `value` \<string|Function|boolean\> The value of the option, unused if "key" is an object

Sets mongoose options

`key` can be used as an object to set multiple options at once.
If an error gets thrown for one option, other options will still be evaluated.

#### Example:

    mongoose.set('test', value) // sets the 'test' option to `value`

    mongoose.set('debug', true) // enable logging collection methods + arguments to the console/file

    mongoose.set('debug', function(collectionName, methodName, ...methodArgs) {}); // use custom function to log collection methods + arguments

    mongoose.set({ debug: true, autoIndex: false }); // set multiple options at once

Currently supported options are:
- `allowDiskUse`: Set to `true` to set `allowDiskUse` to true to all aggregation operations by default.
- `applyPluginsToChildSchemas`: `true` by default. Set to false to skip applying global plugins to child schemas
- `applyPluginsToDiscriminators`: `false` by default. Set to true to apply global plugins to discriminator schemas. This typically isn't necessary because plugins are applied to the base schema and discriminators copy all middleware, methods, statics, and properties from the base schema.
- `autoCreate`: Set to `true` to make Mongoose call [`Model.createCollection()`](https://mongoosejs.com/docs/api/model.md#Model.createCollection()) automatically when you create a model with `mongoose.model()` or `conn.model()`. This is useful for testing transactions, change streams, and other features that require the collection to exist.
- `autoIndex`: `true` by default. Set to false to disable automatic index creation for all models associated with this Mongoose instance.
- `bufferCommands`: enable/disable mongoose's buffering mechanism for all connections and models
- `bufferTimeoutMS`: If bufferCommands is on, this option sets the maximum amount of time Mongoose buffering will wait before throwing an error. If not specified, Mongoose will use 10000 (10 seconds).
- `cloneSchemas`: `false` by default. Set to `true` to `clone()` all schemas before compiling into a model.
- `debug`: If `true`, prints the operations mongoose sends to MongoDB to the console. If an object is passed, you can set `color`, `shell`, and `timestamp` options. If `timestamp` is `true`, Mongoose prefixes console debug output with an ISO timestamp in brackets. If a writable stream is passed, it will log to that stream, without colorization. If a callback function is passed, it will receive the collection name, the method name, then all arguments passed to the method. For example, if you wanted to replicate the default logging, you could output from the callback `Mongoose: ${collectionName}.${methodName}(${methodArgs.join(', ')})`.
- `id`: If `true`, adds a `id` virtual to all schemas unless overwritten on a per-schema basis.
- `maxTimeMS`: If set, attaches [maxTimeMS](https://www.mongodb.com/docs/manual/reference/operator/meta/maxTimeMS/) to every query
- `objectIdGetter`: `true` by default. Mongoose adds a getter to MongoDB ObjectId's called `_id` that returns `this` for convenience with populate. Set this to false to remove the getter.
- `overwriteModels`: Set to `true` to default to overwriting models with the same name when calling `mongoose.model()`, as opposed to throwing an `OverwriteModelError`.
- `returnDocument`: Set to `'before'` or `'after'` to set the default value for the `returnDocument` option to `findOneAndUpdate()`, `findByIdAndUpdate()`, and `findOneAndReplace()`. Defaults to `'before'`, which returns the document before the update was applied. Read our [`findOneAndUpdate()` tutorial](https://mongoosejs.com/docs/tutorials/findoneandupdate.html) for more information.
- `returnOriginal`: **Deprecated.** Use `returnDocument` instead. If `false`, changes the default `returnOriginal` option to `findOneAndUpdate()`, `findByIdAndUpdate`, and `findOneAndReplace()` to false. This is equivalent to setting the `new` option to `true` for `findOneAndX()` calls by default. Read our [`findOneAndUpdate()` tutorial](https://mongoosejs.com/docs/tutorials/findoneandupdate.html) for more information.
- `runValidators`: `false` by default. Set to true to enable [update validators](https://mongoosejs.com/docs/validation.html#update-validators) for all validators by default.
- `sanitizeFilter`: `false` by default. Set to true to enable the [sanitization of the query filters](https://mongoosejs.com/docs/api/mongoose.md#Mongoose.prototype.sanitizeFilter()) against query selector injection attacks by wrapping any nested objects that have a property whose name starts with `$` in a `$eq`.
- `selectPopulatedPaths`: `true` by default. Set to false to opt out of Mongoose adding all fields that you `populate()` to your `select()`. The schema-level option `selectPopulatedPaths` overwrites this one.
- `strictQuery`: `false` by default. May be `false`, `true`, or `'throw'`. Sets the default [strictQuery](https://mongoosejs.com/docs/guide.html#strictQuery) mode for schemas.
- `strict`: `true` by default, may be `false`, `true`, or `'throw'`. Sets the default strict mode for schemas.
- `timestamps.createdAt.immutable`: `true` by default. If `false`, it will change the `createdAt` field to be [`immutable: false`](https://mongoosejs.com/docs/api/schematype.md#SchemaType.prototype.immutable) which means you can update the `createdAt`
- `toJSON`: `{ transform: true, flattenDecimals: true }` by default. Overwrites default objects to [`toJSON()`](https://mongoosejs.com/docs/api/document.md#Document.prototype.toJSON()), for determining how Mongoose documents get serialized by `JSON.stringify()`
- `toObject`: `{ transform: true, flattenDecimals: true }` by default. Overwrites default objects to [`toObject()`](https://mongoosejs.com/docs/api/document.md#Document.prototype.toObject())
- `transactionAsyncLocalStorage`: `false` by default. If `true`, Mongoose will automatically pass the `session` to any operation executing within a transaction executor function. See [transaction AsyncLocalStorage documentation](https://mongoosejs.com/docs/transactions.html#asynclocalstorage)
- `translateAliases`: `false` by default. If `true`, Mongoose will automatically translate aliases to their original paths before sending the query to MongoDB.
- `updatePipeline`: `false` by default. If `true`, allows passing update pipelines (arrays) to update operations by default without explicitly setting `updatePipeline: true` in each query.

## `Mongoose.prototype.setDriver()`

Overwrites the current driver used by this Mongoose instance. A driver is a
Mongoose-specific interface that defines functions like `find()`.

## `Mongoose.prototype.skipMiddlewareFunction()`

### Parameters

- `result` \<any\>

Use this function in `pre()` middleware to skip calling the wrapped function.

#### Example:

    schema.pre('save', function() {
      // Will skip executing `save()`, but will execute post hooks as if
      // `save()` had executed with the result `{ matchedCount: 0 }`
      return mongoose.skipMiddlewareFunction({ matchedCount: 0 });
    });

## `Mongoose.prototype.startSession()`

### Parameters

- `[options]` \<object\> see the [mongodb driver options](https://mongodb.github.io/node-mongodb-native/7.0/classes/MongoClient.html#startSession)
- `[options.causalConsistency=true]` \<boolean\> set to false to disable causal consistency

### Returns

- \<Promise<ClientSession>\> promise that resolves to a MongoDB driver `ClientSession`

_Requires MongoDB >= 3.6.0._ Starts a [MongoDB session](https://www.mongodb.com/docs/manual/release-notes/3.6/#client-sessions)
for benefits like causal consistency, [retryable writes](https://www.mongodb.com/docs/manual/core/retryable-writes/),
and [transactions](https://thecodebarbarian.com/a-node-js-perspective-on-mongodb-4-transactions.html).

Calling `mongoose.startSession()` is equivalent to calling `mongoose.connection.startSession()`.
Sessions are scoped to a connection, so calling `mongoose.startSession()`
starts a session on the [default mongoose connection](https://mongoosejs.com/docs/api/mongoose.md#Mongoose.prototype.connection).

## `Mongoose.prototype.syncIndexes()`

### Parameters

- `options` \<object\>
- `options.continueOnError` \<boolean\> `false` by default. If set to `true`, mongoose will not throw an error if one model syncing failed, and will return an object where the keys are the names of the models, and the values are the results/errors for each model.

### Returns

- \<Promise\> Returns a Promise, when the Promise resolves the value is a list of the dropped indexes.

Syncs all the indexes for the models registered with this connection.

## `Mongoose.prototype.trusted()`

### Parameters

- `obj` \<object\>

Tells `sanitizeFilter()` to skip the given object when filtering out potential [query selector injection attacks](https://thecodebarbarian.com/2014/09/04/defending-against-query-selector-injection-attacks.html).
Use this method when you have a known query selector that you want to use.

```javascript
const obj = { username: 'val', pwd: trusted({ $type: 'string', $eq: 'my secret' }) };
sanitizeFilter(obj);

// Note that `sanitizeFilter()` did not add `$eq` around `$type`.
obj; // { username: 'val', pwd: { $type: 'string', $eq: 'my secret' } });
```

## `Mongoose.prototype.version`

### Type

- \<property\>

The Mongoose version

#### Example:

    console.log(mongoose.version); // '5.x.x'
