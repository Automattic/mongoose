
Finding documents
=================

Documents can be retrieved through `find`, `findOne` and `findById`. These
methods are executed on your `Model`s.

## Model#find

    Model.find(query, fields, options, callback)

    // fields and options can be ommitted

### Simple query:

    Model.find({ 'some.value': 5 }, function(err, docs){
      // docs is an array
    });

### Retrieveing only certain fields

    Model.find({}, ['first', 'last'], function (err, docs){
      // docs is an array of partially-`init`d documents
    })

## Model#findOne

Same as `Model#find`, but only receives a single document as second parameter:

    Model.findOne({ age: 5}, function (err, doc){
      // doc is a Document
    });

## Model#findById

Same as `findById`, but receives a value to search a document by their `_id`
key. This value is subject to casting, so it can be a hex string or a proper 
ObjectId.

## count

    Model.count(query, callback)

## Query

Each of these methods returns a Query. If you don't pass a callback to these
methods, the Query can be continued to be modified (such as adding options,
fields, etc), before it's `exec`d.

    var query = Model.find({});

    query.where('field', 5);
    query.limit(5);
    query.skip(100);

    // query.executed == false

    query.exec (function (err, docs) {
      // called when the `query.complete` or `query.error` are called
      // internally
    });
    
    // query.executed == true
