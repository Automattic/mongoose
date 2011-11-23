
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
explicitly passed.

## Query#$where

Specifies the javascript function to run on MongoDB on each document scanned.
See the [MongoDB docs](http://www.mongodb.org/display/DOCS/Advanced+Queries#AdvancedQueries-JavascriptExpressionsand%7B%7B%24where%7D%7D) for details.

    Model.find().$where(fn)

`fn` can be either a function or a string.

## Query#$or
## Query#or

## Query#gt
## Query#$gt

## Query#gte
## Query#$gte

## Query#lt
## Query#$lt

## Query#lte
## Query#$lte

## Query#ne
## Query#$ne
## Query#notEqualTo

## Query#in
## Query#$in

## Query#nin
## Query#$nin

## Query#all
## Query#$all

## Query#regex
## Query#$regex

## Query#size
## Query#$size

## Query#maxDistance
## Query#$maxDistance

## Query#mod
## Query#$mod

## Query#near
## Query#$near

## Query#exists
## Query#$exists

## Query#elemMatch
## Query#$elemMatch

## Query#within
## Query#$within

## Query#box
## Query#$box

## Query#center
## Query#$center

## Query#centerSphere
## Query#$centerSphere

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

