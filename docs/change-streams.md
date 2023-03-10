# Change Streams

[Change streams](https://www.mongodb.com/developer/languages/javascript/nodejs-change-streams-triggers/) let you listen for updates to documents in a given model's collection, or even documents in an entire database.
Unlike [middleware](middleware.html), change streams are a MongoDB server construct, which means they pick up changes from anywhere.
Even if you update a document from a MongoDB GUI, your Mongoose change stream will be notified.

The `watch()` function creates a change stream.
Change streams emit a `'data'` event when a document is updated.

```javascript
const Person = mongoose.model('Person', new mongoose.Schema({ name: String }));

// Create a change stream. The 'change' event gets emitted when there's a
// change in the database. Print what the change stream emits.
Person.watch().
  on('change', data => console.log(data));

// Insert a doc, will trigger the change stream handler above
await Person.create({ name: 'Axl Rose' });
```

The above script will print output that looks like:

```no-highlight
{
  _id: {
    _data: '8262408DAC000000012B022C0100296E5A10042890851837DB4792BE6B235E8B85489F46645F6964006462408DAC6F5C42FF5EE087A20004'
  },
  operationType: 'insert',
  clusterTime: new Timestamp({ t: 1648397740, i: 1 }),
  fullDocument: {
    _id: new ObjectId("62408dac6f5c42ff5ee087a2"),
    name: 'Axl Rose',
    __v: 0
  },
  ns: { db: 'test', coll: 'people' },
  documentKey: { _id: new ObjectId("62408dac6f5c42ff5ee087a2") }
}
```

Note that you **must** be connected to a MongoDB replica set or sharded cluster to use change streams.
If you try to call `watch()` when connected to a standalone MongoDB server, you'll get the below error.

```no-highlight
MongoServerError: The $changeStream stage is only supported on replica sets
```

If you're using `watch()` in production, we recommend using [MongoDB Atlas](https://www.mongodb.com/atlas/database).
For local development, we recommend [mongodb-memory-server](https://www.npmjs.com/package/mongodb-memory-server) or [run-rs](https://www.npmjs.com/package/run-rs) to start a replica set locally.

## Iterating using `next()`

If you want to iterate through a change stream in a [AWS Lambda function](lambda.html), do **not** use event emitters to listen to the change stream.
You need to make sure you close your change stream when your Lambda function is done executing, because your change stream may end up in an inconsistent state if Lambda stops your container while the change stream is pulling data from MongoDB.

Change streams also have a `next()` function that lets you explicitly wait for the next change to come in.
Use `resumeAfter` to track where the last change stream left off, and add a timeout to make sure your handler doesn't wait forever if no changes come in.

```javascript
let resumeAfter = undefined;

exports.handler = async(event, context) => {
  // add this so that we can re-use any static/global variables between function calls if Lambda
  // happens to re-use existing containers for the invocation.
  context.callbackWaitsForEmptyEventLoop = false;

  await connectToDatabase();

  const changeStream = await Country.watch([], { resumeAfter });

  // Change stream `next()` will wait forever if there are no changes. So make sure to
  // stop listening to the change stream after a fixed period of time.
  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(false), 1000));
  let doc = null;
  while (doc = await Promise.race([changeStream.next(), timeoutPromise])) {
    console.log('Got', doc);
  }

  // `resumeToken` tells you where the change stream left off, so next function instance
  // can pick up any changes that happened in the meantime.
  resumeAfter = changeStream.resumeToken;
  await changeStream.close();
};
```
