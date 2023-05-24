# Connections

You can connect to MongoDB with the `mongoose.connect()` method.

```javascript
mongoose.connect('mongodb://127.0.0.1:27017/myapp');
```

This is the minimum needed to connect the `myapp` database running locally
on the default port (27017). If connecting fails on your machine, try using
`127.0.0.1` instead of `localhost`.

You can also specify several more parameters in the `uri`:

```javascript
mongoose.connect('mongodb://username:password@host:port/database?options...');
```

See the [mongodb connection string spec](http://www.mongodb.com/docs/manual/reference/connection-string/) for more details.

<ul class="toc">
  <li><a href="#buffering">Buffering</a></li>
  <li><a href="#error-handling">Error Handling</a></li>
  <li><a href="#options">Options</a></li>
  <li><a href="#connection-string-options">Connection String Options</a></li>
  <li><a href="#connection-events">Connection Events</a></li>
  <li><a href="#keepAlive">A note about keepAlive</a></li>
  <li><a href="#server-selection">Server Selection</a></li>
  <li><a href="#replicaset_connections">Replica Set Connections</a></li>
  <li><a href="#replicaset-hostnames">Replica Set Host Names</a></li>
  <li><a href="#mongos_connections">Multi-mongos support</a></li>
  <li><a href="#multiple_connections">Multiple connections</a></li>
  <li><a href="#connection_pools">Connection Pools</a></li>
</ul>

<h2 id="buffering"><a href="#buffering">Operation Buffering</a></h2>

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

<h2 id="error-handling"><a href="#error-handling">Error Handling</a></h2>

There are two classes of errors that can occur with a Mongoose connection.

- **Error on initial connection**: If initial connection fails, Mongoose will emit an 'error' event and the promise `mongoose.connect()` returns will reject. However, Mongoose will **not** automatically try to reconnect.
- **Error after initial connection was established**: Mongoose will attempt to reconnect, and it will emit an 'error' event.

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

<h2 id="options"><a href="#options">Options</a></h2>

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
* `socketTimeoutMS`   - How long the MongoDB driver will wait before killing a socket due to inactivity _after initial connection_. A socket may be inactive because of either no activity or a long-running operation. This is set to `30000` by default, you should set this to 2-3x your longest running operation if you expect some of your database operations to run longer than 20 seconds. This option is passed to [Node.js `socket#setTimeout()` function](https://nodejs.org/api/net.html#net_socket_settimeout_timeout_callback) after the MongoDB driver successfully completes.
* `family`            - Whether to connect using IPv4 or IPv6. This option passed to [Node.js' `dns.lookup()`](https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback) function. If you don't specify this option, the MongoDB driver will try IPv6 first and then IPv4 if IPv6 fails. If your `mongoose.connect(uri)` call takes a long time, try `mongoose.connect(uri, { family: 4 })`
* `authSource`        - The database to use when authenticating with `user` and `pass`. In MongoDB, [users are scoped to a database](https://www.mongodb.com/docs/manual/tutorial/manage-users-and-roles/). If you are getting an unexpected login failure, you may need to set this option.
* `serverSelectionTimeoutMS` - The MongoDB driver will try to find a server to send any given operation to, and keep retrying for `serverSelectionTimeoutMS` milliseconds. If not set, the MongoDB driver defaults to using `30000` (30 seconds).
* `heartbeatFrequencyMS` - The MongoDB driver sends a heartbeat every `heartbeatFrequencyMS` to check on the status of the connection. A heartbeat is subject to `serverSelectionTimeoutMS`, so the MongoDB driver will retry failed heartbeats for up to 30 seconds by default. Mongoose only emits a `'disconnected'` event after a heartbeat has failed, so you may want to decrease this setting to reduce the time between when your server goes down and when Mongoose emits `'disconnected'`. We recommend you do **not** set this setting below 1000, too many heartbeats can lead to performance degradation.

The `serverSelectionTimeoutMS` option also handles how long `mongoose.connect()` will
retry initial connection before erroring out. `mongoose.connect()`
will retry for 30 seconds by default (default `serverSelectionTimeoutMS`) before
erroring out. To get faster feedback on failed operations, you can reduce `serverSelectionTimeoutMS`
to 5000 as shown below.

Example:

```javascript
const options = {
  autoIndex: false, // Don't build indexes
  maxPoolSize: 10, // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  family: 4 // Use IPv4, skip trying IPv6
};
mongoose.connect(uri, options);
```

See [this page](http://mongodb.github.io/node-mongodb-native/3.1/reference/faq/) for more information about `connectTimeoutMS` and `socketTimeoutMS`

<h2 id="callback"><a href="#callback">Callback</a></h2>

The `connect()` function also accepts a callback parameter and returns a
[promise](promises.html).

```javascript
mongoose.connect(uri, options, function(error) {
  // Check error in initial connection. There is no 2nd param to the callback.
});

// Or using promises
mongoose.connect(uri, options).then(
  () => { /** ready to use. The `mongoose.connect()` promise resolves to mongoose instance. */ },
  err => { /** handle initial connection error */ }
);
```

<h2 id="connection-string-options"><a href="#connection-string-options">Connection String Options</a></h2>

You can also specify driver options in your connection string as
[parameters in the query string](https://en.wikipedia.org/wiki/Query_string)
portion of the URI. This only applies to options passed to the MongoDB
driver. You **can't** set Mongoose-specific options like `bufferCommands`
in the query string.

```javascript
mongoose.connect('mongodb://127.0.0.1:27017/test?connectTimeoutMS=1000&bufferCommands=false&authSource=otherdb');
// The above is equivalent to:
mongoose.connect('mongodb://127.0.0.1:27017/test', {
  connectTimeoutMS: 1000
  // Note that mongoose will **not** pull `bufferCommands` from the query string
});
```

The disadvantage of putting options in the query string is that query
string options are harder to read. The advantage is that you only need a
single configuration option, the URI, rather than separate options for
`socketTimeoutMS`, `connectTimeoutMS`, etc. Best practice is to put options
that likely differ between development and production, like `replicaSet`
or `ssl`, in the connection string, and options that should remain constant,
like `connectTimeoutMS` or `maxPoolSize`, in the options object.

The MongoDB docs have a full list of
[supported connection string options](https://www.mongodb.com/docs/manual/reference/connection-string/).
Below are some options that are often useful to set in the connection string because they
are closely associated with the hostname and authentication information.

* `authSource`        - The database to use when authenticating with `user` and `pass`. In MongoDB, [users are scoped to a database](https://www.mongodb.com/docs/manual/tutorial/manage-users-and-roles/). If you are getting an unexpected login failure, you may need to set this option.
* `family`            - Whether to connect using IPv4 or IPv6. This option passed to [Node.js' `dns.lookup()`](https://nodejs.org/api/dns.html#dns_dns_lookup_hostname_options_callback) function. If you don't specify this option, the MongoDB driver will try IPv6 first and then IPv4 if IPv6 fails. If your `mongoose.connect(uri)` call takes a long time, try `mongoose.connect(uri, { family: 4 })`

<h2 id="connection-events"><a href="#connection-events">Connection Events</a></h2>

Connections inherit from [Node.js' `EventEmitter` class](https://nodejs.org/api/events.html#events_class_eventemitter),
and emit events when something happens to the connection, like losing
connectivity to the MongoDB server. Below is a list of events that a
connection may emit.

* `connecting`: Emitted when Mongoose starts making its initial connection to the MongoDB server
* `connected`: Emitted when Mongoose successfully makes its initial connection to the MongoDB server, or when Mongoose reconnects after losing connectivity. May be emitted multiple times if Mongoose loses connectivity.
* `open`: Emitted after `'connected'` and `onOpen` is executed on all of this connection's models.
* `disconnecting`: Your app called [`Connection#close()`](api/connection.html#connection_Connection-close) to disconnect from MongoDB
* `disconnected`: Emitted when Mongoose lost connection to the MongoDB server. This event may be due to your code explicitly closing the connection, the database server crashing, or network connectivity issues.
* `close`: Emitted after [`Connection#close()`](api/connection.html#connection_Connection-close) successfully closes the connection. If you call `conn.close()`, you'll get both a 'disconnected' event and a 'close' event.
* `reconnected`: Emitted if Mongoose lost connectivity to MongoDB and successfully reconnected. Mongoose attempts to [automatically reconnect](https://thecodebarbarian.com/managing-connections-with-the-mongodb-node-driver.html) when it loses connection to the database.
* `error`: Emitted if an error occurs on a connection, like a `parseError` due to malformed data or a payload larger than [16MB](https://www.mongodb.com/docs/manual/reference/limits/#BSON-Document-Size).
* `fullsetup`: Emitted when you're connecting to a replica set and Mongoose has successfully connected to the primary and at least one secondary.
* `all`: Emitted when you're connecting to a replica set and Mongoose has successfully connected to all servers specified in your connection string.

When you're connecting to a single MongoDB server (a "standalone"), Mongoose will emit 'disconnected' if it gets
disconnected from the standalone server, and 'connected' if it successfully connects to the standalone. In a
replica set, Mongoose will emit 'disconnected' if it loses connectivity to the replica set primary, and 'connected' if it manages to reconnect to the replica set primary.

<h2 id="keepAlive"><a href="#keepAlive">A note about keepAlive</a></h2>

Before Mongoose 5.2.0, you needed to enable the `keepAlive` option to initiate [TCP keepalive](https://tldp.org/HOWTO/TCP-Keepalive-HOWTO/overview.html) to prevent `"connection closed"` errors errors.
However, `keepAlive` has been `true` by default since Mongoose 5.2.0, and the `keepAlive` is deprecated as of Mongoose 7.2.0.
Please remove `keepAlive` and `keepAliveInitialDelay` options from your Mongoose connections.

<h2 id="replicaset_connections"><a href="#replicaset_connections">Replica Set Connections</a></h2>

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

<h2 id="server-selection"><a href="#server-selection">Server Selection</a></h2>

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

<h2 id="replicaset-hostnames"><a href="#replicaset-hostnames">Replica Set Host Names</a></h2>

MongoDB replica sets rely on being able to reliably figure out the domain name for each member. 
On Linux and OSX, the MongoDB server uses the output of the [`hostname` command](https://linux.die.net/man/1/hostname) to figure out the domain name to report to the replica set.
This can cause confusing errors if you're connecting to a remote MongoDB replica set running on a machine that reports its `hostname` as `localhost`:

```
// Can get this error even if your connection string doesn't include
// `localhost` if `rs.conf()` reports that one replica set member has
// `localhost` as its host name.
MongooseServerSelectionError: connect ECONNREFUSED localhost:27017
```

If you're experiencing a similar error, connect to the replica set using the `mongo` shell and run the [`rs.conf()`](https://www.mongodb.com/docs/manual/reference/method/rs.conf/) command to check the host names of each replica set member.
Follow [this page's instructions to change a replica set member's host name](https://www.mongodb.com/docs/manual/tutorial/change-hostnames-in-a-replica-set/#change-hostnames-while-maintaining-replica-set-availability).

You can also check the `reason.servers` property of `MongooseServerSelectionError` to see what the MongoDB Node driver thinks the state of your replica set is.
The `reason.servers` property contains a [map](https://masteringjs.io/tutorials/fundamentals/map) of server descriptions.

```
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

<h2 id="mongos_connections"><a href="#mongos_connections">Multi-mongos support</a></h2>

You can also connect to multiple [mongos](https://www.mongodb.com/docs/manual/reference/program/mongos/) instances
for high availability in a sharded cluster. You do
[not need to pass any special options to connect to multiple mongos](http://mongodb.github.io/node-mongodb-native/3.0/tutorials/connect/#connect-to-sharded-cluster) in mongoose 5.x.

```javascript
// Connect to 2 mongos servers
mongoose.connect('mongodb://mongosA:27501,mongosB:27501', cb);
```

<h2 id="multiple_connections"><a href="#multiple_connections">Multiple connections</a></h2>

So far we've seen how to connect to MongoDB using Mongoose's default
connection. Mongoose creates a _default connection_ when you call `mongoose.connect()`.
You can access the default connection using `mongoose.connection`.

You may need multiple connections to MongoDB for several reasons.
One reason is if you have multiple databases or multiple MongoDB clusters.
Another reason is to work around [slow trains](https://thecodebarbarian.com/slow-trains-in-mongodb-and-nodejs).
The `mongoose.createConnection()` function takes the same arguments as
`mongoose.connect()` and returns a new connection.

```javascript
const conn = mongoose.createConnection('mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database][?options]]', options);
```

This [connection](api/connection.html#connection_Connection) object is then used to
create and retrieve [models](api/model.html#model_Model). Models are
**always** scoped to a single connection.

```javascript
const UserModel = conn.model('User', userSchema);
```

If you use multiple connections, you should make sure you export schemas,
**not** models. Exporting a model from a file is called the _export model pattern_.
The export model pattern is limited because you can only use one connection.

```javascript
const userSchema = new Schema({ name: String, email: String });

// The alternative to the export model pattern is the export schema pattern.
module.exports = userSchema;

// Because if you export a model as shown below, the model will be scoped
// to Mongoose's default connection.
// module.exports = mongoose.model('User', userSchema);
```

If you use the export schema pattern, you still need to create models
somewhere. There are two common patterns. First is to export a connection
and register the models on the connection in the file:

```javascript
// connections/fast.js
const mongoose = require('mongoose');

const conn = mongoose.createConnection(process.env.MONGODB_URI);
conn.model('User', require('../schemas/user'));

module.exports = conn;

// connections/slow.js
const mongoose = require('mongoose');

const conn = mongoose.createConnection(process.env.MONGODB_URI);
conn.model('User', require('../schemas/user'));
conn.model('PageView', require('../schemas/pageView'));

module.exports = conn;
```

Another alternative is to register connections with a dependency injector
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

<h2 id="connection_pools"><a href="#connection_pools">Connection Pools</a></h2>

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

<h2 id="next">Next Up</h2>

Now that we've covered connections, let's take a look at [models](models.html).
