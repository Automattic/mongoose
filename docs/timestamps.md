# Timestamps

Mongoose schemas support a `timestamps` option.
If you set `timestamps: true`, Mongoose will add two properties of type `Date` to your schema:

1. `createdAt`: a date representing when this document was created
2. `updatedAt`: a date representing when this document was last updated

Mongoose will then set `createdAt` when the document is first inserted, and update `updatedAt` whenever you update the document using `save()`, `updateOne()`, `updateMany()`, `findOneAndUpdate()`, `update()`, `replaceOne()`, or `bulkWrite()`.

```javascript
const userSchema = new Schema({ name: String }, { timestamps: true });
const User = mongoose.model('User', userSchema);

let doc = await User.create({ name: 'test' });

console.log(doc.createdAt); // 2022-02-26T16:37:48.244Z
console.log(doc.updatedAt); // 2022-02-26T16:37:48.244Z

doc.name = 'test2';
await doc.save();
console.log(doc.createdAt); // 2022-02-26T16:37:48.244Z
console.log(doc.updatedAt); // 2022-02-26T16:37:48.307Z

doc = await User.findOneAndUpdate({ _id: doc._id }, { name: 'test3' }, { new: true });
console.log(doc.createdAt); // 2022-02-26T16:37:48.244Z
console.log(doc.updatedAt); // 2022-02-26T16:37:48.366Z
```

The `createdAt` property is immutable, and Mongoose overwrites any user-specified updates to `updatedAt` by default.

```javascript
let doc = await User.create({ name: 'test' });

console.log(doc.createdAt); // 2022-02-26T17:08:13.930Z
console.log(doc.updatedAt); // 2022-02-26T17:08:13.930Z

doc.name = 'test2';
doc.createdAt = new Date(0);
doc.updatedAt = new Date(0);
await doc.save();

// Mongoose blocked changing `createdAt` and set its own `updatedAt`, ignoring
// the attempt to manually set them.
console.log(doc.createdAt); // 2022-02-26T17:08:13.930Z
console.log(doc.updatedAt); // 2022-02-26T17:08:13.991Z

// Mongoose also blocks changing `createdAt` and sets its own `updatedAt`
// on `findOneAndUpdate()`, `updateMany()`, and other query operations
doc = await User.findOneAndUpdate(
  { _id: doc._id },
  { name: 'test3', createdAt: new Date(0), updatedAt: new Date(0) },
  { new: true }
);
console.log(doc.createdAt); // 2022-02-26T17:08:13.930Z
console.log(doc.updatedAt); // 2022-02-26T17:08:14.008Z
```

## Alternate Property Names

For the purposes of these docs, we'll always refer to `createdAt` and `updatedAt`.
But you can overwrite these property names as shown below.

```javascript
const userSchema = new Schema({ name: String }, {
  timestamps: {
    createdAt: 'created_at', // Use `created_at` to store the created date
    updatedAt: 'updated_at' // and `updated_at` to store the last updated date
  }
});
```

## Disabling Timestamps

`save()`, `updateOne()`, `updateMany()`, `findOneAndUpdate()`, `update()`, `replaceOne()`, and `bulkWrite()` all support a `timestamps` option.
Set `timestamps: false` to skip setting timestamps for that particular operation.

```javascript
let doc = await User.create({ name: 'test' });

console.log(doc.createdAt); // 2022-02-26T23:28:54.264Z
console.log(doc.updatedAt); // 2022-02-26T23:28:54.264Z

doc.name = 'test2';

// Setting `timestamps: false` tells Mongoose to skip updating `updatedAt` on this `save()`
await doc.save({ timestamps: false });
console.log(doc.updatedAt); // 2022-02-26T23:28:54.264Z

// Similarly, setting `timestamps: false` on a query tells Mongoose to skip updating
// `updatedAt`.
doc = await User.findOneAndUpdate({ _id: doc._id }, { name: 'test3' }, {
  new: true,
  timestamps: false
});
console.log(doc.updatedAt); // 2022-02-26T23:28:54.264Z

// Below is how you can disable timestamps on a `bulkWrite()`
await User.bulkWrite([{
  updateOne: {
    filter: { _id: doc._id },
    update: { name: 'test4' },
    timestamps: false
  }
}]);
doc = await User.findOne({ _id: doc._id });
console.log(doc.updatedAt); // 2022-02-26T23:28:54.264Z
```

