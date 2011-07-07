Queries
=======

See also:

  * [Database](database.md)
  * [Collections](collections.md)

## Making queries with find()

[Collections](collections.md) can be queried with `find`. 

    collection.find(query[[[, fields], options], callback]);

Where

  * `query` - is a query object, defining the conditions the documents need to apply 
  * `fields` - indicates which fields should be included in the response (default is all)
  * `options` - defines extra logic (sorting options, paging etc.)
  
The result for the query is actually a cursor object. This can be used directly or converted to an array.

    var cursor = collection.find({});
    cursor.each(...);

To indicate which fields must or must no be returned `fields` value can be used. For example the following `fields` value

    {
        "name": true,
        "title": true
    }

retrieves fields `name` and `title` (and as a default also `_id`) but not any others.

## Find first occurence with findOne()

`findOne` is a convinence method finding and returning the first match of a query while regular `find` returns a cursor object instead.
Use it when you expect only one record, for example when querying with `_id` or another unique property.

    collection.findOne([query], callback)

Where

  * `query` is a query object or an `_id` value
  * `callback` has two parameters - an error object (if an error occured) and the document object. 

Example:

    collection.findOne({_id: doc_id}, function(err, document) {
        console.log(document.name);
    });

## _id values

Default `_id` values are 12 byte binary hashes. You can alter the format with custom Primary Key factories (see *Custom Primarky Keys* in [Database](database.md)).

In order to treat these binary _id values as strings it would be wise to convert binary values to hex strings. This can be done with `toHexString` property.

    var idHex = document._id.toHexString();
    
Hex strings can be reverted back to binary (for example to perform queries) with `db.bson_serializer.ObjectID.createFromHexString`

    {_id: db.bson_serializer.ObjectID.createFromHexString(idHex)}

When inserting new records it is possible to use custom `_id` values as well which do not need to be binary hashes, for example strings.

    collection.insert({_id: "abc", ...});
    collection.findOne({_id: "abc"},...);

This way it is not necessary to convert `_id` values to hex strings and back.

## Query object

The simplest query object is an empty one `{}` which matches every record in the database.

To make a simple query where one field must match to a defined value, one can do it as simply as

    {fieldname: "fieldvalue"}  

This query matches all the records that a) have fields called *fieldname* and b) its value is *"fieldvalue"*.

For example if we have a collection of blog posts where the structure of the 
records is `{title, author, contents}` and we want 
to retrieve all the posts for a specific author then we can do it like this:

    posts = pointer_to_collection;
    posts.find({author:"Daniel"}).toArray(function(err, results){
        console.log(results); // output all records
    });

If the queried field is inside an object then that can be queried also. For example if we have a record with the following structure:

    {
        user: {
            name: "Daniel"
        }
    }

Then we can query the "name" field like this: `{"user.name":"Daniel"}`

### AND

If more than one fieldname is specified, then it's an AND query

    {
        key1: "value1",
        name2: "value2"
    }

Whis query matches all records where *key1* is *"value1"* and  *key2* is *"value2"*

### OR

OR queries are a bit trickier but doable with the `$or` operator. Query operator takes an array which includes
a set of query objects and at least one of these must match a document before it is retrieved

    {
        $or:[
            {author:"Daniel"},
            {author:"Jessica"}
        ]
    }

This query match all the documents where author is Daniel or Jessica.

To mix AND and OR queries, you just need to use $or as one of regular query fields.

    {
        title:"MongoDB", 
        $or:[
            {author:"Daniel"}, 
            {author:"Jessica"}
        ]
    }

### Conditionals

Conditional operators `<`, `<=`, `>`, `>=` and `!=` can't be used directly, as the query object format doesn't support it but the same
can be achieved with their aliases `$lt`, `$lte`, `$gt`, `$gte` and `$ne`. When a field value needs to match a conditional, the value
must be wrapped into a separate object.

    {"fieldname":{$gte:100}}

This query defines that *fieldname* must be greater than or equal to `100`.

Conditionals can also be mixed to create ranges.

    {"fieldname": {$lte:10, $gte:100}} 

### Regular expressions in queries

Queried field values can also be matched with regular expressions

    {author:/^Daniel/}

### Special query operators

In addition to OR and conditional there's some more operators:

  * `$in` - specifies an array of possible matches, `{"name":{$in:[1,2,3]}}`
  * `$nin` - specifies an array of unwanted matches
  * `$all` - array value must match to the condition `{"name":{$all:[1,2,3]}}`
  * `$exists` - checks for existence of a field `{"name":{$exists:true}}`
  * `$mod` - check for a modulo `{"name":{$mod:{3,2}}` is the same as `"name" % 3 == 2`
  * `$size` - checks the size of an array value `{"name": {$size:2}}` matches arrays *name* with 2 elements


## Queries inside objects and arrays

If you have a document with nested objects/arrays then the keys inside these nested objects can still be used for queries.

For example with the following document

    {
        "_id": idvalue,
        "author":{
            "firstname":"Daniel",
            "lastname": "Defoe"
        },
        "books":[
            {
                "title":"Robinson Crusoe"
                "year": 1714
            }
        ]
    }

not only the `_id` field can be used as a query field - also the `firstname` and even `title` can be used. This can be done when
using nested field names as strings, concated with periods.

    collection.find({"author.firstname":"Daniel})
    
Works even inside arrays

    collection.find({"books.year":1714})

## Query options

Query options define the behavior of the query.

    var options = {
        "limit": 20,
        "skip": 10,
        "sort": title
    }

    collection.find({}, options).toArray(...);

### Paging

Paging can be achieved with option parameters `limit` and `skip`

    {
        "limit": 20,
        "skip" 10
    }

retrieves 10 elements starting from 20

### Sorting

Sorting can be acieved with option parameter `sort` which takes an array of sort preferences

    {
        "sort": [['field1','asc'], ['field2','desc']]
    }

With single ascending field the array can be replaced with the name of the field.

    {
        "sort": "name"
    }

### Explain

Option parameter `explain` turns the query into an explain query.

## Cursors

Cursor objects are the results for queries and can be used to fetch individual fields from the database.

### nextObject

`cursor.nextObject(function(err, doc){})` retrieves the next record from database. If doc is null, then there weren't any more records.

### each

`cursor.each(function(err, doc){})` retrieves all matching records one by one.

### toArray

`cursor.toArray(function(err, docs){})` converts the cursor object into an array of all the matching records. Probably the 
most convenient way to retrieve results but be careful with large datasets as every record is loaded into memory. 

    collection.find().toArray(function(err, docs){
        console.log("retrieved records:");
        console.log(docs);
    });

### rewind

`cursor.rewind()` resets the internal pointer in the cursor to the beginning.    

## Counting matches

Counting total number of found matches can be done against cursors with method `count`.

    cursor.count(callback)

Where

  * `callback` is the callback function with two parameters - an error object (if an error occured) and the number on matches as an integer.
  
Example

    cursor.count(function(err, count){
        console.log("Total matches: "+count);
    });
