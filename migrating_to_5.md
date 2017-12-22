* Mongoose now requires node.js >= 4.0.0 and MongoDB >= 3.0.0. [MongoDB 2.6](https://www.mongodb.com/blog/post/mongodb-2-6-end-of-life) and [Node.js < 4](https://github.com/nodejs/Release) where both EOL-ed in 2016.

* Domain sockets must be URI encoded. For example:

```javascript
// Works in mongoose 4. Does **not** work in mongoose 5 because of more
// stringent URI parsing.
const host = '/tmp/mongodb-27017.sock';
mongoose.createConnection(`mongodb://aaron:psw@${host}/fake`);

// Do this instead
const host = encodeURIComponent('/tmp/mongodb-27017.sock');
mongoose.createConnection(`mongodb://aaron:psw@${host}/fake`);
```

* `mongoose.connect()` and `mongoose.disconnect()` now return a promise if no callback specified, or `null` otherwise. It does **not** return the mongoose singleton.

```javascript
// Worked in mongoose 4. Does **not** work in mongoose 5, `mongoose.connect()`
// now returns a promise consistently. This is to avoid the horrible things
// we've done to allow mongoose to be a thenable that resolves to itself.
mongoose.connect('mongodb://localhost:27017/test').model('Test', new Schema({}));

// Do this instead
mongoose.connect('mongodb://localhost:27017/test');
mongoose.model('Test', new Schema({}));
```

* Setters run in reverse order in 4.x:

```javascript
const schema = new Schema({ name: String });
schema.path('name').
  get(() => console.log('This will print 2nd')).
  get(() => console.log('This will print first'));
```

In 5.x, setters run in the order they're declared.

```javascript
const schema = new Schema({ name: String });
schema.path('name').
  get(() => console.log('This will print first')).
  get(() => console.log('This will print 2nd'));
```

* `deleteOne()`, `deleteMany()`, and `remove()` now resolve to the result object
rather than the full [driver `WriteOpResult` object](http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#~writeOpCallback).

```javascript
// In 4.x, this is how you got the number of documents deleted
MyModel.deleteMany().then(res => console.log(res.result.n));
// In 5.x this is how you get the number of documents deleted
MyModel.deleteMany().then(res => res.n);
```

* The `options` parameter to `toObject()` and `toJSON()` merge defaults rather than overwriting them.

```javascript
// Note the `toObject` option below
const schema = new Schema({ name: String }, { toObject: { virtuals: true } });
schema.virtual('answer').get(() => 42);
const MyModel = db.model('MyModel', schema);

const doc = new MyModel({ name: 'test' });
// In mongoose 4.x this prints "undefined", because `{ minimize: false }`
// overwrites the entire schema-defined options object.
// In mongoose 5.x this prints "42", because `{ minimize: false }` gets
// merged with the schema-defined options.
console.log(doc.toJSON({ minimize: false }).answer);
```

* `aggregate()` no longer accepts a spread, you **must** pass your aggregation pipeline as an array. The below code worked in 4.x:

```javascript
MyModel.aggregate({ $match: { isDeleted: false } }, { $skip: 10 }).exec(cb);
```

The above code does **not** work in 5.x, you **must** wrap the `$match` and `$skip` stages in an array.

```javascript
MyModel.aggregate([{ $match: { isDeleted: false } }, { $skip: 10 }]).exec(cb);
```

* Post hooks now get flow control, which means async post save hooks and child document post save hooks execute **before** your `save()` callback.

```javsscript
const ChildModelSchema = new mongoose.Schema({
  text: {
    type: String
  }
});
ChildModelSchema.post('save', function(doc) {
  // In mongoose 5.x this will print **before** the `console.log()`
  // in the `save()` callback. In mongoose 4.x this was reversed.
  console.log('Child post save');
});
const ParentModelSchema = new mongoose.Schema({
  children: [ChildModelSchema]
});

const Model = mongoose.model('Parent', ParentModelSchema);
const m = new Model({ children: [{ text: 'test' }] });
m.save(function() {
  // In mongoose 5.xm this prints **after** the "Child post save" message.
  console.log('Save callback');
});
```

* `$pushAll` is no longer supported and no longer used internally for `save()`, since it has been [deprecated since MongoDB 2.4](https://docs.mongodb.com/manual/reference/operator/update/pushAll/). Use `$push` with `$each` instead.

* The `retainKeyOrder` option was removed, mongoose will now always retain the same key position when cloning objects. If you have queries or indexes that rely on reverse key order, you will have to change them.

* We no longer have a pre-compiled version of mongoose for the browser. If you want to use mongoose schemas in the browser, you need to build your own bundle with browserify/webpack.

* The `saveErrorIfNotFound` option was removed, mongoose will now always error out from `save()` if the underlying document was not found

* `init` hooks are now fully synchronous and do not receive `next()` as a parameter.

* `Document.prototype.init()` no longer takes a callback as a parameter. It
was always synchronous, just had a callback for legacy reasons.

* `doc.save()` no longer passes `numAffected` as a 3rd param to its callback.

* `doc.remove()` no longer debounces

* `getPromiseConstructor()` is gone, just use `mongoose.Promise`.

* You cannot pass parameters to the next pre middleware in the chain using `next()` in mongoose 5.x. In mongoose 4, `next('Test')` in pre middleware would call the
next middleware with 'Test' as a parameter. Mongoose 5.x has removed support for this.
