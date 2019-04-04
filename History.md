5.4.21 / 2019-04-02
===================
 * fix(updateValidators): run update validators correctly on Decimal128 paths #7561
 * fix(update): cast array filters in nested doc arrays correctly #7603
 * fix(document): allow .get() + .set() with aliased paths #7592
 * fix(document): ensure custom getters on single nested subdocs don't get persisted if toObject.getters = true #7601
 * fix(document): support setting subdoc path to subdoc copied using object rest `{...doc}` #7645
 * docs(schema): correct out-of-date list of reserved words #7593
 * docs(model+query): add link to update results docs and examples of using results of updateOne(), etc. #7582
 * docs: use atomic as opposed to $atomic consistently #7649 [720degreeLotus](https://github.com/720degreeLotus)

5.4.20 / 2019-03-25
===================
 * docs(tutorials): add tutorial about `lean()` #7640
 * fix(discriminator): fix wrong modelName being used as value to partialFilterExpression index #7635 #7634 [egorovli](https://github.com/egorovli)
 * fix(document): allow setters to modify `this` when overwriting single nested subdoc #7585
 * fix(populate): handle count option correctly with multiple docs #7573
 * fix(date): support declaring min/max validators as functions #7600 [ChienDevIT](https://github.com/ChienDevIT)
 * fix(discriminator): avoid projecting in embedded discriminator if only auto-selected path is discriminator key #7574
 * fix(discriminator): use discriminator model when using `new BaseModel()` with discriminator key #7586
 * fix(timestamps): avoid throwing if doc array has timestamps and array is undefined #7625 [serg33v](https://github.com/serg33v)
 * docs(document): explain DocumentNotFoundError in save() docs #7580
 * docs(query): fix .all() param type and add example #7612 [720degreeLotus](https://github.com/720degreeLotus)
 * docs: add useNewUrlParser to mongoose.connect for some pages #7615 [YC](https://github.com/YC)

5.4.19 / 2019-03-11
===================
 * fix(mongoose): ensure virtuals set on subdocs in global plugins get applied #7592
 * docs(tutorials): add "Working With Dates" tutorial #7597
 * docs(guide): clarify that versioning only affects array fields #7555
 * docs(model): list out all bulkWrite() options #7550

5.4.18 / 2019-03-08
===================
 * fix(document): handle nested virtuals in populated docs when parent path is projected out #7491
 * fix(model): make subclassed models handle discriminators correctly #7547
 * fix(model): remove $versionError from save options for better debug output #7570

5.4.17 / 2019-03-03
===================
 * fix(update): handle all positional operator when casting array filters #7540
 * fix(populate): handle populating nested path where top-level path is a primitive in the db #7545
 * fix(update): run update validators on array filters #7536
 * fix(document): clean modified subpaths when sorting an array #7556
 * fix(model): cast $setOnInsert correctly with nested docs #7534
 * docs: remove extra curly brace from example #7569 [kolya182](https://github.com/kolya182)

5.4.16 / 2019-02-26
===================
 * fix(schema): handle nested objects with `_id: false` #7524
 * fix(schema): don't throw error if declaring a virtual that starts with a map path name #7464
 * fix(browser): add stubbed `model()` function so code that uses model doesn't throw #7541 [caub](https://github.com/caub)
 * fix(schema): merge virtuals correctly #7563 [yoursdearboy](https://github.com/yoursdearboy)
 * docs(connections): add reconnectFailed to connection docs #7477
 * docs(index): fix typo #7553 [DenrizSusam](https://github.com/DenrizSusam)
 * refactor(schema): iterate over paths instead of depending on childSchemas #7554

5.4.15 / 2019-02-22
===================
 * fix(update): don't call schematype validators on array if using $pull with runValidators #6971
 * fix(schema): clone all schema types when cloning an array #7537
 * docs(connections): improve connectTimeoutMS docs and socketTimeoutMS docs to link to Node.js net.setTimeout() #5169
 * docs: fix setters example in migration guide #7546 [freewil](https://github.com/freewil)

5.4.14 / 2019-02-19
===================
 * fix(populate): make `getters` option handle nested paths #7521
 * fix(documentarray): report validation errors that occur in an array subdoc created using `create()` and then `set()` #7504
 * docs(schema): add examples for schema functions that didn't have any #7525
 * docs: add MongooseError to API docs and add list of error names
 * docs(CONTRIBUTING): fix link #7530 [sarpik](https://github.com/sarpik)

5.4.13 / 2019-02-15
===================
 * fix(query): throw handy error when using updateOne() with overwrite: true and no dollar keys #7475
 * fix(schema): support inheriting existing schema types using Node.js `util.inherits` like mongoose-float #7486
 * docs(connections): add list of connection events #7477

5.4.12 / 2019-02-13
===================
 * fix(connection): dont emit reconnected due to socketTimeoutMS #7452
 * fix(schema): revert check for `false` schema paths #7516 #7512
 * fix(model): don't delete unaliased keys in translateAliases #7510 [chrischen](https://github.com/chrischen)
 * fix(document): run single nested schematype validator if nested path has a default and subpath is modified #7493
 * fix(query): copy mongoose options when using `Query#merge()` #1790
 * fix(timestamps): don't call createdAt getters when setting updatedAt on new doc #7496
 * docs: improve description of ValidationError #7515 [JulioJu](https://github.com/JulioJu)
 * docs: add an asterisk before comment, otherwise the comment line is not generated #7513 [JulioJu](https://github.com/JulioJu)

5.4.11 / 2019-02-09
===================
 * fix(schema): handle `_id: false` in schema paths as a shortcut for setting the `_id` option to `false` #7480
 * fix(update): handle $addToSet and $push with ObjectIds and castNonArrays=false #7479
 * docs(model): document `session` option to `save()` #7484
 * chore: fix gitignore syntax #7498 [JulioJu](https://github.com/JulioJu)
 * docs: document that Document#validateSync returns ValidationError #7499
 * refactor: use consolidated `isPOJO()` function instead of constructor checks #7500

5.4.10 / 2019-02-05
===================
 * docs: add search bar and /search page #6706
 * fix: support dotted aliases #7478 [chrischen](https://github.com/chrischen)
 * fix(document): copy atomics when setting document array to an existing document array #7472
 * chore: upgrade to mongodb driver 3.1.13 #7488
 * docs: remove confusing references to executing a query "immediately" #7461
 * docs(guides+schematypes): link to custom schematypes docs #7407

5.4.9 / 2019-02-01
==================
 * fix(document): make `remove()`, `updateOne()`, and `update()` use the document's associated session #7455
 * fix(document): support passing args to hooked custom methods #7456
 * fix(document): avoid double calling single nested getters on `toObject()` #7442
 * fix(discriminator): handle global plugins modifying top-level discriminator options with applyPluginsToDiscriminators: true #7458
 * docs(documents): improve explanation of documents and use more modern syntax #7463
 * docs(middleware+api): fix a couple typos in examples #7474 [arniu](https://github.com/arniu)

5.4.8 / 2019-01-30
==================
 * fix(query): fix unhandled error when casting object in array filters #7431
 * fix(query): cast query $elemMatch to discriminator schema if discriminator key set #7449
 * docs: add table of contents to all guides #7430

5.4.7 / 2019-01-26
==================
 * fix(populate): set `populated()` when using virtual populate #7440
 * fix(discriminator): defer applying plugins to embedded discriminators until model compilation so global plugins work #7435
 * fix(schema): report correct pathtype underneath map so setting dotted paths underneath maps works #7448
 * fix: get debug from options using the get helper #7451 #7446 [LucGranato](https://github.com/LucGranato)
 * fix: use correct variable name #7443 [esben-semmle](https://github.com/esben-semmle)
 * docs: fix broken QueryCursor link #7438 [shihabmridha](https://github.com/shihabmridha)

5.4.6 / 2019-01-22
==================
 * fix(utils): make minimize leave empty objects in arrays instead of setting the array element to undefined #7322
 * fix(document): support passing `{document, query}` options to Schema#pre(regex) and Schema#post(regex) #7423
 * docs: add migrating to 5 guide to docs #7434
 * docs(deprecations): add instructions for fixing `count()` deprecation #7419
 * docs(middleware): add description and example for aggregate hooks #7402

4.13.18 / 2019-01-21
====================
 * fix(model): handle setting populated path set via `Document#populate()` #7302
 * fix(cast): backport fix from #7290 to 4.x

5.4.5 / 2019-01-18
==================
 * fix(populate): handle nested array `foreignField` with virtual populate #7374
 * fix(query): support not passing any arguments to `orFail()` #7409
 * docs(query): document what the resolved value for `deleteOne()`, `deleteMany()`, and `remove()` contains #7324
 * fix(array): allow opting out of converting non-arrays into arrays with `castNonArrays` option #7371
 * fix(query): ensure updateOne() doesnt unintentionally double call Schema#post(regexp) #7418

5.4.4 / 2019-01-14
==================
 * fix(query): run casting on arrayFilters option #7079
 * fix(document): support skipping timestamps on save() with `save({ timestamps: false })` #7357
 * fix(model): apply custom where on `Document#remove()` so we attach the shardKey #7393
 * docs(mongoose): document `mongoose.connections` #7338

5.4.3 / 2019-01-09
==================
 * fix(populate): handle `count` option when using `Document#populate()` on a virtual #7380
 * fix(connection): set connection state to DISCONNECTED if replica set has no primary #7330
 * fix(mongoose): apply global plugins to schemas nested underneath embedded discriminators #7370
 * fix(document): make modifiedPaths() return nested paths 1 level down on initial set #7313
 * fix(plugins): ensure sharding plugin works even if ObjectId has a `valueOf()` #7353

5.4.2 / 2019-01-03
==================
 * fix(document): ensure Document#updateOne() returns a query but still calls hooks #7366
 * fix(query): allow explicitly projecting out populated paths that are automatically projected in #7383
 * fix(document): support setting `flattenMaps` option for `toObject()` and `toJSON()` at schema level #7274
 * fix(query): handle merging objectids with `.where()` #7360
 * fix(schema): copy `.base` when cloning #7377
 * docs: remove links to plugins.mongoosejs.com in favor of plugins.mongoosejs.io #7364

5.4.1 / 2018-12-26
==================
 * fix(document): ensure doc array defaults get casted #7337
 * fix(document): make `save()` not crash if nested doc has a property 'get' #7316
 * fix(schema): allow using Schema.Types.Map as well as Map to declare a map type #7305
 * fix(map): make set after init mark correct path as modified #7321
 * fix(mongoose): don't recompile model if same collection and schema passed in to `mongoose.model()` #5767
 * fix(schema): improve error message when type is invalid #7303
 * fix(schema): add `populated` to reserved property names #7317
 * fix(model): don't run built-in middleware on custom methods and ensure timestamp hooks don't run if children don't have timestamps set #7342
 * docs(schematypes): clarify that you can add arbitrary options to a SchemaType #7340
 * docs(mongoose): clarify that passing same name+schema to `mongoose.model()` returns the model #5767
 * docs(index): add useNewUrlParser to example #7368 [JIBIN-P](https://github.com/JIBIN-P)
 * docs(connection): add useNewUrlParser to examples #7362 [JIBIN-P](https://github.com/JIBIN-P)
 * docs(discriminators): add back missing example from 'recursive embedded discriminators section' #7349
 * docs(schema): improve docs for string and boolean cast() #7351

5.4.0 / 2018-12-14
==================
 * feat(schematype): add `SchemaType.get()`, custom getters across all instances of a schematype #6912
 * feat(schematype): add `SchemaType.cast()`, configure casting for individual schematypes #7045
 * feat(schematype): add `SchemaType.checkRequired()`, configure what values pass `required` check for a schematype #7186 #7150
 * feat(model): add `Model.findOneAndReplace()` #7162
 * feat(model): add `Model.events` emitter that emits all `error`'s that occur with a given model #7125
 * feat(populate): add `count` option to populate virtuals, support returning # of populated docs instead of docs themselves #4469
 * feat(aggregate): add `.catch()` helper to make aggregations full thenables #7267
 * feat(query): add hooks for `deleteOne()` and `deleteMany()` #7195
 * feat(document): add hooks for `updateOne()` #7133
 * feat(query): add `Query#map()` for synchronously transforming results before post middleware runs #7142
 * feat(schema): support passing an array of objects or schemas to `Schema` constructor #7218
 * feat(populate): add `clone` option to ensure multiple docs don't share the same populated doc #3258
 * feat(query): add `Query#maxTimeMS()` helper #7254
 * fix(query): deprecate broken `Aggregate#addCursorFlag()` #7120
 * docs(populate): fix incorrect example #7335 [zcfan](https://github.com/zcfan)
 * docs(middleware): add `findOneAndDelete` to middleware list #7327 [danielkesselberg](https://github.com/danielkesselberg)

5.3.16 / 2018-12-11
===================
 * fix(document): handle `__proto__` in queries #7290
 * fix(document): use Array.isArray() instead of checking constructor name for arrays #7290
 * docs(populate): add section about what happens when no document matches #7279
 * fix(mongoose): avoid crash on `import mongoose, {Schema} from 'mongoose'` #5648

5.3.15 / 2018-12-05
===================
 * fix(query): handle `orFail()` with `findOneAndUpdate()` and `findOneAndDelete()` #7297 #7280
 * fix(document): make `save()` succeed if strict: false with a `collection` property #7276
 * fix(document): add `flattenMaps` option for toObject() #7274
 * docs(document): document flattenMaps option #7274
 * fix(populate): support populating individual subdoc path in document array #7273
 * fix(populate): ensure `model` option overrides `refPath` #7273
 * fix(map): don't call subdoc setters on init #7272
 * fix(document): use internal get() helper instead of lodash.get to support `null` projection param #7271
 * fix(document): continue running validateSync() for all elements in doc array after first error #6746

5.3.14 / 2018-11-27
===================
 * docs(api): use `openUri()` instead of legacy `open()` #7277 [artemjackson](https://github.com/artemjackson)
 * fix(document): don't mark date underneath single nested as modified if setting to string #7264
 * fix(update): set timestamps on subdocs if not using $set with no overwrite #7261
 * fix(document): use symbol instead of `__parent` so user code doesn't conflict #7230
 * fix(mongoose): allow using `mongoose.model()` without context, like `import {model} from 'mongoose'` #3768

5.3.13 / 2018-11-20
===================
 * fix: bump mongodb driver -> 3.1.10 #7266
 * fix(populate): support setting a model as a `ref` #7253
 * docs(schematype): add ref() function to document what is a valid `ref` path in a schematype #7253
 * fix(array): clean modified subpaths when calling `splice()` #7249
 * docs(compatibility): don't show Mongoose 4.11 as compatible with MongoDB 3.6 re: MongoDB's official compatibility table #7248 [a-harrison](https://github.com/a-harrison)
 * fix(document): report correct validation error if doc array set to primitive #7242
 * fix(mongoose): print warning when including server-side lib with jest jsdom environment #7240

5.3.12 / 2018-11-13
===================
 * docs(compatibility): don't show Mongoose 4.11 as compatible with MongoDB 3.6 re: MongoDB's official compatibility table #7238 [a-harrison](https://github.com/a-harrison)
 * fix(populate): use `instanceof` rather than class name for comparison #7237 [ivanseidel](https://github.com/ivanseidel)
 * docs(api): make options show up as a nested list #7232
 * fix(document): don't mark array as modified on init if doc array has default #7227
 * docs(api): link to bulk write result object in `bulkWrite()` docs #7225

5.3.11 / 2018-11-09
===================
 * fix(model): make parent pointers non-enumerable so they don't crash JSON.stringify() #7220
 * fix(document): allow saving docs with nested props with '.' using `checkKeys: false` #7144
 * docs(lambda): use async/await with lambda example #7019

5.3.10 / 2018-11-06
===================
 * fix(discriminator): support reusing a schema for multiple discriminators #7200
 * fix(cursor): handle `lean(false)` correctly with query cursors #7197
 * fix(document): avoid manual populate if `ref` not set #7193
 * fix(schema): handle schema without `.base` for browser build #7170
 * docs: add further reading section

5.3.9 / 2018-11-02
==================
 * fix: upgrade bson dep -> 1.1.0 to match mongodb-core #7213 [NewEraCracker](https://github.com/NewEraCracker)
 * docs(api): fix broken anchor link #7210 [gfranco93](https://github.com/gfranco93)
 * fix: don't set parent timestamps because a child has timestamps set to false #7203 #7202 [lineus](https://github.com/lineus)
 * fix(document): run setter only once when doing `.set()` underneath a single nested subdoc #7196
 * fix(document): surface errors in subdoc pre validate #7187
 * fix(query): run default functions after hydrating the loaded document #7182
 * fix(query): handle strictQuery: 'throw' with nested path correctly #7178
 * fix(update): update timestamps on replaceOne() #7152
 * docs(transactions): add example of aborting a transaction #7113

5.3.8 / 2018-10-30
==================
 * fix: bump mongodb driver -> 3.1.8 to fix connecting to +srv uri with no credentials #7191 #6881 [lineus](https://github.com/lineus)
 * fix(document): sets defaults correctly in child docs with projection #7159
 * fix(mongoose): handle setting custom type on a separate mongoose global #7158
 * fix: add unnecessary files to npmignore #7157
 * fix(model): set session when creating new subdoc #7104

5.3.7 / 2018-10-26
==================
 * fix(browser): fix buffer usage in browser build #7184 #7173 [lineus](https://github.com/lineus)
 * fix(document): make depopulate() work on populate virtuals and unpopulated docs #7180 #6075 [lineus](https://github.com/lineus)
 * fix(document): only pass properties as 2nd arg to custom validator if `propsParameter` set #7145
 * docs(schematypes): add note about nested paths with `type` getting converted to mixed #7143
 * fix(update): run update validators on nested doc when $set on an array #7135
 * fix(update): copy exact errors from array subdoc validation into top-level update validator error #7135

5.3.6 / 2018-10-23
==================
 * fix(cursor): fix undefined transforms error

5.3.5 / 2018-10-22
==================
 * fix(model): make sure versionKey on `replaceOne()` always gets set at top level to prevent cast errors #7138
 * fix(cursor): handle non-boolean lean option in `eachAsync()` #7137
 * fix(update): correct cast update that overwrites a map #7111
 * fix(schema): handle arrays of mixed correctly #7109
 * fix(query): use correct path when getting schema for child timestamp update #7106
 * fix(document): make `$session()` propagate sessions to child docs #7104
 * fix(document): handle user setting `schema.options.strict = 'throw'` #7103
 * fix(types): use core Node.js buffer prototype instead of safe-buffer because safe-buffer is broken for Node.js 4.x #7102
 * fix(document): handle setting single doc with refPath to document #7070
 * fix(model): handle array filters when updating timestamps for subdocs #7032

5.3.4 / 2018-10-15
==================
 * fix(schema): make `add()` and `remove()` return the schema instance #7131 [lineus](https://github.com/lineus)
 * fix(query): don't require passing model to `cast()` #7118
 * fix: support `useFindAndModify` as a connection-level option #7110 [lineus](https://github.com/lineus)
 * fix(populate): handle plus path projection with virtual populate #7050
 * fix(schema): allow using ObjectId type as schema path type #7049
 * docs(schematypes): elaborate on how schematypes relate to types #7049
 * docs(deprecations): add note about gridstore deprecation #6922
 * docs(guide): add storeSubdocValidationError option to guide #6802

5.3.3 / 2018-10-12
==================
 * fix(document): enable storing mongoose validation error in MongoDB by removing `$isValidatorError` property #7127
 * docs(api): clarify that aggregate triggers aggregate middleware #7126 [lineus](https://github.com/lineus)
 * fix(connection): handle Model.init() when an index exists on schema + autoCreate == true #7122 [jesstelford](https://github.com/jesstelford)
 * docs(middleware): explain how to switch between document and query hooks for `remove()` #7093
 * docs(api): clean up encoding issues in SchemaType.prototype.validate docs #7091
 * docs(schema): add schema types to api docs and update links on schematypes page #7080 #7076 [lineus](https://github.com/lineus)
 * docs(model): expand model constructor docs with examples and `fields` param #7077
 * docs(aggregate): remove incorrect description of noCursorTimeout and add description of aggregate options #7056
 * docs: re-add array type to API docs #7027
 * docs(connections): add note about `members.host` errors due to bad host names in replica set #7006

5.3.2 / 2018-10-07
==================
 * fix(query): make sure to return correct result from `orFail()` #7101 #7099 [gsandorx](https://github.com/gsandorx)
 * fix(schema): handle `{ timestamps: false }` correctly #7088 #7074 [lineus](https://github.com/lineus)
 * docs: fix markdown in options.useCreateIndex documentation #7085 [Cyral](https://github.com/Cyral)
 * docs(schema): correct field name in timestamps example #7082 [kizmo04](https://github.com/kizmo04)
 * docs(migrating_to_5): correct markdown syntax #7078 [gwuah](https://github.com/gwuah)
 * fix(connection): add useFindAndModify option in connect #7059 [NormanPerrin](https://github.com/NormanPerrin)
 * fix(document): dont mark single nested path as modified if setting to the same value #7048
 * fix(populate): use WeakMap to track lean populate models rather than leanPopulateSymbol #7026
 * fix(mongoose): avoid unhandled rejection when `mongoose.connect()` errors with a callback #6997
 * fix(mongoose): isolate Schema.Types between custom Mongoose instances #6933

5.3.1 / 2018-10-02
==================
 * fix(ChangeStream): expose driver's `close()` function #7068 #7022 [lineus](https://github.com/lineus)
 * fix(model): avoid printing warning if `_id` index is set to "hashed" #7053
 * fix(populate): handle nested populate underneath lean array correctly #7052
 * fix(update): make timestamps not crash on a null or undefined update #7041
 * docs(schematypes+validation): clean up links from validation docs to schematypes docs #7040
 * fix(model): apply timestamps to nested docs in bulkWrite() #7032
 * docs(populate): rewrite refPath docs to be simpler and more direct #7013
 * docs(faq): explain why destructuring imports are not supported in FAQ #7009

5.3.0 / 2018-09-28
==================
 * feat(mongoose): support `mongoose.set('debug', WritableStream)` so you can pipe debug to stderr, file, or network #7018
 * feat(query): add useNestedStrict option #6973 #5144 [lineus](https://github.com/lineus)
 * feat(query): add getPopulatedPaths helper to Query.prototype #6970 #6677 [lineus](https://github.com/lineus)
 * feat(model): add `createCollection()` helper to make transactions easier #6948 #6711 [Fonger](https://github.com/Fonger)
 * feat(schema): add ability to do `schema.add(otherSchema)` to merge hooks, virtuals, etc. #6897
 * feat(query): add `orFail()` helper that throws an error if no documents match `filter` #6841
 * feat(mongoose): support global toObject and toJSON #6815
 * feat(connection): add deleteModel() to remove a model from a connection #6813
 * feat(mongoose): add top-level mongoose.ObjectId, mongoose.Decimal128 for easier schema declarations #6760
 * feat(aggregate+query): support for/await/of (async iterators) #6737
 * feat(mongoose): add global `now()` function that you can stub for testing timestamps #6728
 * feat(schema): support `schema.pre(RegExp, fn)` and `schema.post(RegExp, fn)` #6680
 * docs(query): add better docs for the `mongooseOptions()` function #6677
 * feat(mongoose): add support for global strict object #6858
 * feat(schema+mongoose): add autoCreate option to automatically create collections #6489
 * feat(update): update timestamps on nested subdocs when using `$set` #4412
 * feat(query+schema): add query `remove` hook and ability to switch between query `remove` and document `remove` middleware #3054

5.2.18 / 2018-09-27
===================
 * docs(migrating_to_5): add note about overwriting filter properties #7030
 * fix(query): correctly handle `select('+c')` if c is not in schema #7017
 * fix(document): check path exists before checking for required #6974
 * fix(document): retain user-defined key order on initial set with nested docs #6944
 * fix(populate): handle multiple localFields + foreignFields using `localField: function() {}` syntax #5704

5.2.17 / 2018-09-21
===================
 * docs(guide): clarify that Mongoose only increments versionKey on `save()` and add a workaround for `findOneAndUpdate()` #7038
 * fix(model): correctly handle `createIndex` option to `ensureIndexes()` #7036 #6922 [lineus](https://github.com/lineus)
 * docs(migrating_to_5): add a note about changing debug output from stderr to stdout #7034 #7018 [lineus](https://github.com/lineus)
 * fix(query): add `setUpdate()` to allow overwriting update without changing op #7024 #7012 [lineus](https://github.com/lineus)
 * fix(update): find top-level version key even if there are `$` operators in the update #7003
 * docs(model+query): explain which operators `count()` supports that `countDocuments()` doesn't #6911

5.2.16 / 2018-09-19
===================
 * fix(index): use dynamic require only when needed for better webpack support #7014 #7010 [jaydp17](https://github.com/jaydp17)
 * fix(map): handle arrays of mixed maps #6995
 * fix(populate): leave justOne as null if populating underneath a Mixed type #6985
 * fix(populate): add justOne option to allow overriding any bugs with justOne #6985
 * fix(query): add option to skip adding timestamps to an update #6980
 * docs(model+schematype): improve docs about background indexes and init() #6966
 * fix: bump mongodb -> 3.1.6 to allow connecting to srv url without credentials #6955 #6881 [lineus](https://github.com/lineus)
 * fix(connection): allow specifying `useCreateIndex` at the connection level, overrides global-level #6922
 * fix(schema): throw a helpful error if setting `ref` to an invalid value #6915

5.2.15 / 2018-09-15
===================
 * fix(populate): handle virtual justOne correctly if it isn't set #6988
 * fix(populate): consistently use lowercase `model` instead of `Model` so double-populating works with existing docs #6978
 * fix(model): allow calling `Model.init()` again after calling `dropDatabase()` #6967
 * fix(populate): find correct justOne when double-populating underneath an array #6798
 * docs(webpack): make webpack docs use es2015 preset for correct libs and use acorn to test output is valid ES5 #6740
 * fix(populate): add selectPopulatedPaths option to opt out of auto-adding `populate()`-ed fields to `select()` #6546
 * fix(model): set timestamps on bulkWrite `insertOne` and `replaceOne` #5708

5.2.14 / 2018-09-09
===================
 * docs: fix wording on promise docs to not imply queries only return promises #6983 #6982 [lineus](https://github.com/lineus)
 * fix(map): throw TypeError if keys are not string #6956
 * fix(document): ensure you can `validate()` a child doc #6931
 * fix(populate): avoid cast error if refPath points to localFields with 2 different types #6870
 * fix(populate): handle populating already-populated paths #6839
 * fix(schematype): make ObjectIds handle refPaths when checking required #6714
 * fix(model): set timestamps on bulkWrite() updates #5708

5.2.13 / 2018-09-04
===================
 * fix(map): throw TypeError if keys are not string #6968 [Fonger](https://github.com/Fonger)
 * fix(update): make array op casting work with strict:false and {} #6962 #6952 [lineus](https://github.com/lineus)
 * fix(document): add doc.deleteOne(), doc.updateOne(), doc.replaceOne() re: deprecation warnings #6959 #6940 [lineus](https://github.com/lineus)
 * docs(faq+schematypes): add note about map keys needing to be strings #6957 #6956 [lineus](https://github.com/lineus)
 * fix(schematype): remove unused if statement #6950 #6949 [cacothi](https://github.com/cacothi)
 * docs: add /docs/deprecations.html for dealing with MongoDB driver deprecation warnings #6922
 * fix(populate): handle refPath where first element in array has no refPath #6913
 * fix(mongoose): allow setting useCreateIndex option after creating a model but before initial connection succeeds #6890
 * fix(updateValidators): ensure $pull validators always get an array #6889

5.2.12 / 2018-08-30
===================
 * fix(document): disallow setting `constructor` and `prototype` if strict mode false

4.13.17 / 2018-08-30
====================
 * fix(document): disallow setting `constructor` and `prototype` if strict mode false

5.2.11 / 2018-08-30
===================
 * fix(document): disallow setting __proto__ if strict mode false
 * fix(document): run document middleware on docs embedded in maps #6945 #6938 [Fonger](https://github.com/Fonger)
 * fix(query): make castForQuery return a CastError #6943 #6927 [lineus](https://github.com/lineus)
 * fix(query): use correct `this` scope when casting query with legacy 2dsphere pairs defined in schema #6939 #6937 [Fonger](https://github.com/Fonger)
 * fix(document): avoid crash when calling `get()` on deeply nested subdocs #6929 #6925 [jakemccloskey](https://github.com/jakemccloskey)
 * fix(plugins): make saveSubdocs execute child post save hooks _after_ the actual save #6926
 * docs: add dbName to api docs for .connect() #6923 [p722](https://github.com/p722)
 * fix(populate): convert to array when schema specifies array, even if doc doesn't have an array #6908
 * fix(populate): handle `justOne` virtual populate underneath array #6867
 * fix(model): dont set versionKey on upsert if it is already `$set` #5973

4.13.16 / 2018-08-30
====================
 * fix(document): disallow setting __proto__ if strict mode false
 * feat(error): backport adding modified paths to VersionError #6928 [freewil](https://github.com/freewil)