You can also set the `timestamps` option to an object to configure `createdAt` and `updatedAt` separately.
For example, in the below code, Mongoose sets `createdAt` on `save()` but skips `updatedAt`.

```javascript
const doc = new User({ name: 'test' });

// Tell Mongoose to set `createdAt`, but skip `updatedAt`.
await doc.save({ timestamps: { createdAt: true, updatedAt: false } });
console.log(doc.createdAt); // 2022-02-26T23:32:12.478Z
console.log(doc.updatedAt); // undefined
```

Disabling timestamps also lets you set timestamps yourself.
For example, suppose you need to correct a document's `createdAt` or `updatedAt` property.
You can do that by setting `timestamps: false` and setting `createdAt` yourself as shown below.

```javascript
let doc = await User.create({ name: 'test' });

// To update `updatedAt`, do a `findOneAndUpdate()` with `timestamps: false` and
// `updatedAt` set to the value you want
doc = await User.findOneAndUpdate({ _id: doc._id }, { updatedAt: new Date(0) }, {
  new: true,
  timestamps: false
});
console.log(doc.updatedAt); // 1970-01-01T00:00:00.000Z

// To update `createdAt`, you also need to set `strict: false` because `createdAt`
// is immutable
doc = await User.findOneAndUpdate({ _id: doc._id }, { createdAt: new Date(0) }, {
  new: true,
  timestamps: false,
  strict: false
});
console.log(doc.createdAt); // 1970-01-01T00:00:00.000Z
```

## Timestamps on Subdocuments

Mongoose also supports setting timestamps on subdocuments.
Keep in mind that `createdAt` and `updatedAt` for subdocuments represent when the subdocument was created or updated, not the top level document.
Overwriting a subdocument will also overwrite `createdAt`.

```javascript
const roleSchema = new Schema({ value: String }, { timestamps: true });
const userSchema = new Schema({ name: String, roles: [roleSchema] });

const doc = await User.create({ name: 'test', roles: [{ value: 'admin' }] });
console.log(doc.roles[0].createdAt); // 2022-02-27T00:22:53.836Z
console.log(doc.roles[0].updatedAt); // 2022-02-27T00:22:53.836Z

// Overwriting the subdocument also overwrites `createdAt` and `updatedAt`
doc.roles[0] = { value: 'root' };
await doc.save();
console.log(doc.roles[0].createdAt); // 2022-02-27T00:22:53.902Z
console.log(doc.roles[0].updatedAt); // 2022-02-27T00:22:53.902Z

// But updating the subdocument preserves `createdAt` and updates `updatedAt`
doc.roles[0].value = 'admin';
await doc.save();
console.log(doc.roles[0].createdAt); // 2022-02-27T00:22:53.902Z
console.log(doc.roles[0].updatedAt); // 2022-02-27T00:22:53.909Z
```

## Under the Hood

For queries with timestamps, Mongoose adds 2 properties to each update query:

1. Add `updatedAt` to `$set`
2. Add `createdAt` to `$setOnInsert`

For example, if you run the below code:

```javascript
mongoose.set('debug', true);

const userSchema = new Schema({
  name: String
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

await User.findOneAndUpdate({}, { name: 'test' });
```

You'll see the below output from Mongoose debug mode:

```no-highlight
Mongoose: users.findOneAndUpdate({}, { '$setOnInsert': { createdAt: new Date("Sun, 27 Feb 2022 00:26:27 GMT") }, '$set': { updatedAt: new Date("Sun, 27 Feb 2022 00:26:27 GMT"), name: 'test' }}, {...})
```

Notice the `$setOnInsert` for `createdAt` and `$set` for `updatedAt`.
MongoDB's [`$setOnInsert` operator](https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/) applies the update only if a new document is [upserted](https://masteringjs.io/tutorials/mongoose/upsert).
So, for example, if you want to _only_ set `updatedAt` if the document if a new document is created, you can disable the `updatedAt` timestamp and set it yourself as shown below:

```javascript
await User.findOneAndUpdate({}, { $setOnInsert: { updatedAt: new Date() } }, {
  timestamps: { createdAt: true, updatedAt: false }
});
```
