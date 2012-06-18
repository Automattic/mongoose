
Finding documents
=================

Documents can be retrieved through `find`, `findOne` and `findById`. These
methods are executed on your `Model`s.

## Model.find

    Model.find(query, fields, options, callback)

    // fields and options can be omitted

### Simple query:

    Model.find({ 'some.value': 5 }, function (err, docs) {
      // docs is an array
    });

### Retrieving only certain fields

    Model.find({}, ['first', 'last'], function (err, docs) {
      // docs is an array of partially-`init`d documents
      // defaults are still applied and will be "populated"
    })

## Model.findOne

Same as `Model#find`, but only receives a single document as second parameter:

    Model.findOne({ age: 5}, function (err, doc){
      // doc is a Document
    });

## Model.findById

Same as `findOne`, but receives a value to search a document by their `_id`
key. This value is subject to casting, so it can be a hex string or a proper ObjectId.

    Model.findById(obj._id, function (err, doc){
      // doc is a Document
    });

## Model.count

Counts the number of documents matching `conditions`.

    Model.count(conditions, callback);

## Model.remove

Removes documents matching `conditions`.

    Model.remove(conditions, callback);

## Model.distinct

Finds distinct values of `field` for documents matching `conditions`.

    Model.distinct(field, conditions, callback);

## Model.where

Creates a [Query](/docs/query.html) for this model. Handy when expressing complex directives.

    Model
    .where('age').gte(25)
    .where('tags').in(['movie', 'music', 'art'])
    .select('name', 'age', 'tags')
    .skip(20)
    .limit(10)
    .asc('age')
    .slaveOk()
    .hint({ age: 1, name: 1 })
    .exec(callback);

## Model.$where

Sometimes you need to query for things in mongodb using a JavaScript expression. You can do so via find({$where: javascript}), or you can use the mongoose shortcut method $where via a Query chain or from your mongoose Model.

    Model.$where('this.firstname === this.lastname').exec(callback)

## Model.update

See the [updating docs](/docs/updating-documents.html) page.

## Query API

Each of these methods returns a [Query](/docs/query.html). If you don't pass a callback to these methods, the Query can be continued to be modified (such as adding options, fields, etc), before it's `exec`d.

    var query = Model.find({});

    query.where('field', 5);
    query.limit(5);
    query.skip(100);

    query.exec(function (err, docs) {
      // called when the `query.complete` or `query.error` are called
      // internally
    });
