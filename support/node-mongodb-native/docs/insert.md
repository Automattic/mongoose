Inserting and updating
======================

See also:

  * [Database](database.md)
  * [Collections](collections.md)

## Insert

Records can be inserted to a collection with `insert`

    collection.insert(docs[, options, callback])
    
Where

  * `docs` is a single document object or an array of documents
  * `options` is an object of parameters, if you use a callback, set `safe` to true - this way the callback is executed *after* the record is saved to the database, if `safe` is false (default) callback is fired immediately and thus doesn't make much sense.
  * `callback` - callback function to run after the record is inserted. Set `safe` to true in `options` when using callback. First parameter for callback
    is the error object (if an error occured) and the second is an array of records inserted. 

For example

    var document = {name:"David", title:"About MongoDB"};
    collection.insert(document, {safe: true}, function(err, records){
        console.log("Record added as "+records[0]._id);
    });

If trying to insert a record with an existing `_id` value, then the operation yields in error.

    collection.insert({_id:1}, {safe:true}, function(err, doc){
        // no error, inserted new document, with _id=1
        collection.insert({_id:1}, {safe:true}, function(err, doc){
            // error occured since _id=1 already existed
        });
    });

## Save

Shorthand for insert/update is `save` - if `_id` value set, the record is updated if it exists or inserted if it does not; if the `_id` value is not set, then the record is inserted as a new one.

    collection.save({_id:"abc", user:"David"},{safe:true}, callback)
    
`callback` gets two parameters - an error object (if an error occured) and the record if it was inserted or `1` if the record was updated. 

## Update

Updates can be done with `update`

    collection.update(criteria, update[, options[, callback]]);

Where

  * `criteria` is a query object to find records that need to be updated (see [Queries](queries.md))
  * `update` is the replacement object
  * `options` is an options object (see below)
  * `callback` is the callback to be run after the records are updated. Has two parameters, the first is an error object (if error occured), the second is the count of records that were modified.
  
### Update options

There are several option values that can be used with an update

  * `safe` - run callback only after the update is done, defaults to false
  * `multi` - update all records that match the query object, default is false (only the first one found is updated)
  * `upsert` - if true and no records match the query, insert `update` as a new record 

### Replacement object

If the replacement object is a document, the matching documents will be replaced (except the `_id` values if no `_id` is set).

    collection.update({_id:"123"}, {author:"Jessica", title:"Mongo facts"});
    
The example above will replace the document contents of id=123 with the replacement object.

To update only selected fields, `$set` operator needs to be used. Following replacement object
replaces author value but leaves everything else intact.

    collection.update({_id:"123"}, {$set: {author:"Jessica"}});
    
See [MongoDB documentation](http://www.mongodb.org/display/DOCS/Updating) for all possible operators.

## Find and Modify

To update and retrieve the contents for one single record you can use `findAndModify`.

    collection.findAndModify(criteria, sort, update[, options, callback])
    
Where

  * `criteria` is the query object to find the record
  * `sort` indicates the order of the matches if there's more than one matching record. The first record on the result set will be used. See [Queries->find->options->sort](queries.md) for the format.
  * `update` is the replacement object
  * `options` define the behavior of the function
  * `callback` is the function to run after the update is done. Has two parameters - error object (if error occured) and the record that was updated.
 
### Options

Options object can be used for the following options:

  * `remove` - if set to true (default is false), removes the record from the collection. Callback function still gets the object but it doesn't exist in the collection any more.
  * `new` - if set to true, callback function returns the modified record. Default is false (original record is returned)
  * `upsert` - if set to true and no record matched to the query, replacement object is inserted as a new record
  
### Example

    var mongodb = require('mongodb'),
        server = new mongodb.Server("127.0.0.1", 27017, {});

    new mongodb.Db('test', server, {}).open(function (error, client) {
        if (error) throw error;
        var collection = new mongodb.Collection(client, 'test_collection');
        collection.findAndModify(
            {hello: 'world'}, // query
            [['_id','asc']],  // sort order
            {$set: {hi: 'there'}}, // replacement, replaces only the field "hi"
            {}, // options
            function(err, object) {
                if (err){
                    console.warn(err.message);
                }else{
                    console.dir(object);  // undefined if no matching object exists.
                }
            });
        });
   