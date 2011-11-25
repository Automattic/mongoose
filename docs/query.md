
Queries
=================

A `Query` is what is returned when calling many `Model`
[methods](/docs/finding-documents.html). These `Query`
objects provide a chaining api to specify search terms,
cursor options, hints, and other behavior.

## Query#where

Lets you specify query terms with sugar.

    query.where(path [, val])

`path` is a valid document path. `val` is optional. Its useful to omit
`val` when used in conjunction with other query methods. For example:

    query
    .where('name', 'Space Ghost')
    .where('age').gte(21).lte(65)
    .run(callback)

In this case, `gte()` and `lte()` operate on the previous path if not
explicitly passed. The above query results in the following query expression:

    { name: 'Space Ghost', age: { $gte: 21, $lte: 65 }}

## Query#$where

Specifies the javascript function to run on MongoDB on each document scanned.
See the [MongoDB docs](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-JavascriptExpressionsand%7B%7B%24where%7D%7D) for details.

    Model.find().$where(fn)

`fn` can be either a function or a string.

## Query#$or, Query#or

Specifies the [$or](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24or) operator.

    query.$or(array);

`array` is an array of expressions.

    query.or([{ color: 'blue' }, { color: 'red' }]);

## Query#gt, Query#$gt

Specifies a [greater than](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%3C%2C%3C%3D%2C%3E%2C%3E%3D) expression.

    query.$gt(path, val);

`$gt` is also one of the methods with extra chaining sugar: when only one
argument is passed, it uses the path used the last call to `where()`. Example:

    Model.where('age').$gt(21)

Results in:

    { age: { $gt: 21 }}

## Query#gte, Query#$gte

Specifies a [greater than or equal to](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%3C%2C%3C%3D%2C%3E%2C%3E%3D) expression.

    query.$gte(path, val);

`$gte` is also one of the methods with extra chaining sugar: when only one
argument is passed, it uses the path used the last call to `where()`. Example:

    Model.where('age').$gte(21)

Results in:

    { age: { $gte: 21 }}

## Query#lt,Query#$lt

Specifies a [less than](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%3C%2C%3C%3D%2C%3E%2C%3E%3D) expression.

    query.$lt(path, val);

`$lt` is also one of the methods with extra chaining sugar: when only one
argument is passed, it uses the path used the last call to `where()`. Example:

    Model.where('age').$lt(21)

Results in:

    { age: { $lt: 21 }}

## Query#lte, Query#$lte

Specifies a [less than or equal to](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%3C%2C%3C%3D%2C%3E%2C%3E%3D) expression.

    query.$lte(path, val);

`$lte` is also one of the methods with extra chaining sugar: when only one
argument is passed, it uses the path used the last call to `where()`. Example:

    Model.where('age').$lte(21)

Results in:

    { age: { $lte: 21 }}

## Query#ne, Query#$ne, Query#notEqualTo

Specifies the [$ne](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24ne) operator.

    query.$ne(path, val);

These methods have extra sugar in that
when only one argument is passed, the path in the last call
to `where()` is used. Example:

    query.where('_id').ne('4ecf92f31993a52c58e07f6a')

and

    query.notEqualTo('_id', '4ecf92f31993a52c58e07f6a')

both result in

    { _id: { $ne: ObjectId('4ecf92f31993a52c58e07f6a') }}

## Query#in, Query#$in

Specifies the [$in](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24in) operator.

    query.$in(path, array)

These methods have extra sugar in that
when only one argument is passed, the path in the last call
to `where()` is used.

    query.where('tags').in(['game', 'fun', 'holiday'])

results in

    { tags: { $in: ['game', 'fun', 'holiday'] }}

## Query#nin, Query#$nin

Specifies the [$nin](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24nin) operator.

    query.$nin(path, array)

These methods have extra sugar in that
when only one argument is passed, the path in the last call
to `where()` is used.

    query.where('games').nin(['boring', 'lame'])

results in

    { games: { $nin: ['boring', 'lame'] }}

