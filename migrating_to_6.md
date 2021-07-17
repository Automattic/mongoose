* In MongoDB Node.js Driver v4.x, 'MongoError' is now 'MongoServerError'. Please change any code that depends on the hardcoded string 'MongoError'.

* Single nested subdocs have been renamed to "subdocument paths". So `SchemaSingleNestedOptions` is now `SchemaSubdocumentOptions` and `mongoose.Schema.Types.Embedded` is now `mongoose.Schema.Types.Subdocument`. See gh-10419

* `Document#populate()` now returns a promise. And is now no longer chainable. Replace `await doc.populate('path1').populate('path2').execPopulate()` with `await doc.populate('path1'); await doc.populate('path2');`

* `await Model.create([])` in v6.0 returns an empty array when provided an empty array, in v5.0 it used to return `undefined`. If any of your code is checking whether the output is `undefined` or not, you need to modify it with the assumption that `await Model.create(...)` will always return an array if provided an array.
