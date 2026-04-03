# Query Casting

The first parameter to [`Model.find()`](../api/model.html#model_Model-find), [`Query#find()`](../api/query.html#query_Query-find), [`Model.findOne()`](../api/model.html#model_Model-findOne), etc. is called `filter`.
In older content this parameter is sometimes called `query` or `conditions`. For example:

```javascript acquit:Cast Tutorial.*get and set
const query = Character.find({ name: 'Jean-Luc Picard' });
query.getFilter(); // `{ name: 'Jean-Luc Picard' }`

// Subsequent chained calls merge new properties into the filter
query.find({ age: { $gt: 50 } });
query.getFilter(); // `{ name: 'Jean-Luc Picard', age: { $gt: 50 } }`
```

When you execute the query using [`Query#exec()`](../api/query.html#query_Query-exec) or [`Query#then()`](../api/query.html#query_Query-then), Mongoose *casts* the filter to match your schema.

```javascript acquit:Cast Tutorial.*cast values
// Note that `_id` and `age` are strings. Mongoose will cast `_id` to
// a MongoDB ObjectId and `age.$gt` to a number.
const query = Character.findOne({
  _id: '5cdc267dd56b5662b7b7cc0c',
  age: { $gt: '50' }
});

// `{ _id: '5cdc267dd56b5662b7b7cc0c', age: { $gt: '50' } }`
// Query hasn't been executed yet, so Mongoose hasn't casted the filter.
query.getFilter();

const doc = await query.exec();
doc.name; // "Jean-Luc Picard"

// Mongoose casted the filter, so `_id` became an ObjectId and `age.$gt`
// became a number.
query.getFilter()._id instanceof mongoose.Types.ObjectId; // true
typeof query.getFilter().age.$gt === 'number'; // true
```

If Mongoose fails to cast the filter to your schema, your query will throw a `CastError`.

```javascript acquit:Cast Tutorial.*cast error
const query = Character.findOne({ age: { $lt: 'not a number' } });

const err = await query.exec().then(() => null, err => err);
err instanceof mongoose.CastError; // true
// Cast to number failed for value "not a number" at path "age" for
// model "Character"
err.message;
```

## The `strictQuery` Option

By default, Mongoose does **not** cast filter properties that aren't in your schema.

```javascript acquit:Cast Tutorial.*not in schema
const query = Character.findOne({ notInSchema: { $lt: 'not a number' } });

// No error because `notInSchema` is not defined in the schema
await query.exec();
```

You can configure this behavior using the [`strictQuery` option for schemas](../guide.html#strictQuery). This option is analogous to the [`strict` option](../guide.html#strict). Setting `strictQuery` to `true` removes non-schema properties from the filter:

```javascript acquit:Cast Tutorial.*strictQuery true
mongoose.deleteModel('Character');
const schema = new mongoose.Schema({ name: String, age: Number }, {
  strictQuery: true
});
Character = mongoose.model('Character', schema);

const query = Character.findOne({ notInSchema: { $lt: 'not a number' } });

await query.exec();
query.getFilter(); // Empty object `{}`, Mongoose removes `notInSchema`
```

To make Mongoose throw an error if your `filter` has a property that isn't in the schema, set `strictQuery` to `'throw'`:

```javascript acquit:Cast Tutorial.*strictQuery throw
mongoose.deleteModel('Character');
const schema = new mongoose.Schema({ name: String, age: Number }, {
  strictQuery: 'throw'
});
Character = mongoose.model('Character', schema);

const query = Character.findOne({ notInSchema: { $lt: 'not a number' } });

const err = await query.exec().then(() => null, err => err);
err.name; // 'StrictModeError'
// Path "notInSchema" is not in schema and strictQuery is 'throw'.
err.message;
```

## Implicit `$in`

Because of schemas, Mongoose knows what types fields should be, so it can provide some neat syntactic sugar. For example, if you forget to put [`$in`](https://www.mongodb.com/docs/manual/reference/operator/query/in/) on a non-array field, Mongoose will add `$in` for you.

```javascript acquit:Cast Tutorial.*implicit in
// Normally wouldn't find anything because `name` is a string, but
// Mongoose automatically inserts `$in`
const query = Character.findOne({ name: ['Jean-Luc Picard', 'Will Riker'] });

const doc = await query.exec();
doc.name; // "Jean-Luc Picard"

// `{ name: { $in: ['Jean-Luc Picard', 'Will Riker'] } }`
query.getFilter();
```