5.2.10 / 2018-08-27
===================
 * fix: bump mongodb driver -> 3.1.4 #6920 #6903 #6884 #6799 #6741 [Fonger](https://github.com/Fonger)
 * fix(model): track `session` option for `save()` as the document's `$session()` #6909
 * fix(query): add Query.getOptions() helper #6907 [Fonger](https://github.com/Fonger)
 * fix(document): ensure array atomics get cleared after save() #6900
 * fix(aggregate): add missing redact and readConcern helpers #6895 [Fonger](https://github.com/Fonger)
 * fix: add global option `mongoose.set('useCreateIndex', true)` to avoid ensureIndex deprecation warning #6890
 * fix(query): use `projection` option to avoid deprecation warnings #6888 #6880 [Fonger](https://github.com/Fonger)
 * fix(query): use `findOneAndReplace()` internally if using `overwrite: true` with `findOneAndUpdate()` #6888 [Fonger](https://github.com/Fonger)
 * fix(document): ensure required cache gets cleared correctly between subsequent saves #6892
 * fix(aggregate): support session chaining correctly #6886 #6885 [Fonger](https://github.com/Fonger)
 * fix(query): use `projection` instead of `fields` internally for `find()` and `findOne()` to avoid deprecation warning #6880
 * fix(populate): add `getters` option to opt in to calling getters on populate #6844

5.2.9 / 2018-08-17
==================
 * fix(document): correctly propagate write concern options in save() #6877 [Fonger](https://github.com/Fonger)
 * fix: upgrade mongodb driver -> 3.1.3 for numerous fixes #6869 #6843 #6692 #6670 [simllll](https://github.com/simllll)
 * fix: correct `this` scope of default functions for DocumentArray and Array #6868 #6840 [Fonger](https://github.com/Fonger)
 * fix(types): support casting JSON form of buffers #6866 #6863 [Fonger](https://github.com/Fonger)
 * fix(query): get global runValidators option correctly #6865 #6578
 * fix(query): add Query.prototype.setQuery() analogous to `getQuery()` #6855 #6854
 * docs(connections): add note about the `family` option for IPv4 vs IPv6 and add port to example URIs #6784
 * fix(query): get global runValidators option correctly #6578

4.13.15 / 2018-08-14
====================
 * fix(mongoose): add global `usePushEach` option for easier Mongoose 4.x + MongoDB 3.6 #6858
 * chore: fix flakey tests for 4.x #6853 [Fonger](https://github.com/Fonger)
 * feat(error): add version number to VersionError #6852 [freewil](https://github.com/freewil)

5.2.8 / 2018-08-13
==================
 * docs: update `execPopulate()` code example #6851 [WJakub](https://github.com/WJakub)
 * fix(document): allow passing callback to `execPopulate()` #6851
 * fix(populate): populate with undefined fields without error #6848 #6845 [Fonger](https://github.com/Fonger)
 * docs(migrating_to_5): Add `objectIdGetter` option docs #6842 [jwalton](https://github.com/jwalton)
 * chore: run lint in parallel and only on Node.js v10 #6836 [Fonger](https://github.com/Fonger)
 * fix(populate): throw helpful error if refPath excluded in query #6834
 * docs(migrating_to_5): add note about removing runSettersOnQuery #6832
 * fix: use safe-buffer to avoid buffer deprecation errors in Node.js 10 #6829 [Fonger](https://github.com/Fonger)
 * docs(query): fix broken links #6828 [yaynick](https://github.com/yaynick)
 * docs(defaults): clarify that defaults only run on undefined #6827
 * chore: fix flakey tests #6824 [Fonger](https://github.com/Fonger)
 * docs: fix custom inspect function deprecation warning in Node.js 10 #6821 [yelworc](https://github.com/yelworc)
 * fix(document): ensure subdocs get set to init state after save() so validators can run again #6818
 * fix(query): make sure embedded query casting always throws a CastError #6803
 * fix(document): ensure `required` function only gets called once when validating #6801
 * docs(connections): note that you must specify port if using `useNewUrlParser: true` #6789
 * fix(populate): support `options.match` in virtual populate schema definition #6787
 * fix(update): strip out virtuals from updates if strict: 'throw' rather than returning an error #6731

5.2.7 / 2018-08-06
==================
 * fix(model): check `expireAfterSeconds` option when diffing indexes in syncIndexes() #6820 #6819 [christopherhex](https://github.com/christopherhex)
 * chore: fix some common test flakes in travis #6816 [Fonger](https://github.com/Fonger)
 * chore: bump eslint and webpack to avoid bad versions of eslint-scope #6814
 * test(model): add delay to session tests to improve pass rate #6811 [Fonger](https://github.com/Fonger)
 * fix(model): support options in `deleteMany` #6810 [Fonger](https://github.com/Fonger)
 * fix(query): don't use $each when pushing an array into an array #6809 [lineus](https://github.com/lineus)
 * chore: bump mquery so eslint isn't a prod dependency #6800
 * fix(populate): correctly get schema type when calling `populate()` on already populated path #6798
 * fix(populate): propagate readConcern options in populate from parent query #6792 #6785 [Fonger](https://github.com/Fonger)
 * docs(connection): add description of useNewUrlParser option #6789
 * fix(query): make select('+path') a no-op if no select prop in schema #6785
 * docs(schematype+validation): document using function syntax for custom validator message #6772
 * fix(update): throw CastError if updating with `$inc: null` #6770
 * fix(connection): throw helpful error when calling `createConnection(undefined)` #6763

5.2.6 / 2018-07-30
==================
 * fix(document): don't double-call deeply nested custom getters when using `get()` #6779 #6637
 * fix(query): upgrade mquery for readConcern() helper #6777
 * docs(schematypes): clean up typos #6773 [sajadtorkamani](https://github.com/sajadtorkamani)
 * refactor(browser): fix webpack warnings #6771 #6705
 * fix(populate): make error reported when no `localField` specified catchable #6767
 * docs(connection): use correct form in createConnection example #6766 [lineus](https://github.com/lineus)
 * fix(connection): throw helpful error when using legacy `mongoose.connect()` syntax #6756
 * fix(document): handle overwriting `$session` in `execPopulate()` #6754
 * fix(query): propagate top-level session down to `populate()` #6754
 * fix(aggregate): add `session()` helper for consistency with query api #6752
 * fix(map): avoid infinite recursion when update overwrites a map #6750
 * fix(model): be consistent about passing noop callback to mongoose.model() `init()` as well as db.model() #6707

5.2.5 / 2018-07-23
==================
 * fix(boolean): expose `convertToTrue` and `convertToFalse` for custom boolean casting #6758
 * docs(schematypes): add note about what values are converted to booleans #6758
 * fix(document): fix(document): report castError when setting single nested doc to array #6753
 * docs: prefix mongoose.Schema call with new operator #6751 [sajadtorkamani](https://github.com/sajadtorkamani)
 * docs(query): add examples and links to schema writeConcern option for writeConcern helpers #6748
 * docs(middleware): clarify that init middleware is sync #6747
 * perf(model): create error rather than modifying stack for source map perf #6735
 * fix(model): throw helpful error when passing object to aggregate() #6732
 * fix(model): pass Model instance as context to applyGetters when calling getters for virtual populate #6726 [lineus](https://github.com/lineus)
 * fix(documentarray): remove `isNew` and `save` listeners on CastError because otherwise they never get removed #6723
 * docs(model+query): clarify when to use `countDocuments()` vs `estimatedDocumentCount()` #6713
 * fix(populate): correctly set virtual nestedSchemaPath when calling populate() multiple times #6644
 * docs(connections): add note about the `family` option for IPv4 vs IPv6 and add port to example URIs #6566

5.2.4 / 2018-07-16
==================
 * docs: Model.insertMany rawResult option in api docs #6724 [lineus](https://github.com/lineus)
 * docs: fix typo on migrating to 5 guide #6722 [iagowp](https://github.com/iagowp)
 * docs: update doc about keepalive #6719 #6718 [simllll](https://github.com/simllll)
 * fix: ensure debug mode doesn't crash with sessions #6712
 * fix(document): report castError when setting single nested doc to primitive value #6710
 * fix(connection): throw helpful error if using `new db.model(foo)(bar)` #6698
 * fix(model): throw readable error with better stack trace when non-cb passed to $wrapCallback() #6640

5.2.3 / 2018-07-11
==================
 * fix(populate): if a getter is defined on the localField, use it when populating #6702 #6618 [lineus](https://github.com/lineus)
 * docs(schema): add example of nested aliases #6671
 * fix(query): add `session()` function to queries to avoid positional argument mistakes #6663
 * docs(transactions): use new session() helper to make positional args less confusing #6663
 * fix(query+model+schema): add support for `writeConcern` option and writeConcern helpers #6620
 * docs(guide): add `writeConcern` option and re-add description for `safe` option #6620
 * docs(schema): fix broken API links #6619
 * docs(connections): add information re: socketTimeoutMS and connectTimeoutMS #4789

5.2.2 / 2018-07-08
==================
 * fix(model+query): add missing estimatedDocumentCount() function #6697
 * docs(faq): improve array-defaults section #6695 [lineus](https://github.com/lineus)
 * docs(model): fix countDocuments() docs, bad copy/paste from count() docs #6694 #6643
 * fix(connection): add `startSession()` helper to connection and mongoose global #6689
 * fix: upgrade mongodb driver -> 3.1.1 for countDocuments() fix #6688 #6666
 * docs(compatibility): add MongoDB 4 range #6685
 * fix(populate): add ability to define refPath as a function #6683 [lineus](https://github.com/lineus)
 * docs: add rudimentary transactions guide #6672
 * fix(update): make setDefaultsOnInsert handle nested subdoc updates with deeply nested defaults #6665
 * docs: use latest acquit-ignore to handle examples that start with acquit:ignore:start #6657
 * fix(validation): format `properties.message` as well as `message` #6621

5.2.1 / 2018-07-03
==================
 * fix(connection): allow setting the mongodb driver's useNewUrlParser option, default to false #6656 #6648 #6647
 * fix(model): only warn on custom _id index if index only has _id key #6650

5.2.0 / 2018-07-02
==================
 * feat(model): add `countDocuments()` #6643
 * feat(model): make ensureIndexes() fail if specifying an index on _id #6605
 * feat(mongoose): add `objectIdGetter` option to remove ObjectId.prototype._id #6588
 * feat: upgrade mongodb -> 3.1.0 for full MongoDB 4.0 support #6579
 * feat(query): support `runValidators` as a global option #6578
 * perf(schema): use WeakMap instead of array for schema stack #6503
 * feat(model): decorate unique discriminator indexes with partialFilterExpressions #6347
 * feat(model): add `syncIndexes()`, drops indexes that aren't in schema #6281
 * feat(document): add default getter/setter if virtual doesn't have one #6262
 * feat(discriminator): support discriminators on nested doc arrays #6202
 * feat(update): add `Query.prototype.set()` #5770

5.1.8 / 2018-07-02
==================
 * fix: don't throw TypeError if calling save() after original save() failed with push() #6638 [evanhenke](https://github.com/evanhenke)
 * fix(query): add explain() helper and don't hydrate explain output #6625
 * docs(query): fix `setOptions()` lists #6624
 * docs: add geojson docs #6607
 * fix: bump mongodb -> 3.0.11 to avoid cyclic dependency error with retryWrites #6109

5.1.7 / 2018-06-26
==================
 * docs: add npm badge to readme #6623 [VFedyk](https://github.com/VFedyk)
 * fix(document): don't throw parallel save error if post save hooks in parallel #6614 #6611 [lineus](https://github.com/lineus)
 * fix(populate): allow dynamic ref to handle >1 model getModelsMapForPopulate #6613 #6612 [jimmytsao](https://github.com/jimmytsao)
 * fix(document): handle `push()` on triple nested document array #6602
 * docs(validation): improve update validator doc headers #6577 [joeytwiddle](https://github.com/joeytwiddle)
 * fix(document): handle document arrays in `modifiedPaths()` with includeChildren option #5904

5.1.6 / 2018-06-19
==================
 * fix: upgrade mongodb -> 3.0.10
 * docs(model+document): clarify that `save()` returns `undefined` if passed a callback #6604 [lineus](https://github.com/lineus)
 * fix(schema): apply alias when adding fields with .add() #6593
 * docs: add full list of guides and streamline nav #6592
 * docs(model): add `projection` option to `findOneAndUpdate()` #6590 [lineus](https://github.com/lineus)
 * docs: support @static JSDoc declaration #6584
 * fix(query): use boolean casting logic for $exists #6581
 * fix(query): cast all $text options to correct values #6581
 * fix(model): add support synchronous pre hooks for `createModel` #6552 [profbiss](https://github.com/profbiss)
 * docs: add note about the `applyPluginsToDiscriminators` option #4965

5.1.5 / 2018-06-11
==================
 * docs(guide): rework query helper example #6575 [lineus](https://github.com/lineus)
 * fix(populate): handle virtual populate with embedded discriminator under single nested subdoc #6571
 * docs: add string option to projections that call query select #6563 [lineus](https://github.com/lineus)
 * style: use ES6 in collection.js #6560 [l33ds](https://github.com/l33ds)
 * fix(populate): add virtual ref function ability getModelsMapForPopulate #6559 #6554 [lineus](https://github.com/lineus)
 * docs(queries): fix link #6557 [sun1x](https://github.com/sun1x)
 * fix(schema): rename indexes -> getIndexes to avoid webpack duplicate declaration #6547
 * fix(document): support `toString()` as custom method #6538
 * docs: add @instance for instance methods to be more compliant with JSDoc #6516 [treble-snake](https://github.com/treble-snake)
 * fix(populate): avoid converting to map when using mongoose-deep-populate #6460
 * docs(browser): create new browser docs page #6061

5.1.4 / 2018-06-04
==================
 * docs(faq): add hr tags for parallel save error #6550 [lineus](https://github.com/lineus)
 * docs(connection): fix broken link #6545 [iblamefish](https://github.com/iblamefish)
 * fix(populate): honor subpopulate options #6539 #6528 [lineus](https://github.com/lineus)
 * fix(populate): allow population of refpath under array #6537 #6509 [lineus](https://github.com/lineus)
 * fix(query): dont treat $set the same as the other ops in update casting #6535 [lineus](https://github.com/lineus)
 * fix: bump async -> 2.6.1 #6534 #6505 [lineus](https://github.com/lineus)
 * fix: support using a function as validation error message #6530 [lucandrade](https://github.com/lucandrade)
 * fix(populate): propagate `lean()` down to subpopulate #6498 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs(lambda): add info on what happens if database does down between lambda function calls #6409
 * fix(update): allow updating embedded discriminator path if discriminator key is in filter #5841

5.1.3 / 2018-05-28
==================
 * fix(document): support set() on path underneath array embedded discriminator #6526
 * chore: update lodash and nsp dev dependencies #6514 [ChristianMurphy](https://github.com/ChristianMurphy)
 * fix(document): throw readable error when saving the same doc instance more than once in parallel #6511 #6456 #4064 [lineus](https://github.com/lineus)
 * fix(populate): set correct nestedSchemaPath for virtual underneath embedded discriminator #6501 #6487 [lineus](https://github.com/lineus)
 * docs(query): add section on promises and warning about not mixing promises and callbacks #6495
 * docs(connection): add concrete example of connecting to multiple hosts #6492 [lineus](https://github.com/lineus)
 * fix(populate): handle virtual populate under single nested doc under embedded discriminator #6488
 * fix(schema): collect indexes from embedded discriminators for autoIndex build #6485
 * fix(document): handle `doc.set()` underneath embedded discriminator #6482
 * fix(document): handle set() on path under embedded discriminator with object syntax #6482
 * fix(document): handle setting nested property to object with only non-schema properties #6436

4.13.14 / 2018-05-25
====================
 * fix(model): handle retainKeyOrder option in findOneAndUpdate() #6484

5.1.2 / 2018-05-21
==================
 * docs(guide): add missing SchemaTypes #6490 [distancesprinter](https://github.com/distancesprinter)
 * fix(map): make MongooseMap.toJSON return a serialized object #6486 #6478 [lineus](https://github.com/lineus)
 * fix(query): make CustomQuery inherit from model.Query for hooks #6483 #6455 [lineus](https://github.com/lineus)
 * fix(document): prevent default falses from being skipped by $__dirty #6481 #6477 [lineus](https://github.com/lineus)
 * docs(connection): document `useDb()` #6480
 * fix(model): skip redundant clone in insertMany #6479 [d1manson](https://github.com/d1manson)
 * fix(aggregate): let replaceRoot accept objects as well as strings #6475 #6474 [lineus](https://github.com/lineus)
 * docs(model): clarify `emit()` in mapReduce and how map/reduce are run #6465
 * fix(populate): flatten array to handle multi-level nested `refPath` #6457
 * fix(date): cast small numeric strings as years #6444 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(populate): remove unmatched ids when using virtual populate on already hydrated document #6435
 * fix(array): use custom array class to avoid clobbered property names #6431
 * fix(model): handle hooks for custom methods that return promises #6385

4.13.13 / 2018-05-17
====================
 * fix(update): stop clobbering $in when casting update #6441 #6339
 * fix: upgrade async -> 2.6.0 re: security warning

5.1.1 / 2018-05-14
==================
 * docs(schema): add notes in api and guide about schema.methods object #6470 #6440 [lineus](https://github.com/lineus)
 * fix(error): add modified paths to VersionError #6464 #6433 [paglias](https://github.com/paglias)
 * fix(populate): only call populate with full param signature when match is not present #6458 #6451 [lineus](https://github.com/lineus)
 * docs: fix geoNear link in migration guide #6450 [kawache](https://github.com/kawache)
 * fix(discriminator): throw readable error when `create()` with a non-existent discriminator key #6434
 * fix(populate): add `retainNullValues` option to avoid stripping out null keys #6432
 * fix(populate): handle populate in embedded discriminators underneath nested paths #6411
 * docs(model): add change streams and ToC, make terminology more consistent #5888

5.1.0 / 2018-05-10
==================
 * feat(ObjectId): add `_id` getter so you can get a usable id whether or not the path is populated #6415 #6115
 * feat(model): add Model.startSession() #6362
 * feat(document): add doc.$session() and set session on doc after query #6362
 * feat: add Map type that supports arbitrary keys #6287 #681
 * feat: add `cloneSchemas` option to mongoose global to opt in to always cloning schemas before use #6274
 * feat(model): add `findOneAndDelete()` and `findByIdAndDelete()` #6164
 * feat(document): support `$ignore()` on single nested and array subdocs #6152
 * feat(document): add warning about calling `save()` on subdocs #6152
 * fix(model): make `save()` use `updateOne()` instead of `update()` #6031
 * feat(error): add version number to VersionError #5966
 * fix(query): allow `[]` as a value for `$in` when casting #5913
 * fix(document): avoid running validators on single nested paths if only a child path is modified #5885
 * feat(schema): print warning if method conflicts with mongoose internals #5860

5.0.18 / 2018-05-09
===================
 * fix(update): stop clobbering $in when casting update #6441 #6339 [lineus](https://github.com/lineus)
 * fix: upgrade mongodb driver -> 3.0.8 to fix session issue #6437 #6357 [simllll](https://github.com/simllll)
 * fix: upgrade bson -> 1.0.5 re: https://snyk.io/vuln/npm:bson:20180225 #6423 [ChristianMurphy](https://github.com/ChristianMurphy)
 * fix: look for `valueOf()` when casting to Decimal128 #6419 #6418 [lineus](https://github.com/lineus)
 * fix: populate array of objects with space separated paths #6414 [lineus](https://github.com/lineus)
 * test: add coverage for `mongoose.pluralize()` #6412 [FastDeath](https://github.com/FastDeath)
 * fix(document): avoid running default functions on init() if path has value #6410
 * fix(document): allow saving document with `null` id #6406
 * fix: prevent casting of populated docs in document.init #6390 [lineus](https://github.com/lineus)
 * fix: remove `toHexString()` helper that was added in 5.0.15 #6359

5.0.17 / 2018-04-30
===================
 * docs(migration): certain chars in passwords may cause connection failures #6401 [markstos](https://github.com/markstos)
 * fix(document): don't throw when `push()` on a nested doc array #6398
 * fix(model): apply hooks to custom methods if specified #6385
 * fix(schema): support opting out of one timestamp field but not the other for `insertMany()` #6381
 * fix(documentarray): handle `required: true` within documentarray definition #6364
 * fix(document): ensure `isNew` is set before default functions run on init #3793

5.0.16 / 2018-04-23
===================
 * docs(api): sort api methods based on their string property #6374 [lineus](https://github.com/lineus)
 * docs(connection): fix typo in `createCollection()` #6370 [mattc41190](https://github.com/mattc41190)
 * docs(document): remove vestigial reference to `numAffected` #6367 [ekulabuhov](https://github.com/ekulabuhov)
 * docs(schema): fix typo #6366 [dhritzkiv](https://github.com/dhritzkiv)
 * docs(schematypes): add missing `minlength` and `maxlength` docs #6365 [treble-snake](https://github.com/treble-snake)
 * docs(queries): fix formatting #6360 [treble-snake](https://github.com/treble-snake)
 * docs(api): add cursors to API docs #6353 #6344 [lineus](https://github.com/lineus)
 * docs(aggregate): remove reference to non-existent `.select()` method #6346
 * fix(update): handle `required` array with update validators and $pull #6341
 * fix(update): avoid setting __v in findOneAndUpdate if it is `$set` #5973

5.0.15 / 2018-04-16
===================
 * fix: add ability for casting from number to decimal128 #6336 #6331 [lineus](https://github.com/lineus)
 * docs(middleware): enumerate the ways to error out in a hook #6315
 * fix(document): respect schema-level depopulate option for toObject() #6313
 * fix: bump mongodb driver -> 3.0.6 #6310
 * fix(number): check for `valueOf()` function to support Decimal.js #6306 #6299 [lineus](https://github.com/lineus)
 * fix(query): run array setters on query if input value is an array #6277
 * fix(versioning): don't require matching version when using array.pull() #6190
 * fix(document): add `toHexString()` function so you don't need to check whether a path is populated to get an id #6115

5.0.14 / 2018-04-09
===================
 * fix(schema): clone aliases and alternative option syntax correctly
 * fix(query): call utils.toObject in query.count like in query.find #6325 [lineus](https://github.com/lineus)
 * docs(populate): add middleware examples #6320 [BorntraegerMarc](https://github.com/BorntraegerMarc)
 * docs(compatibility): fix dead link #6319 [lacivert](https://github.com/lacivert)
 * docs(api): fix markdown parsing for parameters #6318 #6314 [lineus](https://github.com/lineus)
 * fix(populate): handle space-delimited paths in array populate #6296 #6284 [lineus](https://github.com/lineus)
 * fix(populate): support basic virtual populate underneath embedded discriminators #6273

5.0.13 / 2018-04-05
===================
 * docs(faq): add middleware to faq arrow function warning #6309 [lineus](https://github.com/lineus)
 * docs(schema): add example to loadClass() docs #6308
 * docs: clean up misc typos #6304 [sfrieson](https://github.com/sfrieson)
 * fix(document): apply virtuals when calling `toJSON()` on a nested path #6294
 * refactor(connection): use `client.db()` syntax rather than double-parsing the URI #6292 #6286
 * docs: document new behavior of required validator for arrays #6288 [daltones](https://github.com/daltones)
 * fix(schema): treat set() options as user-provided options #6274
 * fix(schema): clone discriminators correctly #6274
 * fix(update): make setDefaultsOnInsert not create subdoc if only default is id #6269
 * docs(discriminator): clarify 3rd argument to Model.discriminator() #2596

5.0.12 / 2018-03-27
===================
 * docs(query): updating model name in query API docs #6280 [lineus](https://github.com/lineus)
 * docs: fix typo in tests #6275 [styler](https://github.com/styler)
 * fix: add missing `.hint()` to aggregate #6272 #6251 [lineus](https://github.com/lineus)
 * docs(api): add headers to each API docs section for easer nav #6261
 * fix(query): ensure hooked query functions always run on next tick for chaining #6250
 * fix(populate): ensure populated array not set to null if it isn't set #6245
 * fix(connection): set readyState to disconnected if initial connection fails #6244 #6131
 * docs(model): make `create()` params show up correctly in docs #6242
 * fix(model): make error handlers work with MongoDB server errors and `insertMany()` #6228
 * fix(browser): ensure browser document builds defaults for embedded arrays correctly #6175
 * fix(timestamps): set timestamps when using `updateOne()` and `updateMany()` #6282 [gualopezb](https://github.com/gualopezb)

5.0.11 / 2018-03-19
===================
 * fix(update): handle $pull with $in in update validators #6240
 * fix(query): don't convert undefined to null when casting so driver `ignoreUndefined` option works #6236
 * docs(middleware): add example of using async/await with middleware #6235
 * fix(populate): apply justOne option before `completeMany()` so it works with lean() #6234
 * fix(query): ensure errors in user callbacks aren't caught in init #6195 #6178
 * docs(connections): document dbName option for Atlas connections #6179
 * fix(discriminator): make child schema nested paths overwrite parent schema paths #6076

4.13.12 / 2018-03-13
====================
 * fix(document): make virtual get() return undefined instead of null if no getters #6223
 * docs: fix url in useMongoClient error message #6219 #6217 [lineus](https://github.com/lineus)
 * fix(discriminator): don't copy `discriminators` property from base schema #6122 #6064

5.0.10 / 2018-03-12
===================
 * docs(schematype): add notes re: running setters on queries #6209
 * docs: fix typo #6208 [kamagatos](https://github.com/kamagatos)
 * fix(query): only call setters once on query filter props for findOneAndUpdate and findOneAndRemove #6203
 * docs: elaborate on connection string changes in migration guide #6193
 * fix(document): skip applyDefaults if subdoc is null #6187
 * docs: fix schematypes docs and link to them #6176
 * docs(faq): add FAQs re: array defaults and casting aggregation pipelines #6184 #6176 #6170 [lineus](https://github.com/lineus)
 * fix(document): ensure primitive defaults are set and built-in default functions run before setters #6155
 * fix(query): handle single embedded embedded discriminators in castForQuery #6027

5.0.9 / 2018-03-05
==================
 * perf: bump mongodb -> 3.0.4 to fix SSL perf issue #6065

5.0.8 / 2018-03-03
==================
 * docs: remove obsolete references to `emitIndexErrors` #6186 [isaackwan](https://github.com/isaackwan)
 * fix(query): don't cast findOne() until exec() so setters don't run twice #6157
 * fix: remove document_provider.web.js file #6186
 * fix(discriminator): support custom discriminator model names #6100 [wentout](https://github.com/wentout)
 * fix: support caching calls to `useDb()` #6036 [rocketspacer](https://github.com/rocketspacer)
 * fix(query): add omitUndefined option so setDefaultsOnInsert can kick in on undefined #6034
 * fix: upgrade mongodb -> 3.0.3 for reconnectTries: 0 blocking process exit fix #6028

5.0.7 / 2018-02-23
==================
 * fix: support eachAsync options with aggregation cursor #6169 #6168 [vichle](https://github.com/vichle)
 * docs: fix link to MongoDB compound indexes docs #6162 [br0p0p](https://github.com/br0p0p)
 * docs(aggregate): use eachAsync instead of incorrect `each()` #6160 [simllll](https://github.com/simllll)
 * chore: fix benchmarks #6158 [pradel](https://github.com/pradel)
 * docs: remove dead link to old blog post #6154 [markstos](https://github.com/markstos)
 * fix: don't convert dates to numbers when updating mixed path #6146 #6145 [s4rbagamble](https://github.com/s4rbagamble)
 * feat(aggregate): add replaceRoot, count, sortByCount helpers #6142 [jakesjews](https://github.com/jakesjews)
 * fix(document): add includedChildren flag to modifiedPaths() #6134
 * perf: don't create wrapper function if no hooks specified #6126
 * fix(schema): allow indexes on single nested subdocs for geoJSON #6113
 * fix(document): allow depopulating all fields #6073
 * feat(mongoose): add support for `useFindAndModify` option on singleton #5616

5.0.6 / 2018-02-15
==================
 * refactor(query.castUpdate): avoid creating error until necessary #6137
 * docs(api): fix missing api docs #6136 [lineus](https://github.com/lineus)
 * fix(schema): copy virtuals when using `clone()` #6133
 * fix(update): avoid digging into buffers with upsert and replaceOne #6124
 * fix(schema): support `enum` on arrays of strings #6102
 * fix(update): cast `$addToSet: [1, 2]` -> `$addToSet: { $each: [1, 2] }` #6086

5.0.5 / 2018-02-13
==================
 * docs: make > show up correctly in API docs #6114
 * fix(query): support `where()` overwriting primitive with object #6097
 * fix(schematype): don't run internal `resetId` setter on queries with _id #6093
 * fix(discriminator): don't copy `discriminators` property from base schema #6064
 * fix(utils): respect `valueOf()` when merging object for update #6059
 * docs(validation): fix typo 'maxLength' #4720
 * fix(document): apply defaults after setting initial value so default functions don't see empty doc #3781