## Query#all, Query#$all

Specifies the [$all](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24all) operator.

    query.$all(path, array)

These methods have extra sugar in that
when only one argument is passed, the path in the last call
to `where()` is used.

    query.where('games').all(['fun', 'exhausting'])

results in

    { games: { $all: ['fun', 'exhausting'] }}

## Query#regex, Query#$regex

Specifies the [$regex](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-RegularExpressions) operator.

    query.regex('name.first', /^a/i)

These methods have extra sugar in that
when only one argument is passed, the path in the last call
to `where()` is used.

    query.where('name.first').$regex(/^a/i)

results in

    { 'name.first': { $regex: /^a/i }}

## Query#size, Query#$size

Specifies the [$size](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24size) operator.

    query.$size(path, integer)

These methods have extra sugar in that
when only one argument is passed, the path in the last call
to `where()` is used.

    query.size('comments', 2)
    query.where('comments').size(2)

both result in

    { comments: { $size: 2 }}

## Query#mod, Query#$mod

Specifies the [$mod](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24mod) operator.

    var array = [10, 1]
    query.mod(path, array)

    query.mod(path, 10, 1)

    query.where(path).$mod(10, 1)

all result in

    { path: { $mod: [10, 1] }}

## Query#exists, Query#$exists

Specifies the [$exists](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24exists) operator.

    query.exists(path, Boolean)

These methods have extra sugar in that
when only one argument is passed, the path from the last call
to `where()` is used.

Given the following query,

    var query = Model.find();

the following queries

    query.exists('occupation');
    query.exists('occupation', true);
    query.where('occupation').exists();

all result in

    { occupation: { $exists: true }}

Another example:

    query.exists('occupation', false)
    query.where('occupation').exists(false);

result in

    { occupation: { $exists: false }}

## Query#elemMatch, Query#$elemMatch

Specifies the [$elemMatch](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-%24elemMatch) operator.

    query.elemMatch(path, criteria)
    query.where(path).elemMatch(criteria)

Functions can also be passed so you can further use query sugar
to declare the expression:

    query.where(path).elemMatch(function)
    query.elemMatch(path, function)

In this case a `query` is passed as the only argument into the function.

    query.where('comments').elemMatch(function (elem) {
      elem.where('author', 'bnoguchi')
      elem.where('votes').gte(5);
    });

Results in

    { comments: { $elemMatch: { author: 'bnoguchi', votes: { $gte: 5 }}}}

## Query#within, Query#$within

## Query#box, Query#$box

## Query#center, Query#$center

## Query#centerSphere, Query#$centerSphere

## Query#near, Query#$near

Specifies the [$near](http://www.mongodb.org/display/DOCS/Geospatial+Indexing#GeospatialIndexing-Querying) operator.

    var array = [10, 1]
    query.near(path, array)

    query.near(path, 10, 1)

    query.where(path).$near(10, 1)

all result in

    { path: { $near: [10, 1] }}

## Query#maxDistance, Query#$maxDistance

Specifies the [$maxDistance](http://www.mongodb.org/display/DOCS/Geospatial+Indexing#GeospatialIndexing-Querying) operator.

    query.where('checkin').near([40, -72]).maxDistance(1);

results in

    { checkin: { $near: [40, -72], $maxDistance: 1 }}

## Query#select
## Query#fields

## Query#only
## Query#exclude

## Query#slice
## Query#$slice

## Query#populate

// sorting
## Query#sort
## Query#asc
## Query#desc

// options
## Query#limit
## Query#skip
## Query#maxscan
## Query#snapshot
## Query#batchSize
## Query#slaveOk
## Query#hint

// executing
## Query#find

    query.find(criteria [, callback])

## Query#findOne
## Query#count
## Query#distinct
## Query#update
## Query#remove

## Query#run
## Query#exec

    query.run([callback])

## Query#each

## Query#stream

Returns a [QueryStream](/docs/querystream.html) for the query.

    Model.find({}).stream().pipe(writeStream)

