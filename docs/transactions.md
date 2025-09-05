# Transactions in Mongoose

[Transactions](https://www.mongodb.com/transactions) let you execute multiple operations in isolation and potentially undo all the operations if one of them fails.
This guide will get you started using transactions with Mongoose.

## Getting Started with Transactions {#getting-started-with-transactions}

If you haven't already, import mongoose:

```javascript
import mongoose from 'mongoose';
```

To create a transaction, you first need to create a session using [`Mongoose#startSession`](api/mongoose.html#mongoose_Mongoose-startSession)
or [`Connection#startSession()`](api/connection.html#connection_Connection-startSession).

```javascript
// Using Mongoose's default connection
const session = await mongoose.startSession();

// Using custom connection
const db = await mongoose.createConnection(mongodbUri).asPromise();
const session = await db.startSession();
```

In practice, you should use either the [`session.withTransaction()` helper](https://mongodb.github.io/node-mongodb-native/3.2/api/ClientSession.html#withTransaction)
or Mongoose's `Connection#transaction()` function to run a transaction. The `session.withTransaction()` helper handles:

* Creating a transaction
* Committing the transaction if it succeeds
* Aborting the transaction if your operation throws
* Retrying in the event of a [transient transaction error](https://stackoverflow.com/questions/52153538/what-is-a-transienttransactionerror-in-mongoose-or-mongodb).

```acquit
[require:transactions.*withTransaction]
```

For more information on the `ClientSession#withTransaction()` function, please see
[the MongoDB Node.js driver docs](https://mongodb.github.io/node-mongodb-native/3.2/api/ClientSession.html#withTransaction).

Mongoose's `Connection#transaction()` function is a wrapper around `withTransaction()` that
integrates Mongoose change tracking with transactions.
For example, suppose you `save()` a document in a transaction that later fails.
The changes in that document are not persisted to MongoDB.
The `Connection#transaction()` function informs Mongoose change tracking that the `save()` was rolled back, and marks all fields that were changed in the transaction as modified.

```javascript
const doc = new Person({ name: 'Will Riker' });

await db.transaction(async function setRank(session) {
  doc.name = 'Captain';
  await doc.save({ session });
  doc.isNew; // false

  // Throw an error to abort the transaction
  throw new Error('Oops!');
}, { readPreference: 'primary' }).catch(() => {});

// true, `transaction()` reset the document's state because the
// transaction was aborted.
doc.isNew;
```

## Note About Parallelism in Transactions {#note-about-parallelism-in-transactions}

Running operations in parallel is **not supported** during a transaction.
The use of `Promise.all`, `Promise.allSettled`, `Promise.race`, etc. to parallelize operations inside a transaction is undefined behaviour and should be avoided.

MongoDB also does not support multiple transactions on the same session in parallel.
This also means MongoDB does not support nested transactions on the same session.
The following code will throw a `Transaction already in progress` error.

```javascript
const doc = new Person({ name: 'Will Riker' });

await db.transaction(async function setRank(session) {
  // This throws `Transaction already in progress` because there is already a transaction
  // in progress for this session.
  await session.withTransaction(async () => {});
});
```

## With Mongoose Documents and `save()` {#with-mongoose-documents-and-save}

If you get a [Mongoose document](documents.html) from [`findOne()`](api/model.html#model_Model-findOne)
or [`find()`](api/model.html#model_Model-find) using a session, the document will
keep a reference to the session and use that session for [`save()`](api/document.html#document_Document-save).

To get/set the session associated with a given document, use [`doc.$session()`](api/document.html#document_Document-$session).

```acquit
[require:transactions.*save]
```

## With the Aggregation Framework {#with-the-aggregation-framework}

The `Model.aggregate()` function also supports transactions. Mongoose
aggregations have a [`session()` helper](api/aggregate.html#aggregate_Aggregate-session)
that sets the [`session` option](api/aggregate.html#aggregate_Aggregate-option).
Below is an example of executing an aggregation within a transaction.

```acquit
[require:transactions.*aggregate]
```

## Using AsyncLocalStorage {#asynclocalstorage}

One major pain point with transactions in Mongoose is that you need to remember to set the `session` option on every operation.
If you don't, your operation will execute outside of the transaction.
Mongoose 8.4 is able to set the `session` operation on all operations within a `Connection.prototype.transaction()` executor function using Node's [AsyncLocalStorage API](https://nodejs.org/api/async_context.html#class-asynclocalstorage).
Set the `transactionAsyncLocalStorage` option using `mongoose.set('transactionAsyncLocalStorage', true)` to enable this feature.

```javascript
mongoose.set('transactionAsyncLocalStorage', true);

const Test = mongoose.model('Test', mongoose.Schema({ name: String }));

const doc = new Test({ name: 'test' });

// Save a new doc in a transaction that aborts
await connection.transaction(async() => {
  await doc.save(); // Notice no session here
  throw new Error('Oops');
}).catch(() => {});

// false, `save()` was rolled back
await Test.exists({ _id: doc._id });
```

With `transactionAsyncLocalStorage`, you no longer need to pass sessions to every operation.
Mongoose will add the session by default under the hood.

`transactionAsyncLocalStorage` creates a new session each time you call `connection.transaction()`.
This means each transaction will have its own session and be independent of other transactions.
This also means that nested transactions are also independent of each other.

```javascript
await mongoose.connection.transaction(async () => {
  await User.create({ name: 'John' });
  // This starts an independent transaction - this transaction will **NOT**
  // be rolled back even though it is within another `transaction()` call
  await mongoose.connection.transaction(async () => {
    await User.create({ name: 'Jane' });
  });
  throw new Error('Fail the top-level transaction');
});
```

However, if the nested transaction fails, the top-level transaction will still be rolled back because `await mongoose.connection.transaction()` throws.

```javascript
await mongoose.connection.transaction(async () => {
  await User.create({ name: 'John' });
  await mongoose.connection.transaction(async () => {
    // This causes both transactions to roll back, but only because this error bubbles up.
    throw new Error('Fail the nested transaction');
  });
});
```

## Advanced Usage {#advanced-usage}

Advanced users who want more fine-grained control over when they commit or abort transactions
can use `session.startTransaction()` to start a transaction:

```acquit
[require:transactions.*basic example]
```

You can also use `session.abortTransaction()` to abort a transaction:

```acquit
[require:transactions.*abort]
```