5.0.4 / 2018-02-08
==================
 * docs: add lambda guide #6107
 * fix(connection): add `dbName` option to work around `mongodb+srv` not supporting db name in URI #6106
 * fix(schematype): fix regexp typo in ObjectId #6098 [JoshuaWise](https://github.com/JoshuaWise)
 * perf(document): re-use the modifiedPaths list #6092 [tarun1793](https://github.com/tarun1793)
 * fix: use console.info() instead of console.error() for debug output #6088 [yuristsepaniuk](https://github.com/yuristsepaniuk)
 * docs(validation): clean up runValidators and isAsync options docs for 5.x #6083
 * docs(model): use array instead of spread consistently for aggregate() #6070
 * fix(schema): make aliases handle mongoose-lean-virtuals #6069
 * docs(layout): add link to subdocs guide #6056
 * fix(query): make strictQuery: true strip out fields that aren't in the schema #6032
 * docs(guide): add notes for `strictQuery` option #6032

4.13.11 / 2018-02-07
====================
 * docs: fix links in 4.x docs #6081
 * chore: add release script that uses --tag for npm publish for 4.x releases #6063

5.0.3 / 2018-01-31
==================
 * fix: consistently use process.nextTick() to avoid sinon.useFakeTimers() causing ops to hang #6074
 * docs(aggregate): fix typo #6072 [adursun](https://github.com/adursun)
 * chore: add return type to `mongoose.model()` docs [bryant1410](https://github.com/bryant1410)
 * fix(document): depopulate push()-ed docs when saving #6048
 * fix: upgrade mongodb -> 3.0.2 #6019

5.0.2 / 2018-01-28
==================
 * fix(schema): do not overwrite default values in schema when nested timestamps are provided #6024 [cdeveas](https://github.com/cdeveas)
 * docs: fix syntax highlighting in models.jade, schematypes.jade, subdocs.jade #6058 [lineus](https://github.com/lineus)
 * fix: use lazy loading so we can build mongoose with webpack #5993 #5842
 * docs(connections): clarify multi-mongos with useMongoClient for 4.x docs #5984
 * fix(populate): handle populating embedded discriminator paths #5970

4.13.10 / 2018-01-28
====================
 * docs(model+query): add lean() option to Model helpers #5996 [aguyinmontreal](https://github.com/aguyinmontreal)
 * fix: use lazy loading so we can build mongoose with webpack #5993 #5842
 * docs(connections): clarify multi-mongos with useMongoClient for 4.x docs #5984
 * fix(populate): handle populating embedded discriminator paths #5970
 * docs(query+aggregate): add more detail re: maxTimeMS #4066

5.0.1 / 2018-01-19
==================
 * fix(document): make validate() not resolve to document #6014
 * fix(model): make save() not return DocumentNotFoundError if using fire-and-forget writes #6012
 * fix(aggregate): make options() work as advertised #6011 [spederiva](https://github.com/spederiva)
 * docs(queries): fix code samples #6008

5.0.0 / 2018-01-17
==================
 * test: refactor tests to use start fewer connections #5985 [fenanquin](https://github.com/fenanquin)
 * feat: add global bufferCommands option #5879
 * docs: new docs site and build system #5976
 * test: increase timeout on slow test cases #5968 [fenanquin](https://github.com/fenanquin)
 * fix: avoid casting out array filter elements #5965
 * feat: add Model.watch() wrapper #5964
 * chore: replace istanbul with nyc #5962 [ChristianMurphy](https://github.com/ChristianMurphy)

4.13.9 / 2018-01-07
===================
 * chore: update marked (dev dependency) re: security vulnerability #5951 [ChristianMurphy](https://github.com/ChristianMurphy)
 * fix: upgrade mongodb -> 2.2.34 for ipv6 and autoReconnect fixes #5794 #5760
 * docs: use useMongooseAggCursor for aggregate docs #2955

5.0.0-rc2 / 2018-01-04
======================
 * fix: add cleaner warning about no longer needing `useMongoClient` in 5.x #5961
 * chore: update acquit -> 0.5.1 for minor security patch #5961 [ChristianMurphy](https://github.com/ChristianMurphy)
 * docs: add docs for mongoose 4.x at http://mongoosejs.com/docs/4.x #5959
 * docs: add link to migration guide #5957
 * chore: update eslint to version 4.14.0 #5955 [ChristianMurphy](https://github.com/ChristianMurphy)
 * chore: update mocha to version 4.1.0 [ChristianMurphy](https://github.com/ChristianMurphy)

5.0.0-rc1 / 2018-01-02
======================
 * fix(index): use pluralize correctly for `mongoose.model()` #5958
 * fix: make mquery use native promises by default #5945
 * fix(connection): ensure 'joined' and 'left' events get bubbled up #5944

5.0.0-rc0 / 2017-12-28
======================
 * BREAKING CHANGE: always use mongoose aggregation cursor when using `.aggregate().cursor()` #5941
 * BREAKING CHANGE: attach query middleware when compiling model #5939
 * BREAKING CHANGE: `emitIndexErrors` is on by default, failing index build will throw uncaught error if not handled #5910
 * BREAKING CHANGE: remove precompiled browser bundle #5895
 * feat: add `mongoose.pluralize()` function #5877
 * BREAKING CHANGE: remove `passRawResult` option for `findOneAndUpdate`, use `rawResult` #5869
 * BREAKING CHANGE: implicit async validators (based on number of function args) are removed, return a promise instead #5824
 * BREAKING CHANGE: fail fast if user sets a unique index on `_id` #5820 [varunjayaraman](https://github.com/varunjayaraman)
 * BREAKING CHANGE: mapReduce resolves to an object with 2 keys rather than 2 separate args #5816
 * BREAKING CHANGE: `mongoose.connect()` returns a promise, removed MongooseThenable #5796
 * BREAKING CHANGE: query stream removed, use `cursor()` instead #5795
 * BREAKING CHANGE: connection `open()` and `openSet()` removed, use `openUri()` instead #5795
 * BREAKING CHANGE: use MongoDB driver 3.0.0, drop support for MongoDB server < 3.0.0 #5791 #4740
 * BREAKING CHANGE: remove support for `$pushAll`, remove `usePushEach` option #5670
 * BREAKING CHANGE: make date casting use native Date #5395 [varunjayaraman](https://github.com/varunjayaraman)
 * BREAKING CHANGE: remove `runSettersOnQuery`, always run setters on query #5340
 * BREAKING CHANGE: array of length 0 now satisfies `required: true` for arays #5139 [wlingke](https://github.com/wlingke)
 * BREAKING CHANGE: remove `saveErrorIfNotFound`, always error out if `save()` did not update a document #4973
 * BREAKING CHANGE: don't execute getters in reverse order #4835
 * BREAKING CHANGE: make boolean casting more strict #4245
 * BREAKING CHANGE: `toObject()` and `toJSON()` option parameter merges with defaults rather than overwriting #4131
 * feat: allow setting `default` on `_id` #4069
 * BREAKING CHANGE: `deleteX()` and `remove()` promise resolves to the write object result #4013
 * feat: support returning a promise from middleware functions #3779
 * BREAKING CHANGE: don't return a promise if callback specified #3670
 * BREAKING CHANGE: only cast `update()`, `updateX()`, `replaceOne()`, `remove()`, `deleteX()` in exec #3529
 * BREAKING CHANGE: sync errors in middleware functions are now handled #3483
 * BREAKING CHANGE: post hooks get flow control #3232
 * BREAKING CHANGE: deduplicate hooks when merging discriminator schema #2945
 * BREAKING CHANGE: use native promises by default, remove support for mpromise #2917
 * BREAKING CHANGE: remove `retainKeyOrder`, always use forward order when iterating through objects #2749
 * BREAKING CHANGE: `aggregate()` no longer accepts a spread #2716

4.13.8 / 2017-12-27
===================
 * docs(guide): use more up-to-date syntax for autoIndex example #5933
 * docs: fix grammar #5927 [abagh0703](https://github.com/abagh0703)
 * fix: propagate lean options to child schemas #5914
 * fix(populate): use correct model with discriminators + nested populate #5858

4.13.7 / 2017-12-11
===================
 * docs(schematypes): fix typo #5889 [gokaygurcan](https://github.com/gokaygurcan)
 * fix(cursor): handle `reject(null)` with eachAsync callback #5875 #5874 [ZacharyRSmith](https://github.com/ZacharyRSmith)
 * fix: disallow setting `mongoose.connection` to invalid values #5871 [jinasonlin](https://github.com/jinasonlin)
 * docs(middleware): suggest using `return next()` to stop middleware execution #5866
 * docs(connection): improve connection string query param docs #5864
 * fix(document): run validate hooks on array subdocs even if not directly modified #5861
 * fix(discriminator): don't treat $meta as defining projection when querying #5859
 * fix(types): handle Decimal128 when using bson-ext on server side #5850
 * fix(document): ensure projection with only $slice isn't treated as inclusive for discriminators #4991
 * fix(model): throw error when passing non-object to create() #2037

4.13.6 / 2017-12-02
===================
 * fix(schema): support strictBool option in schema #5856 [ekulabuhov](https://github.com/ekulabuhov)
 * fix(update): make upsert option consistently handle truthy values, not just booleans, for updateOne() #5839
 * refactor: remove unnecessary constructor check #2057
 * docs(query): correct function signature for .mod() helper #1806
 * fix(query): report ObjectParameterError when passing non-object as filter to find() and findOne() #1698

4.13.5 / 2017-11-24
===================
 * fix(model): handle update cast errors correctly with bulkWrite #5845 [Michael77](https://github.com/Michael77)
 * docs: add link to bufferCommands option #5844 [ralphite](https://github.com/ralphite)
 * fix(model): allow virtual ref function to return arrays #5834 [brunohcastro](https://github.com/brunohcastro)
 * fix(query): don't throw uncaught error if query filter too big #5812
 * fix(document): if setting unselected nested path, don't overwrite nested path #5800
 * fix(document): support calling `populate()` on nested document props #5703
 * fix: add `strictBool` option for schema type boolean #5344 #5211 #4245
 * docs(faq): add faq re: typeKey #1886
 * docs(query): add more detailed docs re: options #1702

4.13.4 / 2017-11-17
===================
 * fix(aggregate): add chainable .option() helper for setting arbitrary options #5829
 * fix(aggregate): add `.pipeline()` helper to get the current pipeline #5825
 * docs: grammar fixes for `unique` FAQ #5823 [mfluehr](https://github.com/mfluehr)
 * chore: add node 9 to travis #5822 [superheri](https://github.com/superheri)
 * fix(model): fix infinite recursion with recursive embedded discriminators #5821 [Faibk](https://github.com/Faibk)

4.13.3 / 2017-11-15
===================
 * chore: add node 8 to travis #5818 [superheri](https://github.com/superheri)
 * fix(document): don't apply transforms to nested docs when updating already saved doc #5807

4.13.2 / 2017-11-11
===================
 * feat(buffer): add support for subtype prop #5530

4.13.1 / 2017-11-08
===================
 * fix: accept multiple paths or array of paths to depopulate #5798 #5797 [adamreisnz](https://github.com/adamreisnz)
 * fix(document): pass default array as actual array rather than taking first element #5780
 * fix(model): increment version when $set-ing it in a save() that requires a version bump #5779
 * fix(query): don't explicitly project in discriminator key if user projected in parent path #5775 #5754
 * fix(model): cast query option to geoNear() #5765
 * fix(query): don't treat projection with just $slice as inclusive #5737
 * fix(discriminator): defer applying embedded discriminator hooks until top-level model is compiled #5706
 * docs(discriminator): add warning to always attach hooks before calling discriminator() #5706

4.13.0 / 2017-11-02
===================
 * feat(aggregate): add $addFields helper #5740 [AyushG3112](https://github.com/AyushG3112)
 * feat(connection): add connection-level bufferCommands #5720
 * feat(connection): add createCollection() helper #5712
 * feat(populate): support setting localField and foreignField to functions #5704 #5602
 * feat(query): add multipleCastError option for aggregating cast errors when casting update #5609
 * feat(populate): allow passing a function to virtual ref #5602
 * feat(schema): add excludeIndexes option to optionally prevent collecting indexes from nested schemas #5575
 * feat(model): report validation errors from `insertMany()` if using `ordered: false` and `rawResult: true` #5337
 * feat(aggregate): add pre/post aggregate middleware #5251
 * feat(schema): allow using `set` as a schema path #1939

4.12.6 / 2017-11-01
===================
 * fix(schema): make clone() copy query helpers correctly #5752
 * fix: undeprecate `ensureIndex()` and use it by default #3280

4.12.5 / 2017-10-29
===================
 * fix(query): correctly handle `$in` and required for $pull and update validators #5744
 * feat(aggegate): add $addFields pipeline operator #5740 [AyushG3112](https://github.com/AyushG3112)
 * fix(document): catch sync errors in document pre hooks and report as error #5738
 * fix(populate): handle slice projections correctly when automatically selecting populated fields #5737
 * fix(discriminator): fix hooks for embedded discriminators #5706 [wlingke](https://github.com/wlingke)
 * fix(model): throw sane error when customer calls `mongoose.Model()` over `mongoose.model()` #2005

4.12.4 / 2017-10-21
===================
 * test(plugins): add coverage for idGetter with id as a schema property #5713 [wlingke](https://github.com/wlingke)
 * fix(model): avoid copying recursive $$context object when creating discriminator after querying #5721
 * fix(connection): ensure connection promise helpers are removed before emitting 'connected' #5714
 * docs(schema): add notes about runSettersOnQuery to schema setters #5705
 * fix(collection): ensure queued operations run on the next tick #5562

4.12.3 / 2017-10-16
===================
 * fix(connection): emit 'reconnect' event as well as 'reconnected' for consistency with driver #5719
 * fix: correctly bubble up left/joined events for replica set #5718
 * fix(connection): allow passing in `autoIndex` as top-level option rather than requiring `config.autoIndex` #5711
 * docs(connection): improve docs regarding reconnectTries, autoReconnect, and bufferMaxEntries #5711
 * fix(query): handle null with addToSet/push/pull/pullAll update validators #5710
 * fix(model): handle setDefaultsOnInsert option for bulkWrite updateOne and updateMany #5708
 * fix(query): avoid infinite recursion edge case when cloning a buffer #5702

4.12.2 / 2017-10-14
===================
 * docs(faq): add FAQ about using arrow functions for getters/setters, virtuals, and methods #5700
 * docs(schema): document the childSchemas property and add to public API #5695
 * fix(query): don't project in populated field if parent field is already projected in #5669
 * fix: bump mongodb -> 2.2.33 for issue with autoReconnect #4513

4.12.1 / 2017-10-08
===================
 * fix(document): create new doc when setting single nested, no more set() on copy of priorVal #5693
 * fix(model): recursively call applyMethods on child schemas for global plugins #5690
 * docs: fix bad promise lib example on home page #5686
 * fix(query): handle false when checking for inclusive/exclusive projection #5685
 * fix(discriminator): allow reusing child schema #5684
 * fix: make addToSet() on empty array with subdoc trigger manual population #5504

4.12.0 / 2017-10-02
===================
 * docs(validation): add docs coverage for ValidatorError.reason #5681
 * feat(discriminator): always add discriminatorKey to base schema to allow updating #5613
 * fix(document): make nested docs no longer inherit parent doc's schema props #5586 #5546 #5470
 * feat(query): run update validators on $pull and $pullAll #5555
 * feat(query): add .error() helper to query to error out in pre hooks #5520
 * feat(connection): add dropCollection() helper #5393
 * feat(schema): add schema-level collation option #5295
 * feat(types): add `discriminator()` function for single nested subdocs #5244
 * feat(document): add $isDeleted() getter/setter for better support for soft deletes #4428
 * feat(connection): bubble up reconnectFailed event when driver gives up reconnecting #4027
 * fix(query): report error if passing array or other non-object as filter to update query #3677
 * fix(collection): use createIndex() instead of deprecated ensureIndex() #3280

4.11.14 / 2017-09-30
====================
 * chore: add nsp check to the CI build #5679 [hairyhenderson](https://github.com/hairyhenderson)
 * fix: bump mquery because of security issue with debug package #5677 #5675 [jonathanprl](https://github.com/jonathanprl)
 * fix(populate): automatically select() populated()-ed fields #5669
 * fix(connection): make force close work as expected #5664
 * fix(document): treat $elemMatch as inclusive projection #5661
 * docs(model/query): clarify which functions fire which middleware #5654
 * fix(model): make `init()` public and return a promise that resolves when indexes are done building #5563

4.11.13 / 2017-09-24
====================
 * fix(query): correctly run replaceOne with update validators #5665 [sime1](https://github.com/sime1)
 * fix(schema): replace mistype in setupTimestamp method #5656 [zipp3r](https://github.com/zipp3r)
 * fix(query): avoid throwing cast error for strict: throw with nested id in query #5640
 * fix(model): ensure class gets combined schema when using class syntax with discriminators #5635
 * fix(document): handle setting doc array to array of top-level docs #5632
 * fix(model): handle casting findOneAndUpdate() with overwrite and upsert #5631
 * fix(update): correctly handle $ in updates #5628
 * fix(types): handle manual population consistently for unshift() and splice() #5504

4.11.12 / 2017-09-18
====================
 * docs(model): asterisk should not render as markdown bullet #5644 [timkinnane](https://github.com/timkinnane)
 * docs: use useMongoClient in connection example #5627 [GabrielNicolasAvellaneda](https://github.com/GabrielNicolasAvellaneda)
 * fix(connection): call callback when initial connection failed #5626
 * fix(query): apply select correctly if a given nested schema is used for 2 different paths #5603
 * fix(document): add graceful fallback for setting a doc array value and `pull()`-ing a doc #3511

4.11.11 / 2017-09-10
====================
 * fix(connection): properly set readyState in response to driver 'close' and 'reconnect' events #5604
 * fix(document): ensure single embedded doc setters only get called once, with correct value #5601
 * fix(timestamps): allow enabling updatedAt without createdAt #5598
 * test: improve unique validator test by making create run before ensureIndex #5595 #5562
 * fix(query): ensure find callback only gets called once when post init hook throws error #5592

4.11.10 / 2017-09-03
====================
 * docs: add KeenIO tracking #5612
 * fix(schema): ensure validators declared with `.validate()` get copied with clone() #5607
 * fix: remove unnecessary jest warning #5480
 * fix(discriminator): prevent implicit discriminator schema id from clobbering base schema custom id #5591
 * fix(schema): hide schema objectid warning for non-hex strings of length 24 #5587
 * docs(populate): use story schema defined key author instead of creator #5578 [dmric](https://github.com/dmric)
 * docs(document): describe usage of `.set()` #5576
 * fix(document): ensure correct scope in single nested validators #5569
 * fix(populate): don't mark path as populated until populate() is done #5564
 * fix(document): make push()-ing a doc onto an empty array act as manual population #5504
 * fix(connection): emit timeout event on socket timeout #4513

4.11.9 / 2017-08-27
===================
 * fix(error): avoid using arguments.callee because that breaks strict mode #5572
 * docs(schematypes): fix spacing #5567
 * fix(query): enforce binary subtype always propagates to mongodb #5551
 * fix(query): only skip castForQuery for mongoose arrays #5536
 * fix(browser): rely on browser entrypoint to decide whether to use BrowserDocument or NodeDocument #5480

4.11.8 / 2017-08-23
===================
 * feat: add warning about using schema ObjectId as type ObjectId #5571 [efkan](https://github.com/efkan)
 * fix(schema): allow setting `id` property after schema was created #5570 #5548
 * docs(populate): remove confusing _ from populate docs #5560
 * fix(connection): expose parsed uri fields (host, port, dbname) when using openUri() #5556
 * docs: added type boolean to options documentation #5547 [ndabAP](https://github.com/ndabAP)
 * test: add test coverage for stopping/starting server #5524
 * fix(aggregate): pull read preference from schema by default #5522

4.11.7 / 2017-08-14
===================
 * fix: correct properties when calling toJSON() on populated virtual #5544 #5442 [davidwu226](https://github.com/davidwu226)
 * docs: fix spelling #5535 [et](https://github.com/et)
 * fix(error): always set name before stack #5533
 * fix: add warning about running jest in jsdom environment #5532 #5513 #4943
 * fix(document): ensure overwriting a doc array cleans out individual docs #5523
 * fix(schema): handle creating arrays of single nested using type key #5521
 * fix: upgrade mongodb -> 2.2.31 to support user/pass options #5419

4.11.6 / 2017-08-07
===================
 * fix: limiting number of async operations per time in insertMany #5529 [andresattler](https://github.com/andresattler)
 * fix: upgrade mongodb -> 2.2.30 #5517
 * fix(browserDocument): prevent stack overflow caused by double-wrapping embedded doc save() in jest #5513
 * fix(document): clear single nested doc when setting to empty object #5506
 * fix(connection): emit reconnected and disconnected events correctly with useMongoClient #5498
 * fix(populate): ensure nested virtual populate gets set even if top-level property is null #5431

4.11.5 / 2017-07-30
===================
 * docs: fix link to $lookup #5516 [TalhaAwan](https://github.com/TalhaAwan)
 * fix: better parallelization for eachAsync #5502 [lchenay](https://github.com/lchenay)
 * docs(document): copy docs for save from model to doc #5493
 * fix(document): handle dotted virtuals in toJSON output #5473
 * fix(populate): restore user-provided limit after mutating so cursor() works with populate limit #5468
 * fix(query): don't throw StrictModeError if geo query with upsert #5467
 * fix(populate): propagate readPreference from query to populate queries by default #5460
 * docs: warn not to use arrow functions for statics and methods #5458
 * fix(query): iterate over all condition keys for setDefaultsOnInsert #5455
 * docs(connection): clarify server/replset/mongos option deprecation with useMongoClient #5442

4.11.4 / 2017-07-23
===================
 * fix: handle next() errors in `eachAsync()` #5486 [lchenay](https://github.com/lchenay)
 * fix(schema): propagate runSettersOnQuery option to implicitly created schemas #5479 [https://github.com/ValYouW]
 * fix(query): run castConditions() correctly in update ops #5477
 * fix(query): ensure castConditions called for findOne and findOneAnd* #5477
 * docs: clarify relationship between $lookup and populate #5475 [TalhaAwan](https://github.com/TalhaAwan)
 * test: add coverage for arrays of arrays [zbjornson](https://github.com/zbjornson)
 * fix(middleware): ensure that error handlers for save get doc as 2nd param #5466
 * fix: handle strict: false correctly #5454 #5453 [wookieb](https://github.com/wookieb)
 * fix(query): apply schema excluded paths if only projection is a $slice #5450
 * fix(query): correct discriminator handling for schema `select: false` fields in schema #5448
 * fix(cursor): call next() in series when parallel option used #5446
 * chore: load bundled driver first to avoid packaging problem #5443 [prototypeme](https://github.com/prototypeme)
 * fix(query): defer condition casting until final exec #5434
 * fix(aggregate): don't rely on mongodb aggregate to put a cursor in the callback #5394
 * docs(aggregate): add useMongooseAggCursor docs #5394
 * docs(middleware): clarify context for document, query, and model middleware #5381

4.11.3 / 2017-07-14
===================
 * fix(connection): remove .then() before resolving to prevent infinite recursion #5471

4.11.2 / 2017-07-13
===================
 * docs: fix comment typo in connect example #5435 [ConnorMcF](https://github.com/ConnorMcF)
 * fix(update): correctly cast document array in update validators with exec() #5430
 * fix(connection): handle autoIndex with useMongoClient #5423
 * fix(schema): handle `type: [Array]` in schemas #5416
 * fix(timestamps): if overwrite is set and there's a $set, use $set instead of top-level update #5413
 * fix(document): don't double-validate deeply nested doc array elements #5411
 * fix(schematype): clone default objects so default not shared across object instances unless `shared` specified #5407
 * fix(document): reset down the nested subdocs when resetting parent doc #5406
 * fix: don't pass error arg twice to error handlers #5405
 * fix(connection): make openUri() return connection decorated with then() and catch() #5404
 * fix: enforce $set on an array must be an array #5403
 * fix(document): don't crash if calling `validateSync()` after overwriting doc array index #5389
 * fix(discriminator): ensure discriminator key doesn't count as user-selected field for projection #4629

4.11.1 / 2017-07-02
===================
* docs: populate virtuals fix justOne description #5427 [fredericosilva](https://github.com/fredericosilva)
 * fix(connection): make sure to call onOpen in openUri() #5404
 * docs(query): justOne is actually single, and it default to false #5402 [zbjornson](https://github.com/zbjornson)
 * docs: fix small typo in lib/schema.js #5398 #5396 [pjo336](https://github.com/pjo336)
 * fix: emit remove on single nested subdocs when removing parent #5388
 * fix(update): handle update with defaults and overwrite but no update validators #5384
 * fix(populate): handle undefined refPath values in middle of array #5377
 * fix(document): ensure consistent setter context for single nested #5363
 * fix(query): support runSettersOnQuery as query option #5350

4.11.0 / 2017-06-25
===================
 * feat(query): execute setters with query as context for `runSettersOnQuery` #5339
 * feat(model): add translateAliases function #5338 [rocketspacer](https://github.com/rocketspacer)
 * feat(connection): add `useMongoClient` and `openUri` functions, deprecate current connect logic #5304
 * refactor(schema): make id virtual not access doc internals #5279
 * refactor: handle non-boolean lean #5279
 * feat(cursor): add addCursorFlag() support to query and agg cursors #4814
 * feat(cursor): add parallel option to eachAsync #4244
 * feat(schema): allow setting custom error constructor for custom validators #4009

4.10.8 / 2017-06-21
===================
 * docs: fix small formatting typo on schematypes #5374 [gianpaj](https://github.com/gianpaj)
 * fix(model): allow null as an _id #5370
 * fix(populate): don't throw async uncaught exception if model not found in populate #5364
 * fix: correctly cast decimals in update #5361
 * fix(error): don't use custom getter for ValidationError message #5359
 * fix(query): handle runSettersOnQuery in built-in _id setter #5351
 * fix(document): ensure consistent context for nested doc custom validators #5347

4.10.7 / 2017-06-18
===================
 * docs(validation): show overriding custom validator error with 2nd cb arg #5358
 * fix: `parseOption` mutates user passed option map #5357 [igwejk](https://github.com/igwejk)
 * docs: fix guide.jade typo #5356 [CalebAnderson2014](https://github.com/CalebAnderson2014)
 * fix(populate): don't set populate virtual to ids when match fails #5336
 * fix(query): callback with cast error if remove and delete* args have a cast error #5323

4.10.6 / 2017-06-12
===================
 * fix(cursor): handle custom model option for populate #5334
 * fix(populate): handle empty virtual populate with Model.populate #5331
 * fix(model): make ensureIndexes() run with autoIndex: false unless called internally #5328 #5324 #5317
 * fix: wait for all connections to close before resolving disconnect() promise #5316
 * fix(document): handle setting populated path with custom typeKey in schema #5313
 * fix(error): add toJSON helper to ValidationError so `message` shows up with JSON.stringify #5309
 * feat: add `getPromiseConstructor()` to prevent need for `mongoose.Promise.ES6` #5305
 * fix(document): handle conditional required with undefined props #5296
 * fix(model): clone options before inserting in save() #5294
 * docs(populate): clarify that multiple populate() calls on same path overwrite #5274

4.10.5 / 2017-06-06
===================
 * chore: improve contrib guide for building docs #5312
 * fix(populate): handle init-ing nested virtuals properly #5311
 * fix(update): report update validator error if required path under single nested doc not set
 * fix(schema): remove default validate pre hook that was causing issues with jest #4943

4.10.4 / 2017-05-29
===================
 * chore: dont store test data in same directory #5303
 * chore: add data dirs to npmignore #5301 [Starfox64](https://github.com/Starfox64)
 * docs(query): add docs about runSettersOnQuery #5300

4.10.3 / 2017-05-27
===================
 * docs: correct inconsistent references to updateOne and replaceOne #5297 [dhritzkiv](https://github.com/dhritzkiv)
 * docs: fix dropdowns in docs #5292 [nathanallen](https://github.com/nathanallen)
 * docs: add description of alias option #5287
 * fix(document): prevent infinite loop if validating nested array #5282
 * fix(schema): correctly handle ref ObjectIds from different mongoose libs #5259
 * fix(schema): load child class methods after base class methods to allow override #5227

4.10.2 / 2017-05-22
===================
 * fix: bump ms -> 2.0.0 and mquery -> 2.3.1 for minor security vulnerability #5275

4.10.1 / 2017-05-21
===================
 * fix(aggregate): handle sorting by text score correctly #5258
 * fix(populate): handle doc.populate() with virtuals #5240
 * fix(schema): enforce that `_id` is never null #5236

4.10.0 / 2017-05-18
===================
 * fix(schema): update clone method to include indexes #5268 [clozanosanchez](https://github.com/clozanosanchez)
 * feat(schema): support aliases #5184 [rocketspacer](https://github.com/rocketspacer)
 * feat(aggregate): add mongoose-specific aggregation cursor option #5145
 * refactor(model): make sharding into a plugin instead of core #5105
 * fix(document): make nested doc mongoose internals not enumerable again #5078
 * feat(model): pass params to pre hooks #5064
 * feat(timestamps): support already defined timestamp paths in schema #4868
 * feat(query): add runSettersOnQuery option #4569
 * fix(query): add strictQuery option that throws when not querying on field not in schema #4136
 * fix(update): more complete handling for overwrite option with update validators #3556
 * feat: support `unique: true` in arrays via the mongoose-unique-array plugin #3347
 * fix(model): always emit 'index', even if no indexes #3347
 * fix(schema): set unique indexes on primitive arrays #3347
 * feat(validation): include failed paths in error message and inspect output #3064 #2135
 * fix(model): return saved docs when create() fails #2190

4.9.10 / 2017-05-17
===================
 * fix(connection): ensure callback arg to openSet() is handled properly #5249
 * docs: remove dead plugins repo and add content links #5247
 * fix(model): skip index build if connecting after model init and autoIndex false #5176

4.9.9 / 2017-05-13
==================
 * docs: correct value for Query#regex() #5230
 * fix(connection): don't throw if .catch() on open() promise #5229
 * fix(schema): allow update with $currentDate for updatedAt to succeed #5222
 * fix(model): versioning doesn't fail if version key undefined #5221 [basileos](https://github.com/basileos)
 * fix(document): don't emit model error if callback specified for consistency with docs #5216
 * fix(document): handle errors in subdoc pre validate #5215

4.9.8 / 2017-05-07
==================
 * docs(subdocs): rewrite subdocs guide #5217
 * fix(document): avoid circular JSON if error in doc array under single nested subdoc #5208
 * fix(document): set intermediate empty objects for deeply nested undefined paths before path itself #5206
 * fix(schema): throw error if first param to schema.plugin() is not a function #5201
 * perf(document): major speedup in validating subdocs (50x in some cases) #5191

4.9.7 / 2017-04-30
==================
 * docs: fix typo #5204 [phutchins](https://github.com/phutchins)
 * fix(schema): ensure correct path for deeply nested schema indexes #5199
 * fix(schema): make remove a reserved name #5197
 * fix(model): handle Decimal type in insertMany correctly #5190
 * fix: upgrade kareem to handle async pre hooks correctly #5188
 * docs: add details about unique not being a validator #5179
 * fix(validation): handle returning a promise with isAsync: true #5171

4.9.6 / 2017-04-23
==================
 * fix: update `parentArray` references when directly assigning document arrays #5192 [jhob](https://github.com/jhob)
 * docs: improve schematype validator docs #5178 [milesbarr](https://github.com/milesbarr)
 * fix(model): modify discriminator() class in place #5175
 * fix(model): handle bulkWrite updateMany casting #5172 [tzellman](https://github.com/tzellman)
 * docs(model): fix replaceOne example for bulkWrite #5168
 * fix(document): don't create a new array subdoc when creating schema array #5162
 * fix(model): merge query hooks from discriminators #5147
 * fix(document): add parent() function to subdocument to match array subdoc #5134

4.9.5 / 2017-04-16
==================
 * fix(query): correct $pullAll casting of null #5164 [Sebmaster](https://github.com/Sebmaster)
 * docs: add advanced schemas docs for loadClass #5157
 * fix(document): handle null/undefined gracefully in applyGetters() #5143
 * fix(model): add resolveToObject option for mapReduce with ES6 promises #4945

4.9.4 / 2017-04-09
==================
 * fix(schema): clone query middleware correctly #5153 #5141 [clozanosanchez](https://github.com/clozanosanchez)
 * docs(aggregate): fix typo #5142
 * fix(query): cast .$ update to underlying array type #5130
 * fix(populate): don't mutate populate result in place #5128
 * fix(query): handle $setOnInsert consistent with $set #5126
 * docs(query): add strict mode option for findOneAndUpdate #5108

4.9.3 / 2017-04-02
==================
 * docs: document.js fixes for functions prepended with `$` #5131 [krmannix](https://github.com/krmannix)
 * fix: Avoid exception on constructor check #5129 [monkbroc](https://github.com/monkbroc)
 * docs(schematype): explain how to use `isAsync` with validate() #5125
 * docs(schematype): explain custom message with required function #5123
 * fix(populate): only apply refPath duplicate id optimization if not array #5114
 * fix(document): copy non-objects to doc when init() #5111
 * perf(populate): dont clone whole options every time #5103
 * feat(document): add isDirectSelected() to minimize isSelected() changes #5063
 * docs(schematypes): explain some subtleties with arrays #5059

4.9.2 / 2017-03-26
==================
 * fix(discriminator): handle class names consistently #5104
 * fix(schema): make clone() work with reusing discriminator schemas #5098
 * fix(querycursor): run pre find hooks with .cursor() #5096
 * fix(connection): throw error if username:password includes @ or : #5091
 * fix(timestamps): handle overwriting createdAt+updatedAt consistently #5088
 * fix(document): ensure subdoc post save runs after parent save #5085
 * docs(model): improve update docs #5076 [bertolo1988](https://github.com/bertolo1988)

4.9.1 / 2017-03-19
==================
 * fix(query): handle $type for arrays #5080 #5079 [zoellner](https://github.com/zoellner)
 * fix(model): handle ordered param for `insertMany` validation errors #5072 [sjorssnoeren](https://github.com/sjorssnoeren)
 * fix(populate): avoid duplicate ids in dynref queries #5054
 * fix(timestamps): dont set timestamps in update if user set it #5045
 * fix(update): dont double-call setters on arrays #5041
 * fix: upgrade driver -> 2.2.25 for jest fix #5033
 * fix(model): get promise each time save() is called rather than once #5030
 * fix(connection): make connect return value consistent #5006

4.9.0 / 2017-03-13
==================
 * feat(document): return this from `depopulate()` #5027
 * fix(drivers): stop emitting timeouts as errors #5026
 * feat(schema): add a clone() function for schemas #4983
 * feat(query): add rawResult option to replace passRawResult, deprecate passRawResult #4977 #4925
 * feat(schematype): support isAsync validator option and handle returning promises from validators, deprecate implicit async validators #4290
 * feat(query): add `replaceOne()`, `deleteOne()`, `deleteMany()` #3998
 * feat(model): add `bulkWrite()` #3998

4.8.7 / 2017-03-12
==================
 * fix(model): if last arg in spread is falsy, treat it as a callback #5061
 * fix(document): use $hook instead of hook to enable 'hook' as a path name #5047
 * fix(populate): dont select foreign field if parent field is selected #5037
 * fix(populate): handle passing no args to query.populate #5036
 * fix(update): use correct method for casting nested arrays #5032
 * fix(discriminator): handle array discriminators when casting $push #5009

4.8.6 / 2017-03-05
==================
 * docs(document): remove text that implies that transform is false by default #5023
 * fix(applyHooks): dont wrap a function if it is already wrapped #5019
 * fix(document): ensure nested docs' toObject() clones #5008

4.8.5 / 2017-02-25
==================
 * fix: check for empty schemaPath before accessing property $isMongooseDocumentArray #5017 [https://github.com/randyhoulahan](randyhoulahan)
 * fix(discriminators): handle create() and push() for embedded discriminators #5001
 * fix(querycursor): ensure close emitted after last data event #4998
 * fix(discriminators): remove fields not selected in child when querying by base model #4991

4.8.4 / 2017-02-19
==================
 * docs(discriminators): explain embedded discriminators #4997
 * fix(query): fix TypeError when findOneAndUpdate errors #4990
 * fix(update): handle nested single embedded in update validators correctly #4989
 * fix(browser): make browser doc constructor not crash #4987

4.8.3 / 2017-02-15
==================
 * chore: upgrade mongodb driver -> 2.2.24
 * docs(connections): addd some details about callbacks #4986
 * fix: ensure class is created with new keyword #4972 #4947 [benhjames](https://github.com/benhjames)
 * fix(discriminator): add applyPluginsToDiscriminators option #4965
 * fix(update): properly cast array subdocs when casting update #4960
 * fix(populate): ensure foreign field is selected for virtual populate #4959
 * docs(query): document some query callback params #4949
 * fix(document): ensure errors in validators get caught #2185

4.8.2 / 2017-02-10
==================
 * fix(update): actually run validators on addToSet #4953
 * fix(update): improve buffer error handling #4944 [ValYouW](https://github.com/ValYouW)
 * fix(discriminator): handle subclassing with loadClass correctly #4942
 * fix(query): allow passing Map to sort() #4941
 * fix(document): handle setting discriminator doc #4935
 * fix(schema): return correct value from pre init hook #4928
 * fix(query): ensure consistent params in error handlers if pre hook errors #4927

4.8.1 / 2017-01-30
==================
 * fix(query): handle $exists for arrays and embedded docs #4937
 * fix(query): handle passing string to hint() #4931

4.8.0 / 2017-01-28
==================
 * feat(schema): add saveErrorIfNotFound option and $where property #4924 #4004
 * feat(query): add $in implicitly if passed an array #4912 [QuotableWater7](https://github.com/QuotableWater7)
 * feat(aggregate): helper for $facet #4904 [varunjayaraman](https://github.com/varunjayaraman)
 * feat(query): add collation method #4839
 * feat(schema): propogate strict option to implicit array subschemas #4831 [dkrosso](https://github.com/dkrosso)
 * feat(aggregate): add helper for graphLookup #4819 [varunjayaraman](https://github.com/varunjayaraman)
 * feat(types): support Decimal128 #4759
 * feat(aggregate): add eachAsync() to aggregate cursor #4300
 * feat(query): add updateOne and updateMany #3997
 * feat(model): support options for insertMany #3893
 * fix(document): run validation on single nested docs if not directly modified #3884
 * feat(model): use discriminator constructor based on discriminatorKey in create() #3624
 * feat: pass collection as context to debug function #3261
 * feat(query): support push and addToSet for update validators #2933
 * perf(document): refactor registerHooksFromSchema so hooks are defined on doc prototype #2754
 * feat(types): add discriminator() function to doc arrays #2723 #1856
 * fix(populate): return an error if sorting underneath a doc array #2202

4.7.9 / 2017-01-27
==================
 * fix(query): handle casting $exists under $not #4933
 * chore: upgrade mongodb -> 2.2.22 re: #4931

4.7.8 / 2017-01-23
==================
 * fix(populate): better handling for virtual populate under arrays #4923
 * docs: upgrade contributors count #4918 [AdamZaczek](https://github.com/AdamZaczek)
 * fix(query): don't set nested path default if setting parent path #4911
 * docs(promise): add missing bracket #4907
 * fix(connection): ensure error handling is consistently async #4905
 * fix: handle authMechanism in query string #4900
 * fix(document): ensure error handlers run for validate #4885

4.7.7 / 2017-01-15
==================
 * fix(utils): don't crash if to[key] is null #4881
 * fix: upgrade mongodb -> 2.2.21 #4867
 * fix: add a toBSON to documents for easier querying #4866
 * fix: suppress bluebird warning #4854 [davidwu226](https://github.com/davidwu226)
 * fix(populate): handle nested virtuals in virtual populate #4851

4.7.6 / 2017-01-02
==================
 * fix(model): allow passing non-array to insertMany #4846
 * fix(populate): use base model name if no discriminator for backwards compat #4843
 * fix: allow internal validate callback to be optional #4842 [arciisine](https://github.com/arciisine)
 * fix(document): don't skip pointCut if save not defined (like in browser doc) #4841
 * chore: improve benchmarks #4838 [billouboq](https://github.com/billouboq)
 * perf: remove some unused parameters #4837 [billouboq](https://github.com/billouboq)
 * fix(query): don't call error handler if passRawResult is true and no error occurred #4836

4.7.5 / 2016-12-26
==================
 * docs(model): fix spelling mistake #4828 [paulinoj](https://github.com/paulinoj)
 * fix(aggregate): remove unhandled rejection when using aggregate.then() #4824
 * perf: remove try/catch that kills optimizer #4821
 * fix(model): handles populating with discriminators that may not have a ref #4817
 * fix(document): handle setting array of discriminators #3575

4.7.4 / 2016-12-21
==================
 * docs: fix typo #4810 [GEEKIAM](https://github.com/GEEKIAM)
 * fix(query): timestamps with $push + $each #4805
 * fix(document): handle buffers correctly in minimize #4800
 * fix: don't disallow overwriting default and cast fns #4795 [pdspicer](https://github.com/pdspicer)
 * fix(document): don't convert single nested docs to POJOs #4793
 * fix(connection): handle reconnect to replica set correctly #4972 [gfzabarino](https://github.com/gfzabarino)

4.7.3 / 2016-12-16
==================
 * fix: upgrade mongodb driver -> 2.2.16 for several bug fixes and 3.4 support #4799
 * fix(model): ensure discriminator key is correct for child schema on discriminator #4790
 * fix(document): handle mark valid in subdocs correctly #4778
 * fix(query): check for objects consistently #4775

4.7.2 / 2016-12-07
==================
 * test(populate): fix justOne test #4772 [cblanc](https://github.com/cblanc)
 * chore: fix benchmarks #4769 [billouboq](https://github.com/billouboq)
 * fix(document): handle setting subdoc to null after setting parent doc #4766
 * fix(query): support passRawResult with lean #4762 #4761 [mhfrantz](https://github.com/mhfrantz)
 * fix(query): throw StrictModeError if upsert with nonexisting field in condition #4757
 * test: fix a couple of sort tests #4756 [japod](https://github.com/japod)
 * chore: upgrade mongodb driver -> 2.2.12 #4753 [mdlavin](https://github.com/mdlavin)
 * fix(query): handle update with upsert and overwrite correctly #4749

4.7.1 / 2016-11-30
==================
 * fix(schema): throw error if you use prototype as a schema path #4746
 * fix(schema): throw helpful error if you define a virtual with the same path as a real path #4744
 * fix(connection): make createConnection not throw rejected promises #4742
 * fix(populate): allow specifiying options in model schema #4741
 * fix(document): handle selected nested elements with defaults #4739
 * fix(query): add model to cast error if possible #4729
 * fix(query): handle timestamps with overwrite #4054

4.7.0 / 2016-11-23
==================
 * docs: clean up schematypes #4732 [kidlj](https://github.com/kidlj)
 * perf: only get stack when necessary with VersionError #4726 [Sebmaster](https://github.com/Sebmaster)
 * fix(query): ensure correct casting when setting array element #4724
 * fix(connection): ensure db name gets set when you pass 4 params #4721
 * fix: prevent TypeError in node v7 #4719 #4706
 * feat(document): support .set() on virtual subpaths #4716
 * feat(populate): support populate virtuals on nested schemas #4715
 * feat(querycursor): support transform option and .map() #4714 #4705 [cblanc](https://github.com/cblanc)
 * fix(document): dont set defaults on not-selected nested paths #4707
 * fix(populate): don't throw if empty string passed to populate #4702
 * feat(model): add `loadClass()` function for importing schema from ES6 class #4668 [rockmacaca](https://github.com/rockmacaca)

4.6.8 / 2016-11-14
==================
 * fix(querycursor): clear stack when iterating onto next doc #4697
 * fix: handle null keys in validation error #4693 #4689 [arciisine](https://github.com/arciisine)
 * fix(populate): handle pre init middleware correctly with populate virtuals #4683
 * fix(connection): ensure consistent return value for open and openSet #4659
 * fix(schema): handle falsy defaults for arrays #4620

4.6.7 / 2016-11-10
==================
 * fix(document): only invalidate in subdoc if using update validators #4681
 * fix(document): don't create subdocs when excluded in projection #4669
 * fix(document): ensure single embedded schema validator runs with correct context #4663
 * fix(document): make sure to depopulate top level for sharding #4658
 * fix(connection): throw more helpful error when .model() called incorrectly #4652
 * fix(populate): throw more descriptive error when trying to populate a virtual that doesn't have proper options #4602
 * fix(document): ensure subtype gets set properly when saving with a buffer id #4506
 * fix(query): handle setDefaultsOnInsert with defaults on doc arrays #4456
 * fix(drivers): make debug output better by calling toBSON() #4356

4.6.6 / 2016-11-03
==================
 * chore: upgrade deps #4674 [TrejGun](https://github.com/TrejGun)
 * chore: run tests on node v7 #4673 [TrejGun](https://github.com/TrejGun)
 * perf: make setDefaultsOnInsert more efficient if upsert is off #4672 [CamHenlin](https://github.com/CamHenlin)
 * fix(populate): ensure document array is returned #4656
 * fix(query): cast doc arrays with positionals correctly for update #4655
 * fix(document): ensure single nested doc validators run with correct context #4654
 * fix: handle reconnect failed error in new version of driver #4653 [loris](https://github.com/loris)
 * fix(populate): if setting a populated doc, take its id #4632
 *  fix(populate): handle populated virtuals in init #4618

4.6.5 / 2016-10-23
==================
 * docs: fix grammar issues #4642 #4640 #4639 [silvermanj7](https://github.com/silvermanj7)
 * fix(populate): filter out nonexistant values for dynref #4637
 * fix(query): handle $type as a schematype operator #4632
 * fix(schema): better handling for uppercase: false and lowercase: false #4622
 * fix(query): don't run transforms on updateForExec() #4621
 * fix(query): handle id = 0 in findById #4610
 * fix(query): handle buffers in mergeClone #4609
 * fix(document): handle undefined with conditional validator for validateSync #4607
 * fix: upgrade to mongodb driver 2.2.11 #4581
 * docs(schematypes): clarify schema.path() #4518
 * fix(query): ensure path is defined before checking in timestamps #4514
 * fix(model): set version key in upsert #4505
 * fix(document): never depopulate top-level doc #3057
 * refactor: ensure sync for setting non-capped collections #2690

4.6.4 / 2016-10-16
==================
 * fix(query): cast $not correctly #4616 #4592 [prssn](https://github.com/prssn)
 * fix: address issue with caching global plugins #4608 #4601 [TrejGun](https://github.com/TrejGun)
 * fix(model): make sure to depopulate in insertMany #4590
 * fix(model): buffer autoIndex if bufferCommands disabled #4589
 * fix(populate): copy ids array before modifying #4585
 * feat(schema): add retainKeyOrder prop #4542
 * fix(document): return isModified true for children of direct modified paths #4528
 * fix(connection): add dropDatabase() helper #4490
 * fix(model): add usePushEach option for schemas #4455
 * docs(connections): add some warnings about buffering #4413
 * fix: add ability to set promise implementation in browser #4395

4.6.3 / 2016-10-05
==================
 * fix(document): ensure single nested docs get initialized correctly when setting nested paths #4578
 * fix: turn off transforms when writing nested docs to db #4574
 * fix(document): don't set single nested subdocs to null when removing parent doc #4566
 * fix(model): ensure versionKey gets set in insertMany #4561
 * fix(schema): handle typeKey in arrays #4548
 * feat(schema): set $implicitlyCreated on schema if created by interpretAsType #4443

4.6.2 / 2016-09-30
==================
 * chore: upgrade to async 2.0.1 internally #4579 [billouboq](https://github.com/billouboq)
 * fix(types): ensure nested single doc schema errors reach update validators #4557 #4519
 * fix(connection): handle rs names with leading numbers (muri 1.1.1) #4556
 * fix(model): don't throw if method name conflicts with Object.prototype prop #4551
 * docs: fix broken link #4544 [VFedyk](https://github.com/VFedyk)
 * fix: allow overwriting model on mongoose singleton #4541 [Nainterceptor](https://github.com/Nainterceptor)
 * fix(document): don't use init: true when building doc defaults #4540
 * fix(connection): use replSet option if replset not specified #4535
 * fix(query): cast $not objects #4495

4.6.1 / 2016-09-20
==================
 * fix(query): improve handling of $not with $elemMatch #4531 #3719 [timbowhite](https://github.com/timbowhite)
 * fix: upgrade mongodb -> 2.2.10 #4517
 * chore: fix webpack build issue #4512 [saiichihashimoto](https://github.com/saiichihashimoto)
 * fix(query): emit error on next tick when exec callback errors #4500
 * test: improve test case #4496 [isayme](https://github.com/isayme)
 * fix(schema): use same check for array types and top-level types #4493
 * style: fix indentation in docs #4489 [dhurlburtusa](https://github.com/dhurlburtusa)
 * fix(schema): expose original object passed to constructor #4486
 * fix(query): handle findOneAndUpdate with array of arrays #4484 #4470 [fedotov](https://github.com/fedotov)
 * feat(document): add $ignore to make a path ignored #4480
 * fix(query): properly handle setting single embedded in update #4475 #4466 #4465
 * fix(updateValidators): handle single nested schema subpaths correctly #4479
 * fix(model): throw handy error when method name conflicts with property name #4475
 * fix(schema): handle .set() with array field #4472
 * fix(query): check nested path when avoiding double-validating Mixed #4441
 * fix(schema): handle calling path.trim() with no args correctly #4042

4.6.0 / 2016-09-02
==================
 * docs(document): clarify the findById and findByIdAndUpdate examples #4471 [mdcanham](https://github.com/mdcanham)
 * docs(schematypes): add details re: options #4452
 * docs(middleware): add docs for insertMany hooks #4451
 * fix(schema): create new array when copying from existing object to preserve change tracking #4449
 * docs: fix typo in index.jade #4448
 * fix(query): allow array for populate options #4446
 * fix(model): create should not cause unhandle reject promise #4439
 * fix: upgrade to mongodb driver 2.2.9 #4363 #4341 #4311 (see [comments here](https://github.com/mongodb/js-bson/commit/aa0b54597a0af28cce3530d2144af708e4b66bf0#commitcomment-18850498) if you use node 0.10)

4.5.10 / 2016-08-23
===================
 * docs: fix typo on documents.jade #4444 [Gabri3l](https://github.com/Gabri3l)
 * chore: upgrade mocha to 3.0.2 #4437 [TrejGun](https://github.com/TrejGun)
 * fix: subdocuments causing error with parent timestamp on update #4434 [dyang108](https://github.com/dyang108)
 * fix(query): don't crash if timestamps on and update doesn't have a path #4425 #4424 #4418
 * fix(query): ensure single nested subdoc is hydrated when running update validators #4420
 * fix(query): cast non-$geometry operators for $geoWithin #4419
 * docs: update contributor count #4415 [AdamZaczek](https://github.com/AdamZaczek)
 * docs: add more clarification re: the index event #4410
 * fix(document): only skip modifying subdoc path if parent is direct modified #4405
 * fix(schema): throw cast error if provided date invalid #4404
 * feat(error): use util.inspect() so CastError never prints "[object Object]" #4398
 * fix(model): dont error if the discriminator key is unchanged #4387
 * fix(query): don't throw unhandled rejection with bluebird when using cbs #4379

4.5.9 / 2016-08-14
==================
 * docs: add mixed schema doc for Object literal #4400 [Kikobeats](https://github.com/Kikobeats)
 * fix(query): cast $geoWithin and convert mongoose objects to POJOs before casting #4392
 * fix(schematype): dont cast defaults without parent doc #4390
 * fix(query): disallow passing empty string to findOne() #4378
 * fix(document): set single nested doc isNew correctly #4369
 * fix(types): checks field name correctly with nested arrays and populate #4365
 * fix(drivers): make debug output copy-pastable into mongodb shell #4352
 * fix(services): run update validators on nested paths #4332
 * fix(model): handle typeKey with discriminators #4339
 * fix(query): apply timestamps to child schemas when explicitly specified in update #4049
 * fix(schema): set prefix as nested path with add() #1730

4.5.8 / 2016-08-01
==================
 * fix(model): make changing the discriminator key cause a cast error #4374
 * fix(query): pass projection fields to cursor #4371 #4342 [Corei13](https://github.com/Corei13)
 * fix(document): support multiple paths for isModified #4370 [adambuczynski](https://github.com/adambuczynski)
 * fix(querycursor): always cast fields before returning cursor #4355
 * fix(query): support projection as alias for fields in findOneAndUpdate #4315
 * fix(schema): treat index false + unique false as no index #4304
 * fix(types): dont mark single nested subpath as modified if whole doc already modified #4224

4.5.7 / 2016-07-25
==================
 * fix(document): ensure no unhandled rejections if callback specified for save #4364

4.5.6 / 2016-07-23
==================
 * fix(schema): don't overwrite createdAt if it isn't selected #4351 [tusbar](https://github.com/tusbar)
 * docs(api): fix link to populate() and add a new one from depopulate() #4345 [Delapouite](https://github.com/Delapouite)
 * fix(types): ownerDocument() works properly with single nested docs #4344 [vichle](https://github.com/vichle)
 * fix(populate): dont use findOne when justOne option set #4329
 * fix(document): dont trigger .then() deprecated warning when calling doc.remove() #4291
 * docs(connection): add promiseLibrary option #4280
 * fix(plugins): apply global plugins to subschemas #4271
 * fix(model): ensure `ensureIndex()` never calls back in the same tick #4246
 * docs(schema): improve post hook docs on schema #4238

4.5.5 / 2016-07-18
==================
 * fix(document): handle setting root to empty obj if minimize false #4337
 * fix: downgrade to mongodb 2.1.18 #4335 #4334 #4328 #4323
 * perf(types): remove defineProperty usage in documentarray #4333
 * fix(query): correctly pass model in .toConstructor() #4318
 * fix(services): avoid double-validating mixed types with update validators #4305
 * docs(middleware): add docs describing error handling middleware #4229
 * fix(types): throw correct error when invalidating doc array #3602

4.5.4 / 2016-07-11
==================
 * fix(types): fix removing embedded documents #4309 [RoCat](https://github.com/RoCat)
 * docs: various docs improvements #4302 #4294 [simonxca](https://github.com/simonxca)
 * fix: upgrade mongodb -> 2.1.21 #4295 #4202 [RoCat](https://github.com/RoCat)
 * fix(populate): convert single result to array for virtual populate because of lean #4288
 * fix(populate): handle empty results for populate virtuals properly #4285 #4284
 * fix(query): dont cast $inc to number if type is long #4283
 * fix(types): allow setting single nested doc to null #4281
 * fix(populate): handle deeply nested virtual populate #4278
 * fix(document): allow setting empty obj if strict mode is false #4274
 * fix(aggregate): allow passing obj to .unwind() #4239
 * docs(document): add return statements to transform examples #1963

4.5.3 / 2016-06-30
==================
 * fix(query): pass correct options to QueryCursor #4277 #4266
 * fix(querycursor): handle lean option correctly #4276 [gchudnov](https://github.com/gchudnov)
 * fix(document): fix error handling when no error occurred #4275
 * fix(error): use strict mode for version error #4272
 * docs(populate): fix crashing compilation for populate.jade #4267
 * fix(populate): support `justOne` option for populate virtuals #4263
 * fix(populate): ensure model param gets used for populate virtuals #4261 #4243
 * fix(querycursor): add ability to properly close the cursor #4258
 * docs(model): correct link to Document #4250
 * docs(populate): correct path for refPath populate #4240
 * fix(document): support validator.isEmail as validator #4064

4.5.2 / 2016-06-24
==================
 * fix(connection): add checks for collection presence for `onOpen` and `onClose` #4259 [nodkz](https://github.com/nodkz)
 * fix(cast): allow strings for $type operator #4256
 * fix(querycursor): support lean() #4255 [pyramation](https://github.com/pyramation)
 * fix(aggregate): allow setting noCursorTimeout option #4241
 * fix(document): handle undefined for Array.pull #4222 [Sebmaster](https://github.com/Sebmaster)
 * fix(connection): ensure promise.catch() catches initial connection error #4135
 * fix(document): show additional context for VersionError #2633

4.5.1 / 2016-06-18
==================
 * fix(model): ensure wrapped insertMany() returns a promise #4237
 * fix(populate): dont overwrite populateVirtuals when populating multiple paths #4234
 * docs(model): clarify relationship between create() and save() #4233
 * fix(types): handle option param in subdoc remove() #4231 [tdebarochez](https://github.com/tdebarochez)
 * fix(document): dedupe modified paths #4226 #4223 [adambuczynski](https://github.com/adambuczynski)
 * fix(model): don't modify user-provided options object #4221
 * fix(document): handle setting nested path to empty object #4218 #4182
 * fix(document): clean subpaths when removing single nested #4216
 * fix(document): don't force transform on subdocs with inspect #4213
 * fix(error): allow setting .messages object #4207

4.5.0 / 2016-06-13
==================
 * feat(query): added Query.prototype.catch() #4215 #4173 [adambuczynski](https://github.com/adambuczynski)
 * feat(query): add Query.prototype.cursor() as a .stream() alternative #4117 #3637 #1907
 * feat(document): add markUnmodified() function #4092 [vincentcr](https://github.com/vincentcr)
 * feat(aggregate): convert aggregate object to a thenable #3995 #3946 [megagon](https://github.com/megagon)
 * perf(types): remove defineProperties call for array (**Note:** Because of this, a mongoose array will no longer `assert.deepEqual()` a plain old JS array) #3886
 * feat(model): add hooks for insertMany() #3846
 * feat(schema): add support for custom query methods #3740 #2372
 * feat(drivers): emit error on 'serverClosed' because that means that reconnect failed #3615
 * feat(model): emit error event when callback throws exception #3499
 * feat(model): inherit options from discriminator base schema #3414 #1818
 * feat(populate): expose mongoose-populate-virtuals inspired populate API #2562
 * feat(document): trigger remove hooks on subdocs when removing parent #2348
 * feat(schema): add support for express-style error handling middleware #2284
 * fix(model): disallow setting discriminator key #2041
 * feat(schema): add support for nested arrays #1361

4.4.20 / 2016-06-05
===================
 * docs: clarify command buffering when using driver directly #4195
 * fix(promise): correct broken mpromise .catch() #4189
 * fix(document): clean modified subpaths when set path to empty obj #4182
 * fix(query): support minDistance with query casting and `.near()` #4179
 * fix(model): remove unnecessary .save() promise #4177
 * fix(schema): cast all valid ObjectId strings to object ids #3365
 * docs: remove unclear "unsafe" term in query docs #3282

4.4.19 / 2016-05-21
===================
 * fix(model): handle insertMany if timestamps not set #4171

4.4.18 / 2016-05-21
===================
 * docs: add missing period #4170 [gitname](https://github.com/gitname)
 * docs: change build badge to svg #4158 [a0viedo](https://github.com/a0viedo)
 * fix(model): update timestamps when setting `createdAt` #4155
 * fix(utils): make sure to require in document properly #4152
 * fix(model): throw overwrite error when discriminator name conflicts #4148

4.4.17 / 2016-05-13
===================
 * docs: remove repetition in QueryStream docs #4147 [hugoabonizio](https://github.com/hugoabonizio)
 * fix(document): dont double-validate doc array elements #4145
 * fix(document): call required function with correct scope #4142 [JedWatson](https://github.com/JedWatson)

4.4.16 / 2016-05-09
===================
 * refactor(document): use function reference #4133 [dciccale](https://github.com/dciccale)
 * docs(querystream): clarify `destroy()` and close event #4126 [AnthonyCC](https://github.com/AnthonyCC)
 * test: make before hook fail fast if it can't connect #4121
 * docs: add description of CastError constructor params #4120
 * fix(schematype): ensure single embedded defaults have $parent #4115
 * fix(document): mark nested paths for validation #4111
 * fix(schema): make sure element is always a subdoc in doc array validation #3816

4.4.15 / 2016-05-06
===================
 * fix(schema): support overwriting array default #4109
 * fix(populate): assign values when resolving each populate #4104
 * fix(aggregate): dont send async option to server #4101
 * fix(model): ensure isNew set to false after insertMany #4099
 * fix(connection): emit on error if listeners and no callback #4098
 * fix(document): treat required fn that returns false as required: false #4094

4.4.14 / 2016-04-27
===================
 * fix: upgrade mongodb -> 2.1.18 #4102
 * feat(connection): allow setting mongos as a uri query param #4093 #4035 [burtonjc](https://github.com/burtonjc)
 * fix(populate): make sure to use correct assignment order for each model #4073
 * fix(schema): add complete set of geospatial operators for single embedded subdocs #4014

3.8.40 / 2016-04-24
===================
 * upgraded; mquery -> 1.10.0 #3989

4.4.13 / 2016-04-21
===================
 * docs: add docs favicons #4082 [robertjustjones](https://github.com/robertjustjones)
 * docs(model): correct Model.remove() return value #4075 [Jokero](https://github.com/Jokero)
 * fix(query): add $geoWithin query casting for single embedded docs #4044
 * fix(schema): handle setting trim option to falsy #4042
 * fix(query): handle setDefaultsOnInsert with empty update #3835

4.4.12 / 2016-04-08
===================
 * docs(query): document context option for update and findOneAndUpdate #4055
 * docs(query): correct link to $geoWithin docs #4050
 * fix(project): upgrade to mongodb driver 2.1.16 #4048 [schmalliso](https://github.com/schmalliso)
 * docs(validation): fix validation docs #4028
 * fix(types): improve .id() check for document arrays #4011
 * fix(query): remove premature return when using $rename #3171
 * docs(connection): clarify relationship between models and connections #2157

4.4.11 / 2016-04-03
===================
 * fix: upgrade to mongodb driver 2.1.14 #4036 #4030 #3945
 * fix(connection): allow connecting with { mongos: true } to handle query params #4032 [burtonjc](https://github.com/burtonjc)
 * docs(connection): add autoIndex example #4026 [tilleps](https://github.com/tilleps)
 * fix(query): handle passRawResult option when zero results #4023
 * fix(populate): clone options before modifying #4022
 * docs: add missing whitespace #4019 [chenxsan](https://github.com/chenxsan)
 * chore: upgrade to ESLint 2.4.0 #4015 [ChristianMurphy](https://github.com/ChristianMurphy)
 * fix(types): single nested subdocs get ids by default #4008
 * chore(project): add dependency status badge #4007 [Maheshkumar-Kakade](http://github.com/Maheshkumar-Kakade)
 * fix: make sure timestamps don't trigger unnecessary updates #4005 #3991 [tommarien](https://github.com/tommarien)
 * fix(document): inspect inherits schema options #4001
 * fix(populate): don't mark populated path as modified if setting to object w/ same id #3992
 * fix(document): support kind argument to invalidate #3965

4.4.10 / 2016-03-24
===================
 * fix(document): copy isNew when copying a document #3982
 * fix(document): don't override defaults with undefined keys #3981
 * fix(populate): merge multiple deep populate options for the same path #3974

4.4.9 / 2016-03-22
==================
 * fix: upgrade mongodb -> 2.1.10 re https://jira.mongodb.org/browse/NODE-679 #4010
 * docs: add syntax highlighting for acquit examples #3975

4.4.8 / 2016-03-18
==================
 * docs(aggregate): clarify promises #3990 [megagon](https://github.com/megagon)
 * fix: upgrade mquery -> 1.10 #3988 [matskiv](https://github.com/matskiv)
 * feat(connection): 'all' event for repl sets #3986 [xizhibei](https://github.com/xizhibei)
 * docs(types): clarify Array.pull #3985 [seriousManual](https://github.com/seriousManual)
 * feat(query): support array syntax for .sort() via mquery 1.9 #3980
 * fix(populate): support > 3 level nested populate #3973
 * fix: MongooseThenable exposes connection correctly #3972
 * docs(connection): add note about reconnectTries and reconnectInterval #3969
 * feat(document): invalidate returns the new validationError #3964
 * fix(query): .eq() as shorthand for .equals #3953 [Fonger](https://github.com/Fonger)
 * docs(connection): clarify connection string vs passed options #3941
 * docs(query): select option for findOneAndUpdate #3933
 * fix(error): ValidationError.properties no longer enumerable #3925
 * docs(validation): clarify how required validators work with nested schemas #3915
 * fix: upgrade mongodb driver -> 2.1.8 to make partial index errors more sane #3864

4.4.7 / 2016-03-11
==================
 * fix(query): stop infinite recursion caused by merging a mongoose buffer #3961
 * fix(populate): handle deep populate array -> array #3954
 * fix(schema): allow setting timestamps with .set() #3952 #3951 #3907 [Fonger](https://github.com/Fonger)
 * fix: MongooseThenable doesn't overwrite constructors #3940
 * fix(schema): don't cast boolean to date #3935
 * fix(drivers): support sslValidate in connection string #3929
 * fix(types): correct markModified() for single nested subdocs #3910
 * fix(drivers): catch and report any errors that occur in driver methods #3906
 * fix(populate): get subpopulate model correctly when array under nested #3904
 * fix(document): allow fields named 'pre' and 'post' #3902
 * docs(query): clarify runValidators and setDefaultsOnInsert options #3892
 * docs(validation): show how to use custom required messages in schema #2616

4.4.6 / 2016-03-02
==================
 * fix: upgrade mongodb driver to 2.1.7 #3938
 * docs: fix plugins link #3917 #3909 [fbertone](https://github.com/fbertone)
 * fix(query): sort+select with count works #3914
 * fix(query): improve mergeUpdate's ability to handle nested docs #3890

4.4.5 / 2016-02-24
==================
 * fix(query): ability to select a length field (upgrade to mquery 1.7.0) #3903
 * fix: include nested CastError as reason for array CastError #3897 [kotarou3](https://github.com/kotarou3)
 * fix(schema): check for doc existence before taking fields #3889
 * feat(schema): useNestedStrict option to take nested strict mode for update #3883
 * docs(validation): clarify relationship between required and checkRequired #3822
 * docs(populate): dynamic reference docs #3809
 * docs: expand dropdown when clicking on file name #3807
 * docs: plugins.mongoosejs.io is up #3127
 * fix(schema): ability to add a virtual with same name as removed path #2398

4.4.4 / 2016-02-17
==================
 * fix(schema): handle field selection when casting single nested subdocs #3880
 * fix(populate): populating using base model with multiple child models in result #3878
 * fix: ability to properly use return value of `mongoose.connect()` #3874
 * fix(populate): dont hydrate populated subdoc if lean option set #3873
 * fix(connection): dont re-auth if already connected with useDb #3871
 * docs: cover how to set underlying driver's promise lib #3869
 * fix(document): handle conflicting names in validation errors with subdocs #3867
 * fix(populate): set undefined instead of null consistently when populate couldn't find results #3859
 * docs: link to `execPopulate()` in `doc.populate()` docs #3836
 * docs(plugin): link to the `mongoose.plugin()` function #3732

4.4.3 / 2016-02-09
==================
 * fix: upgrade to mongodb 2.1.6 to remove kerberos log output #3861 #3860 [cartuchogl](https://github.com/cartuchogl)
 * fix: require('mongoose') is no longer a pseudo-promise #3856
 * fix(query): update casting for single nested docs #3820
 * fix(populate): deep populating multiple paths with same options #3808
 * docs(middleware): clarify save/validate hook order #1149

4.4.2 / 2016-02-05
==================
 * fix(aggregate): handle calling .cursor() with no options #3855
 * fix: upgrade mongodb driver to 2.1.5 for GridFS memory leak fix #3854
 * docs: fix schematype.html conflict #3853 #3850 #3843
 * fix(model): bluebird unhandled rejection with ensureIndexes() on init #3837
 * docs: autoIndex option for createConnection #3805

4.4.1 / 2016-02-03
==================
 * fix: linting broke some cases where we use `== null` as shorthand #3852
 * docs: fix up schematype.html conflict #3848 #3843 [mynameiscoffey](https://github.com/mynameiscoffey)
 * fix: backwards breaking change with `.connect()` return value #3847
 * docs: downgrade dox and highlight.js to fix docs build #3845
 * docs: clean up typo #3842 [Flash-](https://github.com/Flash-)
 * fix(document): storeShard handles undefined values #3841
 * chore: more linting #3838 [TrejGun](https://github.com/TrejGun)
 * fix(schema): handle `text: true` as a way to declare a text index #3824

4.4.0 / 2016-02-02
==================
 * docs: fix expireAfterSeconds index option name #3831 [Flash-](https://github.com/Flash-)
 * chore: run lint after test #3829 [ChristianMurphy](https://github.com/ChristianMurphy)
 * chore: use power-assert instead of assert #3828 [TrejGun](https://github.com/TrejGun)
 * chore: stricter lint #3827 [TrejGun](https://github.com/TrejGun)
 * feat(types): casting moment to date #3813 [TrejGun](https://github.com/TrejGun)
 * chore: comma-last lint for test folder #3810 [ChristianMurphy](https://github.com/ChristianMurphy)
 * fix: upgrade async mpath, mpromise, muri, and sliced #3801 [TrejGun](https://github.com/TrejGun)
 * fix(query): geo queries now return proper ES2015 promises #3800 [TrejGun](https://github.com/TrejGun)
 * perf(types): use `Object.defineProperties()` for array #3799 [TrejGun](https://github.com/TrejGun)
 * fix(model): mapReduce, ensureIndexes, remove, and save properly return ES2015 promises #3795 #3628 #3595 [TrejGun](https://github.com/TrejGun)
 * docs: fixed dates in History.md #3791 [Jokero](https://github.com/Jokero)
 * feat: connect, open, openSet, and disconnect return ES2015 promises #3790 #3622 [TrejGun](https://github.com/TrejGun)
 * feat: custom type for int32 via mongoose-int32 npm package #3652 #3102
 * feat: basic custom schema type API #995
 * feat(model): `insertMany()` for more performant bulk inserts #723

4.3.7 / 2016-01-23
==================
 * docs: grammar fix in timestamps docs #3786 [zclancy](https://github.com/zclancy)
 * fix(document): setting nested populated docs #3783 [slamuu](https://github.com/slamuu)
 * fix(document): don't call post save hooks twice for pushed docs #3780
 * fix(model): handle `_id=0` correctly #3776
 * docs(middleware): async post hooks #3770
 * docs: remove confusing sentence #3765 [marcusmellis89](https://github.com/marcusmellis89)

3.8.39 / 2016-01-15
===================
 * fixed; casting a number to a buffer #3764
 * fixed; enumerating virtual property with nested objects #3743 [kusold](https://github.com/kusold)

4.3.6 / 2016-01-15
==================
 * fix(types): casting a number to a buffer #3764
 * fix: add "listener" to reserved keywords #3759
 * chore: upgrade uglify #3757 [ChristianMurphy](https://github.com/ChristianMurphy)
 * fix: broken execPopulate() in 4.3.5 #3755 #3753
 * fix: ability to remove() a single embedded doc #3754
 * style: comma-last in test folder #3751 [ChristianMurphy](https://github.com/ChristianMurphy)
 * docs: clarify versionKey option #3747
 * fix: improve colorization for arrays #3744 [TrejGun](https://github.com/TrejGun)
 * fix: webpack build #3713

4.3.5 / 2016-01-09
==================
 * fix(query): throw when 4th parameter to update not a function #3741 [kasselTrankos](https://github.com/kasselTrankos)
 * fix(document): separate error type for setting an object to a primitive #3735
 * fix(populate): Model.populate returns ES6 promise #3734
 * fix(drivers): re-register event handlers after manual reconnect #3729
 * docs: broken links #3727
 * fix(validation): update validators run array validation #3724
 * docs: clarify the need to use markModified with in-place date ops #3722
 * fix(document): mark correct path as populated when manually populating array #3721
 * fix(aggregate): support for array pipeline argument to append #3718 [dbkup](https://github.com/dbkup)
 * docs: clarify `.connect()` callback #3705
 * fix(schema): properly validate nested single nested docs #3702
 * fix(types): handle setting documentarray of wrong type #3701
 * docs: broken links #3700
 * fix(drivers): debug output properly displays '0' #3689

3.8.38 / 2016-01-07
===================
 * fixed; aggregate.append an array #3730 [dbkup](https://github.com/dbkup)

4.3.4 / 2015-12-23
==================
 * fix: upgrade mongodb driver to 2.1.2 for repl set error #3712 [sansmischevia](https://github.com/sansmischevia)
 * docs: validation docs typo #3709 [ivanmaeder](https://github.com/ivanmaeder)
 * style: remove unused variables #3708 [ChristianMurphy](https://github.com/ChristianMurphy)
 * fix(schema): duck-typing for schemas #3703 [mgcrea](https://github.com/mgcrea)
 * docs: connection sample code issue #3697
 * fix(schema): duck-typing for schemas #3693 [mgcrea](https://github.com/mgcrea)
 * docs: clarify id schema option #3638

4.3.3 / 2015-12-18
==================
 * fix(connection): properly support 'replSet' as well as 'replset' #3688 [taxilian](https://github.com/taxilian)
 * fix(document): single nested doc pre hooks called before nested doc array #3687 [aliatsis](https://github.com/aliatsis)

4.3.2 / 2015-12-17
==================
 * fix(document): .set() into single nested schemas #3686
 * fix(connection): support 'replSet' as well as 'replset' option #3685
 * fix(document): bluebird unhandled rejection when validating doc arrays #3681
 * fix(document): hooks for doc arrays in single nested schemas #3680
 * fix(document): post hooks for single nested schemas #3679
 * fix: remove unused npm module #3674 [sybarite](https://github.com/sybarite)
 * fix(model): don't swallow exceptions in nested doc save callback #3671
 * docs: update keepAlive info #3667 [ChrisZieba](https://github.com/ChrisZieba)
 * fix(document): strict 'throw' throws a specific mongoose error #3662
 * fix: flakey test #3332
 * fix(query): more robust check for RegExp #2969

4.3.1 / 2015-12-11
==================
 * feat(aggregate): `.sample()` helper #3665
 * fix(query): bitwise query operators with buffers #3663
 * docs(migration): clarify `new` option and findByIdAndUpdate #3661

4.3.0 / 2015-12-09
==================
 * feat(query): support for mongodb 3.2 bitwise query operators #3660
 * style: use comma-last style consistently #3657 [ChristianMurphy](https://github.com/ChristianMurphy)
 * feat: upgrade mongodb driver to 2.1.0 for full MongoDB 3.2 support #3656
 * feat(aggregate): `.lookup()` helper #3532

4.2.10 / 2015-12-08
===================
 * fixed; upgraded marked #3653 [ChristianMurphy](https://github.com/ChristianMurphy)
 * docs; cross-db populate #3648
 * docs; update mocha URL #3646 [ojhaujjwal](https://github.com/ojhaujjwal)
 * fixed; call close callback asynchronously #3645
 * docs; virtuals.html issue #3644 [Psarna94](https://github.com/Psarna94)
 * fixed; single embedded doc casting on init #3642
 * docs; validation docs improvements #3640

4.2.9 / 2015-12-02
==================
 * docs; defaults docs #3625
 * fix; nested numeric keys causing an embedded document crash #3623
 * fix; apply path getters before virtual getters #3618
 * fix; casting for arrays in single nested schemas #3616

4.2.8 / 2015-11-25
==================
 * docs; clean up README links #3612 [ReadmeCritic](https://github.com/ReadmeCritic)
 * fix; ESLint improvements #3605 [ChristianMurphy](https://github.com/ChristianMurphy)
 * fix; assigning single nested subdocs #3601
 * docs; describe custom logging functions in `mongoose.set()` docs #3557

4.2.7 / 2015-11-20
==================
 * fixed; readPreference connection string option #3600
 * fixed; pulling from manually populated arrays #3598 #3579
 * docs; FAQ about OverwriteModelError #3597 [stcruy](https://github.com/stcruy)
 * fixed; setting single embedded schemas to null #3596
 * fixed; indexes for single embedded schemas #3594
 * docs; clarify projection for `findOne()` #3593 [gunar](https://github.com/gunar)
 * fixed; .ownerDocument() method on single embedded schemas #3589
 * fixed; properly throw casterror for query on single embedded schema #3580
 * upgraded; mongodb driver -> 2.0.49 for reconnect issue fix #3481

4.2.6 / 2015-11-16
==================
 * fixed; ability to manually populate an array #3575
 * docs; clarify `isAsync` parameter to hooks #3573
 * fixed; use captureStackTrace if possible instead #3571
 * fixed; crash with buffer and update validators #3565 [johnpeb](https://github.com/johnpeb)
 * fixed; update casting with operators overwrite: true #3564
 * fixed; validation with single embedded docs #3562
 * fixed; inline docs inherit parents $type key #3560
 * docs; bad grammar in populate docs #3559 [amaurymedeiros](https://github.com/amaurymedeiros)
 * fixed; properly handle populate option for find() #2321

3.8.37 / 2015-11-16
===================
 * fixed; use retainKeyOrder for cloning update op #3572

4.2.5 / 2015-11-09
==================
 * fixed; handle setting fields in pre update hooks with exec #3549
 * upgraded; ESLint #3547 [ChristianMurphy](https://github.com/ChristianMurphy)
 * fixed; bluebird unhandled rejections with cast errors and .exec #3543
 * fixed; min/max validators handling undefined #3539
 * fixed; standalone mongos connections #3537
 * fixed; call `.toObject()` when setting a single nested doc #3535
 * fixed; single nested docs now have methods #3534
 * fixed; single nested docs with .create() #3533 #3521 [tusbar](https://github.com/tusbar)
 * docs; deep populate docs #3528
 * fixed; deep populate schema ref handling #3507
 * upgraded; mongodb driver -> 2.0.48 for sort overflow issue #3493
 * docs; clarify default ids for discriminators #3482
 * fixed; properly support .update(doc) #3221

4.2.4 / 2015-11-02
==================
 * fixed; upgraded `ms` package for security vulnerability #3524 [fhemberger](https://github.com/fhemberger)
 * fixed; ESlint rules #3517 [ChristianMurphy](https://github.com/ChristianMurphy)
 * docs; typo in aggregation docs #3513 [rafakato](https://github.com/rafakato)
 * fixed; add `dontThrowCastError` option to .update() for promises #3512
 * fixed; don't double-cast buffers in node 4.x #3510 #3496
 * fixed; population with single embedded schemas #3501
 * fixed; pre('set') hooks work properly #3479
 * docs; promises guide #3441

4.2.3 / 2015-10-26
==================
 * docs; remove unreferenced function in middleware.jade #3506
 * fixed; handling auth with no username/password #3500 #3498 #3484 [mleanos](https://github.com/mleanos)
 * fixed; more ESlint rules #3491 [ChristianMurphy](https://github.com/ChristianMurphy)
 * fixed; swallowing exceptions in save callback #3478
 * docs; fixed broken links in subdocs guide #3477
 * fixed; casting booleans to numbers #3475
 * fixed; report CastError for subdoc arrays in findOneAndUpdate #3468
 * fixed; geoNear returns ES6 promise #3458

4.2.2 / 2015-10-22
==================
 * fixed; go back to old pluralization code #3490

4.2.1 / 2015-10-22
==================
 * fixed; pluralization issues #3492 [ChristianMurphy](https://github.com/ChristianMurphy)

4.2.0 / 2015-10-22
==================
 * added; support for skipVersioning for document arrays #3467 [chazmo03](https://github.com/chazmo03)
 * added; ability to customize schema 'type' key #3459 #3245
 * fixed; writeConcern for index builds #3455
 * added; emit event when individual index build starts #3440 [objectiveSee](https://github.com/objectiveSee)
 * added; 'context' option for update validators #3430
 * refactor; pluralization now in separate pluralize-mongoose npm module #3415 [ChristianMurphy](https://github.com/ChristianMurphy)
 * added; customizable error validation messages #3406 [geronime](https://github.com/geronime)
 * added; support for passing 'minimize' option to update #3381
 * added; ability to customize debug logging format #3261
 * added; baseModelName property for discriminator models #3202
 * added; 'emitIndexErrors' option #3174
 * added; 'async' option for aggregation cursor to support buffering #3160
 * added; ability to skip validation for individual save() calls #2981
 * added; single embedded schema support #2689 #585
 * added; depopulate function #2509

4.1.12 / 2015-10-19
===================
 * docs; use readPreference instead of slaveOk for Query.setOptions docs #3471 [buunguyen](https://github.com/buunguyen)
 * fixed; more helpful error when regexp contains null bytes #3456
 * fixed; x509 auth issue #3454 [NoxHarmonium](https://github.com/NoxHarmonium)

3.8.36 / 2015-10-18
===================
 * fixed; Make array props non-enumerable #3461 [boblauer](https://github.com/boblauer)

4.1.11 / 2015-10-12
===================
 * fixed; update timestamps for update() if they're enabled #3450 [isayme](https://github.com/isayme)
 * fixed; unit test error on node 0.10 #3449 [isayme](https://github.com/isayme)
 * docs; timestamp option docs #3448 [isayme](https://github.com/isayme)
 * docs; fix unexpected indent #3443 [isayme](https://github.com/isayme)
 * fixed; use ES6 promises for Model.prototype.remove() #3442
 * fixed; don't use unused 'safe' option for index builds #3439
 * fixed; elemMatch casting bug #3437 #3435 [DefinitelyCarter](https://github.com/DefinitelyCarter)
 * docs; schema.index docs #3434
 * fixed; exceptions in save() callback getting swallowed on mongodb 2.4 #3371

4.1.10 / 2015-10-05
===================
 * docs; improve virtuals docs to explain virtuals schema option #3433 [zoyaH](https://github.com/zoyaH)
 * docs; MongoDB server version compatibility guide #3427
 * docs; clarify that findById and findByIdAndUpdate fire hooks #3422
 * docs; clean up Model.save() docs #3420
 * fixed; properly handle projection with just id #3407 #3412
 * fixed; infinite loop when database document is corrupted #3405
 * docs; clarify remove middleware #3388

4.1.9 / 2015-09-28
==================
 * docs; minlength and maxlength string validation docs #3368 #3413 [cosmosgenius](https://github.com/cosmosgenius)
 * fixed; linting for infix operators #3397 [ChristianMurphy](https://github.com/ChristianMurphy)
 * fixed; proper casting for $all #3394
 * fixed; unhandled rejection warnings with .create() #3391
 * docs; clarify update validators on paths that aren't explicitly set #3386
 * docs; custom validator examples #2778

4.1.8 / 2015-09-21
==================
 * docs; fixed typo in example #3390 [kmctown](https://github.com/kmctown)
 * fixed; error in toObject() #3387 [guumaster](https://github.com/guumaster)
 * fixed; handling for casting null dates #3383 [alexmingoia](https://github.com/alexmingoia)
 * fixed; passing composite ids to `findByIdAndUpdate` #3380
 * fixed; linting #3376 #3375 [ChristianMurphy](https://github.com/ChristianMurphy)
 * fixed; added NodeJS v4 to Travis #3374 [ChristianMurphy](https://github.com/ChristianMurphy)
 * fixed; casting $elemMatch inside of $not #3373 [gaguirre](https://github.com/gaguirre)
 * fixed; handle case where $slice is 0 #3369
 * fixed; avoid running getters if path is populated #3357
 * fixed; cast documents to objects when setting to a nested path #3346

4.1.7 / 2015-09-14
==================
 * docs; typos in SchemaType documentation #3367 [jasson15](https://github.com/jasson15)
 * fixed; MONGOOSE_DRIVER_PATH env variable again #3360
 * docs; added validateSync docs #3353
 * fixed; set findOne op synchronously in query #3344
 * fixed; handling for `.pull()` on a documentarray without an id #3341
 * fixed; use natural order for cloning update conditions #3338
 * fixed; issue with strict mode casting for mixed type updates #3337

4.1.6 / 2015-09-08
==================
 * fixed; MONGOOSE_DRIVER_PATH env variable #3345 [g13013](https://github.com/g13013)
 * docs; global autoIndex option #3335 [albertorestifo](https://github.com/albertorestifo)
 * docs; model documentation typos #3330
 * fixed; report reason for CastError #3320
 * fixed; .populate() no longer returns true after re-assigning #3308
 * fixed; discriminators with aggregation geoNear #3304
 * docs; discriminator docs #2743

4.1.5 / 2015-09-01
==================
 * fixed; document.remove() removing all docs #3326 #3325
 * fixed; connect() checks for rs_name in options #3299
 * docs; examples for schema.set() #3288
 * fixed; checkKeys issue with bluebird #3286 [gregthegeek](https://github.com/gregthegeek)

4.1.4 / 2015-08-31
==================
 * fixed; ability to set strict: false for update #3305
 * fixed; .create() properly uses ES6 promises #3297
 * fixed; pre hooks on nested subdocs #3291 #3284 [aliatsis](https://github.com/aliatsis)
 * docs; remove unclear text in .remove() docs #3282
 * fixed; pre hooks called twice for 3rd-level nested doc #3281
 * fixed; nested transforms #3279
 * upgraded; mquery -> 1.6.3 #3278 #3272
 * fixed; don't swallow callback errors by default #3273 #3222
 * fixed; properly get nested paths from nested schemas #3265
 * fixed; remove() with id undefined deleting all docs #3260 [thanpolas](https://github.com/thanpolas)
 * fixed; handling for non-numeric projections #3256
 * fixed; findById with id undefined returning first doc #3255
 * fixed; use retainKeyOrder for update #3215
 * added; passRawResult option to findOneAndUpdate for backwards compat #3173

4.1.3 / 2015-08-16
==================
 * fixed; getUpdate() in pre update hooks #3520 [gregthegeek](https://github.com/gregthegeek)
 * fixed; handleArray() ensures arg is an array #3238 [jloveridge](https://github.com/jloveridge)
 * fixed; refresh required path cache when recreating docs #3199
 * fixed; $ operator on unwind aggregation helper #3197
 * fixed; findOneAndUpdate() properly returns raw result as third arg to callback #3173
 * fixed; querystream with dynamic refs #3108

3.8.35 / 2015-08-14
===================
 * fixed; handling for minimize on nested objects #2930
 * fixed; don't crash when schema.path.options undefined #1824

4.1.2 / 2015-08-10
==================
 * fixed; better handling for Jade templates #3241 [kbadk](https://github.com/kbadk)
 * added; ESlint trailing spaces #3234 [ChristianMurphy](https://github.com/ChristianMurphy)
 * added; ESlint #3191 [ChristianMurphy](https://github.com/ChristianMurphy)
 * fixed; properly emit event on disconnect #3183
 * fixed; copy options properly using Query.toConstructor() #3176
 * fixed; setMaxListeners() issue in browser build #3170
 * fixed; node driver -> 2.0.40 to not store undefined keys as null #3169
 * fixed; update validators handle positional operator #3167
 * fixed; handle $all + $elemMatch query casting #3163
 * fixed; post save hooks don't swallow extra args #3155
 * docs; spelling mistake in index.jade #3154
 * fixed; don't crash when toObject() has no fields #3130
 * fixed; apply toObject() recursively for find and update queries #3086 [naoina](https://github.com/naoina)

4.1.1 / 2015-08-03
==================
 * fixed; aggregate exec() crash with no callback #3212 #3198 [jpgarcia](https://github.com/jpgarcia)
 * fixed; pre init hooks now properly synchronous #3207 [burtonjc](https://github.com/burtonjc)
 * fixed; updateValidators doesn't flatten dates #3206 #3194 [victorkohl](https://github.com/victorkohl)
 * fixed; default fields don't make document dirty between saves #3205 [burtonjc](https://github.com/burtonjc)
 * fixed; save passes 0 as numAffected rather than undefined when no change #3195 [burtonjc](https://github.com/burtonjc)
 * fixed; better handling for positional operator in update #3185
 * fixed; use Travis containers #3181 [ChristianMurphy](https://github.com/ChristianMurphy)
 * fixed; leaked variable #3180 [ChristianMurphy](https://github.com/ChristianMurphy)

4.1.0 / 2015-07-24
==================
 * added; `schema.queue()` now public #3193
 * added; raw result as third parameter to findOneAndX callback #3173
 * added; ability to run validateSync() on only certain fields #3153
 * added; subPopulate #3103 [timbur](https://github.com/timbur)
 * added; $isDefault function on documents #3077
 * added; additional properties for built-in validator messages #3063 [KLicheR](https://github.com/KLicheR)
 * added; getQuery() and getUpdate() functions for Query #3013
 * added; export DocumentProvider #2996
 * added; ability to remove path from schema #2993 [JohnnyEstilles](https://github.com/JohnnyEstilles)
 * added; .explain() helper for aggregate #2714
 * added; ability to specify which ES6-compatible promises library mongoose uses #2688
 * added; export Aggregate #1910

4.0.8 / 2015-07-20
==================
 * fixed; assignment with document arrays #3178 [rosston](https://github.com/rosston)
 * docs; remove duplicate paragraph #3164 [rhmeeuwisse](https://github.com/rhmeeuwisse)
 * docs; improve findOneAndXYZ parameter descriptions #3159 [rhmeeuwisse](https://github.com/rhmeeuwisse)
 * docs; add findOneAndRemove to list of supported middleware #3158
 * docs; clarify ensureIndex #3156
 * fixed; refuse to save/remove document without id #3118
 * fixed; hooks next() no longer accidentally returns promise #3104
 * fixed; strict mode for findOneAndUpdate #2947
 * added; .min.js.gz file for browser component #2806

3.8.34 / 2015-07-20
===================
 * fixed; allow using $rename #3171
 * fixed; no longer modifies update arguments #3008

4.0.7 / 2015-07-11
==================
 * fixed; documentarray id method when using object id #3157 [siboulet](https://github.com/siboulet)
 * docs; improve findById docs #3147
 * fixed; update validators handle null properly #3136 [odeke-em](https://github.com/odeke-em)
 * docs; jsdoc syntax errors #3128 [rhmeeuwisse](https://github.com/rhmeeuwisse)
 * docs; fix typo #3126 [rhmeeuwisse](https://github.com/rhmeeuwisse)
 * docs; proper formatting in queries.jade #3121 [rhmeeuwisse](https://github.com/rhmeeuwisse)
 * docs; correct example for string maxlength validator #3111 [rhmeeuwisse](https://github.com/rhmeeuwisse)
 * fixed; setDefaultsOnInsert with arrays #3107
 * docs; LearnBoost -> Automattic in package.json #3099
 * docs; pre update hook example #3094 [danpe](https://github.com/danpe)
 * docs; clarify query middleware example #3051
 * fixed; ValidationErrors in strict mode #3046
 * fixed; set findOneAndUpdate properties before hooks run #3024

3.8.33 / 2015-07-10
===================
 * upgraded; node driver -> 1.4.38
 * fixed; dont crash when `match` validator undefined

4.0.6 / 2015-06-21
==================
 * upgraded; node driver -> 2.0.34 #3087
 * fixed; apply setters on addToSet, etc #3067 [victorkohl](https://github.com/victorkohl)
 * fixed; missing semicolons #3065 [sokolikp](https://github.com/sokolikp)
 * fixed; proper handling for async doc hooks #3062 [gregthegeek](https://github.com/gregthegeek)
 * fixed; dont set failed populate field to null if other docs are successfully populated #3055 [eloytoro](https://github.com/eloytoro)
 * fixed; setDefaultsOnInsert with document arrays #3034 [taxilian](https://github.com/taxilian)
 * fixed; setters fired on array items #3032
 * fixed; stop validateSync() on first error #3025 [victorkohl](https://github.com/victorkohl)
 * docs; improve query docs #3016
 * fixed; always exclude _id when its deselected #3010
 * fixed; enum validator kind property #3009
 * fixed; mquery collection names #3005
 * docs; clarify mongos option #3000
 * docs; clarify that query builder has a .then() #2995
 * fixed; race condition in dynamic ref #2992

3.8.31 / 2015-06-20
===================
 * fixed; properly handle text search with discriminators and $meta #2166

4.0.5 / 2015-06-05
==================
 * fixed; ObjectIds and buffers when mongodb driver is a sibling dependency #3050 #3048 #3040 #3031 #3020 #2988 #2951
 * fixed; warn user when 'increment' is used in schema #3039
 * fixed; setDefaultsOnInsert with array in schema #3035
 * fixed; dont use default Object toString to cast to string #3030
 * added; npm badge #3020 [odeke-em](https://github.com/odeke-em)
 * fixed; proper handling for calling .set() with a subdoc #2782
 * fixed; dont throw cast error when using $rename on non-string path #1845

3.8.30 / 2015-06-05
===================
 * fixed; enable users to set all options with tailable() #2883

4.0.4 / 2015-05-28
==================
 * docs; findAndModify new parameter correct default value #3012 [JonForest](https://github.com/JonForest)
 * docs; clarify pluralization rules #2999 [anonmily](https://github.com/anonmily)
 * fix; discriminators with schema methods #2978
 * fix; make `isModified` a schema reserved keyword #2975
 * fix; properly fire setters when initializing path with object #2943
 * fix; can use `setDefaultsOnInsert` without specifying `runValidators` #2938
 * fix; always set validation errors `kind` property #2885
 * upgraded; node driver -> 2.0.33 #2865

3.8.29 / 2015-05-27
===================
 * fixed; Handle JSON.stringify properly for nested docs #2990

4.0.3 / 2015-05-13
==================
 * upgraded; mquery -> 1.5.1 #2983
 * docs; clarify context for query middleware #2974
 * docs; fix missing type -> kind rename in History.md #2961
 * fixed; broken ReadPreference include on Heroku #2957
 * docs; correct form for cursor aggregate option #2955
 * fixed; sync post hooks now properly called after function #2949 #2925
 * fixed; fix sub-doc validate() function #2929
 * upgraded; node driver -> 2.0.30 #2926
 * docs; retainKeyOrder for save() #2924
 * docs; fix broken class names #2913
 * fixed; error when using node-clone on a doc #2909
 * fixed; no more hard references to bson #2908 #2906
 * fixed; dont overwrite array values #2907 [naoina](https://github.com/naoina)
 * fixed; use readPreference=primary for findOneAndUpdate #2899 #2823
 * docs; clarify that update validators only run on $set and $unset #2889
 * fixed; set kind consistently for built-in validators #2885
 * docs; single field populated documents #2884
 * fixed; nested objects are now enumerable #2880 [toblerpwn](https://github.com/toblerpwn)
 * fixed; properly populate field when ref, lean, stream used together #2841
 * docs; fixed migration guide jade error #2807

3.8.28 / 2015-05-12
===================
 * fixed; proper handling for toJSON options #2910
 * fixed; dont attach virtuals to embedded docs in update() #2046

4.0.2 / 2015-04-23
==================
 * fixed; error thrown when calling .validate() on subdoc not in an array #2902
 * fixed; rename define() to play nice with webpack #2900 [jspears](https://github.com/jspears)
 * fixed; pre validate called twice with discriminators #2892
 * fixed; .inspect() on mongoose.Types #2875
 * docs; correct callback params for Model.update #2872
 * fixed; setDefaultsOnInsert now works when runValidators not specified #2870
 * fixed; Document now wraps EventEmitter.addListener #2867
 * fixed; call non-hook functions in schema queue #2856
 * fixed; statics can be mocked out for tests #2848 [ninelb](https://github.com/ninelb)
 * upgraded; mquery 1.4.0 for bluebird bug fix #2846
 * fixed; required validators run first #2843
 * docs; improved docs for new option to findAndMody #2838
 * docs; populate example now uses correct field #2837 [swilliams](https://github.com/swilliams)
 * fixed; pre validate changes causing VersionError #2835
 * fixed; get path from correct place when setting CastError #2832
 * docs; improve docs for Model.update() function signature #2827 [irnc](https://github.com/irnc)
 * fixed; populating discriminators #2825 [chetverikov](https://github.com/chetverikov)
 * fixed; discriminators with nested schemas #2821
 * fixed; CastErrors with embedded docs #2819
 * fixed; post save hook context #2816
 * docs; 3.8.x -> 4.x migration guide #2807
 * fixed; proper _distinct copying for query #2765 [cdelauder](https://github.com/cdelauder)

3.8.27 / 2015-04-22
===================
 * fixed; dont duplicate db calls on Q.ninvoke() #2864
 * fixed; Model.find arguments naming in docs #2828
 * fixed; Support ipv6 in connection strings #2298

3.8.26 / 2015-04-07
===================
 * fixed; TypeError when setting date to undefined #2833
 * fixed; handle CastError properly in distinct() with no callback #2786
 * fixed; broken links in queries docs #2779
 * fixed; dont mark buffer as modified when setting type initially #2738
 * fixed; dont crash when using slice with populate #1934

4.0.1 / 2015-03-28
==================
 * fixed; properly handle empty cast doc in update() with promises #2796
 * fixed; unstable warning #2794
 * fixed; findAndModify docs now show new option is false by default #2793

4.0.0 / 2015-03-25
==================
 * fixed; on-the-fly schema docs typo #2783 [artiifix](https://github.com/artiifix)
 * fixed; cast error validation handling #2775 #2766 #2678
 * fixed; discriminators with populate() #2773 #2719 [chetverikov](https://github.com/chetverikov)
 * fixed; increment now a reserved path #2709
 * fixed; avoid sending duplicate object ids in populate() #2683
 * upgraded; mongodb to 2.0.24 to properly emit reconnect event multiple times #2656

4.0.0-rc4 / 2015-03-14
======================
 * fixed; toObject virtuals schema option handled properly #2751
 * fixed; update validators work on document arrays #2733
 * fixed; check for cast errors on $set #2729
 * fixed; instance field set for all schema types #2727 [csdco](https://github.com/csdco)
 * fixed; dont run other validators if required fails #2725
 * fixed; custom getters execute on ref paths #2610
 * fixed; save defaults if they were set when doc was loaded from db #2558
 * fixed; pre validate now runs before pre save #2462
 * fixed; no longer throws errors with --use_strict #2281

3.8.25 / 2015-03-13
===================
 * fixed; debug output reverses order of aggregation keys #2759
 * fixed; $eq is a valid query selector in 3.0 #2752
 * fixed; upgraded node driver to 1.4.32 for handling non-numeric poolSize #2682
 * fixed; update() with overwrite sets _id for nested docs #2658
 * fixed; casting for operators in $elemMatch #2199

4.0.0-rc3 / 2015-02-28
======================
 * fixed; update() pre hooks run before validators #2706
 * fixed; setters not called on arrays of refs #2698 [brandom](https://github.com/brandom)
 * fixed; use node driver 2.0.18 for nodejs 0.12 support #2685
 * fixed; comments reference file that no longer exists #2681
 * fixed; populated() returns _id of manually populated doc #2678
 * added; ability to exclude version key in toObject() #2675
 * fixed; dont allow setting nested path to a string #2592
 * fixed; can cast objects with _id field to ObjectIds #2581
 * fixed; on-the-fly schema getters #2360
 * added; strict option for findOneAndUpdate() #1967

3.8.24 / 2015-02-25
===================
 * fixed; properly apply child schema transforms #2691
 * fixed; make copy of findOneAndUpdate options before modifying #2687
 * fixed; apply defaults when parent path is selected #2670 #2629
 * fixed; properly get ref property for nested paths #2665
 * fixed; node driver makes copy of authenticate options before modifying them #2619
 * fixed; dont block process exit when auth fails #2599
 * fixed; remove redundant clone in update() #2537

4.0.0-rc2 / 2015-02-10
======================
 * added; io.js to travis build
 * removed; browser build dependencies not installed by default
 * added; dynamic refpaths #2640 [chetverikov](https://github.com/chetverikov)
 * fixed; dont call child schema transforms on parent #2639 [chetverikov](https://github.com/chetverikov)
 * fixed; get rid of remove option if new is set in findAndModify #2598
 * fixed; aggregate all document array validation errors #2589
 * fixed; custom setters called when setting value to undefined #1892

3.8.23 / 2015-02-06
===================
 * fixed; unset opts.remove when upsert is true #2519
 * fixed; array saved as object when path is object in array #2442
 * fixed; inline transforms #2440
 * fixed; check for callback in count() #2204
 * fixed; documentation for selecting fields #1534

4.0.0-rc1 / 2015-02-01
======================
 * fixed; use driver 2.0.14
 * changed; use transform: true by default #2245

4.0.0-rc0 / 2015-01-31
===================
 * fixed; wrong order for distinct() params #2628
 * fixed; handling no query argument to remove() #2627
 * fixed; createModel and discriminators #2623 [ashaffer](https://github.com/ashaffer)
 * added; pre('count') middleware #2621
 * fixed; double validation calls on document arrays #2618
 * added; validate() catches cast errors #2611
 * fixed; respect replicaSet parameter in connection string #2609
 * added; can explicitly exclude paths from versioning #2576 [csabapalfi](https://github.com/csabapalfi)
 * upgraded; driver to 2.0.15 #2552
 * fixed; save() handles errors more gracefully in ES6 #2371
 * fixed; undefined is now a valid argument to findOneAndUpdate #2272
 * changed; `new` option to findAndModify ops is false by default #2262

3.8.22 / 2015-01-24
===================
 * upgraded; node-mongodb-native to 1.4.28 #2587 [Climax777](https://github.com/Climax777)
 * added; additional documentation for validators #2449
 * fixed; stack overflow when creating massive arrays #2423
 * fixed; undefined is a valid id for queries #2411
 * fixed; properly create nested schema index when same schema used twice #2322
 * added; link to plugin generator in docs #2085 [huei90](https://github.com/huei90)
 * fixed; optional arguments documentation for findOne() #1971 [nachinius](https://github.com/nachinius)

3.9.7 / 2014-12-19
===================
 * added; proper cursors for aggregate #2539 [changyy](https://github.com/changyy)
 * added; min/max built-in validators for dates #2531 [bshamblen](https://github.com/bshamblen)
 * fixed; save and validate are now reserved keywords #2380
 * added; basic documentation for browser component #2256
 * added; find and findOne hooks (query middleware) #2138
 * fixed; throw a DivergentArrayError when saving positional operator queries #2031
 * added; ability to use options as a document property #1416
 * fixed; document no longer inherits from event emitter and so domain and _events are no longer reserved #1351
 * removed; setProfiling #1349

3.8.21 / 2014-12-18
===================
 * fixed; syntax in index.jade #2517 [elderbas](https://github.com/elderbas)
 * fixed; writable statics #2510 #2528
 * fixed; overwrite and explicit $set casting #2515

3.9.6 / 2014-12-05
===================
 * added; correctly run validators on each element of array when entire array is modified #661 #1227
 * added; castErrors in validation #1013 [jondavidjohn](https://github.com/jondavidjohn)
 * added; specify text indexes in schema fields #1401 [sr527](https://github.com/sr527)
 * added; ability to set field with validators to undefined #1594 [alabid](https://github.com/alabid)
 * added; .create() returns an array when passed an array #1746 [alabid](https://github.com/alabid)
 * added; test suite and docs for use with co and yield #2177 #2474
 * fixed; subdocument toObject() transforms #2447 [chmanie](https://github.com/chmanie)
 * fixed; Model.create() with save errors #2484
 * added; pass options to .save() and .remove() #2494 [jondavidjohn](https://github.com/jondavidjohn)

3.8.20 / 2014-12-01
===================
 * fixed; recursive readPref #2490 [kjvalencik](https://github.com/kjvalencik)
 * fixed; make sure to copy parameters to update() before modifying #2406 [alabid](https://github.com/alabid)
 * fixed; unclear documentation about query callbacks #2319
 * fixed; setting a schema-less field to an empty object #2314 [alabid](https://github.com/alabid)
 * fixed; registering statics and methods for discriminators #2167 [alabid](https://github.com/alabid)

3.9.5 / 2014-11-10
===================
 * added; ability to disable autoIndex on a per-connection basis #1875 [sr527](https://github.com/sr527)
 * fixed; `geoNear()` no longer enforces legacy coordinate pairs - supports GeoJSON #1987 [alabid](https://github.com/alabid)
 * fixed; browser component works when minified with mangled variable names #2302
 * fixed; `doc.errors` now cleared before `validate()` called #2302
 * added; `execPopulate()` function to make `doc.populate()` compatible with promises #2317
 * fixed; `count()` no longer throws an error when used with `sort()` #2374
 * fixed; `save()` no longer recursively calls `save()` on populated fields #2418

3.8.19 / 2014-11-09
===================
 * fixed; make sure to not override subdoc _ids on find #2276 [alabid](https://github.com/alabid)
 * fixed; exception when comparing two documents when one lacks _id #2333 [slawo](https://github.com/slawo)
 * fixed; getters for properties with non-strict schemas #2439 [alabid](https://github.com/alabid)
 * fixed; inconsistent URI format in docs #2414 [sr527](https://github.com/sr527)

3.9.4 / 2014-10-25
==================
 * fixed; statics no longer can be overwritten #2343 [nkcmr](https://github.com/chetverikov)
 * added; ability to set single populated paths to documents #1530
 * added; setDefaultsOnInsert and runValidator options for findOneAndUpdate() #860

3.8.18 / 2014-10-22
==================
 * fixed; Dont use all toObject options in save #2340 [chetverikov](https://github.com/chetverikov)

3.9.3 / 2014-10-01
=================
 * added; support for virtuals that return objects #2294
 * added; ability to manually hydrate POJOs into mongoose objects #2292
 * added; setDefaultsOnInsert and runValidator options for update() #860

3.8.17 / 2014-09-29
==================
 * fixed; use schema options retainKeyOrder in save() #2274
 * fixed; fix skip in populate when limit is set #2252
 * fixed; fix stack overflow when passing MongooseArray to findAndModify #2214
 * fixed; optimize .length usage in populate #2289

3.9.2 / 2014-09-08
==================
 * added; test coverage for browser component #2255
 * added; in-order execution of validators #2243
 * added; custom fields for validators #2132
 * removed; exception thrown when find() used with count() #1950

3.8.16 / 2014-09-08
==================
 * fixed; properly remove modified array paths if array has been overwritten #1638
 * fixed; key check errors #1884
 * fixed; make sure populate on an array always returns a Mongoose array #2214
 * fixed; SSL connections with node 0.11 #2234
 * fixed; return sensible strings for promise errors #2239

3.9.1 / 2014-08-17
==================
 * added; alpha version of browser-side schema validation #2254
 * added; support passing a function to schemas `required` field #2247
 * added; support for setting updatedAt and createdAt timestamps #2227
 * added; document.validate() returns a promise #2131

3.8.15 / 2014-08-17
==================
 * fixed; Replica set connection string example in docs #2246
 * fixed; bubble up parseError event #2229
 * fixed; removed buggy populate cache #2176
 * fixed; dont $inc versionKey if its being $set #1933
 * fixed; cast $or and $and in $pull #1932
 * fixed; properly cast to schema in stream() #1862
 * fixed; memory leak in nested objects #1565 #2211 [devongovett](https://github.com/devongovett)

3.8.14 / 2014-07-26
==================
 * fixed; stringifying MongooseArray shows nested arrays #2002
 * fixed; use populated doc schema in toObject and toJSON by default #2035
 * fixed; dont crash on arrays containing null #2140
 * fixed; model.update w/ upsert has same return values on .exec and promise #2143
 * fixed; better handling for populate limit with multiple documents #2151
 * fixed; dont prevent users from adding weights to text index #2183
 * fixed; helper for aggregation cursor #2187
 * updated; node-mongodb-native to 1.4.7

3.8.13 / 2014-07-15
==================
 * fixed; memory leak with isNew events #2159
 * fixed; docs for overwrite option for update() #2144
 * fixed; storeShard() handles dates properly #2127
 * fixed; sub-doc changes not getting persisted to db after save #2082
 * fixed; populate with _id: 0 actually removes _id instead of setting to undefined #2123
 * fixed; save versionKey on findOneAndUpdate w/ upsert #2122
 * fixed; fix typo in 2.8 docs #2120 [shakirullahi](https://github.com/shakirullahi)
 * fixed; support maxTimeMs #2102 [yuukinajima](https://github.com/yuukinajima)
 * fixed; support $currentDate #2019
 * fixed; $addToSet handles objects without _ids properly #1973
 * fixed; dont crash on invalid nearSphere query #1874

3.8.12 / 2014-05-30
==================
 * fixed; single-server reconnect event fires #1672
 * fixed; sub-docs not saved when pushed into populated array #1794
 * fixed; .set() sometimes converts embedded docs to pojos #1954 [archangel-irk](https://github.com/archangel-irk)
 * fixed; sub-doc changes not getting persisted to db after save #2082
 * fixed; custom getter might cause mongoose to mistakenly think a path is dirty #2100 [pgherveou](https://github.com/pgherveou)
 * fixed; chainable helper for allowDiskUse option in aggregation #2114

3.9.0 (unstable) / 2014-05-22
==================
 * changed; added `domain` to reserved keywords #1338 #2052 [antoinepairet](https://github.com/antoinepairet)
 * added; asynchronous post hooks #1977 #2081 [chopachom](https://github.com/chopachom) [JasonGhent](https://github.com/JasonGhent)
 * added; using model for population, cross-db populate [mihai-chiorean](https://github.com/mihai-chiorean)
 * added; can define a type for schema validators
 * added; `doc.remove()` returns a promise #1619 [refack](https://github.com/refack)
 * added; internal promises for hooks, pre-save hooks run in parallel #1732 [refack](https://github.com/refack)
 * fixed; geoSearch hanging when no results returned #1846 [ghartnett](https://github.com/ghartnett)
 * fixed; do not set .type property on ValidationError, use .kind instead #1323

3.8.11 / 2014-05-22
==================
 * updated; node-mongodb-native to 1.4.5
 * reverted; #2052, fixes #2097

3.8.10 / 2014-05-20
==================

 * updated; node-mongodb-native to 1.4.4
 * fixed; _.isEqual false negatives bug in js-bson #2070
 * fixed; missing check for schema.options #2014
 * fixed; missing support for $position #2024
 * fixed; options object corruption #2049
 * fixed; improvements to virtuals docs #2055
 * fixed; added `domain` to reserved keywords #2052 #1338

3.8.9 / 2014-05-08
==================

 * updated; mquery to 0.7.0
 * updated; node-mongodb-native to 1.4.3
 * fixed; $near failing against MongoDB 2.6
 * fixed; relying on .options() to determine if collection exists
 * fixed; $out aggregate helper
 * fixed; all test failures against MongoDB 2.6.1, with caveat #2065

3.8.8 / 2014-02-22
==================

 * fixed; saving Buffers #1914
 * updated; expose connection states for user-land #1926 [yorkie](https://github.com/yorkie)
 * updated; mquery to 0.5.3
 * updated; added get / set to reserved path list #1903 [tstrimple](https://github.com/tstrimple)
 * docs; README code highlighting, syntax fixes #1930 [IonicaBizau](https://github.com/IonicaBizau)
 * docs; fixes link in the doc at #1925 [kapeels](https://github.com/kapeels)
 * docs; add a missed word 'hook' for the description of the post-hook api #1924 [ipoval](https://github.com/ipoval)

3.8.7 / 2014-02-09
==================

 * fixed; sending safe/read options in Query#exec #1895
 * fixed; findOneAnd..() with sort #1887

3.8.6 / 2014-01-30
==================

 * fixed; setting readPreferences #1895

3.8.5 / 2014-01-23
==================

 * fixed; ssl setting when using URI #1882
 * fixed; findByIdAndUpdate now respects the overwrite option #1809 [owenallenaz](https://github.com/owenallenaz)

3.8.4 / 2014-01-07
==================

 * updated; mongodb driver to 1.3.23
 * updated; mquery to 0.4.1
 * updated; mpromise to 0.4.3
 * fixed; discriminators now work when selecting fields #1820 [daemon1981](https://github.com/daemon1981)
 * fixed; geoSearch with no results timeout #1846 [ghartnett](https://github.com/ghartnett)
 * fixed; infitite recursion in ValidationError #1834 [chetverikov](https://github.com/chetverikov)

3.8.3 / 2013-12-17
==================

 * fixed; setting empty array with model.update #1838
 * docs; fix url

3.8.2 / 2013-12-14
==================

 * fixed; enum validation of multiple values #1778 [heroicyang](https://github.com/heroicyang)
 * fixed; global var leak #1803
 * fixed; post remove now fires on subdocs #1810
 * fixed; no longer set default empty array for geospatial-indexed fields #1668 [shirish87](https://github.com/shirish87)
 * fixed; model.stream() not hydrating discriminators correctly #1792 [j](https://github.com/j)
 * docs: Stablility -> Stability [nikmartin](https://github.com/nikmartin)
 * tests; improve shard error handling

3.8.1 / 2013-11-19
==================

 * fixed; mishandling of Dates with minimize/getters #1764
 * fixed; Normalize bugs.email, so `npm` will shut up #1769 [refack](https://github.com/refack)
 * docs; Improve the grammar where "lets us" was used #1777 [alexyoung](https://github.com/alexyoung)
 * docs; Fix some grammatical issues in the documentation #1777 [alexyoung](https://github.com/alexyoung)
 * docs; fix Query api exposure
 * docs; fix return description
 * docs; Added Notes on findAndUpdate() #1750 [sstadelman](https://github.com/sstadelman)
 * docs; Update version number in README #1762 [Fodi69](https://github.com/Fodi69)

3.8.0 / 2013-10-31
==================

 * updated; warn when using an unstable version
 * updated; error message returned in doc.save() #1595
 * updated; mongodb driver to 1.3.19 (fix error swallowing behavior)
 * updated; mquery to 0.3.2
 * updated; mocha to 1.12.0
 * updated; mpromise 0.3.0
 * updated; sliced 0.0.5
 * removed; mongoose.Error.DocumentError (never used)
 * removed; namedscope (undocumented and broken) #679 #642 #455 #379
 * changed; no longer offically supporting node 0.6.x
 * changed; query.within getter is now a method -> query.within()
 * changed; query.intersects getter is now a method -> query.intersects()
 * added; custom error msgs for built-in validators #747
 * added; discriminator support #1647 #1003 [j](https://github.com/j)
 * added; support disabled collection name pluralization #1350 #1707 [refack](https://github.com/refack)
 * added; support for GeoJSON to Query#near [ebensing](https://github.com/ebensing)
 * added; stand-alone base query support - query.toConstructor() [ebensing](https://github.com/ebensing)
 * added; promise support to geoSearch #1614 [ebensing](https://github.com/ebensing)
 * added; promise support for geoNear #1614 [ebensing](https://github.com/ebensing)
 * added; connection.useDb() #1124 [ebensing](https://github.com/ebensing)
 * added; promise support to model.mapReduce()
 * added; promise support to model.ensureIndexes()
 * added; promise support to model.populate()
 * added; benchmarks [ebensing](https://github.com/ebensing)
 * added; publicly exposed connection states #1585
 * added; $geoWithin support #1529 $1455 [ebensing](https://github.com/ebensing)
 * added; query method chain validation
 * added; model.update `overwrite` option
 * added; model.geoNear() support #1563 [ebensing](https://github.com/ebensing)
 * added; model.geoSearch() support #1560 [ebensing](https://github.com/ebensing)
 * added; MongooseBuffer#subtype()
 * added; model.create() now returns a promise #1340
 * added; support for `awaitdata` query option
 * added; pass the doc to doc.remove() callback #1419 [JoeWagner](https://github.com/JoeWagner)
 * added; aggregation query builder #1404 [njoyard](https://github.com/njoyard)
 * fixed; document.toObject when using `minimize` and `getters` options #1607 [JedWatson](https://github.com/JedWatson)
 * fixed; Mixed types can now be required #1722 [Reggino](https://github.com/Reggino)
 * fixed; do not pluralize model names not ending with letters #1703 [refack](https://github.com/refack)
 * fixed; repopulating modified populated paths #1697
 * fixed; doc.equals() when _id option is set to false #1687
 * fixed; strict mode warnings #1686
 * fixed; $near GeoJSON casting #1683
 * fixed; nearSphere GeoJSON query builder
 * fixed; population field selection w/ strings #1669
 * fixed; setters not firing on null values #1445 [ebensing](https://github.com/ebensing)
 * fixed; handle another versioning edge case #1520
 * fixed; excluding subdocument fields #1280 [ebensing](https://github.com/ebensing)
 * fixed; allow array properties to be set to null with findOneAndUpdate [aheuermann](https://github.com/aheuermann)
 * fixed; subdocuments now use own toJSON opts #1376 [ebensing](https://github.com/ebensing)
 * fixed; model#geoNear fulfills promise when results empty #1658 [ebensing](https://github.com/ebensing)
 * fixed; utils.merge no longer overrides props and methods #1655 [j](https://github.com/j)
 * fixed; subdocuments now use their own transform #1412 [ebensing](https://github.com/ebensing)
 * fixed; model.remove() removes only what is necessary #1649
 * fixed; update() now only runs with cb or explicit true #1644
 * fixed; casting ref docs on creation #1606 [ebensing](https://github.com/ebensing)
 * fixed; model.update "overwrite" option works as documented
 * fixed; query#remove() works as documented
 * fixed; "limit" correctly applies to individual items on population #1490 [ebensing](https://github.com/ebensing)
 * fixed; issue with positional operator on ref docs #1572 [ebensing](https://github.com/ebensing)
 * fixed; benchmarks to actually output valid json
 * deprecated; promise#addBack (use promise#onResolve)
 * deprecated; promise#complete (use promise#fulfill)
 * deprecated; promise#addCallback (use promise#onFulFill)
 * deprecated; promise#addErrback (use promise#onReject)
 * deprecated; query.nearSphere() (use query.near)
 * deprecated; query.center() (use query.circle)
 * deprecated; query.centerSphere() (use query.circle)
 * deprecated; query#slaveOk (use query#read)
 * docs; custom validator messages
 * docs; 10gen -> MongoDB
 * docs; add Date method caveats #1598
 * docs; more validation details
 * docs; state which branch is stable/unstable
 * docs; mention that middleware does not run on Models
 * docs; promise.fulfill()
 * docs; fix readme spelling #1483 [yorchopolis](https://github.com/yorchopolis)
 * docs; fixed up the README and examples [ebensing](https://github.com/ebensing)
 * website; add "show code" for properties
 * website; move "show code" links down
 * website; update guide
 * website; add unstable docs
 * website; many improvements
 * website; fix copyright #1439
 * website; server.js -> static.js #1546 [nikmartin](https://github.com/nikmartin)
 * tests; refactor 1703
 * tests; add test generator
 * tests; validate formatMessage() throws
 * tests; add script for continuously running tests
 * tests; fixed versioning tests
 * tests; race conditions in tests
 * tests; added for nested and/or queries
 * tests; close some test connections
 * tests; validate db contents
 * tests; remove .only
 * tests; close some test connections
 * tests; validate db contents
 * tests; remove .only
 * tests; replace deprecated method names
 * tests; convert id to string
 * tests; fix sharding tests for MongoDB 2.4.5
 * tests; now 4-5 seconds faster
 * tests; fix race condition
 * make; suppress warning msg in test
 * benchmarks; updated for pull requests
 * examples; improved and expanded [ebensing](https://github.com/ebensing)

3.7.4 (unstable) / 2013-10-01
=============================

 * updated; mquery to 0.3.2
 * removed; mongoose.Error.DocumentError (never used)
 * added; custom error msgs for built-in validators #747
 * added; discriminator support #1647 #1003 [j](https://github.com/j)
 * added; support disabled collection name pluralization #1350 #1707 [refack](https://github.com/refack)
 * fixed; do not pluralize model names not ending with letters #1703 [refack](https://github.com/refack)
 * fixed; repopulating modified populated paths #1697
 * fixed; doc.equals() when _id option is set to false #1687
 * fixed; strict mode warnings #1686
 * fixed; $near GeoJSON casting #1683
 * fixed; nearSphere GeoJSON query builder
 * fixed; population field selection w/ strings #1669
 * docs; custom validator messages
 * docs; 10gen -> MongoDB
 * docs; add Date method caveats #1598
 * docs; more validation details
 * website; add "show code" for properties
 * website; move "show code" links down
 * tests; refactor 1703
 * tests; add test generator
 * tests; validate formatMessage() throws

3.7.3 (unstable) / 2013-08-22
=============================

  * updated; warn when using an unstable version
  * updated; mquery to 0.3.1
  * updated; mocha to 1.12.0
  * updated; mongodb driver to 1.3.19 (fix error swallowing behavior)
  * changed; no longer offically supporting node 0.6.x
  * added; support for GeoJSON to Query#near [ebensing](https://github.com/ebensing)
  * added; stand-alone base query support - query.toConstructor() [ebensing](https://github.com/ebensing)
  * added; promise support to geoSearch #1614 [ebensing](https://github.com/ebensing)
  * added; promise support for geoNear #1614 [ebensing](https://github.com/ebensing)
  * fixed; setters not firing on null values #1445 [ebensing](https://github.com/ebensing)
  * fixed; handle another versioning edge case #1520
  * fixed; excluding subdocument fields #1280 [ebensing](https://github.com/ebensing)
  * fixed; allow array properties to be set to null with findOneAndUpdate [aheuermann](https://github.com/aheuermann)
  * fixed; subdocuments now use own toJSON opts #1376 [ebensing](https://github.com/ebensing)
  * fixed; model#geoNear fulfills promise when results empty #1658 [ebensing](https://github.com/ebensing)
  * fixed; utils.merge no longer overrides props and methods #1655 [j](https://github.com/j)
  * fixed; subdocuments now use their own transform #1412 [ebensing](https://github.com/ebensing)
  * make; suppress warning msg in test
  * docs; state which branch is stable/unstable
  * docs; mention that middleware does not run on Models
  * tests; add script for continuously running tests
  * tests; fixed versioning tests
  * benchmarks; updated for pull requests

3.7.2 (unstable) / 2013-08-15
==================

  * fixed; model.remove() removes only what is necessary #1649
  * fixed; update() now only runs with cb or explicit true #1644
  * tests; race conditions in tests
  * website; update guide

3.7.1 (unstable) / 2013-08-13
=============================

  * updated; driver to 1.3.18 (fixes memory leak)
  * added; connection.useDb() #1124 [ebensing](https://github.com/ebensing)
  * added; promise support to model.mapReduce()
  * added; promise support to model.ensureIndexes()
  * added; promise support to model.populate()
  * fixed; casting ref docs on creation #1606 [ebensing](https://github.com/ebensing)
  * fixed; model.update "overwrite" option works as documented
  * fixed; query#remove() works as documented
  * fixed; "limit" correctly applies to individual items on population #1490 [ebensing](https://github.com/ebensing)
  * fixed; issue with positional operator on ref docs #1572 [ebensing](https://github.com/ebensing)
  * fixed; benchmarks to actually output valid json
  * tests; added for nested and/or queries
  * tests; close some test connections
  * tests; validate db contents
  * tests; remove .only
  * tests; close some test connections
  * tests; validate db contents
  * tests; remove .only
  * tests; replace deprecated method names
  * tests; convert id to string
  * docs; promise.fulfill()

3.7.0 (unstable) / 2013-08-05
===================

  * changed; query.within getter is now a method -> query.within()
  * changed; query.intersects getter is now a method -> query.intersects()
  * deprecated; promise#addBack (use promise#onResolve)
  * deprecated; promise#complete (use promise#fulfill)
  * deprecated; promise#addCallback (use promise#onFulFill)
  * deprecated; promise#addErrback (use promise#onReject)
  * deprecated; query.nearSphere() (use query.near)
  * deprecated; query.center() (use query.circle)
  * deprecated; query.centerSphere() (use query.circle)
  * deprecated; query#slaveOk (use query#read)
  * removed; namedscope (undocumented and broken) #679 #642 #455 #379
  * added; benchmarks [ebensing](https://github.com/ebensing)
  * added; publicly exposed connection states #1585
  * added; $geoWithin support #1529 $1455 [ebensing](https://github.com/ebensing)
  * added; query method chain validation
  * added; model.update `overwrite` option
  * added; model.geoNear() support #1563 [ebensing](https://github.com/ebensing)
  * added; model.geoSearch() support #1560 [ebensing](https://github.com/ebensing)
  * added; MongooseBuffer#subtype()
  * added; model.create() now returns a promise #1340
  * added; support for `awaitdata` query option
  * added; pass the doc to doc.remove() callback #1419 [JoeWagner](https://github.com/JoeWagner)
  * added; aggregation query builder #1404 [njoyard](https://github.com/njoyard)
  * updated; integrate mquery #1562 [ebensing](https://github.com/ebensing)
  * updated; error msg in doc.save() #1595
  * updated; bump driver to 1.3.15
  * updated; mpromise 0.3.0
  * updated; sliced 0.0.5
  * tests; fix sharding tests for MongoDB 2.4.5
  * tests; now 4-5 seconds faster
  * tests; fix race condition
  * docs; fix readme spelling #1483 [yorchopolis](https://github.com/yorchopolis)
  * docs; fixed up the README and examples [ebensing](https://github.com/ebensing)
  * website; add unstable docs
  * website; many improvements
  * website; fix copyright #1439
  * website; server.js -> static.js #1546 [nikmartin](https://github.com/nikmartin)
  * examples; improved and expanded [ebensing](https://github.com/ebensing)

3.6.20 (stable) / 2013-09-23
===================

 * fixed; repopulating modified populated paths #1697
 * fixed; doc.equals w/ _id false #1687
 * fixed; strict mode warning #1686
 * docs; near/nearSphere

3.6.19 (stable) / 2013-09-04
==================

  * fixed; population field selection w/ strings #1669
  * docs; Date method caveats #1598

3.6.18 (stable) / 2013-08-22
===================

  * updated; warn when using an unstable version of mongoose
  * updated; mocha to 1.12.0
  * updated; mongodb driver to 1.3.19 (fix error swallowing behavior)
  * fixed; setters not firing on null values #1445 [ebensing](https://github.com/ebensing)
  * fixed; properly exclude subdocument fields #1280 [ebensing](https://github.com/ebensing)
  * fixed; cast error in findAndModify #1643 [aheuermann](https://github.com/aheuermann)
  * website; update guide
  * website; added documentation for safe:false and versioning interaction
  * docs; mention that middleware dont run on Models
  * docs; fix indexes link
  * make; suppress warning msg in test
  * tests; moar

3.6.17 / 2013-08-13
===================

  * updated; driver to 1.3.18 (fixes memory leak)
  * fixed; casting ref docs on creation #1606
  * docs; query options

3.6.16 / 2013-08-08
===================

  * added; publicly expose connection states #1585
  * fixed; limit applies to individual items on population #1490 [ebensing](https://github.com/ebensing)
  * fixed; positional operator casting in updates #1572 [ebensing](https://github.com/ebensing)
  * updated; MongoDB driver to 1.3.17
  * updated; sliced to 0.0.5
  * website; tweak homepage
  * tests; fixed + added
  * docs; fix some examples
  * docs; multi-mongos support details
  * docs; auto open browser after starting static server

3.6.15 / 2013-07-16
==================

  * added; mongos failover support #1037
  * updated; make schematype return vals return self #1580
  * docs; add note to model.update #571
  * docs; document third param to document.save callback #1536
  * tests; tweek mongos test timeout

3.6.14 / 2013-07-05
===================

  * updated; driver to 1.3.11
  * fixed; issue with findOneAndUpdate not returning null on upserts #1533 [ebensing](https://github.com/ebensing)
  * fixed; missing return statement in SchemaArray#$geoIntersects() #1498 [bsrykt](https://github.com/bsrykt)
  * fixed; wrong isSelected() behavior #1521 [kyano](https://github.com/kyano)
  * docs; note about toObject behavior during save()
  * docs; add callbacks details #1547 [nikmartin](https://github.com/nikmartin)

3.6.13 / 2013-06-27
===================

  * fixed; calling model.distinct without conditions #1541
  * fixed; regression in Query#count() #1542
  * now working on 3.6.13

3.6.12 / 2013-06-25
===================

  * updated; driver to 1.3.10
  * updated; clearer capped collection error message #1509 [bitmage](https://github.com/bitmage)
  * fixed; MongooseBuffer subtype loss during casting #1517 [zedgu](https://github.com/zedgu)
  * fixed; docArray#id when doc.id is disabled #1492
  * fixed; docArray#id now supports matches on populated arrays #1492 [pgherveou](https://github.com/pgherveou)
  * website; fix example
  * website; improve _id disabling example
  * website; fix typo #1494 [dejj](https://github.com/dejj)
  * docs; added a 'Requesting new features' section #1504 [shovon](https://github.com/shovon)
  * docs; improve subtypes description
  * docs; clarify _id disabling
  * docs: display by alphabetical order the methods list #1508 [nicolasleger](https://github.com/nicolasleger)
  * tests; refactor isSelected checks
  * tests; remove pointless test
  * tests; fixed timeouts

3.6.11 / 2013-05-15
===================

  * updated; driver to 1.3.5
  * fixed; compat w/ Object.create(null) #1484 #1485
  * fixed; cloning objects w/ missing constructors
  * fixed; prevent multiple min number validators #1481 [nrako](https://github.com/nrako)
  * docs; add doc.increment() example
  * docs; add $size example
  * docs; add "distinct" example

3.6.10 / 2013-05-09
==================

  * update driver to 1.3.3
  * fixed; increment() works without other changes #1475
  * website; fix links to posterous
  * docs; fix link #1472

3.6.9 / 2013-05-02
==================

  * fixed; depopulation of mixed documents #1471
  * fixed; use of $options in array #1462
  * tests; fix race condition
  * docs; fix default example

3.6.8 / 2013-04-25
==================

  * updated; driver to 1.3.0
  * fixed; connection.model should retain options #1458 [vedmalex](https://github.com/vedmalex)
  * tests; 4-5 seconds faster

3.6.7 / 2013-04-19
==================

  * fixed; population regression in 3.6.6 #1444

3.6.6 / 2013-04-18
==================

  * fixed; saving populated new documents #1442
  * fixed; population regession in 3.6.5 #1441
  * website; fix copyright #1439

3.6.5 / 2013-04-15
==================

  * fixed; strict:throw edge case using .set(path, val)
  * fixed; schema.pathType() on some numbericAlpha paths
  * fixed; numbericAlpha path versioning
  * fixed; setting nested mixed paths #1418
  * fixed; setting nested objects with null prop #1326
  * fixed; regression in v3.6 population performance #1426 [vedmalex](https://github.com/vedmalex)
  * fixed; read pref typos #1422 [kyano](https://github.com/kyano)
  * docs; fix method example
  * website; update faq
  * website; add more deep links
  * website; update poolSize docs
  * website; add 3.6 release notes
  * website; note about keepAlive

3.6.4 / 2013-04-03
==================

  * fixed; +field conflict with $slice #1370
  * fixed; nested deselection conflict #1333
  * fixed; RangeError in ValidationError.toString() #1296
  * fixed; do not save user defined transforms #1415
  * tests; fix race condition

3.6.3 / 2013-04-02
==================

  * fixed; setting subdocuments deeply nested fields #1394
  * fixed; regression: populated streams #1411
  * docs; mention hooks/validation with findAndModify
  * docs; mention auth
  * docs; add more links
  * examples; add document methods example
  * website; display "see" links for properties
  * website; clean up homepage

3.6.2 / 2013-03-29
==================

  * fixed; corrupted sub-doc array #1408
  * fixed; document#update returns a Query #1397
  * docs; readpref strategy

3.6.1 / 2013-03-27
==================

  * added; populate support to findAndModify varients #1395
  * added; text index type to schematypes
  * expose allowed index types as Schema.indexTypes
  * fixed; use of `setMaxListeners` as path
  * fixed; regression in node 0.6 on docs with > 10 arrays
  * fixed; do not alter schema arguments #1364
  * fixed; subdoc#ownerDocument() #1385
  * website; change search id
  * website; add search from google [jackdbernier](https://github.com/jackdbernier)
  * website; fix link
  * website; add 3.5.x docs release
  * website; fix link
  * docs; fix geometry
  * docs; hide internal constructor
  * docs; aggregation does not cast arguments #1399
  * docs; querystream options
  * examples; added for population

3.6.0 / 2013-03-18
==================

  * changed; cast 'true'/'false' to boolean #1282 [mgrach](https://github.com/mgrach)
  * changed; Buffer arrays can now contain nulls
  * added; QueryStream transform option
  * added; support for authSource driver option
  * added; {mongoose,db}.modelNames()
  * added; $push w/ $slice,$sort support (MongoDB 2.4)
  * added; hashed index type (MongoDB 2.4)
  * added; support for mongodb 2.4 geojson (MongoDB 2.4)
  * added; value at time of validation error
  * added; support for object literal schemas
  * added; bufferCommands schema option
  * added; allow auth option in connections #1360 [geoah](https://github.com/geoah)
  * added; performance improvements to populate() [263ece9](https://github.com/LearnBoost/mongoose/commit/263ece9)
  * added; allow adding uncasted docs to populated arrays and properties #570
  * added; doc#populated(path) stores original populated _ids
  * added; lean population #1260
  * added; query.populate() now accepts an options object
  * added; document#populate(opts, callback)
  * added; Model.populate(docs, opts, callback)
  * added; support for rich nested path population
  * added; doc.array.remove(value) subdoc with _id value support #1278
  * added; optionally allow non-strict sets and updates
  * added; promises/A+ comformancy with [mpromise](https://github.com/aheckmann/mpromise)
  * added; promise#then
  * added; promise#end
  * fixed; use of `model` as doc property
  * fixed; lean population #1382
  * fixed; empty object mixed defaults #1380
  * fixed; populate w/ deselected _id using string syntax
  * fixed; attempted save of divergent populated arrays #1334 related
  * fixed; better error msg when attempting toObject as property name
  * fixed; non population buffer casting from doc
  * fixed; setting populated paths #570
  * fixed; casting when added docs to populated arrays #570
  * fixed; prohibit updating arrays selected with $elemMatch #1334
  * fixed; pull / set subdoc combination #1303
  * fixed; multiple bg index creation #1365
  * fixed; manual reconnection to single mongod
  * fixed; Constructor / version exposure #1124
  * fixed; CastError race condition
  * fixed; no longer swallowing misuse of subdoc#invalidate()
  * fixed; utils.clone retains RegExp opts
  * fixed; population of non-schema property
  * fixed; allow updating versionKey #1265
  * fixed; add EventEmitter props to reserved paths #1338
  * fixed; can now deselect populated doc _ids #1331
  * fixed; properly pass subtype to Binary in MongooseBuffer
  * fixed; casting _id from document with non-ObjectId _id
  * fixed; specifying schema type edge case { path: [{type: "String" }] }
  * fixed; typo in schemdate #1329 [jplock](https://github.com/jplock)
  * updated; driver to 1.2.14
  * updated; muri to 0.3.1
  * updated; mpromise to 0.2.1
  * updated; mocha 1.8.1
  * updated; mpath to 0.1.1
  * deprecated; pluralization will die in 4.x
  * refactor; rename private methods to something unusable as doc properties
  * refactor MongooseArray#remove
  * refactor; move expires index to SchemaDate #1328
  * refactor; internal document properties #1171 #1184
  * tests; added
  * docs; indexes
  * docs; validation
  * docs; populate
  * docs; populate
  * docs; add note about stream compatibility with node 0.8
  * docs; fix for private names
  * docs; Buffer -> mongodb.Binary #1363
  * docs; auth options
  * docs; improved
  * website; update FAQ
  * website; add more api links
  * website; add 3.5.x docs to prior releases
  * website; Change mongoose-types to an active repo [jackdbernier](https://github.com/jackdbernier)
  * website; compat with node 0.10
  * website; add news section
  * website; use T for generic type
  * benchmark; make adjustable

3.6.0rc1 / 2013-03-12
======================

  * refactor; rename private methods to something unusable as doc properties
  * added; {mongoose,db}.modelNames()
  * added; $push w/ $slice,$sort support (MongoDB 2.4)
  * added; hashed index type (MongoDB 2.4)
  * added; support for mongodb 2.4 geojson (MongoDB 2.4)
  * added; value at time of validation error
  * added; support for object literal schemas
  * added; bufferCommands schema option
  * added; allow auth option in connections #1360 [geoah](https://github.com/geoah)
  * fixed; lean population #1382
  * fixed; empty object mixed defaults #1380
  * fixed; populate w/ deselected _id using string syntax
  * fixed; attempted save of divergent populated arrays #1334 related
  * fixed; better error msg when attempting toObject as property name
  * fixed; non population buffer casting from doc
  * fixed; setting populated paths #570
  * fixed; casting when added docs to populated arrays #570
  * fixed; prohibit updating arrays selected with $elemMatch #1334
  * fixed; pull / set subdoc combination #1303
  * fixed; multiple bg index creation #1365
  * fixed; manual reconnection to single mongod
  * fixed; Constructor / version exposure #1124
  * fixed; CastError race condition
  * fixed; no longer swallowing misuse of subdoc#invalidate()
  * fixed; utils.clone retains RegExp opts
  * fixed; population of non-schema property
  * fixed; allow updating versionKey #1265
  * fixed; add EventEmitter props to reserved paths #1338
  * fixed; can now deselect populated doc _ids #1331
  * updated; muri to 0.3.1
  * updated; driver to 1.2.12
  * updated; mpromise to 0.2.1
  * deprecated; pluralization will die in 4.x
  * docs; Buffer -> mongodb.Binary #1363
  * docs; auth options
  * docs; improved
  * website; add news section
  * benchmark; make adjustable

3.6.0rc0 / 2013-02-03
======================

  * changed; cast 'true'/'false' to boolean #1282 [mgrach](https://github.com/mgrach)
  * changed; Buffer arrays can now contain nulls
  * fixed; properly pass subtype to Binary in MongooseBuffer
  * fixed; casting _id from document with non-ObjectId _id
  * fixed; specifying schema type edge case { path: [{type: "String" }] }
  * fixed; typo in schemdate #1329 [jplock](https://github.com/jplock)
  * refactor; move expires index to SchemaDate #1328
  * refactor; internal document properties #1171 #1184
  * added; performance improvements to populate() [263ece9](https://github.com/LearnBoost/mongoose/commit/263ece9)
  * added; allow adding uncasted docs to populated arrays and properties #570
  * added; doc#populated(path) stores original populated _ids
  * added; lean population #1260
  * added; query.populate() now accepts an options object
  * added; document#populate(opts, callback)
  * added; Model.populate(docs, opts, callback)
  * added; support for rich nested path population
  * added; doc.array.remove(value) subdoc with _id value support #1278
  * added; optionally allow non-strict sets and updates
  * added; promises/A+ comformancy with [mpromise](https://github.com/aheckmann/mpromise)
  * added; promise#then
  * added; promise#end
  * updated; mocha 1.8.1
  * updated; muri to 0.3.0
  * updated; mpath to 0.1.1
  * updated; docs

3.5.16 / 2013-08-13
===================

  * updated; driver to 1.3.18

3.5.15 / 2013-07-26
==================

  * updated; sliced to 0.0.5
  * updated; driver to 1.3.12
  * fixed; regression in Query#count() due to driver change
  * tests; fixed timeouts
  * tests; handle differing test uris

3.5.14 / 2013-05-15
===================

  * updated; driver to 1.3.5
  * fixed; compat w/ Object.create(null) #1484 #1485
  * fixed; cloning objects missing constructors
  * fixed; prevent multiple min number validators #1481 [nrako](https://github.com/nrako)

3.5.13 / 2013-05-09
==================

  * update driver to 1.3.3
  * fixed; use of $options in array #1462

3.5.12 / 2013-04-25
===================

  * updated; driver to 1.3.0
  * fixed; connection.model should retain options #1458 [vedmalex](https://github.com/vedmalex)
  * fixed; read pref typos #1422 [kyano](https://github.com/kyano)

3.5.11 / 2013-04-03
==================

  * fixed; +field conflict with $slice #1370
  * fixed; RangeError in ValidationError.toString() #1296
  * fixed; nested deselection conflict #1333
  * remove time from Makefile

3.5.10 / 2013-04-02
==================

  * fixed; setting subdocuments deeply nested fields #1394
  * fixed; do not alter schema arguments #1364

3.5.9 / 2013-03-15
==================

  * updated; driver to 1.2.14
  * added; support for authSource driver option (mongodb 2.4)
  * added; QueryStream transform option (node 0.10 helper)
  * fixed; backport for saving required populated buffers
  * fixed; pull / set subdoc combination #1303
  * fixed; multiple bg index creation #1365
  * test; added for saveable required populated buffers
  * test; added for #1365
  * test; add authSource test

3.5.8 / 2013-03-12
==================

  * added; auth option in connection [geoah](https://github.com/geoah)
  * fixed; CastError race condition
  * docs; add note about stream compatibility with node 0.8

3.5.7 / 2013-02-22
==================

  * updated; driver to 1.2.13
  * updated; muri to 0.3.1 #1347
  * fixed; utils.clone retains RegExp opts #1355
  * fixed; deepEquals RegExp support
  * tests; fix a connection test
  * website; clean up docs [afshinm](https://github.com/afshinm)
  * website; update homepage
  * website; migragtion: emphasize impact of strict docs #1264

3.5.6 / 2013-02-14
==================

  * updated; driver to 1.2.12
  * fixed; properly pass Binary subtype
  * fixed; add EventEmitter props to reserved paths #1338
  * fixed; use correct node engine version
  * fixed; display empty docs as {} in log output #953 follow up
  * improved; "bad $within $box argument" error message
  * populate; add unscientific benchmark
  * website; add stack overflow to help section
  * website; use better code font #1336 [risseraka](https://github.com/risseraka)
  * website; clarify where help is available
  * website; fix source code links #1272 [floatingLomas](https://github.com/floatingLomas)
  * docs; be specific about _id schema option #1103
  * docs; add ensureIndex error handling example
  * docs; README
  * docs; CONTRIBUTING.md

3.5.5 / 2013-01-29
==================

  * updated; driver to 1.2.11
  * removed; old node < 0.6x shims
  * fixed; documents with Buffer _ids equality
  * fixed; MongooseBuffer properly casts numbers
  * fixed; reopening closed connection on alt host/port #1287
  * docs; fixed typo in Readme #1298 [rened](https://github.com/rened)
  * docs; fixed typo in migration docs [Prinzhorn](https://github.com/Prinzhorn)
  * docs; fixed incorrect annotation in SchemaNumber#min [bilalq](https://github.com/bilalq)
  * docs; updated

3.5.4 / 2013-01-07
==================

  * changed; "_pres" & "_posts" are now reserved pathnames #1261
  * updated; driver to 1.2.8
  * fixed; exception when reopening a replica set. #1263 [ethankan](https://github.com/ethankan)
  * website; updated

3.5.3 / 2012-12-26
==================

  * added; support for geo object notation #1257
  * fixed; $within query casting with arrays
  * fixed; unix domain socket support #1254
  * updated; driver to 1.2.7
  * updated; muri to 0.0.5

3.5.2 / 2012-12-17
==================

  * fixed; using auth with replica sets #1253

3.5.1 / 2012-12-12
==================

  * fixed; regression when using subdoc with `path` as pathname #1245 [daeq](https://github.com/daeq)
  * fixed; safer db option checks
  * updated; driver to 1.2.5
  * website; add more examples
  * website; clean up old docs
  * website; fix prev release urls
  * docs; clarify streaming with HTTP responses

3.5.0 / 2012-12-10
==================

  * added; paths to CastErrors #1239
  * added; support for mongodb connection string spec #1187
  * added; post validate event
  * added; Schema#get (to retrieve schema options)
  * added; VersionError #1071
  * added; npmignore [hidekiy](https://github.com/hidekiy)
  * update; driver to 1.2.3
  * fixed; stackoverflow in setter #1234
  * fixed; utils.isObject()
  * fixed; do not clobber user specified driver writeConcern #1227
  * fixed; always pass current document to post hooks
  * fixed; throw error when user attempts to overwrite a model
  * fixed; connection.model only caches on connection #1209
  * fixed; respect conn.model() creation when matching global model exists #1209
  * fixed; passing model name + collection name now always honors collection name
  * fixed; setting virtual field to an empty object #1154
  * fixed; subclassed MongooseErrors exposure, now available in mongoose.Error.xxxx
  * fixed; model.remove() ignoring callback when executed twice [daeq](https://github.com/daeq) #1210
  * docs; add collection option to schema api docs #1222
  * docs; NOTE about db safe options
  * docs; add post hooks docs
  * docs; connection string options
  * docs; middleware is not executed with Model.remove #1241
  * docs; {g,s}etter introspection #777
  * docs; update validation docs
  * docs; add link to plugins page
  * docs; clarify error returned by unique indexes #1225
  * docs; more detail about disabling autoIndex behavior
  * docs; add homepage section to package (npm docs mongoose)
  * docs; more detail around collection name pluralization #1193
  * website; add .important css
  * website; update models page
  * website; update getting started
  * website; update quick start

3.4.0 / 2012-11-10
==================

  * added; support for generic toJSON/toObject transforms #1160 #1020 #1197
  * added; doc.set() merge support #1148 [NuORDER](https://github.com/NuORDER)
  * added; query#add support #1188 [aleclofabbro](https://github.com/aleclofabbro)
  * changed; adding invalid nested paths to non-objects throws 4216f14
  * changed; fixed; stop invalid function cloning (internal fix)
  * fixed; add query $and casting support #1180 [anotheri](https://github.com/anotheri)
  * fixed; overwriting of query arguments #1176
  * docs; fix expires examples
  * docs; transforms
  * docs; schema `collection` option docs [hermanjunge](https://github.com/hermanjunge)
  * website; updated
  * tests; added

3.3.1 / 2012-10-11
==================

  * fixed; allow goose.connect(uris, dbname, opts) #1144
  * docs; persist API private checked state across page loads

3.3.0 / 2012-10-10
==================

  * fixed; passing options as 2nd arg to connect() #1144
  * fixed; race condition after no-op save #1139
  * fixed; schema field selection application in findAndModify #1150
  * fixed; directly setting arrays #1126
  * updated; driver to 1.1.11
  * updated; collection pluralization rules [mrickard](https://github.com/mrickard)
  * tests; added
  * docs; updated

3.2.2 / 2012-10-08
==================

  * updated; driver to 1.1.10 #1143
  * updated; use sliced 0.0.3
  * fixed; do not recast embedded docs unnecessarily
  * fixed; expires schema option helper #1132
  * fixed; built in string setters #1131
  * fixed; debug output for Dates/ObjectId properties #1129
  * docs; fixed Javascript syntax error in example [olalonde](https://github.com/olalonde)
  * docs; fix toJSON example #1137
  * docs; add ensureIndex production notes
  * docs; fix spelling
  * docs; add blogposts about v3
  * website; updated
  * removed; undocumented inGroupsOf util
  * tests; added

3.2.1 / 2012-09-28
==================

  * fixed; remove query batchSize option default of 1000 https://github.com/learnboost/mongoose/commit/3edaa8651
  * docs; updated
  * website; updated

3.2.0 / 2012-09-27
==================

  * added; direct array index assignment with casting support `doc.array.set(index, value)`
  * fixed; QueryStream#resume within same tick as pause() #1116
  * fixed; default value validatation #1109
  * fixed; array splice() not casting #1123
  * fixed; default array construction edge case #1108
  * fixed; query casting for inequalities in arrays #1101 [dpatti](https://github.com/dpatti)
  * tests; added
  * website; more documentation
  * website; fixed layout issue #1111 [SlashmanX](https://github.com/SlashmanX)
  * website; refactored [guille](https://github.com/guille)

3.1.2 / 2012-09-10
==================

  * added; ReadPreferrence schema option #1097
  * updated; driver to 1.1.7
  * updated; default query batchSize to 1000
  * fixed; we now cast the mapReduce query option #1095
  * fixed; $elemMatch+$in with field selection #1091
  * fixed; properly cast $elemMatch+$in conditions #1100
  * fixed; default field application of subdocs #1027
  * fixed; querystream prematurely dying #1092
  * fixed; querystream never resumes when paused at getMore boundries #1092
  * fixed; querystream occasionally emits data events after destroy #1092
  * fixed; remove unnecessary ObjectId creation in querystream
  * fixed; allow ne(boolean) again #1093
  * docs; add populate/field selection syntax notes
  * docs; add toObject/toJSON options detail
  * docs; `read` schema option

3.1.1 / 2012-08-31
==================

  * updated; driver to 1.1.6

3.1.0 / 2012-08-29
==================

  * changed; fixed; directly setting nested objects now overwrites entire object (previously incorrectly merged them)
  * added; read pref support (mongodb 2.2) 205a709c
  * added; aggregate support (mongodb 2.2) f3a5bd3d
  * added; virtual {g,s}etter introspection (#1070)
  * updated; docs [brettz9](https://github.com/brettz9)
  * updated; driver to 1.1.5
  * fixed; retain virtual setter return values (#1069)

3.0.3 / 2012-08-23
==================

  * fixed; use of nested paths beginning w/ numbers #1062
  * fixed; query population edge case #1053 #1055 [jfremy](https://github.com/jfremy)
  * fixed; simultaneous top and sub level array modifications #1073
  * added; id and _id schema option aliases + tests
  * improve debug formatting to allow copy/paste logged queries into mongo shell [eknkc](https://github.com/eknkc)
  * docs

3.0.2 / 2012-08-17
==================

  * added; missing support for v3 sort/select syntax to findAndModify helpers (#1058)
  * fixed; replset fullsetup event emission
  * fixed; reconnected event for replsets
  * fixed; server reconnection setting discovery
  * fixed; compat with non-schema path props using positional notation (#1048)
  * fixed; setter/casting order (#665)
  * docs; updated

3.0.1 / 2012-08-11
==================

  * fixed; throw Error on bad validators (1044)
  * fixed; typo in EmbeddedDocument#parentArray [lackac]
  * fixed; repair mongoose.SchemaTypes alias
  * updated; docs

3.0.0 / 2012-08-07
==================

  * removed; old subdocument#commit method
  * fixed; setting arrays of matching docs [6924cbc2]
  * fixed; doc!remove event now emits in save order as save for consistency
  * fixed; pre-save hooks no longer fire on subdocuments when validation fails
  * added; subdoc#parent() and subdoc#parentArray() to access subdocument parent objects
  * added; query#lean() helper

3.0.0rc0 / 2012-08-01
=====================

  * fixed; allow subdoc literal declarations containing "type" pathname (#993)
  * fixed; unsetting a default array (#758)
  * fixed; boolean $in queries (#998)
  * fixed; allow use of `options` as a pathname (#529)
  * fixed; `model` is again a permitted schema path name
  * fixed; field selection option on subdocs (#1022)
  * fixed; handle another edge case with subdoc saving (#975)
  * added; emit save err on model if listening
  * added; MongoDB TTL collection support (#1006)
  * added; $center options support
  * added; $nearSphere and $polygon support
  * updated; driver version to 1.1.2

3.0.0alpha2 / 2012-07-18
=========================

  * changed; index errors are now emitted on their model and passed to an optional callback (#984)
  * fixed; specifying index along with sparse/unique option no longer overwrites (#1004)
  * fixed; never swallow connection errors (#618)
  * fixed; creating object from model with emded object no longer overwrites defaults [achurkin] (#859)
  * fixed; stop needless validation of unchanged/unselected fields (#891)
  * fixed; document#equals behavior of objectids (#974)
  * fixed; honor the minimize schema option (#978)
  * fixed; provide helpful error msgs when reserved schema path is used (#928)
  * fixed; callback to conn#disconnect is optional (#875)
  * fixed; handle missing protocols in connection urls (#987)
  * fixed; validate args to query#where (#969)
  * fixed; saving modified/removed subdocs (#975)
  * fixed; update with $pull from Mixed array (#735)
  * fixed; error with null shard key value
  * fixed; allow unsetting enums (#967)
  * added; support for manual index creation (#984)
  * added; support for disabled auto-indexing (#984)
  * added; support for preserving MongooseArray#sort changes (#752)
  * added; emit state change events on connection
  * added; support for specifying BSON subtype in MongooseBuffer#toObject [jcrugzz]
  * added; support for disabled versioning (#977)
  * added; implicit "new" support for models and Schemas

3.0.0alpha1 / 2012-06-15
=========================

  * removed; doc#commit (use doc#markModified)
  * removed; doc.modified getter (#950)
  * removed; mongoose{connectSet,createSetConnection}. use connect,createConnection instead
  * removed; query alias methods 1149804c
  * removed; MongooseNumber
  * changed; now creating indexes in background by default
  * changed; strict mode now enabled by default (#952)
  * changed; doc#modifiedPaths is now a method (#950)
  * changed; getters no longer cast (#820); casting happens during set
  * fixed; no need to pass updateArg to findOneAndUpdate (#931)
  * fixed: utils.merge bug when merging nested non-objects. [treygriffith]
  * fixed; strict:throw should produce errors in findAndModify (#963)
  * fixed; findAndUpdate no longer overwrites document (#962)
  * fixed; setting default DocumentArrays (#953)
  * fixed; selection of _id with schema deselection (#954)
  * fixed; ensure promise#error emits instanceof Error
  * fixed; CursorStream: No stack overflow on any size result (#929)
  * fixed; doc#remove now passes safe options
  * fixed; invalid use of $set during $pop
  * fixed; array#{$pop,$shift} mirror MongoDB behavior
  * fixed; no longer test non-required vals in string match (#934)
  * fixed; edge case with doc#inspect
  * fixed; setter order (#665)
  * fixed; setting invalid paths in strict mode (#916)
  * fixed; handle docs without id in DocumentArray#id method (#897)
  * fixed; do not save virtuals during model.update (#894)
  * fixed; sub doc toObject virtuals application (#889)
  * fixed; MongooseArray#pull of ObjectId (#881)
  * fixed; handle passing db name with any repl set string
  * fixed; default application of selected fields (#870)
  * fixed; subdoc paths reported in validation errors (#725)
  * fixed; incorrect reported num of affected docs in update ops (#862)
  * fixed; connection assignment in Model#model (#853)
  * fixed; stringifying arrays of docs (#852)
  * fixed; modifying subdoc and parent array works (#842)
  * fixed; passing undefined to next hook (#785)
  * fixed; Query#{update,remove}() works without callbacks (#788)
  * fixed; set/updating nested objects by parent pathname (#843)
  * fixed; allow null in number arrays (#840)
  * fixed; isNew on sub doc after insertion error (#837)
  * fixed; if an insert fails, set isNew back to false [boutell]
  * fixed; isSelected when only _id is selected (#730)
  * fixed; setting an unset default value (#742)
  * fixed; query#sort error messaging (#671)
  * fixed; support for passing $options with $regex
  * added; array of object literal notation in schema creates DocumentArrays
  * added; gt,gte,lt,lte query support for arrays (#902)
  * added; capped collection support (#938)
  * added; document versioning support
  * added; inclusion of deselected schema path (#786)
  * added; non-atomic array#pop
  * added; EmbeddedDocument constructor is now exposed in DocArray#create 7cf8beec
  * added; mapReduce support (#678)
  * added; support for a configurable minimize option #to{Object,JSON}(option) (#848)
  * added; support for strict: `throws` [regality]
  * added; support for named schema types (#795)
  * added; to{Object,JSON} schema options (#805)
  * added; findByIdAnd{Update,Remove}()
  * added; findOneAnd{Update,Remove}()
  * added; query.setOptions()
  * added; instance.update() (#794)
  * added; support specifying model in populate() [DanielBaulig]
  * added; `lean` query option [gitfy]
  * added; multi-atomic support to MongooseArray#nonAtomicPush
  * added; support for $set + other $atomic ops on single array
  * added; tests
  * updated; driver to 1.0.2
  * updated; query.sort() syntax to mirror query.select()
  * updated; clearer cast error msg for array numbers
  * updated; docs
  * updated; doc.clone 3x faster (#950)
  * updated; only create _id if necessary (#950)

2.7.3 / 2012-08-01
==================

  * fixed; boolean $in queries (#998)
  * fixed field selection option on subdocs (#1022)

2.7.2 / 2012-07-18
==================

  * fixed; callback to conn#disconnect is optional (#875)
  * fixed; handle missing protocols in connection urls (#987)
  * fixed; saving modified/removed subdocs (#975)
  * updated; tests

2.7.1 / 2012-06-26
===================

  * fixed; sharding: when a document holds a null as a value of the shard key
  * fixed; update() using $pull on an array of Mixed (gh-735)
  * deprecated; MongooseNumber#{inc, increment, decrement} methods
  * tests; now using mocha

2.7.0 / 2012-06-14
===================

  * added; deprecation warnings to methods being removed in 3.x

2.6.8 / 2012-06-14
===================

  * fixed; edge case when using 'options' as a path name (#961)

2.6.7 / 2012-06-08
===================

  * fixed; ensure promise#error always emits instanceof Error
  * fixed; selection of _id w/ another excluded path (#954)
  * fixed; setting default DocumentArrays (#953)

2.6.6 / 2012-06-06
===================

  * fixed; stack overflow in query stream with large result sets (#929)
  * added; $gt, $gte, $lt, $lte support to arrays (#902)
  * fixed; pass option `safe` along to doc#remove() calls

2.6.5 / 2012-05-24
===================

  * fixed; do not save virtuals in Model.update (#894)
  * added; missing $ prefixed query aliases (going away in 3.x) (#884) [timoxley]
  * fixed; setting invalid paths in strict mode (#916)
  * fixed; resetting isNew after insert failure (#837) [boutell]

2.6.4 / 2012-05-15
===================

  * updated; backport string regex $options to 2.x
  * updated; use driver 1.0.2 (performance improvements) (#914)
  * fixed; calling MongooseDocumentArray#id when the doc has no _id (#897)

2.6.3 / 2012-05-03
===================

  * fixed; repl-set connectivity issues during failover on MongoDB 2.0.1
  * updated; driver to 1.0.0
  * fixed; virtuals application of subdocs when using toObject({ virtuals: true }) (#889)
  * fixed; MongooseArray#pull of ObjectId correctly updates the array itself (#881)

2.6.2 / 2012-04-30
===================

  * fixed; default field application of selected fields (#870)

2.6.1 / 2012-04-30
===================

  * fixed; connection assignment in mongoose#model (#853, #877)
  * fixed; incorrect reported num of affected docs in update ops (#862)

2.6.0 / 2012-04-19
===================

  * updated; hooks.js to 0.2.1
  * fixed; issue with passing undefined to a hook callback. thanks to [chrisleishman] for reporting.
  * fixed; updating/setting nested objects in strict schemas (#843) as reported by [kof]
  * fixed; Query#{update,remove}() work without callbacks again (#788)
  * fixed; modifying subdoc along with parent array $atomic op (#842)

2.5.14 / 2012-04-13
===================

  * fixed; setting an unset default value (#742)
  * fixed; doc.isSelected(otherpath) when only _id is selected (#730)
  * updated; docs

2.5.13 / 2012-03-22
===================

  * fixed; failing validation of unselected required paths (#730,#713)
  * fixed; emitting connection error when only one listener (#759)
  * fixed; MongooseArray#splice was not returning values (#784) [chrisleishman]

2.5.12 / 2012-03-21
===================

  * fixed; honor the `safe` option in all ensureIndex calls
  * updated; node-mongodb-native driver to 0.9.9-7

2.5.11 / 2012-03-15
===================

  * added; introspection for getters/setters (#745)
  * updated; node-mongodb-driver to 0.9.9-5
  * added; tailable method to Query (#769) [holic]
  * fixed; Number min/max validation of null (#764) [btamas]
  * added; more flexible user/password connection options (#738) [KarneAsada]

2.5.10 / 2012-03-06
===================

  * updated; node-mongodb-native driver to 0.9.9-4
  * added; Query#comment()
  * fixed; allow unsetting arrays
  * fixed; hooking the set method of subdocuments (#746)
  * fixed; edge case in hooks
  * fixed; allow $id and $ref in queries (fixes compatibility with mongoose-dbref) (#749) [richtera]
  * added; default path selection to SchemaTypes

2.5.9 / 2012-02-22
===================

  * fixed; properly cast nested atomic update operators for sub-documents

2.5.8 / 2012-02-21
===================

  * added; post 'remove' middleware includes model that was removed (#729) [timoxley]

2.5.7 / 2012-02-09
===================

  * fixed; RegExp validators on node >= v0.6.x

2.5.6 / 2012-02-09
===================

  * fixed; emit errors returned from db.collection() on the connection (were being swallowed)
  * added; can add multiple validators in your schema at once (#718) [diogogmt]
  * fixed; strict embedded documents (#717)
  * updated; docs [niemyjski]
  * added; pass number of affected docs back in model.update/save

2.5.5 / 2012-02-03
===================

  * fixed; RangeError: maximum call stack exceed error when removing docs with Number _id (#714)

2.5.4 / 2012-02-03
===================

  * fixed; RangeError: maximum call stack exceed error (#714)

2.5.3 / 2012-02-02
===================

  * added; doc#isSelected(path)
  * added; query#equals()
  * added; beta sharding support
  * added; more descript error msgs (#700) [obeleh]
  * added; document.modifiedPaths (#709) [ljharb]
  * fixed; only functions can be added as getters/setters (#707,704) [ljharb]

2.5.2 / 2012-01-30
===================

  * fixed; rollback -native driver to 0.9.7-3-5 (was causing timeouts and other replica set weirdness)
  * deprecated; MongooseNumber (will be moved to a separate repo for 3.x)
  * added; init event is emitted on schemas

2.5.1 / 2012-01-27
===================

  * fixed; honor strict schemas in Model.update (#699)

2.5.0 / 2012-01-26
===================

  * added; doc.toJSON calls toJSON on embedded docs when exists [jerem]
  * added; populate support for refs of type Buffer (#686) [jerem]
  * added; $all support for ObjectIds and Dates (#690)
  * fixed; virtual setter calling on instantiation when strict: true (#682) [hunterloftis]
  * fixed; doc construction triggering getters (#685)
  * fixed; MongooseBuffer check in deepEquals (#688)
  * fixed; range error when using Number _ids with `instance.save()` (#691)
  * fixed; isNew on embedded docs edge case (#680)
  * updated; driver to 0.9.8-3
  * updated; expose `model()` method within static methods

2.4.10 / 2012-01-10
===================

  * added; optional getter application in .toObject()/.toJSON() (#412)
  * fixed; nested $operators in $all queries (#670)
  * added; $nor support (#674)
  * fixed; bug when adding nested schema (#662) [paulwe]

2.4.9 / 2012-01-04
===================

  * updated; driver to 0.9.7-3-5 to fix Linux performance degradation on some boxes

2.4.8 / 2011-12-22
===================

  * updated; bump -native to 0.9.7.2-5
  * fixed; compatibility with date.js (#646) [chrisleishman]
  * changed; undocumented schema "lax" option to "strict"
  * fixed; default value population for strict schemas
  * updated; the nextTick helper for small performance gain. 1bee2a2

2.4.7 / 2011-12-16
===================

  * fixed; bug in 2.4.6 with path setting
  * updated; bump -native to 0.9.7.2-1
  * added; strict schema option [nw]

2.4.6 / 2011-12-16
===================

  * fixed; conflicting mods on update bug [sirlantis]
  * improved; doc.id getter performance

2.4.5 / 2011-12-14
===================

  * fixed; bad MongooseArray behavior in 2.4.2 - 2.4.4

2.4.4 / 2011-12-14
===================

  * fixed; MongooseArray#doAtomics throwing after sliced

2.4.3 / 2011-12-14
===================

  * updated; system.profile schema for MongoDB 2x

2.4.2 / 2011-12-12
===================

  * fixed; partially populating multiple children of subdocs (#639) [kenpratt]
  * fixed; allow Update of numbers to null (#640) [jerem]

2.4.1 / 2011-12-02
===================

  * added; options support for populate() queries
  * updated; -native driver to 0.9.7-1.4

2.4.0 / 2011-11-29
===================

  * added; QueryStreams (#614)
  * added; debug print mode for development
  * added; $within support to Array queries (#586) [ggoodale]
  * added; $centerSphere query support
  * fixed; $within support
  * added; $unset is now used when setting a path to undefined (#519)
  * added; query#batchSize support
  * updated; docs
  * updated; -native driver to 0.9.7-1.3 (provides Windows support)

2.3.13 / 2011-11-15
===================

  * fixed; required validation for Refs (#612) [ded]
  * added; $nearSphere support for Arrays (#610)

2.3.12 / 2011-11-09
===================

  * fixed; regression, objects passed to Model.update should not be changed (#605)
  * fixed; regression, empty Model.update should not be executed

2.3.11 / 2011-11-08
===================

  * fixed; using $elemMatch on arrays of Mixed types (#591)
  * fixed; allow using $regex when querying Arrays (#599)
  * fixed; calling Model.update with no atomic keys (#602)

2.3.10 / 2011-11-05
===================

  * fixed; model.update casting for nested paths works (#542)

2.3.9 / 2011-11-04
==================

  * fixed; deepEquals check for MongooseArray returned false
  * fixed; reset modified flags of embedded docs after save [gitfy]
  * fixed; setting embedded doc with identical values no longer marks modified [gitfy]
  * updated; -native driver to 0.9.6.23 [mlazarov]
  * fixed; Model.update casting (#542, #545, #479)
  * fixed; populated refs no longer fail required validators (#577)
  * fixed; populating refs of objects with custom ids works
  * fixed; $pop & $unset work with Model.update (#574)
  * added; more helpful debugging message for Schema#add (#578)
  * fixed; accessing .id when no _id exists now returns null (#590)

2.3.8 / 2011-10-26
==================

  * added; callback to query#findOne is now optional (#581)

2.3.7 / 2011-10-24
==================

  * fixed; wrapped save/remove callbacks in nextTick to mitigate -native swallowing thrown errors

2.3.6 / 2011-10-21
==================

  * fixed; exclusion of embedded doc _id from query results (#541)

2.3.5 / 2011-10-19
==================

  * fixed; calling queries without passing a callback works (#569)
  * fixed; populate() works with String and Number _ids too (#568)

2.3.4 / 2011-10-18
==================

  * added; Model.create now accepts an array as a first arg
  * fixed; calling toObject on a DocumentArray with nulls no longer throws
  * fixed; calling inspect on a DocumentArray with nulls no longer throws
  * added; MongooseArray#unshift support
  * fixed; save hooks now fire on embedded documents [gitfy] (#456)
  * updated; -native driver to 0.9.6-22
  * fixed; correctly pass $addToSet op instead of $push
  * fixed; $addToSet properly detects dates
  * fixed; $addToSet with multiple items works
  * updated; better node 0.6 Buffer support

2.3.3 / 2011-10-12
==================

  * fixed; population conditions in multi-query settings [vedmalex] (#563)
  * fixed; now compatible with Node v0.5.x

2.3.2 / 2011-10-11
==================

  * fixed; population of null subdoc properties no longer hangs (#561)

2.3.1 / 2011-10-10
==================

  * added; support for Query filters to populate() [eneko]
  * fixed; querying with number no longer crashes mongodb (#555) [jlbyrey]
  * updated; version of -native driver to 0.9.6-21
  * fixed; prevent query callbacks that throw errors from corrupting -native connection state

2.3.0 / 2011-10-04
==================

  * fixed; nulls as default values for Boolean now works as expected
  * updated; version of -native driver to 0.9.6-20

2.2.4 / 2011-10-03
==================

  * fixed; populate() works when returned array contains undefined/nulls

2.2.3 / 2011-09-29
==================

  * updated; version of -native driver to 0.9.6-19

2.2.2 / 2011-09-28
==================

  * added; $regex support to String [davidandrewcope]
  * added; support for other contexts like repl etc (#535)
  * fixed; clear modified state properly after saving
  * added; $addToSet support to Array

2.2.1 / 2011-09-22
==================

  * more descript error when casting undefined to string
  * updated; version of -native driver to 0.9.6-18

2.2.0 / 2011-09-22
==================

  * fixed; maxListeners warning on schemas with many arrays (#530)
  * changed; return / apply defaults based on fields selected in query (#423)
  * fixed; correctly detect Mixed types within schema arrays (#532)

2.1.4 / 2011-09-20
==================

  * fixed; new private methods that stomped on users code
  * changed; finished removing old "compat" support which did nothing

2.1.3 / 2011-09-16
==================

  * updated; version of -native driver to 0.9.6-15
  * added; emit `error` on connection when open fails [edwardhotchkiss]
  * added; index support to Buffers (thanks justmoon for helping track this down)
  * fixed; passing collection name via schema in conn.model() now works (thanks vedmalex for reporting)

2.1.2 / 2011-09-07
==================

  * fixed; Query#find with no args no longer throws

2.1.1 / 2011-09-07
==================

  * added; support Model.count(fn)
  * fixed; compatibility with node >=0.4.0 < 0.4.3
  * added; pass model.options.safe through with .save() so w:2, wtimeout:5000 options work [andrewjstone]
  * added; support for $type queries
  * added; support for Query#or
  * added; more tests
  * optimized populate queries

2.1.0 / 2011-09-01
==================

  * changed; document#validate is a public method
  * fixed; setting number to same value no longer marks modified (#476) [gitfy]
  * fixed; Buffers shouldn't have default vals
  * added; allow specifying collection name in schema (#470) [ixti]
  * fixed; reset modified paths and atomics after saved (#459)
  * fixed; set isNew on embedded docs to false after save
  * fixed; use self to ensure proper scope of options in doOpenSet (#483) [andrewjstone]

2.0.4 / 2011-08-29
==================

  * Fixed; Only send the depopulated ObjectId instead of the entire doc on save (DBRefs)
  * Fixed; Properly cast nested array values in Model.update (the data was stored in Mongo incorrectly but recast on document fetch was "fixing" it)

2.0.3 / 2011-08-28
==================

  * Fixed; manipulating a populated array no longer causes infinite loop in BSON serializer during save (#477)
  * Fixed; populating an empty array no longer hangs foreeeeeeeever (#481)

2.0.2 / 2011-08-25
==================

  * Fixed; Maintain query option key order (fixes 'bad hint' error from compound query hints)

2.0.1 / 2011-08-25
==================

  * Fixed; do not over-write the doc when no valide props exist in Model.update (#473)

2.0.0 / 2011-08-24
===================

  * Added; support for Buffers [justmoon]
  * Changed; improved error handling [maelstrom]
  * Removed: unused utils.erase
  * Fixed; support for passing other context object into Schemas (#234) [Sija]
  * Fixed; getters are no longer circular refs to themselves (#366)
  * Removed; unused compat.js
  * Fixed; getter/setter scopes are set properly
  * Changed; made several private properties more obvious by prefixing _
  * Added; DBRef support [guille]
  * Changed; removed support for multiple collection names per model
  * Fixed; no longer applying setters when document returned from db
  * Changed; default auto_reconnect to true
  * Changed; Query#bind no longer clones the query
  * Fixed; Model.update now accepts $pull, $inc and friends (#404)
  * Added; virtual type option support [nw]

1.8.4 / 2011-08-21
===================

  * Fixed; validation bug when instantiated with non-schema properties (#464) [jmreidy]

1.8.3 / 2011-08-19
===================

  * Fixed; regression in connection#open [jshaw86]

1.8.2 / 2011-08-17
===================

  * fixed; reset connection.readyState after failure [tomseago]
  * fixed; can now query positionally for non-embedded docs (arrays of numbers/strings etc)
  * fixed; embedded document query casting
  * added; support for passing options to node-mongo-native db, server, and replsetserver [tomseago]

1.8.1 / 2011-08-10
===================

  * fixed; ObjectIds were always marked modified
  * fixed; can now query using document instances
  * fixed; can now query/update using documents with subdocs

1.8.0 / 2011-08-04
===================

  * fixed; can now use $all with String and Number
  * fixed; can query subdoc array with $ne: null
  * fixed; instance.subdocs#id now works with custom _ids
  * fixed; do not apply setters when doc returned from db (change in bad behavior)

1.7.4 / 2011-07-25
===================

  * fixed; sparse now a valid seperate schema option
  * fixed; now catching cast errors in queries
  * fixed; calling new Schema with object created in vm.runInNewContext now works (#384) [Sija]
  * fixed; String enum was disallowing null
  * fixed; Find by nested document _id now works (#389)

1.7.3 / 2011-07-16
===================

  * fixed; MongooseArray#indexOf now works with ObjectIds
  * fixed; validation scope now set properly (#418)
  * fixed; added missing colors dependency (#398)

1.7.2 / 2011-07-13
===================

  * changed; node-mongodb-native driver to v0.9.6.7

1.7.1 / 2011-07-12
===================

  * changed; roll back node-mongodb-native driver to v0.9.6.4

1.7.0 / 2011-07-12
===================

  * fixed; collection name misspelling [mathrawka]
  * fixed; 2nd param is required for ReplSetServers [kevinmarvin]
  * fixed; MongooseArray behaves properly with Object.keys
  * changed; node-mongodb-native driver to v0.9.6.6
  * fixed/changed; Mongodb segfault when passed invalid ObjectId (#407)
      - This means invalid data passed to the ObjectId constructor will now error

1.6.0 / 2011-07-07
===================

  * changed; .save() errors are now emitted on the instances db instead of the instance 9782463fc
  * fixed; errors occurring when creating indexes now properly emit on db
  * added; $maxDistance support to MongooseArrays
  * fixed; RegExps now work with $all
  * changed; node-mongodb-native driver to v0.9.6.4
  * fixed; model names are now accessible via .modelName
  * added; Query#slaveOk support

1.5.0 / 2011-06-27
===================

  * changed; saving without a callback no longer ignores the error (@bnoguchi)
  * changed; hook-js version bump to 0.1.9
  * changed; node-mongodb-native version bumped to 0.9.6.1 - When .remove() doesn't
             return an error, null is no longer passed.
  * fixed; two memory leaks (@justmoon)
  * added; sparse index support
  * added; more ObjectId conditionals (gt, lt, gte, lte) (@phillyqueso)
  * added; options are now passed in model#remote (@JerryLuke)

1.4.0 / 2011-06-10
===================

  * bumped hooks-js dependency (fixes issue passing null as first arg to next())
  * fixed; document#inspect now works properly with nested docs
  * fixed; 'set' now works as a schema attribute (GH-365)
  * fixed; _id is now set properly within pre-init hooks (GH-289)
  * added; Query#distinct / Model#distinct support (GH-155)
  * fixed; embedded docs now can use instance methods (GH-249)
  * fixed; can now overwrite strings conflicting with schema type

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
