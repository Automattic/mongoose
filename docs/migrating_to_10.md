# Migrating from 9.x to 10.x

<style>
  ul > li {
    padding: 4px 0px;
  }
</style>

There are several backwards-breaking changes you should be aware of when migrating from Mongoose 9.x to Mongoose 10.x.

If you're still on Mongoose 8.x or earlier, please read the [Mongoose 8.x to 9.x migration guide](migrating_to_9.html) and upgrade to Mongoose 9.x first before upgrading to Mongoose 10.

## Removed on-the-fly casting for documents

Mongoose 10 no longer supports on-the-fly (also called ad hoc) casting for document paths. In Mongoose 9, you could pass a type as the third argument to `Document#set()` or the second argument to `Document#get()` to cast a value for a path that is not in the schema. Mongoose 10 ignores these type arguments and no longer stores ad hoc schema types on individual documents.

```javascript
const schema = new mongoose.Schema({}, { strict: false });
const Test = mongoose.model('Test', schema);
const doc = new Test();

// Worked in Mongoose 9, but throws an error in Mongoose 10
doc.set('count', '42', Number);
doc.get('count', Number);
```

Cast values explicitly instead of relying on adhoc type casting.

The function signature for `Document#set()` and its alias `Document#$set()` is now `function set(path, val, options?)` - the 3rd argument is now `options`.
The `type` argument has been removed.

## Removed support for passing a query to model query methods

Mongoose 10 no longer supports passing a query instance as the filter to model query methods like `find()` and `findOne()`.

If you need to copy a query into another query, use `Query.prototype.merge()`:

```javascript
const query = User.find({ status: 'active' }).select('name');
const queryToRun = User.find().merge(query);

await queryToRun.exec();
```

`Query.prototype.merge()` copies the query's conditions, field selection, and options to the query it is called on.
