# Connection

- [`Connection()`](#Connection())
- [`Connection.prototype.aggregate()`](#Connection.prototype.aggregate())
- [`Connection.prototype.asPromise()`](#Connection.prototype.asPromise())
- [`Connection.prototype.bulkWrite()`](#Connection.prototype.bulkWrite())
- [`Connection.prototype.client`](#Connection.prototype.client)
- [`Connection.prototype.close()`](#Connection.prototype.close())
- [`Connection.prototype.collection()`](#Connection.prototype.collection())
- [`Connection.prototype.collections`](#Connection.prototype.collections)
- [`Connection.prototype.config`](#Connection.prototype.config)
- [`Connection.prototype.createCollection()`](#Connection.prototype.createCollection())
- [`Connection.prototype.createCollections()`](#Connection.prototype.createCollections())
- [`Connection.prototype.db`](#Connection.prototype.db)
- [`Connection.prototype.deleteModel()`](#Connection.prototype.deleteModel())
- [`Connection.prototype.destroy()`](#Connection.prototype.destroy())
- [`Connection.prototype.dropCollection()`](#Connection.prototype.dropCollection())
- [`Connection.prototype.dropDatabase()`](#Connection.prototype.dropDatabase())
- [`Connection.prototype.get()`](#Connection.prototype.get())
- [`Connection.prototype.getClient()`](#Connection.prototype.getClient())
- [`Connection.prototype.host`](#Connection.prototype.host)
- [`Connection.prototype.id`](#Connection.prototype.id)
- [`Connection.prototype.listCollections()`](#Connection.prototype.listCollections())
- [`Connection.prototype.listDatabases()`](#Connection.prototype.listDatabases())
- [`Connection.prototype.model()`](#Connection.prototype.model())
- [`Connection.prototype.modelNames()`](#Connection.prototype.modelNames())
- [`Connection.prototype.models`](#Connection.prototype.models)
- [`Connection.prototype.name`](#Connection.prototype.name)
- [`Connection.prototype.on()`](#Connection.prototype.on())
- [`Connection.prototype.once()`](#Connection.prototype.once())
- [`Connection.prototype.openUri()`](#Connection.prototype.openUri())
- [`Connection.prototype.pass`](#Connection.prototype.pass)
- [`Connection.prototype.plugin()`](#Connection.prototype.plugin())
- [`Connection.prototype.plugins`](#Connection.prototype.plugins)
- [`Connection.prototype.port`](#Connection.prototype.port)
- [`Connection.prototype.readyState`](#Connection.prototype.readyState)
- [`Connection.prototype.removeDb()`](#Connection.prototype.removeDb())
- [`Connection.prototype.set()`](#Connection.prototype.set())
- [`Connection.prototype.setClient()`](#Connection.prototype.setClient())
- [`Connection.prototype.startSession()`](#Connection.prototype.startSession())
- [`Connection.prototype.syncIndexes()`](#Connection.prototype.syncIndexes())
- [`Connection.prototype.transaction()`](#Connection.prototype.transaction())
- [`Connection.prototype.useDb()`](#Connection.prototype.useDb())
- [`Connection.prototype.user`](#Connection.prototype.user)
- [`Connection.prototype.watch()`](#Connection.prototype.watch())
- [`Connection.prototype.withSession()`](#Connection.prototype.withSession())

## `Connection()`

### Parameters

- `base` \<Mongoose\> a mongoose instance

### Inherits

- [NodeJS EventEmitter](https://nodejs.org/api/events.html#class-eventemitter)

Connection constructor

For practical reasons, a Connection equals a Db.

## `Connection.prototype.aggregate()`

### Parameters

- `pipeline` \<Array\>
- `[options]` \<object\>
- `[options.cursor=false]` \<boolean\> If true, make the Aggregate resolve to a Mongoose AggregationCursor rather than an array

### Returns

- \<Aggregate\> Aggregation wrapper

Runs a [db-level aggregate()](https://www.mongodb.com/docs/manual/reference/method/db.aggregate/) on this connection's underlying `db`

## `Connection.prototype.asPromise()`

### Returns

- \<Promise\>

Returns a promise that resolves when this connection
successfully connects to MongoDB, or rejects if this connection failed
to connect.

#### Example:

    const conn = await mongoose.createConnection('mongodb://127.0.0.1:27017/test').
      asPromise();
    conn.readyState; // 1, means Mongoose is connected

## `Connection.prototype.bulkWrite()`

### Parameters

- `ops` \<Array\>
- `[options]` \<object\>
- `[options.ordered]` \<boolean\> If false, perform unordered operations. If true, perform ordered operations.
- `[options.session]` \<Session\> The session to use for the operation.

### Returns

- \<Promise\>

### See

- [MongoDB](https://www.mongodb.com/docs/manual/reference/command/bulkWrite/#mongodb-dbcommand-dbcmd.bulkWrite)

_Requires MongoDB Server 8.0 or greater_. Executes bulk write operations across multiple models in a single operation.
You must specify the `model` for each operation: Mongoose will use `model` for casting and validation, as well as
determining which collection to apply the operation to.

#### Example:
    const Test = mongoose.model('Test', new Schema({ name: String }));

    await db.bulkWrite([
      { model: Test, name: 'insertOne', document: { name: 'test1' } }, // Can specify model as a Model class...
      { model: 'Test', name: 'insertOne', document: { name: 'test2' } } // or as a model name
    ], { ordered: false });

## `Connection.prototype.client`

### Type

- \<property\>

The MongoClient instance this connection uses to talk to MongoDB. Mongoose automatically sets this property
when the connection is opened.

## `Connection.prototype.close()`

### Parameters

- `[force]` \<boolean\> optional

### Returns

- \<Promise\>

Closes the connection

## `Connection.prototype.collection()`

### Parameters

- `name` \<string\> of the collection
- `[options]` \<object\> optional collection options

### Returns

- \<Collection\> collection instance

Retrieves a raw collection instance, creating it if not cached.
This method returns a thin wrapper around a [MongoDB Node.js driver collection](https://mongodb.github.io/node-mongodb-native/Next/classes/Collection.html).
Using a Collection bypasses Mongoose middleware, validation, and casting,
letting you use [MongoDB Node.js driver](https://mongodb.github.io/node-mongodb-native/) functionality directly.

## `Connection.prototype.collections`

### Type

- \<property\>

A hash of the collections associated with this connection

## `Connection.prototype.config`

### Type

- \<property\>

A hash of the global options that are associated with this connection

## `Connection.prototype.createCollection()`

### Parameters

- `collection` \<string\> The collection to create
- `[options]` \<object\> see [MongoDB driver docs](https://mongodb.github.io/node-mongodb-native/7.0/classes/Db.html#createCollection)

### Returns

- \<Promise\>

Helper for `createCollection()`. Will explicitly create the given collection
with specified options. Used to create [capped collections](https://www.mongodb.com/docs/manual/core/capped-collections/)
and [views](https://www.mongodb.com/docs/manual/core/views/) from mongoose.

Options are passed down without modification to the [MongoDB driver's `createCollection()` function](https://mongodb.github.io/node-mongodb-native/7.0/classes/Db.html#createCollection)

## `Connection.prototype.createCollections()`

### Parameters

- `continueOnError` \<boolean\> When true, will continue to create collections and create a new error class for the collections that errored.

Calls `createCollection()` on a models in a series.

## `Connection.prototype.db`

### Type

- \<property\>

The mongodb.Db instance, set when the connection is opened

## `Connection.prototype.deleteModel()`

### Parameters

- `name` \<string|RegExp\> if string, the name of the model to remove. If regexp, removes all models whose name matches the regexp.

### Returns

- \<Connection\> this

Removes the model named `name` from this connection, if it exists. You can
use this function to clean up any models you created in your tests to
prevent OverwriteModelErrors.

#### Example:

    conn.model('User', new Schema({ name: String }));
    console.log(conn.model('User')); // Model object
    conn.deleteModel('User');
    console.log(conn.model('User')); // undefined

    // Usually useful in a Mocha `afterEach()` hook
    afterEach(function() {
      conn.deleteModel(/.+/); // Delete every model
    });

## `Connection.prototype.destroy()`

### Parameters

- `[force]` \<boolean\>

Destroy the connection. Similar to [`.close`](https://mongoosejs.com/docs/api/connection.md#Connection.prototype.close()),
but also removes the connection from Mongoose's `connections` list and prevents the
connection from ever being re-opened.

## `Connection.prototype.dropCollection()`

### Parameters

- `collection` \<string\> The collection to delete

### Returns

- \<Promise\>

Helper for `dropCollection()`. Will delete the given collection, including
all documents and indexes.

## `Connection.prototype.dropDatabase()`

### Returns

- \<Promise\>

Helper for `dropDatabase()`. Deletes the given database, including all
collections, documents, and indexes.

#### Example:

    const conn = mongoose.createConnection('mongodb://127.0.0.1:27017/mydb');
    // Deletes the entire 'mydb' database
    await conn.dropDatabase();

## `Connection.prototype.get()`

### Parameters

- `key` \<string\>

Gets the value of the option `key`. Equivalent to `conn.options[key]`

#### Example:

    conn.get('test'); // returns the 'test' value

## `Connection.prototype.getClient()`

### Returns

- \<MongoClient\>

Returns the [MongoDB driver `MongoClient`](https://mongodb.github.io/node-mongodb-native/7.0/classes/MongoClient.html) instance
that this connection uses to talk to MongoDB.

#### Example:

    const conn = await mongoose.createConnection('mongodb://127.0.0.1:27017/test').
      asPromise();

    conn.getClient(); // MongoClient { ... }

## `Connection.prototype.host`

### Type

- \<property\>

The host name portion of the URI. If multiple hosts, such as a replica set,
this will contain the first host name in the URI

#### Example:

    mongoose.createConnection('mongodb://127.0.0.1:27017/mydb').host; // "127.0.0.1"

## `Connection.prototype.id`

### Type

- \<property\>

A number identifier for this connection. Used for debugging when
you have [multiple connections](https://mongoosejs.com/docs/connections.html#multiple_connections).

#### Example:

    // The default connection has `id = 0`
    mongoose.connection.id; // 0

    // If you create a new connection, Mongoose increments id
    const conn = mongoose.createConnection();
    conn.id; // 1

## `Connection.prototype.listCollections()`

### Returns

- \<Promise<Array<Collection>>\>

Helper for MongoDB Node driver's `listCollections()`.
Returns an array of collection objects.

## `Connection.prototype.listDatabases()`

### Returns

- \<Promise<Array<[object Object]>>\>

Helper for MongoDB Node driver's `listDatabases()`.
Returns an object with a `databases` property that contains an
array of database objects.

#### Example:
    const { databases } = await mongoose.connection.listDatabases();
    databases; // [{ name: 'mongoose_test', sizeOnDisk: 0, empty: false }]

## `Connection.prototype.model()`

### Parameters

- `name` \<string|Function\> the model name or class extending Model
- `[schema]` \<Schema\> a schema. necessary when defining a model
- `[collection]` \<string\> name of mongodb collection (optional) if not given it will be induced from model name
- `[options]` \<object\>
- `[options.overwriteModels=false]` \<boolean\> If true, overwrite existing models with the same name to avoid `OverwriteModelError`

### Returns

- \<Model\> The compiled model

### See

- [Mongoose#model](https://mongoosejs.com/docs/api/mongoose.md#Mongoose.prototype.model())

Defines or retrieves a model.

    const mongoose = require('mongoose');
    const db = mongoose.createConnection(..);
    db.model('Venue', new Schema(..));
    const Ticket = db.model('Ticket', new Schema(..));
    const Venue = db.model('Venue');

_When no `collection` argument is passed, Mongoose produces a collection name by passing the model `name` to the `utils.toCollectionName` method. This method pluralizes the name. If you don't like this behavior, either pass a collection name or set your schemas collection name option._

#### Example:

    const schema = new Schema({ name: String }, { collection: 'actor' });

    // or

    schema.set('collection', 'actor');

    // or

    const collectionName = 'actor'
    const M = conn.model('Actor', schema, collectionName)

## `Connection.prototype.modelNames()`

### Returns

- \<Array<string>\>

Returns an array of model names created on this connection.

## `Connection.prototype.models`

### Type

- \<property\>

A [POJO](https://masteringjs.io/tutorials/fundamentals/pojo) containing
a map from model names to models. Contains all models that have been
added to this connection using [`Connection#model()`](https://mongoosejs.com/docs/api/connection.md#Connection.prototype.model()).

#### Example:

    const conn = mongoose.createConnection();
    const Test = conn.model('Test', mongoose.Schema({ name: String }));

    Object.keys(conn.models).length; // 1
    conn.models.Test === Test; // true

## `Connection.prototype.name`

### Type

- \<property\>

The name of the database this connection points to.

#### Example:

    mongoose.createConnection('mongodb://127.0.0.1:27017/mydb').name; // "mydb"

## `Connection.prototype.on()`

### Parameters

- `event` \<string\> The event to listen on
- `callback` \<Function\>

### See

- [Connection#readyState](https://mongoosejs.com/docs/api/connection.md#Connection.prototype.readyState)

Listen to events in the Connection

## `Connection.prototype.once()`

### Parameters

- `event` \<string\> The event to listen on
- `callback` \<Function\>

### See

- [Connection#readyState](https://mongoosejs.com/docs/api/connection.md#Connection.prototype.readyState)

Listen to a event once in the Connection

## `Connection.prototype.openUri()`

### Parameters

- `uri` \<string\> The URI to connect with.
- `[options]` \<object\> Passed on to [`MongoClient.connect`](https://mongodb.github.io/node-mongodb-native/7.0/classes/MongoClient.html#connect)
- `[options.bufferCommands=true]` \<boolean\> Mongoose specific option. Set to false to [disable buffering](https://mongoosejs.com/docs/faq.html#callback_never_executes) on all models associated with this connection.
- `[options.bufferTimeoutMS=10000]` \<number\> Mongoose specific option. If `bufferCommands` is true, Mongoose will throw an error after `bufferTimeoutMS` if the operation is still buffered.
- `[options.dbName]` \<string\> The name of the database we want to use. If not provided, use database name from connection string.
- `[options.user]` \<string\> username for authentication, equivalent to `options.auth.username`. Maintained for backwards compatibility.
- `[options.pass]` \<string\> password for authentication, equivalent to `options.auth.password`. Maintained for backwards compatibility.
- `[options.maxPoolSize=100]` \<number\> The maximum number of sockets the MongoDB driver will keep open for this connection. Keep in mind that MongoDB only allows one operation per socket at a time, so you may want to increase this if you find you have a few slow queries that are blocking faster queries from proceeding. See [Slow Trains in MongoDB and Node.js](https://thecodebarbarian.com/slow-trains-in-mongodb-and-nodejs).
- `[options.minPoolSize=0]` \<number\> The minimum number of sockets the MongoDB driver will keep open for this connection. Keep in mind that MongoDB only allows one operation per socket at a time, so you may want to increase this if you find you have a few slow queries that are blocking faster queries from proceeding. See [Slow Trains in MongoDB and Node.js](https://thecodebarbarian.com/slow-trains-in-mongodb-and-nodejs).
- `[options.serverSelectionTimeoutMS]` \<number\> The MongoDB driver will try to find a server to send any given operation to, and keep retrying for `serverSelectionTimeoutMS` milliseconds before erroring out. If not set, the MongoDB driver defaults to using `30000` (30 seconds).
- `[options.heartbeatFrequencyMS]` \<number\> The MongoDB driver sends a heartbeat every `heartbeatFrequencyMS` to check on the status of the connection. A heartbeat is subject to `serverSelectionTimeoutMS`, so the MongoDB driver will retry failed heartbeats for up to 30 seconds by default. Mongoose only emits a `'disconnected'` event after a heartbeat has failed, so you may want to decrease this setting to reduce the time between when your server goes down and when Mongoose emits `'disconnected'`. We recommend you do **not** set this setting below 1000, too many heartbeats can lead to performance degradation.
- `[options.autoIndex=true]` \<boolean\> Mongoose-specific option. Set to false to disable automatic index creation for all models associated with this connection.
- `[options.socketTimeoutMS=0]` \<number\> How long the MongoDB driver will wait before killing a socket due to inactivity _after initial connection_. A socket may be inactive because of either no activity or a long-running operation. `socketTimeoutMS` defaults to 0, which means Node.js will not time out the socket due to inactivity. This option is passed to [Node.js `socket#setTimeout()` function](https://nodejs.org/api/net.html#net_socket_settimeout_timeout_callback) after the MongoDB driver successfully completes.
- `[options.family=0]` \<number\> Passed transparently to [Node.js' `dns.lookup()`](https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback) function. May be either `0`, `4`, or `6`. `4` means use IPv4 only, `6` means use IPv6 only, `0` means try both.
- `[options.autoCreate=false]` \<boolean\> Set to `true` to make Mongoose automatically call `createCollection()` on every model created on this connection.

Opens the connection with a URI using `MongoClient.connect()`.

## `Connection.prototype.pass`

### Type

- \<property\>

The password specified in the URI

#### Example:

    mongoose.createConnection('mongodb://val:psw@127.0.0.1:27017/mydb').pass; // "psw"

## `Connection.prototype.plugin()`

### Parameters

- `fn` \<Function\> plugin callback
- `[opts]` \<object\> optional options

### Returns

- \<Connection\> this

### See

- [plugins](https://mongoosejs.com/docs/plugins.html)

Declares a plugin executed on all schemas you pass to `conn.model()`

Equivalent to calling `.plugin(fn)` on each schema you create.

#### Example:

    const db = mongoose.createConnection('mongodb://127.0.0.1:27017/mydb');
    db.plugin(() => console.log('Applied'));
    db.plugins.length; // 1

    db.model('Test', new Schema({})); // Prints "Applied"

## `Connection.prototype.plugins`

### Type

- \<property\>

The plugins that will be applied to all models created on this connection.

#### Example:

    const db = mongoose.createConnection('mongodb://127.0.0.1:27017/mydb');
    db.plugin(() => console.log('Applied'));
    db.plugins.length; // 1

    db.model('Test', new Schema({})); // Prints "Applied"

## `Connection.prototype.port`

### Type

- \<property\>

The port portion of the URI. If multiple hosts, such as a replica set,
this will contain the port from the first host name in the URI.

#### Example:

    mongoose.createConnection('mongodb://127.0.0.1:27017/mydb').port; // 27017

## `Connection.prototype.readyState`

### Type

- \<property\>

Connection ready state

- 0 = disconnected
- 1 = connected
- 2 = connecting
- 3 = disconnecting

Each state change emits its associated event name.

#### Example:

    conn.on('connected', callback);
    conn.on('disconnected', callback);

## `Connection.prototype.removeDb()`

### Parameters

- `name` \<string\> The database name

### Returns

- \<Connection\> this

Removes the database connection with the given name created with with `useDb()`.

Throws an error if the database connection was not found.

#### Example:

    // Connect to `initialdb` first
    const conn = await mongoose.createConnection('mongodb://127.0.0.1:27017/initialdb').asPromise();

    // Creates an un-cached connection to `mydb`
    const db = conn.useDb('mydb');

    // Closes `db`, and removes `db` from `conn.relatedDbs` and `conn.otherDbs`
    await conn.removeDb('mydb');

## `Connection.prototype.set()`

### Parameters

- `key` \<string\>
- `val` \<any\>

Sets the value of the option `key`. Equivalent to `conn.options[key] = val`

Supported options include:

- `maxTimeMS`: Set [`maxTimeMS`](https://mongoosejs.com/docs/api/query.md#Query.prototype.maxTimeMS()) for all queries on this connection.
- 'debug': If `true`, prints the operations mongoose sends to MongoDB to the console. If a writable stream is passed, it will log to that stream, without colorization. If a callback function is passed, it will receive the collection name, the method name, then all arguments passed to the method. For example, if you wanted to replicate the default logging, you could output from the callback `Mongoose: ${collectionName}.${methodName}(${methodArgs.join(', ')})`.

#### Example:

    conn.set('test', 'foo');
    conn.get('test'); // 'foo'
    conn.options.test; // 'foo'

## `Connection.prototype.setClient()`

### Parameters

- `client` \<MongClient\> The Client to set to be used.

### Returns

- \<Connection\> this

Set the [MongoDB driver `MongoClient`](https://mongodb.github.io/node-mongodb-native/7.0/classes/MongoClient.html) instance
that this connection uses to talk to MongoDB. This is useful if you already have a MongoClient instance, and want to
reuse it.

#### Example:

    const client = await mongodb.MongoClient.connect('mongodb://127.0.0.1:27017/test');

    const conn = mongoose.createConnection().setClient(client);

    conn.getClient(); // MongoClient { ... }
    conn.readyState; // 1, means 'CONNECTED'

## `Connection.prototype.startSession()`

### Parameters

- `[options]` \<object\> see the [mongodb driver options](https://mongodb.github.io/node-mongodb-native/7.0/classes/MongoClient.html#startSession)
- `[options.causalConsistency=true]` \<boolean\> set to false to disable causal consistency

### Returns

- \<Promise<ClientSession>\> promise that resolves to a MongoDB driver `ClientSession`

_Requires MongoDB >= 3.6.0._ Starts a [MongoDB session](https://www.mongodb.com/docs/manual/release-notes/3.6/#client-sessions)
for benefits like causal consistency, [retryable writes](https://www.mongodb.com/docs/manual/core/retryable-writes/),
and [transactions](https://thecodebarbarian.com/a-node-js-perspective-on-mongodb-4-transactions.html).

#### Example:

    const session = await conn.startSession();
    let doc = await Person.findOne({ name: 'Ned Stark' }, null, { session });
    await doc.deleteOne();
    // `doc` will always be null, even if reading from a replica set
    // secondary. Without causal consistency, it is possible to
    // get a doc back from the below query if the query reads from a
    // secondary that is experiencing replication lag.
    doc = await Person.findOne({ name: 'Ned Stark' }, null, { session, readPreference: 'secondary' });

## `Connection.prototype.syncIndexes()`

### Parameters

- `[options]` \<object\>
- `[options.continueOnError]` \<boolean\> `false` by default. If set to `true`, mongoose will not throw an error if one model syncing failed, and will return an object where the keys are the names of the models, and the values are the results/errors for each model.

### Returns

- \<Promise<object>\> Returns a Promise, when the Promise resolves the value is a list of the dropped indexes.

Syncs all the indexes for the models registered with this connection.

## `Connection.prototype.transaction()`

### Parameters

- `fn` \<Function\> Function to execute in a transaction
- `[options]` \<[object Object]\> Optional settings for the transaction

### Returns

- \<Promise<any>\> promise that is fulfilled if Mongoose successfully committed the transaction, or rejects if the transaction was aborted or if Mongoose failed to commit the transaction. If fulfilled, the promise resolves to a MongoDB command result.

_Requires MongoDB >= 3.6.0._ Executes the wrapped async function
in a transaction. Mongoose will commit the transaction if the
async function executes successfully and attempt to retry if
there was a retriable error.

Calls the MongoDB driver's [`session.withTransaction()`](https://mongodb.github.io/node-mongodb-native/7.0/classes/ClientSession.html#withTransaction),
but also handles resetting Mongoose document state as shown below.

#### Example:

    const doc = new Person({ name: 'Will Riker' });
    await db.transaction(async function setRank(session) {
      doc.rank = 'Captain';
      await doc.save({ session });
      doc.isNew; // false

      // Throw an error to abort the transaction
      throw new MongooseError('Oops!');
    },{ readPreference: 'primary' }).catch(() => {});

    // true, `transaction()` reset the document's state because the
    // transaction was aborted.
    doc.isNew;

## `Connection.prototype.useDb()`

### Parameters

- `name` \<string\> The database name
- `[options]` \<object\>
- `[options.useCache=false]` \<boolean\> If true, cache results so calling `useDb()` multiple times with the same name only creates 1 connection object.

### Returns

- \<Connection\> New Connection Object

Switches to a different database using the same [connection pool](https://mongoosejs.com/docs/connections.html#connection_pools).

Returns a new connection object, with the new db.

#### Example:

    // Connect to `initialdb` first
    const conn = await mongoose.createConnection('mongodb://127.0.0.1:27017/initialdb').asPromise();

    // Creates an un-cached connection to `mydb`
    const db = conn.useDb('mydb');
    // Creates a cached connection to `mydb2`. All calls to `conn.useDb('mydb2', { useCache: true })` will return the same
    // connection instance as opposed to creating a new connection instance
    const db2 = conn.useDb('mydb2', { useCache: true });

## `Connection.prototype.user`

### Type

- \<property\>

The username specified in the URI

#### Example:

    mongoose.createConnection('mongodb://val:psw@127.0.0.1:27017/mydb').user; // "val"

## `Connection.prototype.watch()`

### Parameters

- `[pipeline]` \<Array\>
- `[options]` \<object\> passed without changes to [the MongoDB driver's `Db#watch()` function](https://mongodb.github.io/node-mongodb-native/7.0/classes/Db.html#watch)

### Returns

- \<ChangeStream\> mongoose-specific change stream wrapper, inherits from EventEmitter

Watches the entire underlying database for changes. Similar to
[`Model.watch()`](https://mongoosejs.com/docs/api/model.md#Model.watch()).

This function does **not** trigger any middleware. In particular, it
does **not** trigger aggregate middleware.

The ChangeStream object is an event emitter that emits the following events:

- 'change': A change occurred, see below example
- 'error': An unrecoverable error occurred. In particular, change streams currently error out if they lose connection to the replica set primary. Follow [this GitHub issue](https://github.com/Automattic/mongoose/issues/6799) for updates.
- 'end': Emitted if the underlying stream is closed
- 'close': Emitted if the underlying stream is closed

#### Example:

    const User = conn.model('User', new Schema({ name: String }));

    const changeStream = conn.watch().on('change', data => console.log(data));

    // Triggers a 'change' event on the change stream.
    await User.create({ name: 'test' });

## `Connection.prototype.withSession()`

### Parameters

- `executor` \<Function\> called with 1 argument: a `ClientSession` instance

### Returns

- \<Promise\> resolves to the return value of the executor function

A convenience wrapper for `connection.client.withSession()`.

#### Example:

    await conn.withSession(async session => {
      const doc = await TestModel.findOne().session(session);
    });
