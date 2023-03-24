# Using Async/Await with Mongoose

* [Basic Use](#basic-use)
* [Async Functions](#async-functions)
* [Queries](#queries)

## Basic Use

Async/await lets us write asynchronous code as if it were synchronous. 
This is especially helpful for avoiding callback hell when executing multiple async operations in sequence--a common scenario when working with Mongoose.
Each of the three functions below retrieves a record from the database, updates it, and prints the updated record to the console.

```javascript
// Works.
function callbackUpdate() {
  MyModel.findOne({ firstName: 'franklin', lastName: 'roosevelt' }, function(err, doc) {
    if (err) {
      handleError(err);
    }

    doc.middleName = 'delano';

    doc.save(function(err, updatedDoc) {
      if (err) {
        handleError(err);
      }

      // Final logic is 2 callbacks deep
      console.log(updatedDoc);
    });
  });
}

// Better.
function thenUpdate() {
  MyModel.findOne({ firstName: 'franklin', lastName: 'roosevelt' })
    .then(function(doc) {
      doc.middleName = 'delano';
      return doc.save();
    })
    .then(console.log)
    .catch(function(err) {
      handleError(err);
    });
}

// Best?
async function awaitUpdate() {
  try {
    const doc = await MyModel.findOne({
      firstName: 'franklin',
      lastName: 'roosevelt'
    });

    doc.middleName = 'delano';

    console.log(await doc.save());
  }
  catch (err) {
    handleError(err);
  }
}
```

Note that the specific fulfillment values of different Mongoose methods vary, and may be affected by configuration. Please refer to the [API documentation](api/mongoose.html.html) for information about specific methods.

## Async Functions

Adding the keyword *async* to a JavaScript function automatically causes it to return a native JavaScript promise.
This is true [regardless of the return value we specify in the function body](http://thecodebarbarian.com/async-functions-in-javascript.html#an-async-function-always-returns-a-promise).     

```javascript
async function getUser() {
  // Inside getUser, we can await an async operation and interact with
  // foundUser as a normal, non-promise value...
  const foundUser = await User.findOne({ name: 'bill' });

  console.log(foundUser); // Prints '{name: 'bill', admin: false}'
  return foundUser;
}

// However, because async functions always return a promise,
// user is a promise.
const user = getUser();

console.log(user); // Oops.  Prints '[Promise]'
```

Instead, treat the return value of an async function as you would any other promise.  Await its fulfillment inside another async function, or chain onto it using `.then` blocks.

```javascript
async function getUser() {
  const foundUser = await User.findOne({ name: 'bill' });
  return foundUser;
}

async function doStuffWithUser() {
  // Await the promise returned from calling getUser.
  const user = await getUser();

  console.log(user); // Prints '{name: 'bill', admin: false}'
}
```

<h2 id="queries">Async/Await with Mongoose Queries</h2>

Under the hood, [async/await is syntactic sugar](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await) over the Promise API.
Due to the surprisingly simple way promises are implemented in JavaScript, the keyword `await` will try to unwrap any object with a property whose key is the string ‘then’ and whose value is a function. 
Such objects belong to a broader class of objects called [thenables](https://masteringjs.io/tutorials/fundamentals/thenable). 
If the thenable being unwrapped is a genuine promise, e.g. an instance of the [Promise constructor](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), we enjoy several guarantees about how the object’s ‘then’ function will behave. 
However, Mongoose provides several static helper methods that return a different class of thenable object called a [Query](queries.html)--and [Queries are not promises](queries.html#queries-are-not-promises). 
Because Queries are also *thenables*, we can interact with a Query using async/await just as we would interact with a genuine promise, with one key difference: observing the fulfillment value of a genuine promise cannot under any circumstances change that value, but trying to re-observe the value of a Query may cause the Query to be re-executed.

```javascript
function isPromise(thenable) {
  return thenable instanceof Promise;
}

// The fulfillment value of the promise returned by user.save() will always be the same,
// regardless of how, or how often, we observe it.
async function observePromise() {
  const user = await User.findOne({ firstName: 'franklin', lastName: 'roosevelt' });

  user.middleName = 'delano';

  // Document.prototype.save() returns a *genuine* promise
  const realPromise = user.save();

  console.log(isPromise(realPromise)); // true

  const awaitedValue = await realPromise;

  realPromise.then(chainedValue => console.log(chainedValue === awaitedValue)); // true
}

// By contrast, the value we receive when we try to observe the same Query more than
// once is different every time.  The Query is re-executing.
async function observeQuery() {
  const query = User.findOne({ firstName: 'leroy', lastName: 'jenkins' });

  console.log(isPromise(query)); // false

  const awaitedValue = await query;

  query.then(chainedValue => console.log(chainedValue === awaitedValue)); // false
}
```

You are most likely to accidentally re-execute queries in this way when mixing callbacks with async/await.
This is never necessary and should be avoided.
If you need a Query to return a fully-fledged promise instead of a [thenable](https://masteringjs.io/tutorials/fundamentals/thenable), you can use [Query#exec()](api/query.html#query_Query-exec).
