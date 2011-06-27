Collections
===========

See also:

  * [Database](database.md)
  * [Queries](queries.md)
  
## Collection objects

Collection obejct is a pointer to a specific collection in the [database](database.md). If you want to [insert](insert.md) new records or
[query](queries.md) existing ones then you need to have a valid collection object. 

**NB** Collection names can't start or end with a period nor contain a dollar sign! (`.tes$t` is not allowed)

## Creating collections

Collections can be created with `createCollection`

    db.createCollection(name, callback)

where `name` is the name of the collection and `callback` is a callback function. `db` is the database object. 

The first parameter for
the callback is the error object (null if no error) and the second one is the pointer to the newly created
collection. If strict mode is on and the table exists, the operation yields in error. With strict mode off (default)
the function simple returns the pointer to the existing collection and does not truncate it.

    db.createCollection("test", function(err, collection){
        collection.insert({"test":"value"});
    });

### Collection properties

  * `collectionName` is the name of the collection (not including the database name as a prefix)
  * `db` is the pointer to the corresponding databse object

Example of usage:

    console.log("Collection name: "+collection.collectionName)

## List existing collections

### List names

Collections can be listed with `collectionNames`

    db.collectionNames(callback);
    
`callback` gets two parameters - an error object (if error occured) and an array of collection names as strings.

Collection names also include database name, so a collection named `posts` in a database `blog` will be listed as `blog.posts`.

Additionally there's system collections which should not be altered without knowing exactly what you are doing, these sollections
can be identified with `system` prefix. For example `posts.system.indexes`.

Example:

    
    var mongodb = require("mongodb"),
        mongoserver = new mongodb.Server("localhost"),
        db_connector = new mongodb.Db("blog", mongoserver);

    db_connector.open(function(err, db){
        db.collectionNames(function(err, collections){
            console.log(collections); // ["blog.posts", "blog.system.indexes"]
        });
    });

## List collections

Collection objects can be listed with database method `collections`

    db.collections(callback)

Where `callback` gets two parameters - an error object (if an error occured) and an array of collection objects.

## Selecting collections

Existing collections can be opened with `collection`

    db.collection("name", callback);

If strict mode is off, then a new collection is created if not already present.

## Renaming collections

A collection can be renamed with collection method `rename`

    collection.rename(new_name, callback);

## Removing records from collections

Records can be erased from a collection with `remove`

    collection.remove([[query[, options]], callback]);
    
Where

  * `query` is the query that records to be removed need to match. If not set all records will be removed
  * `options` indicate advanced options. For example use `{safe: true}` when using callbacks
  * `callback` callback function that gets two parameters - an error object (if an error occured) and the count of removed records
    
## Removing collections

A collection can be dropped with `drop`

    collection.drop(callback);

or with `dropCollection`

    db.dropCollection(collection_name, callback)