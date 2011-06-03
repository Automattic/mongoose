
1.3.7 / 2011-06-03
===================

  * added MongooseArray#splice support
  * fixed; 'path' is now a valid Schema pathname
  * improved hooks (utilizing https://github.com/bnoguchi/hooks-js)
  * fixed; MongooseArray#$shift now works (never did)
  * fixed; Document.modified no longer throws
  * fixed; modifying subdoc property sets modified paths for subdoc and parent doc
  * fixed; marking subdoc path as modified properly persists the value to the db
  * fixed; RexExps can again be saved ( #357 )

1.3.6 / 2011-05-18
===================

  * fixed; corrected casting for queries against array types
  * added; Document#set now accepts Document instances

1.3.5 / 2011-05-17
===================

  * fixed; $ne queries work properly with single vals
  * added; #inspect() methods to improve console.log output

1.3.4 / 2011-05-17
===================

  * fixed; find by Date works as expected (#336)
  * added; geospatial 2d index support
  * added; support for $near (#309)
  * updated; node-mongodb-native driver
  * fixed; updating numbers work (#342)
  * added; better error msg when try to remove an embedded doc without an _id (#307)
  * added; support for 'on-the-fly' schemas (#227)
  * changed; virtual id getters can now be skipped
  * fixed; .index() called on subdoc schema now works as expected
  * fixed; db.setProfile() now buffers until the db is open (#340)

1.3.3 / 2011-04-27
===================

  * fixed; corrected query casting on nested mixed types

1.3.2 / 2011-04-27
===================

  * fixed; query hints now retain key order

1.3.1 / 2011-04-27
===================

  * fixed; setting a property on an embedded array no longer overwrites entire array (GH-310) 
  * fixed; setting nested properties works when sibling prop is named "type"
  * fixed; isModified is now much finer grained when .set() is used (GH-323)
  * fixed; mongoose.model() and connection.model() now return the Model (GH-308, GH-305)
  * fixed; can now use $gt, $lt, $gte, $lte with String schema types (GH-317)
  * fixed; .lowercase() -> .toLowerCase() in pluralize()
  * fixed; updating an embedded document by index works (GH-334)
  * changed; .save() now passes the instance to the callback (GH-294, GH-264)
  * added; can now query system.profile and system.indexes collections
  * added; db.model('system.profile') is now included as a default Schema
  * added; db.setProfiling(level, ms, callback)
  * added; Query#hint() support
  * added; more tests
  * updated node-mongodb-native to 0.9.3

1.3.0 / 2011-04-19
===================

  * changed; save() callbacks now fire only once on failed validation
  * changed; Errors returned from save() callbacks now instances of ValidationError
  * fixed; MongooseArray#indexOf now works properly

1.2.0 / 2011-04-11
===================

  * changed; MongooseNumber now casts empty string to null

1.1.25 / 2011-04-08
===================

  * fixed; post init now fires at proper time

1.1.24 / 2011-04-03
===================

  * fixed; pushing an array onto an Array works on existing docs

1.1.23 / 2011-04-01
===================

  * Added Model#model

1.1.22 / 2011-03-31
===================

  * Fixed; $in queries on mixed types now work

1.1.21 / 2011-03-31
===================

  * Fixed; setting object root to null/undefined works

1.1.20 / 2011-03-31
===================

  * Fixed; setting multiple props on null field works

1.1.19 / 2011-03-31
===================

  * Fixed; no longer using $set on paths to an unexisting fields

1.1.18 / 2011-03-30
===================

  * Fixed; non-mixed type object setters work after initd from null

1.1.17 / 2011-03-30
===================

  * Fixed; nested object property access works when root initd with null value

1.1.16 / 2011-03-28
===================

  * Fixed; empty arrays are now saved

1.1.15 / 2011-03-28
===================

  * Fixed; `null` and `undefined` are set atomically.

1.1.14 / 2011-03-28
===================

  * Changed; more forgiving date casting, accepting '' as null.

1.1.13 / 2011-03-26
===================

  * Fixed setting values as `undefined`.

1.1.12 / 2011-03-26
===================

  * Fixed; nested objects now convert to JSON properly
  * Fixed; setting nested objects directly now works
  * Update node-mongodb-native

1.1.11 / 2011-03-25
===================

  * Fixed for use of `type` as a key.

1.1.10 / 2011-03-23
===================

  * Changed; Make sure to only ensure indexes while connected

1.1.9 / 2011-03-2 
==================

  * Fixed; Mixed can now default to empty arrays
  * Fixed; keys by the name 'type' are now valid
  * Fixed; null values retrieved from the database are hydrated as null values.
  * Fixed repeated atomic operations when saving a same document twice.

1.1.8 / 2011-03-23
==================

  * Fixed 'id' overriding. [bnoguchi]

1.1.7 / 2011-03-22
==================

  * Fixed RegExp query casting when querying against an Array of Strings [bnoguchi]
  * Fixed getters/setters for nested virtualsl. [bnoguchi]

1.1.6 / 2011-03-22
==================

  * Only doValidate when path exists in Schema [aheckmann]
  * Allow function defaults for Array types [aheckmann]
  * Fix validation hang [aheckmann]
  * Fix setting of isRequired of SchemaType [aheckmann]
  * Fix SchemaType#required(false) filter [aheckmann]
  * More backwards compatibility [aheckmann]
  * More tests [aheckmann]

1.1.5 / 2011-03-14
==================

  * Added support for `uri, db, fn` and `uri, fn` signatures for replica sets.
  * Improved/extended replica set tests.

1.1.4 / 2011-03-09
==================

  * Fixed; running an empty Query doesn't throw. [aheckmann]
  * Changed; Promise#addBack returns promise. [aheckmann]
  * Added streaming cursor support. [aheckmann]
  * Changed; Query#update defaults to use$SetOnSave now. [brian]
  * Added more docs.

1.1.3 / 2011-03-04
==================

  * Added Promise#resolve [aheckmann]
  * Fixed backward compatibility with nulls [aheckmann]
  * Changed; Query#{run,exec} return promises [aheckmann]

1.1.2 / 2011-03-03
==================

  * Restored Query#exec and added notion of default operation [brian]
  * Fixed ValidatorError messages [brian]

1.1.1 / 2011-03-01 
==================

  * Added SchemaType String `lowercase`, `uppercase`, `trim`.
  * Public exports (`Model`, `Document`) and tests.
  * Added ObjectId casting support for `Document`s.

1.1.0 / 2011-02-25
==================

  * Added support for replica sets.

1.0.16 / 2011-02-18
===================

  * Added $nin as another whitelisted $conditional for SchemaArray [brian]
  * Changed #with to #where [brian]
  * Added ability to use $in conditional with Array types [brian]

1.0.15 / 2011-02-18
===================

  * Added `id` virtual getter for documents to easily access the hexString of
  the `_id`.

1.0.14 / 2011-02-17
===================

  * Fix for arrays within subdocuments [brian]

1.0.13 / 2011-02-16
===================

  * Fixed embedded documents saving.

1.0.12 / 2011-02-14 
===================

  * Minor refactorings [brian]

1.0.11 / 2011-02-14 
===================

  * Query refactor and $ne, $slice, $or, $size, $elemMatch, $nin, $exists support [brian]
  * Named scopes sugar [brian]

1.0.10 / 2011-02-11 
===================

  * Updated node-mongodb-native driver [thanks John Allen]

1.0.9 / 2011-02-09 
==================

  * Fixed single member arrays as defaults [brian]

1.0.8 / 2011-02-09 
==================

  * Fixed for collection-level buffering of commands [gitfy]
  * Fixed `Document#toJSON` [dalejefferson]
  * Fixed `Connection` authentication [robrighter]
  * Fixed clash of accessors in getters/setters [eirikurn]
  * Improved `Model#save` promise handling

1.0.7 / 2011-02-05 
==================

  * Fixed memory leak warnings for test suite on 0.3
  * Fixed querying documents that have an array that contain at least one
  specified member. [brian]
  * Fixed default value for Array types (fixes GH-210). [brian]
  * Fixed example code.

1.0.6 / 2011-02-03 
==================

  * Fixed `post` middleware
  * Fixed; it's now possible to instantiate a model even when one of the paths maps
  to an undefined value [brian]

1.0.5 / 2011-02-02 
==================

  * Fixed; combo $push and $pushAll auto-converts into a $pushAll [brian]
  * Fixed; combo $pull and $pullAll auto-converts to a single $pullAll [brian]
  * Fixed; $pullAll now removes said members from array before save (so it acts just
  like pushAll) [brian]
  * Fixed; multiple $pulls and $pushes become a single $pullAll and $pushAll.
  Moreover, $pull now modifies the array before save to reflect the immediate
  change [brian]
  * Added tests for nested shortcut getters [brian]
  * Added tests that show that Schemas with nested Arrays don't apply defaults
  [brian]

1.0.4 / 2011-02-02 
==================

  * Added MongooseNumber#toString
  * Added MongooseNumber unit tests

1.0.3 / 2011-02-02 
==================

  * Make sure safe mode works with Model#save
  * Changed Schema options: safe mode is now the default
  * Updated node-mongodb-native to HEAD

1.0.2 / 2011-02-02 
==================

  * Added a Model.create shortcut for creating documents. [brian]
  * Fixed; we can now instantiate models with hashes that map to at least one
  null value. [brian]
  * Fixed Schema with more than 2 nested levels. [brian]

1.0.1 / 2011-02-02 
==================

  * Improved `MongooseNumber`, works almost like the native except for `typeof`
  not being `'number'`.
