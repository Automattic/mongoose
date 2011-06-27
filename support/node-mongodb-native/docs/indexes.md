Indexes
=======

Indexes are needed to make queries faster. For example if you need to find records by a field named *username* and 
the field has a related index set, then the query will be a lot faster compared to if the index was not present.

See [MongoDB documentation](http://www.mongodb.org/display/DOCS/Indexes) for details.

## Create indexes with createIndex()

`createIndex` adds a new index to a collection. For checking if the index was already set, use `ensureIndex` instead.

    collection.createIndex(index[, options], callback)

or

    db.createIndex(collectionname, index[, options], callback)
    
where

  * `index` is the field or fields to be indexed. See *index field*
  * `options` are options, for example `{sparse: true}` to include only records that have indexed field set or `{unique: true}` for unique indexes. If the `options` is a boolean value, then it indicates if it's an unique index or not.
  * `callback` gets two parameters - an error object (if an error occured) and the name for the newly created index

## Ensure indexes with ensureIndex()

Same as `createIndex` with the difference that the index is checked for existence before adding to avoid duplicate indexes.

## Index field

Index field can be a simple string like `"username"` to index certain field (in this case, a field named as *username*).

    collection.ensureIndex("username",callback)

It is possible to index fields inside nested objects, for example `"user.firstname"` to index field named *firstname* inside a document named *user*.

    collection.ensureIndex("user.firstname",callback)

It is also possible to create mixed indexes to include several fields at once.

    collection.ensureIndex({firstname:1, lastname:1}, callback)
    
or with tuples
    
    collection.ensureIndex([["firstname", 1], ["lastname", 1]], callback)
    
The number value indicates direction - if it's 1, then it is an ascending value,
if it's -1 then it's descending. For example if you have documents with a field *date* and you want to sort these records in descending order then you might want to add corresponding index

    collection.ensureIndex({date:-1}, callback)

## Remove indexes with dropIndex()

All indexes can be dropped at once with `dropIndexes`

    collection.dropIndexes(callback)
    
`callback` gets two parameters - an error object (if an error occured) and a boolean value true if operation succeeded.

## Get index information with indexInformation()

`indexInformation` can be used to fetch some useful information about collection indexes. 

    collection.indexInformation(callback)
    
Where `callback` gets two parameters - an error object (if an error occured) and an index information object.

The keys in the index object are the index names and the values are tuples of included fields.

For example if a collection has two indexes - as a default an ascending index for the `_id` field and an additonal descending index for `"username"` field, then the index information object would look like the following

    {
        "_id":[["_id", 1]],
        "username_-1":[["username", -1]]
    } 