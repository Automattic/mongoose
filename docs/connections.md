# Connections

You can connect to MongoDB with the `mongoose.connect()` method.

```javascript
mongoose.connect('mongodb://127.0.0.1:27017/myapp');
```

This is the minimum needed to connect the `myapp` database running locally on the default port (27017).
For local MongoDB databases, we recommend using `127.0.0.1` instead of `localhost`.
That is because Node.js 18 and up prefer IPv6 addresses, which means, on many machines, Node.js will resolve `localhost` to the IPv6 address `::1` and Mongoose will be unable to connect, unless the mongodb instance is running with ipv6 enabled.

You can also specify several more parameters in the `uri`:

```javascript
mongoose.connect('mongodb://username:password@host:port/database?options...');
```

See the [mongodb connection string spec](http://www.mongodb.com/docs/manual/reference/connection-string/) for more details.

<ul class="toc">
  <li><a href="#buffering">Buffering</a></li>
  <li><a href="#error-handling">Error Handling</a></li>
  <li><a href="#options">Options</a></li>
  <li><a href="#serverselectiontimeoutms">serverSelectionTimeoutMS</a></li>
  <li><a href="#connection-string-options">Connection String Options</a></li>
  <li><a href="#connection-events">Connection Events</a></li>
  <li><a href="#keepAlive">A note about keepAlive</a></li>
  <li><a href="#server-selection">Server Selection</a></li>
  <li><a href="#replicaset_connections">Replica Set Connections</a></li>
  <li><a href="#replicaset-hostnames">Replica Set Host Names</a></li>
  <li><a href="#mongos_connections">Multi-mongos support</a></li>
  <li><a href="#multiple_connections">Multiple connections</a></li>
  <li><a href="#connection_pools">Connection Pools</a></li>
  <li><a href="#multi-tenant-connections">Multi Tenant Connections</a></li>
</ul>

## Operation Buffering {#buffering}

Mongoose lets you start using your models immediately, without waiting for
mongoose to establish a connection to MongoDB.

```javascript
mongoose.connect('mongodb://127.0.0.1:27017/myapp');
const MyModel = mongoose.model('Test', new Schema({ name: String }));
// Works
await MyModel.findOne();
```

That's because mongoose buffers model function calls internally. This
buffering is convenient, but also a common source of confusion. Mongoose
will *not* throw any errors by default if you use a model without
connecting.

```javascript
const MyModel = mongoose.model('Test', new Schema({ name: String }));
const promise = MyModel.findOne();

setTimeout(function() {
  mongoose.connect('mongodb://127.0.0.1:27017/myapp');
}, 60000);

// Will just hang until mongoose successfully connects
await promise;
```

To disable buffering, turn off the [`bufferCommands` option on your schema](guide.html#bufferCommands).
If you have `bufferCommands` on and your connection is hanging, try turning
`bufferCommands` off to see if you haven't opened a connection properly.
You can also disable `bufferCommands` globally:

```javascript
mongoose.set('bufferCommands', false);
```

Note that buffering is also responsible for waiting until Mongoose
creates collections if you use the [`autoCreate` option](guide.html#autoCreate).
If you disable buffering, you should also disable the `autoCreate`
option and use [`createCollection()`](api/model.html#model_Model-createCollection)
to create [capped collections](guide.html#capped) or
[collections with collations](guide.html#collation).

```javascript
const schema = new Schema({
  name: String
}, {
  capped: { size: 1024 },
  bufferCommands: false,
  autoCreate: false // disable `autoCreate` since `bufferCommands` is false
});

const Model = mongoose.model('Test', schema);
// Explicitly create the collection before using it
// so the collection is capped.
await Model.createCollection();
```

## Error Handling {#error-handling}

There are two classes of errors that can occur with a Mongoose connection.

* **Error on initial connection**: If initial connection fails, Mongoose will emit an 'error' event and the promise `mongoose.connect()` returns will reject. However, Mongoose will **not** automatically try to reconnect.
* **Error after initial connection was established**: Mongoose will attempt to reconnect, and it will emit an 'error' event.

To handle initial connection errors, you should use `.catch()` or `try/catch` with async/await.

```javascript
mongoose.connect('mongodb://127.0.0.1:27017/test').
  catch(error => handleError(error));

// Or:
try {
  await mongoose.connect('mongodb://127.0.0.1:27017/test');
} catch (error) {
  handleError(error);
}
```

To handle errors after initial connection was established, you should
listen for error events on the connection. However, you still need to
handle initial connection errors as shown above.

```javascript
mongoose.connection.on('error', err => {
  logError(err);
});
```

Note that Mongoose does not necessarily emit an 'error' event if it loses connectivity to MongoDB. You should
listen to the `disconnected` event to report when Mongoose is disconnected from MongoDB.

## Options {#options}

The `connect` method also accepts an `options` object which will be passed
on to the underlying MongoDB driver.

```javascript
mongoose.connect(uri, options);
```

A full list of options can be found on the [MongoDB Node.js driver docs for `MongoClientOptions`](https://mongodb.github.io/node-mongodb-native/4.2/interfaces/MongoClientOptions.html).
Mongoose passes options to the driver without modification, modulo a few
exceptions that are explained below.

* `bufferCommands`    - This is a mongoose-specific option (not passed to the MongoDB driver) that disables [Mongoose's buffering mechanism](faq.html#callback_never_executes)
* `user`/`pass`       - The username and password for authentication. These options are Mongoose-specific, they are equivalent to the MongoDB driver's `auth.username` and `auth.password` options.
* `autoIndex`         - By default, mongoose will automatically build indexes defined in your schema when it connects. This is great for development, but not ideal for large production deployments, because index builds can cause performance degradation. If you set `autoIndex` to false, mongoose will not automatically build indexes for **any** model associated with this connection.
* `dbName`            - Specifies which database to connect to and overrides any database specified in the connection string. This is useful if you are unable to specify a default database in the connection string like with [some `mongodb+srv` syntax connections](https://stackoverflow.com/questions/48917591/fail-to-connect-mongoose-to-atlas/48917626#48917626).

Below are some of the options that are important for tuning Mongoose.

* `promiseLibrary`    - Sets the [underlying driver's promise library](http://mongodb.github.io/node-mongodb-native/3.1/api/MongoClient.html).
* `maxPoolSize`       - The maximum number of sockets the MongoDB driver will keep open for this connection. By default, `maxPoolSize` is 100. Keep in mind that MongoDB only allows one operation per socket at a time, so you may want to increase this if you find you have a few slow queries that are blocking faster queries from proceeding. See [Slow Trains in MongoDB and Node.js](http://thecodebarbarian.com/slow-trains-in-mongodb-and-nodejs). You may want to decrease `maxPoolSize` if you are running into [connection limits](https://www.mongodb.com/docs/atlas/reference/atlas-limits/#connection-limits-and-cluster-tier).
* `minPoolSize`       - The minimum number of sockets the MongoDB driver will keep open for this connection. The MongoDB driver may close sockets that have been inactive for some time. You may want to increase `minPoolSize` if you expect your app to go through long idle times and want to make sure your sockets stay open to avoid slow trains when activity picks up.
* `socketTimeoutMS`   - How long the MongoDB driver will wait before killing a socket due to inactivity *after initial connection*. A socket may be inactive because of either no activity or a long-running operation. `socketTimeoutMS` defaults to 0, which means Node.js will not time out the socket due to inactivity. This option is passed to [Node.js `socket#setTimeout()` function](https://nodejs.org/api/net.html#net_socket_settimeout_timeout_callback) after the MongoDB driver successfully completes.
* `family`            - Whether to connect using IPv4 or IPv6. This option passed to [Node.js' `dns.lookup()`](https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback) function. If you don't specify this option, the MongoDB driver will try IPv6 first and then IPv4 if IPv6 fails. If your `mongoose.connect(uri)` call takes a long time, try `mongoose.connect(uri, { family: 4 })`
* `authSource`        - The database to use when authenticating with `user` and `pass`. In MongoDB, [users are scoped to a database](https://www.mongodb.com/docs/manual/tutorial/manage-users-and-roles/). If you are getting an unexpected login failure, you may need to set this option.
* `serverSelectionTimeoutMS` - The MongoDB driver will try to find a server to send any given operation to, and keep retrying for `serverSelectionTimeoutMS` milliseconds. If not set, the MongoDB driver defaults to using `30000` (30 seconds).
* `heartbeatFrequencyMS` - The MongoDB driver sends a heartbeat every `heartbeatFrequencyMS` to check on the status of the connection. A heartbeat is subject to `serverSelectionTimeoutMS`, so the MongoDB driver will retry failed heartbeats for up to 30 seconds by default. Mongoose only emits a `'disconnected'` event after a heartbeat has failed, so you may want to decrease this setting to reduce the time between when your server goes down and when Mongoose emits `'disconnected'`. We recommend you do **not** set this setting below 1000, too many heartbeats can lead to performance degradation.

## serverSelectionTimeoutMS {#serverselectiontimeoutms}

The `serverSelectionTimeoutMS` option is extremely important: it controls how long the MongoDB Node.js driver will attempt to retry any operation before erroring out.
This includes initial connection, like `await mongoose.connect()`, as well as any operations that make requests to MongoDB, like `save()` or `find()`.

By default, `serverSelectionTimeoutMS` is 30000 (30 seconds).
This means that, for example, if you call `mongoose.connect()` when your standalone MongoDB server is down, your `mongoose.connect()` call will only throw an error after 30 seconds.

```javascript
// Throws an error "getaddrinfo ENOTFOUND doesnt.exist" after 30 seconds
await mongoose.connect('mongodb://doesnt.exist:27017/test');
```

Similarly, if your standalone MongoDB server goes down after initial connection, any `find()` or `save()` calls will error out after 30 seconds, unless your MongoDB server is restarted.

While 30 seconds seems like a long time, `serverSelectionTimeoutMS` means you're unlikely to see any interruptions during a [replica set failover](https://www.mongodb.com/docs/manual/replication/#automatic-failover).
If you lose your replica set primary, the MongoDB Node driver will ensure that any operations you send during the replica set election will eventually execute, assuming that the replica set election takes less than `serverSelectionTimeoutMS`.

To get faster feedback on failed connections, you can reduce `serverSelectionTimeoutMS` to 5000 as follows.
We don't recommend reducing `serverSelectionTimeoutMS` unless you are running a standalone MongoDB server rather than a replica set, or unless you are using a serverless runtime like [AWS Lambda](lambda.html).

```javascript
mongoose.connect(uri, {
  serverSelectionTimeoutMS: 5000
});
```

There is no way to tune `serverSelectionTimeoutMS` independently for `mongoose.connect()` vs for queries.
If you want to reduce `serverSelectionTimeoutMS` for queries and other operations, but still retry `mongoose.connect()` for longer, you are responsible for retrying the `connect()` calls yourself using a `for` loop or [a tool like p-retry](https://github.com/Automattic/mongoose/issues/12967#issuecomment-1411227968).

```javascript
const serverSelectionTimeoutMS = 5000;

// Prints "Failed 0", "Failed 1", "Failed 2" and then throws an
// error. Exits after approximately 15 seconds.
for (let i = 0; i < 3; ++i) {
  try {
    await mongoose.connect('mongodb://doesnt.exist:27017/test', {
      serverSelectionTimeoutMS
    });
    break;
  } catch (err) {
    console.log('Failed', i);
    if (i >= 2) {
      throw err;
    }
  }
}
```

## Using Promises and Async/Await {#promises-async-await}

The `connect()` function returns a [promise](promises.html).

```javascript
// Using async/await. The `mongoose.connect()` promise resolves to mongoose instance.
await mongoose.connect(uri, options);

// Or using promises
mongoose.connect(uri, options).then(
  () => { /** ready to use. The `mongoose.connect()` promise resolves to mongoose instance. */ },
  err => { /** handle initial connection error */ }
);
```

## Connection String Options {#connection-string-options}

You can also specify driver options in your connection string as
[parameters in the query string](https://en.wikipedia.org/wiki/Query_string)
portion of the URI. This only applies to options passed to the MongoDB
driver. You **can't** set Mongoose-specific options like `bufferCommands`
in the query string.

```javascript
mongoose.connect('mongodb://127.0.0.1:27017/test?socketTimeoutMS=1000&bufferCommands=false&authSource=otherdb');
// The above is equivalent to:
mongoose.connect('mongodb://127.0.0.1:27017/test', {
  socketTimeoutMS: 1000
  // Note that mongoose will **not** pull `bufferCommands` from the query string
});
```

The disadvantage of putting options in the query string is that query
string options are harder to read. The advantage is that you only need a
single configuration option, the URI, rather than separate options for
`socketTimeoutMS`, etc. Best practice is to put options
that likely differ between development and production, like `replicaSet`
or `ssl`, in the connection string, and options that should remain constant,
like `socketTimeoutMS` or `maxPoolSize`, in the options object.

The MongoDB docs have a full list of
[supported connection string options](https://www.mongodb.com/docs/manual/reference/connection-string/).
Below are some options that are often useful to set in the connection string because they
are closely associated with the hostname and authentication information.

* `authSource`        - The database to use when authenticating with `user` and `pass`. In MongoDB, [users are scoped to a database](https://www.mongodb.com/docs/manual/tutorial/manage-users-and-roles/). If you are getting an unexpected login failure, you may need to set this option.
* `family`            - Whether to connect using IPv4 or IPv6. This option passed to [Node.js' `dns.lookup()`](https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback) function. If you don't specify this option, the MongoDB driver will try IPv6 first and then IPv4 if IPv6 fails. If your `mongoose.connect(uri)` call takes a long time, try `mongoose.connect(uri, { family: 4 })`

## Connection Events {#connection-events}

Connections inherit from [Node.js' `EventEmitter` class](https://nodejs.org/api/events.html#events_class_eventemitter),
and emit events when something happens to the connection, like losing
connectivity to the MongoDB server. Below is a list of events that a
connection may emit.

* `connecting`: Emitted when Mongoose starts making its initial connection to the MongoDB server
* `connected`: Emitted when Mongoose successfully makes its initial connection to the MongoDB server, or when Mongoose reconnects after losing connectivity. May be emitted multiple times if Mongoose loses connectivity.
* `open`: Emitted after `'connected'` and `onOpen` is executed on all of this connection's models. May be emitted multiple times if Mongoose loses connectivity.
* `disconnecting`: Your app called [`Connection#close()`](api/connection.html#connection_Connection-close) to disconnect from MongoDB. This includes calling `mongoose.disconnect()`, which calls `close()` on all connections.
* `disconnected`: Emitted when Mongoose lost connection to the MongoDB server. This event may be due to your code explicitly closing the connection, the database server crashing, or network connectivity issues.
* `close`: Emitted after [`Connection#close()`](api/connection.html#connection_Connection-close) successfully closes the connection. If you call `conn.close()`, you'll get both a 'disconnected' event and a 'close' event.
* `reconnected`: Emitted if Mongoose lost connectivity to MongoDB and successfully reconnected. Mongoose attempts to [automatically reconnect](https://thecodebarbarian.com/managing-connections-with-the-mongodb-node-driver.html) when it loses connection to the database.
* `error`: Emitted if an error occurs on a connection, like a `parseError` due to malformed data or a payload larger than [16MB](https://www.mongodb.com/docs/manual/reference/limits/#BSON-Document-Size).

When you're connecting to a single MongoDB server (a ["standalone"](https://www.mongodb.com/docs/cloud-manager/tutorial/deploy-standalone/)), Mongoose will emit `disconnected` if it gets
disconnected from the standalone server, and `connected` if it successfully connects to the standalone. In a
[replica set](https://www.mongodb.com/docs/manual/replication/), Mongoose will emit `disconnected` if it loses connectivity to the replica set primary, and `connected` if it manages to reconnect to the replica set primary.

If you are using `mongoose.connect()`, you can use the following to listen to the above events:

```javascript
mongoose.connection.on('connected', () => console.log('connected'));
mongoose.connection.on('open', () => console.log('open'));
mongoose.connection.on('disconnected', () => console.log('disconnected'));
mongoose.connection.on('reconnected', () => console.log('reconnected'));
mongoose.connection.on('disconnecting', () => console.log('disconnecting'));
mongoose.connection.on('close', () => console.log('close'));

mongoose.connect('mongodb://127.0.0.1:27017/mongoose_test');
```

With `mongoose.createConnection()`, use the following instead:

```javascript
const conn = mongoose.createConnection('mongodb://127.0.0.1:27017/mongoose_test');

conn.on('connected', () => console.log('connected'));
conn.on('open', () => console.log('open'));
conn.on('disconnected', () => console.log('disconnected'));
conn.on('reconnected', () => console.log('reconnected'));
conn.on('disconnecting', () => console.log('disconnecting'));
conn.on('close', () => console.log('close'));
```

## A note about keepAlive {#keepAlive}

Before Mongoose 5.2.0, you needed to enable the `keepAlive` option to initiate [TCP keepalive](https://tldp.org/HOWTO/TCP-Keepalive-HOWTO/overview.html) to prevent `"connection closed"` errors.
However, `keepAlive` has been `true` by default since Mongoose 5.2.0, and the `keepAlive` is deprecated as of Mongoose 7.2.0.
Please remove `keepAlive` and `keepAliveInitialDelay` options from your Mongoose connections.

## Replica Set Connections {#replicaset_connections}

To connect to a replica set you pass a comma delimited list of hosts to
connect to rather than a single host.

```javascript
mongoose.connect('mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]' [, options]);
```

For example:

```javascript
mongoose.connect('mongodb://user:pw@host1.com:27017,host2.com:27017,host3.com:27017/testdb');
```

To connect to a single node replica set, specify the `replicaSet` option.

```javascript
mongoose.connect('mongodb://host1:port1/?replicaSet=rsName');
```

## Server Selection {#server-selection}

The underlying MongoDB driver uses a process known as [server selection](https://github.com/mongodb/specifications/blob/master/source/server-selection/server-selection.rst) to connect to MongoDB and send operations to MongoDB.
If the MongoDB driver can't find a server to send an operation to after `serverSelectionTimeoutMS`,
you'll get the below error:

```no-highlight
MongoTimeoutError: Server selection timed out after 30000 ms
```

You can configure the timeout using the `serverSelectionTimeoutMS` option
to `mongoose.connect()`:

```javascript
mongoose.connect(uri, {
  serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
});
```

A `MongoTimeoutError` has a `reason` property that explains why
server selection timed out. For example, if you're connecting to
a standalone server with an incorrect password, `reason`
will contain an "Authentication failed" error.

```javascript
const mongoose = require('mongoose');

const uri = 'mongodb+srv://username:badpw@cluster0-OMITTED.mongodb.net/' +
  'test?retryWrites=true&w=majority';
// Prints "MongoServerError: bad auth Authentication failed."
mongoose.connect(uri, {
  serverSelectionTimeoutMS: 5000
}).catch(err => console.log(err.reason));
```

## Replica Set Host Names {#replicaset-hostnames}

MongoDB replica sets rely on being able to reliably figure out the domain name for each member.  
On Linux and OSX, the MongoDB server uses the output of the [`hostname` command](https://linux.die.net/man/1/hostname) to figure out the domain name to report to the replica set.
This can cause confusing errors if you're connecting to a remote MongoDB replica set running on a machine that reports its `hostname` as `localhost`:

```txt
// Can get this error even if your connection string doesn't include
// `localhost` if `rs.conf()` reports that one replica set member has
// `localhost` as its host name.
MongooseServerSelectionError: connect ECONNREFUSED localhost:27017
```

If you're experiencing a similar error, connect to the replica set using the `mongo` shell and run the [`rs.conf()`](https://www.mongodb.com/docs/manual/reference/method/rs.conf/) command to check the host names of each replica set member.
Follow [this page's instructions to change a replica set member's host name](https://www.mongodb.com/docs/manual/tutorial/change-hostnames-in-a-replica-set/#change-hostnames-while-maintaining-replica-set-availability).

You can also check the `reason.servers` property of `MongooseServerSelectionError` to see what the MongoDB Node driver thinks the state of your replica set is.
The `reason.servers` property contains a [map](https://masteringjs.io/tutorials/fundamentals/map) of server descriptions.

```js
if (err.name === 'MongooseServerSelectionError') {
  // Contains a Map describing the state of your replica set. For example:
  // Map(1) {
  //   'localhost:27017' => ServerDescription {
  //     address: 'localhost:27017',
  //     type: 'Unknown',
  //     ...
  //   }
  // }
  console.log(err.reason.servers);
}
```

## Multi-mongos support {#mongos_connections}

You can also connect to multiple [mongos](https://www.mongodb.com/docs/manual/reference/program/mongos/) instances
for high availability in a sharded cluster. You do
[not need to pass any special options to connect to multiple mongos](http://mongodb.github.io/node-mongodb-native/3.0/tutorials/connect/#connect-to-sharded-cluster) in mongoose 5.x.

```javascript
// Connect to 2 mongos servers
mongoose.connect('mongodb://mongosA:27501,mongosB:27501', cb);
```

## Multiple connections {#multiple_connections}

So far we've seen how to connect to MongoDB using Mongoose's default
connection. Mongoose creates a *default connection* when you call `mongoose.connect()`.
You can access the default connection using `mongoose.connection`.

You may need multiple connections to MongoDB for several reasons.
One reason is if you have multiple databases or multiple MongoDB clusters.
Another reason is to work around [slow trains](https://thecodebarbarian.com/slow-trains-in-mongodb-and-nodejs).
The `mongoose.createConnection()` function takes the same arguments as
`mongoose.connect()` and returns a new connection.

```javascript
const conn = mongoose.createConnection('mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]', options);
```

This [connection](api/connection.html#connection_Connection) object is then used to create and retrieve [models](api/model.html#model_Model).
Models are **always** scoped to a single connection.

```javascript
const UserModel = conn.model('User', userSchema);
```

The `createConnection()` function returns a connection instance, not a promise.
If you want to use `await` to make sure Mongoose successfully connects to MongoDB, use the [`asPromise()` function](api/connection.html#Connection.prototype.asPromise()):

```javascript
// `asPromise()` returns a promise that resolves to the connection
// once the connection succeeds, or rejects if connection failed.
const conn = await mongoose.createConnection(connectionString).asPromise();
```

If you use multiple connections, you should make sure you export schemas, **not** models.
Exporting a model from a file is called the *export model pattern*.
The export model pattern is limited because you can only use one connection.

```javascript
const userSchema = new Schema({ name: String, email: String });

// The alternative to the export model pattern is the export schema pattern.
module.exports = userSchema;

// Because if you export a model as shown below, the model will be scoped
// to Mongoose's default connection.
// module.exports = mongoose.model('User', userSchema);
```

If you use the export schema pattern, you still need to create models somewhere.
There are two common patterns.
The first is to create a function that instantiates a new connection and registers all models on that connection.
With this pattern, you may also register connections with a dependency injector
or another [inversion of control (IOC) pattern](https://thecodebarbarian.com/using-ramda-as-a-dependency-injector).

```javascript
const mongoose = require('mongoose');

module.exports = function connectionFactory() {
  const conn = mongoose.createConnection(process.env.MONGODB_URI);

  conn.model('User', require('../schemas/user'));
  conn.model('PageView', require('../schemas/pageView'));

  return conn;
};
```

Exporting a function that creates a new connection is the most flexible pattern.
However, that pattern can make it tricky to get access to your connection from your route handlers or wherever your business logic is.
An alternative pattern is to export a connection and register the models on the connection in the file's top-level scope as follows.

```javascript
// connections/index.js
const mongoose = require('mongoose');

const conn = mongoose.createConnection(process.env.MONGODB_URI);
conn.model('User', require('../schemas/user'));

module.exports = conn;
```

You can create separate files for each connection, like `connections/web.js` and `connections/mobile.js` if you want to create separate connections for your web API backend and your mobile API backend.
Your business logic can then `require()` or `import` the connection it needs.

## Connection Pools {#connection_pools}

Each `connection`, whether created with `mongoose.connect` or
`mongoose.createConnection` are all backed by an internal configurable
connection pool defaulting to a maximum size of 100. Adjust the pool size
using your connection options:

```javascript
// With object options
mongoose.createConnection(uri, { maxPoolSize: 10 });

// With connection string options
const uri = 'mongodb://127.0.0.1:27017/test?maxPoolSize=10';
mongoose.createConnection(uri);
```

The connection pool size is important because [MongoDB currently can only process one operation per socket](https://thecodebarbarian.com/slow-trains-in-mongodb-and-nodejs).
So `maxPoolSize` functions as a cap on the number of concurrent operations.

## Multi Tenant Connections {#multi-tenant-connections}

In the context of Mongoose, a multi-tenant architecture typically means a case where multiple different clients talk to MongoDB through a single Mongoose application.
This typically means each client makes queries and executes updates through a single Mongoose application, but has a distinct MongoDB database within the same MongoDB cluster.

We recommend reading [this article about multi-tenancy with Mongoose](https://medium.com/brightlab-techblog/multitenant-node-js-application-with-mongoose-mongodb-f8841a285b4f); it has a good description of how we define multi-tenancy and a more detailed overview of our recommended patterns.

There are two patterns we recommend for multi-tenancy in Mongoose:

1. Maintain one connection pool, switch between tenants using the [`Connection.prototype.useDb()` method](https://mongoosejs.com/docs/api/connection.html#Connection.prototype.useDb()).
2. Maintain a separate connection pool per tenant, store connections in a map or [POJO](https://masteringjs.io/tutorials/fundamentals/pojo).

The following is an example of pattern (1).
We recommend pattern (1) for cases where you have a small number of tenants, or if each individual tenant's workload is light (approximately < 1 request per second, all requests take < 10ms of database processing time).
Pattern (1) is simpler to implement and simpler to manage in production, because there is only 1 connection pool.
But, under high load, you will likely run into issues where some tenants' operations slow down other tenants' operations due to [slow trains](https://thecodebarbarian.com/slow-trains-in-mongodb-and-nodejs).

```javascript
const express = require('express');
const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/main');
mongoose.set('debug', true);

mongoose.model('User', mongoose.Schema({ name: String }));

const app = express();

app.get('/users/:tenantId', function(req, res) {
  const db = mongoose.connection.useDb(`tenant_${req.params.tenantId}`, {
    // `useCache` tells Mongoose to cache connections by database name, so
    // `mongoose.connection.useDb('foo', { useCache: true })` returns the
    // same reference each time.
    useCache: true
  });
  // Need to register models every time a new connection is created
  if (!db.models['User']) {
    db.model('User', mongoose.Schema({ name: String }));
  }
  console.log('Find users from', db.name);
  db.model('User').find().
    then(users => res.json({ users })).
    catch(err => res.status(500).json({ message: err.message }));
});

app.listen(3000);
```

The following is an example of pattern (2).
Pattern (2) is more flexible and better for use cases with > 10k tenants and > 1 requests/second.
Because each tenant has a separate connection pool, one tenants' slow operations will have minimal impact on other tenants.
However, this pattern is harder to implement and manage in production.
In particular, [MongoDB does have a limit on the number of open connections](https://www.mongodb.com/blog/post/tuning-mongodb--linux-to-allow-for-tens-of-thousands-connections), and [MongoDB Atlas has separate limits on the number of open connections](https://www.mongodb.com/docs/atlas/reference/atlas-limits), so you need to make sure the total number of sockets in your connection pools doesn't go over MongoDB's limits.

```javascript
const express = require('express');
const mongoose = require('mongoose');

const tenantIdToConnection = {};

const app = express();

app.get('/users/:tenantId', function(req, res) {
  let initialConnection = Promise.resolve();
  const { tenantId } = req.params;
  if (!tenantIdToConnection[tenantId]) {
    tenantIdToConnection[tenantId] = mongoose.createConnection(`mongodb://127.0.0.1:27017/tenant_${tenantId}`);
    tenantIdToConnection[tenantId].model('User', mongoose.Schema({ name: String }));
    initialConnection = tenantIdToConnection[tenantId].asPromise();
  }
  const db = tenantIdToConnection[tenantId];
  initialConnection.
    then(() => db.model('User').find()).
    then(users => res.json({ users })).
    catch(err => res.status(500).json({ message: err.message }));
});

app.listen(3000);
```

## Next Up {#next}

Now that we've covered connections, let's take a look at [models](models.html).
