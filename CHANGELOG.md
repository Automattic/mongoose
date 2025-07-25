8.16.5 / 2025-07-25
===================
 * fix(map): avoid throwing required error if saving map of primitives with required: true #15542
 * types(model): export MongooseBulkWriteResult type #15546
 * types(connection): add base to connection type #15544

8.16.4 / 2025-07-16
===================
 * fix(connection): avoid calling connection.close() internally with force: Object #15534 #15531
 * types(schema): handle required: string in schema definitions #15538 #15536
 * types(document): allow calling $isDefault() with no args #15528 #15522
 * types: infer Typescript string enums #15530 [ruiaraujo](https://github.com/ruiaraujo)
 * types: pass TModelType down to schema statics #15537

8.16.3 / 2025-07-10
===================
 * fix(document): clean modified subpaths if unsetting map #15520 #15519
 * fix: make DocumentArray SchemaType pass all options to embedded SchemaType #15523
 * types: support readonly array in query.select #15527 [omermizr](https://github.com/omermizr)

8.16.2 / 2025-07-07
===================
 * fix(cursor): populate after hydrating in queryCursor so populated docs get parent() #15498 #15494
 * fix(schema): support toJSONSchema() on mixed types and improve error message about unsupported types #15492 #15489
 * types: add _id and __v to toObject/toJSON transform type #15501 #15479
 * types(schema): use user-provided THydratedDocumentType as context for virtual get() and set() #15517 #15516
 * types: improve typing for transform option to toJSON and toObject #15485
 * docs: link to custom setter docs from lowercase, etc. options and note that setters run on query filters #15493 #15491
 * docs(jest): add note about resetModules #15515

8.16.1 / 2025-06-26
===================
 * fix(document): avoid setting _skipMarkModified when setting nested path with merge option #15484 #11913
 * fix(model): make sure post save error handler gets doc as param on VersionError #15483 #15480
 * fix: consistent $conditionalHandlers setup between schematypes #15490
 * docs(compatibility): note that mongodb 4.0 is not supported anymore since 8.16.0 #15487 [hasezoey](https://github.com/hasezoey)
 * docs: remove unnecessary --save flag from npm install instruction #15486 [Thahirgeek](https://github.com/Thahirgeek)

8.16.0 / 2025-06-16
===================
 * feat(model): add Model.createSearchIndexes() #15470 #15465
 * feat: upgrade MongoDB driver -> 6.17.0 #15468 [gmstavros](https://github.com/gmstavros)

8.15.2 / 2025-06-12
===================
 * fix(document+schema): improve handling for setting paths underneath maps, including maps of maps #15477 #15461
 * fix: report default paths in VersionError message because they can can cause VersionError #15464
 * fix(updateValidators): ensure update validators only call validators underneath single nested paths once #15446 #15436
 * fix: fix validation for deeply nested maps of subdocuments #15469 #15447 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(DocumentArray): correctly set parent if instantiated with schema from another Mongoose instance #15471 #15466
 * types(model): use ProjectionType for Model.hydrate() #15447 #15443

8.15.1 / 2025-05-26
===================
 * types: correct handling of _id in ProjectionType #15432 #15418
 * types: fix definition of VectorSearch.$vectorSearch #15429 [chriskrycho](https://github.com/chriskrycho)
 * docs: add Document#save to list of function with callbacks removed #15433 [SethFalco](https://github.com/SethFalco)

8.15.0 / 2025-05-16
===================
 * feat: CSFLE support #15390 [baileympearson](https://github.com/baileympearson)
 * feat: add strictFilter option to findOneAndUpdate (#14913) #15402 #14913 [muazahmed-dev](https://github.com/muazahmed-dev)
 * feat(error): set cause to MongoDB error reason on ServerSelection errors #15420 #15416
 * fix(model): make bulkSave() rely on document.validateSync() to validate docs and skip bulkWrite casting #15415 #15410
 * types: stricter projection typing with 1-level deep nesting #15418 #15327 #13840 [pshaddel](https://github.com/pshaddel)
 * docs: emphasize automatic type inference in TypeScript intro and statics/methods, remove duplicated statics.md #15421

8.14.3 / 2025-05-13
===================
 * types(schema): allow post('init') #15413 #15412 #15333
 * types: fix signature of DocumentArray.id #15414 [Sainan](https://github.com/Sainan)
 * docs: fix typo - change 'prodecure' to 'procedure' #15419 [0xEbrahim](https://github.com/0xEbrahim)

8.14.2 / 2025-05-08
===================
 * fix(query): handle casting array filter paths underneath array filter paths with embedded discriminators #15388 #15386
 * docs(typescript): correct schema and model generic params in TS virtuals docs #15391
 * docs+types(schema): add alternative optimisticConcurrency syntaxes to docs + types #15405 #10591
 * chore: add Node 24 to CI matrix #15408 [stscoundrel](https://github.com/stscoundrel)

7.8.7 / 2025-04-30
==================
 * types(aggregate): allow calling project() with a string #15304 #15300
 * docs: update deleteOne & deleteMany API def #15360 [Elliot67](https://github.com/Elliot67) [SethFalco](https://github.com/SethFalco)

8.14.1 / 2025-04-29
===================
 * fix: correct change tracking with maps of arrays of primitives and maps of maps #15374 #15350
 * fix(populate): consistently convert Buffer representation of UUID to hex string to avoid confusing populate assignment #15383 #15382
 *  docs: add TypeScript Query guide with info on lean() + transform() #15377 #15311

8.14.0 / 2025-04-25
===================
 * feat: upgrade MongoDB driver -> 6.16 #15371
 * feat: implement Query findById methods #15337 [sderrow](https://github.com/sderrow)
 * feat(subdocument): support schematype-level minimize option to disable minimizing empty subdocuments #15336 #15313
 * feat: add skipOriginalStackTraces option to avoid stack trace performance overhead #15345 #15194
 * fix(model): disallow Model.findOneAndUpdate(update) and fix TypeScript types re: findOneAndUpdate #15365 #15363
 * types: correctly recurse in InferRawDocType #15357 #14954 [JavaScriptBach](https://github.com/JavaScriptBach)
 * types: include virtuals in toJSON and toObject output if virtuals: true set #15346 #15316
 * types: make init hooks types accurately reflect runtime behavior #15331 #15301

8.13.3 / 2025-04-24
===================
 * fix: export MongooseBulkSaveIncompleteError #15370 #15369
 * fix: clone POJOs and arrays when casting query filter to avoid mutating objects #15367 #15364
 * types(connection): add Connection.prototype.bulkWrite() to types #15368 #15359
 * docs: add version requirements to v7 migration docs #15361 [SethFalco](https://github.com/SethFalco)
 * docs: update links in deleteOne & deleteMany API def #15360 [Elliot67](https://github.com/Elliot67)
 * docs: adds Model#count to list of fns callback removed from #15349 [SethFalco](https://github.com/SethFalco)

8.13.2 / 2025-04-03
===================
 * fix: avoid double calling validators on paths in document arrays underneath subdocuments #15338 #15335

8.13.1 / 2025-03-28
===================
 * fix(populate): handle virtual populate on array of UUIDs #15329 #15315
 * types: allow default function returning undefined with DocType override #15328

8.13.0 / 2025-03-24
===================
 * feat: bump mongodb driver -> 6.15.0
 * feat: support custom types exported from driver #15321

8.12.2 / 2025-03-21
===================
 * fix(document): avoid stripping out fields in discriminator schema after select: false field #15322 #15308
 * fix(AggregationCursor): make next() error if schema pre('aggregate') middleware throws error #15293 #15279
 * fix(populate): correctly get schematypes when deep populating under a map #15302 #9359
 * fix(model): avoid returning null from bulkSave() if error doesn't have writeErrors property #15323
 * types: add WithTimestamps utility type #15318 [baruchiro](https://github.com/baruchiro)
 * docs: update references to the ms module in date schema documentation #15319 [baruchiro](https://github.com/baruchiro)
 * docs: fix typo in schematypes.md #15305 [skyran1278](https://github.com/skyran1278)

8.12.1 / 2025-03-04
===================
 * fix: match bson version with mongodb's bson version #15297 [hasezoey](https://github.com/hasezoey)

8.12.0 / 2025-03-03
===================
 * feat: bump mongodb driver to 6.14
 * feat: expose "SchemaTypeOptions" in browser #15277 [hasezoey](https://github.com/hasezoey)
 * docs: update field-level-encryption.md #15272 [dphrag](https://github.com/dphrag)

8.11.0 / 2025-02-26
===================
 * feat(model): make bulkWrite results include MongoDB bulk write errors as well as validation errors #15271 #15265
 * feat(document): add schemaFieldsOnly option to toObject() and toJSON() #15259 #15218
 * feat: introduce populate ordered option for populating in series rather than in parallel for transactions #15239 #15231 #15210
 * fix(bigint): throw error when casting BigInt that's outside of the bounds of what MongoDB can safely store #15230 #15200

8.10.2 / 2025-02-25
===================
 * fix(model+connection): return MongoDB BulkWriteResult instance even if no valid ops #15266 #15265
 * fix(debug): avoid printing trusted symbol in debug output #15267 #15263
 * types: make type inference logic resilient to no Buffer type due to missing @types/node #15261

8.10.1 / 2025-02-14
===================
 * perf(document): only call undoReset() 1x/document #15257 #15255
 * perf(schema): clear childSchemas when overwriting existing path to avoid performance degradations #15256 #15253
 * perf: some more micro optimizations for find() and findOne() #14906 #15250
 * fix(model): avoid adding timeout on Model.init() buffering to avoid unintentional dangling open handles #15251 #15241
 * fix: avoid connection buffering on init if autoCreate: false #15247 #15241
 * fix: infer discriminator key if set in $set with overwriteDiscriminatorKey #15243 #15218
 * types(middleware): make this in document middleware the hydrated doc type, not raw doc type #15246 #15242
 * types(schema): support options parameter to Schema.prototype.discriminator() #15249 #15244
 * types(schema): allow calling Schema.prototype.number() with no message arg #15237 #15236
 * docs(typescript): recommend using HydratedSingleSubdocument over Types.Subdocument #15240 #15211

8.10.0 / 2025-02-05
===================
 * feat(schema+schematype): add toJSONSchema() method to convert schemas and schematypes to JSON schema #15184 #11162
 * feat(connection): make connection helpers respect bufferTimeoutMS #15229 #15201
 * feat(document): support schematype-level transform option #15163 #15084
 * feat(model): add insertOne() function to insert a single doc #15162 #14843
 * feat(connection): support Connection.prototype.aggregate() for db-level aggregations #15153
 * feat(model): make syncIndexes() not call createIndex() on indexes that already exist #15175 #12250
 * feat(model): useConnection(connection) function #14802
 * fix(model): disallow updateMany(update) and fix TypeScript types re: updateMany() #15199 #15190
 * fix(collection): avoid buffering if creating a collection during a connection interruption #15187 #14971
 * fix(model): throw error if calling create() with multiple docs in a transaction unless ordered: true #15100
 * fix(model): skip createCollection() in syncIndexes() if autoCreate: false #15155
 * fix(model): make `hydrate()` handle hydrating deeply nested populated docs with hydratedPopulatedDocs #15130
 * types(document): make sure toObject() and toJSON() apply versionKey __v #15097
 * ci(NODE-6505): CI Setup for Encryption Support #15139 [aditi-khare-mongoDB](https://github.com/aditi-khare-mongoDB)

8.9.7 / 2025-02-04
==================
 * fix: avoid applying defaults on map embedded paths #15217 #15196
 * types: add missing $median operator to aggregation types #15233 #15209
 * docs(document): clarify that toObject() returns a POJO that may contain non-POJO values #15232 #15208

8.9.6 / 2025-01-31
==================
 * fix(document): allow setting values to undefined with set(obj) syntax with strict: false #15207 #15192
 * fix(schema): improve reason for UUID cast error, currently a TypeError #15215 #15202
 * fix(aggregate): improve error when calling near() with invalid coordinates #15206 #15188

7.8.6 / 2025-01-20
===================
 * chore: remove coverage output from bundle

6.13.8 / 2025-01-20
===================
 * chore: remove coverage output from bundle

7.8.5 / 2025-01-20
===================
 * chore: re-release to force npm audit to pick up 6.x fix for CVE-2025-23061

6.13.7 / 2025-01-20
===================
 * chore: re-release to force npm audit to pick up 6.x fix for CVE-2025-23061

8.9.5 / 2025-01-13
==================
 * fix: disallow nested $where in populate match CVE-2025-23061
 * fix(schema): handle bitwise operators on Int32 #15176 #15170

7.8.4 / 2025-01-13
===================
 * fix: disallow nested $where in populate match CVE-2025-23061

6.13.6 / 2025-01-13
===================
 * fix: disallow nested $where in populate match CVE-2025-23061

8.9.4 / 2025-01-09
==================
 * fix(document): fix document not applying manual populate when using a function in schema.options.ref #15138 [IchirokuXVI](https://github.com/IchirokuXVI)
 * fix(model): make Model.validate() static correctly cast document arrays #15169 #15164
 * fix(model): allow passing validateBeforeSave option to bulkSave() to skip validation #15161 #15156
 * fix(schema): allow multiple self-referencing discriminator schemas using Schema.prototype.discriminator #15142 #15120
 * types: avoid BufferToBinary<> wiping lean types when passed to generic functions #15160 #15158
 * docs: fix `<code>` in header ids #15159
 * docs: fix header in field-level-encryption.md #15137 [damieng](https://github.com/damieng)

8.9.3 / 2024-12-30
==================
 * fix(schema): make duplicate index error a warning for now to prevent blocking upgrading #15135 #15112 #15109
 * fix(model): handle document array paths set to non-array values in Model.castObject() #15124 #15075
 * fix(document): avoid using childSchemas.path for compatibility with pre-Mongoose-8.8 schemas #15131 #15071
 * fix(model): avoid throwing unnecessary error if updateOne() returns null in save() #15126
 * perf(cursor): clear the stack every time if using populate with batchSize to avoid stack overflows with large docs #15136 #10449
 * types: make BufferToBinary avoid Document instances #15123 #15122
 * types(model+query): avoid stripping out virtuals when calling populate with paths generic #15132 #15111
 * types(schema): add missing removeIndex #15134
 * types: add cleanIndexes() to IndexManager interface #15127
 * docs: move search endpoint to netlify #15119

8.9.2 / 2024-12-19
==================
 * fix(schema): avoid throwing duplicate index error if index spec keys have different order or index has a custom name #15112 #15109
 * fix(map): clean modified subpaths when overwriting values in map of subdocs #15114 #15108
 * fix(aggregate): pull session from transaction local storage for aggregation cursors #15094 [IchirokuXVI](https://github.com/IchirokuXVI)
 * types: correctly handle union types in BufferToBinary and related helpers #15103 #15102 #15057
 * types: add UUID to RefType #15115 #15101
 * docs: remove link to Mongoose 5.x docs from dropdown #15116
 * docs(connection+document+model): remove remaining references to remove(), clarify that deleteOne() does not execute until then() or exec() #15113 #15107

8.9.1 / 2024-12-16
==================
 * fix(connection): remove heartbeat check in load balanced mode #15089 #15042 #14812
 * fix(discriminator): gather childSchemas when creating discriminator to ensure $getAllSubdocs() can properly get all subdocs #15099 #15088 #15092
 * fix(model): handle discriminators in castObject() #15096 #15075
 * fix(schema): throw error if duplicate index definition using unique in schema path and subsequent .index() call #15093 #15056
 * fix: mark documents that are populated using hydratedPopulatedDocs option as populated in top-level doc #15080 #15048
 * fix(document+schema): improve error message for get() on invalid path #15098 #15071
 * docs: remove more callback doc references & some small other changes #15095

8.9.0 / 2024-12-13
==================
 * feat: upgrade mongodb -> 6.12
 * feat: add int32 schematype #15054 [aditi-khare-mongoDB](https://github.com/aditi-khare-mongoDB)
 * feat: add double schematype #15061 [aditi-khare-mongoDB](https://github.com/aditi-khare-mongoDB)
 * feat: allow specifying error message override for duplicate key errors unique: true #15059 #12844
 * feat(connection): add support for Connection.prototype.bulkWrite() with MongoDB server 8.0 #15058 #15028
 * feat: add forceRepopulate option for populate() to allow avoiding repopulating already populated docs #15044 #14979
 * fix(connection): remove heartbeat check in load balanced mode #15089 #15042
 * fix(query): clone PopulateOptions when setting _localModel to avoid state leaking between subpopulate instances #15082 #15026
 * types: add splice() to DocumentArray to allow adding partial objects with splice() #15085 #15041
 * types(aggregate): add $firstN, $lastN, $bottom, $bottomN, $minN and $maxN operators #15087 [mlomnicki](https://github.com/mlomnicki)
 * docs: Remove merge conflict markers #15090 [sponrad](https://github.com/sponrad)

8.8.4 / 2024-12-05
==================
 * fix: cast using overwritten embedded discriminator key when set #15076 #15051
 * fix: avoid throwing error if saveOptions undefined when invalidating subdoc cache #15062

8.8.3 / 2024-11-26
==================
 * fix: disallow using $where in match
 * perf: cache results from getAllSubdocs() on saveOptions, only loop through known subdoc properties #15055 #15029
 * fix(model+query): support overwriteDiscriminatorKey for bulkWrite updateOne and updateMany, allow inferring discriminator key from update #15046 #15040

7.8.3 / 2024-11-26
==================
 * fix: disallow using $where in match
 * fix(projection): avoid setting projection to unknown exclusive/inclusive if elemMatch on a Date, ObjectId, etc. #14894 #14893
 * docs(migrating_to_7): add note about keepAlive to Mongoose 7 migration guide #15032 #13431

6.13.5 / 2024-11-26
===================
 * fix: disallow using $where in match

8.8.2 / 2024-11-18
==================
 * fix(model): handle array filters when casting bulkWrite #15036 #14978
 * fix(model): make diffIndexes() avoid trying to drop default timeseries collection index #15035 #14984
 * fix: save execution stack in query as string #15039 [durran](https://github.com/durran)
 * types(cursor): correct asyncIterator and asyncDispose for TypeScript with lib: 'esnext' #15038
 * docs(migrating_to_8): add note about removing findByIdAndRemove #15024 [dragontaek-lee](https://github.com/dragontaek-lee)

6.13.4 / 2024-11-15
===================
 * fix: save execution stack in query as string #15043 #15039
 * docs: clarify strictQuery default will flip-flop in "Migrating to 6.x" #14998 [markstos](https://github.com/markstos)

8.8.1 / 2024-11-08
==================
 * perf: make a few micro-optimizations to help speed up findOne() #15022 #14906
 * fix: apply embedded discriminators to subdoc schemas before compiling top level model so middleware applies correctly #15001 #14961
 * fix(query): add overwriteImmutable option to allow updating immutable properties without disabling strict mode #15000 #8619

8.8.0 / 2024-10-31
==================
 * feat: upgrade mongodb -> ~6.10 #14991 #14877
 * feat(query): add schemaLevelProjections option to query to disable schema-level select: false #14986 #11474
 * feat: allow defining virtuals on arrays, not just array elements #14955 #2326
 * feat(model): add applyTimestamps() function to apply all schema timestamps, including subdocuments, to a given POJO #14943 #14698
 * feat(model): add hideIndexes option to syncIndexes() and cleanIndexes() #14987 #14868
 * fix(query): make sanitizeFilter disable implicit $in #14985 #14657
 * fix(model): avoid unhandled error if createIndex() throws a sync error #14995
 * fix(model): avoid throwing TypeError if bulkSave()'s bulkWrite() fails with a non-BulkWriteError #14993
 * types: added toJSON:flattenObjectIds effect #14989
 * types: add `__v` to lean() result type and ModifyResult #14990 #12959
 * types: use globalThis instead of global for NativeDate #14992 #14988
 * docs(change-streams): fix markdown syntax highlighting for script output example #14994

8.7.3 / 2024-10-25
==================
 * fix(cursor): close underlying query cursor when calling destroy() #14982 #14966
 * types: add JSONSerialized helper that can convert HydratedDocument to JSON output type #14981 #14451
 * types(model): convert InsertManyResult to interface and remove unnecessary insertedIds override #14977
 * types(connection): add missing sanitizeFilter option #14975
 * types: improve goto definition for inferred schema definitions #14968 [forivall](https://github.com/forivall)
 * docs(migration-guide-v7): correct link to the section "Id Setter" #14973 [rb-ntnx](https://github.com/rb-ntnx)

8.7.2 / 2024-10-17
==================
 * fix(document): recursively clear modified subpaths when setting deeply nested subdoc to null #14963 #14952
 * fix(populate): handle array of ids with parent refPath #14965
 * types: make Buffers into mongodb.Binary in lean result type to match runtime behavior #14967
 * types: correct schema type inference when using nested typeKey like type: { type: String } #14956 #14950
 * types: re-export DeleteResult and UpdateResult from MongoDB Node.js driver #14947 #14946
 * docs(documents): add section on setting deeply nested properties, including warning about nullish coalescing assignment #14972
 * docs(model): add more info on acknowledged: false, specifically that Mongoose may return that if the update was empty #14957

8.7.1 / 2024-10-09
==================
 * fix: set flattenObjectIds to false when calling toObject() for internal purposes #14938
 * fix: add mongodb 8 to test matrix #14937
 * fix: handle buffers stored in MongoDB as EJSON representation with { $binary } #14932
 * docs: indicate that Mongoose 8.7 is required for full MongoDB 8 support #14937

8.7.0 / 2024-09-27
==================
 * feat(model): add Model.applyVirtuals() to apply virtuals to a POJO #14905 #14818
 * feat: upgrade mongodb -> 6.9.0 #14914
 * feat(query): cast $rename to string #14887 #3027
 * feat(SchemaType): add getEmbeddedSchemaType() method to SchemaTypes #14880 #8389
 * fix(model): throw MongooseBulkSaveIncompleteError if bulkSave() didn't completely succeed #14884 #14763
 * fix(connection): avoid returning readyState = connected if connection state is stale #14812 #14727
 * fix: depopulate if push() or addToSet() with an ObjectId on a populated array #14883 #1635
 * types: make __v a number, only set __v on top-level documents #14892

8.6.4 / 2024-09-26
==================
 * fix(document): avoid massive perf degradation when saving new doc with 10 level deep subdocs #14910 #14897
 * fix(model): skip applying static hooks by default if static name conflicts with aggregate middleware #14904 [dragontaek-lee](https://github.com/dragontaek-lee)
 * fix(model): filter applying static hooks by default if static name conflicts with mongoose middleware #14908 [dragontaek-lee](https://github.com/dragontaek-lee)

7.8.2 / 2024-09-25
==================
 * fix(projection): avoid setting projection to unknown exclusive/inclusive if elemMatch on a Date, ObjectId, etc. #14894 #14893

6.13.3 / 2024-09-23
===================
 * docs(migrating_to_6): document that Lodash _.isEmpty() with ObjectId() as a parameter returns true in Mongoose 6 #11152

8.6.3 / 2024-09-17
==================
 * fix: make getters convert uuid to string when calling toObject() and toJSON() #14890 #14869
 * fix: fix missing Aggregate re-exports for ESM #14886 [wongsean](https://github.com/wongsean)
 * types(document): add generic param to depopulate() to allow updating properties #14891 #14876

6.13.2 / 2024-09-12
===================
 * fix(document): make set() respect merge option on deeply nested objects #14870 #14878

8.6.2 / 2024-09-11
==================
 * fix: make set merge deeply nested objects #14870 #14861 [ianHeydoc](https://github.com/ianHeydoc)
 * types: allow arbitrary keys in query filters again (revert #14764) #14874 #14863 #14862 #14842
 * types: make SchemaType static setters property accessible in TypeScript #14881 #14879
 * type(inferrawdoctype): infer Date types as JS dates rather than Mongoose SchemaType Date #14882 #14839

8.6.1 / 2024-09-03
==================
 * fix(document): avoid unnecessary clone() in applyGetters() that was preventing getters from running on 3-level deep subdocuments #14844 #14840 #14835
 * fix(model): throw error if bulkSave() did not insert or update any documents #14837 #14763
 * fix(cursor): throw error in ChangeStream constructor if changeStreamThunk() throws a sync error #14846
 * types(query): add $expr to RootQuerySelector #14845
 * docs: update populate.md to fix missing match: { } #14847 [makhoulshbeeb](https://github.com/makhoulshbeeb)

8.6.0 / 2024-08-28
==================
 * feat: upgrade mongodb -> 6.8.0, handle throwing error on closed cursor in Mongoose with `MongooseError` instead of `MongoCursorExhaustedError` #14813
 * feat(model+query): support options parameter for distinct() #14772 #8006
 * feat(QueryCursor): add getDriverCursor() function that returns the raw driver cursor #14745
 * types: change query selector to disallow unknown top-level keys by default #14764 [alex-statsig](https://github.com/alex-statsig)
 * types: make toObject() and toJSON() not generic by default to avoid type widening #14819 #12883
 * types: avoid automatically inferring lean result type when assigning to explicitly typed variable #14734

8.5.5 / 2024-08-28
==================
 * fix(populate): fix a couple of other places where Mongoose gets the document's _id with getters #14833 #14827 #14759
 * fix(discriminator): shallow clone Schema.prototype.obj before merging schemas to avoid modifying original obj #14821
 * types: fix schema type based on timestamps schema options value #14829 #14825 [ark23CIS](https://github.com/ark23CIS)

8.5.4 / 2024-08-23
==================
 * fix: add empty string check for collection name passed #14806 [Shubham2552](https://github.com/Shubham2552)
 * docs(model): add 'throw' as valid strict value for bulkWrite() and add some more clarification on throwOnValidationError #14809

7.8.1 / 2024-08-19
==================
 * fix(query): handle casting $switch in $expr #14761
 * docs(mongoose): remove out-of-date callback-based example for mongoose.connect() #14811 #14810

8.5.3 / 2024-08-13
==================
 * fix(document): call required functions on subdocuments underneath nested paths with correct context #14801 #14788
 * fix(populate): avoid throwing error when no result and `lean()` set #14799 #14794 #14759 [MohOraby](https://github.com/MohOraby)
 * fix(document): apply virtuals to subdocuments if parent schema has virtuals: true for backwards compatibility #14774 #14771 #14623 #14394
 * types: make HydratedSingleSubdocument and HydratedArraySubdocument merge types instead of using & #14800 #14793
 * types: support schema type inference based on schema options timestamps as well #14773 #13215 [ark23CIS](https://github.com/ark23CIS)
 * types(cursor): indicate that cursor.next() can return null #14798 #14787
 * types: allow mongoose.connection.db to be undefined #14797 #14789
 * docs: add schema type widening advice #14790 [JstnMcBrd](https://github.com/JstnMcBrd)

8.5.2 / 2024-07-30
==================
 * perf(clone): avoid further unnecessary checks if cloning a primitive value #14762 #14394
 * fix: allow setting document array default to null #14769 #14717 #6691
 * fix(model): support session: null option for save() to opt out of automatic session option with transactionAsyncLocalStorage #14744 #14736
 * fix(model+document): avoid depopulating manually populated doc as getter value #14760 #14759
 * fix: correct shardkey access in buildBulkWriteOps #14753 #14752 [adf0nt3s](https://github.com/adf0nt3s)
 * fix(query): handle casting $switch in $expr #14755 #14751
 * types: allow calling SchemaType.cast() without parent and init parameters #14756 #14748 #9076
 * docs: fix a wrong example in v6 migration guide #14758 [abdelrahman-elkady](https://github.com/abdelrahman-elkady)

7.8.0 / 2024-07-23
==================
 * feat: add transactionAsyncLocalStorage option to opt in to automatically setting session on all transactions #14744 #14742 #14583 #13889
 * types(query): fix usage of "RawDocType" where "DocType" should be passed #14737 [hasezoey](https://github.com/hasezoey)

8.5.1 / 2024-07-12
==================
 * perf(model): performance improvements for insertMany() #14724
 * fix(model): avoid leaving subdoc defaults on top-level doc when setting subdocument to same value #14728 #14722
 * fix(model): handle transactionAsyncLocalStorage option with insertMany() #14743
 * types: make _id required on Document type #14735 #14660
 * types: fix ChangeStream.close to return a Promise<void> like the driver #14740 [orgads](https://github.com/orgads)

8.5.0 / 2024-07-08
==================
 * perf: memoize toJSON / toObject default options #14672
 * feat(document): add $createModifiedPathsSnapshot(), $restoreModifiedPathsSnapshot(), $clearModifiedPaths() #14699 #14268
 * feat(query): make sanitizeProjection prevent projecting in paths deselected in the schema #14691
 * feat: allow setting array default value to null #14717 #6691
 * feat(mongoose): allow drivers to set global plugins #14682
 * feat(connection): bubble up monitorCommands events to Mongoose connection if monitorCommands option set #14681 #14611
 * fix(document): ensure post('deleteOne') hooks are called when calling save() after subdoc.deleteOne() #14732 #9885
 * fix(query): remove count() and findOneAndRemove() from query chaining #14692 #14689
 * fix: remove default connection if setting createInitialConnection to false after Mongoose instance created #14679 #8302
 * types(models+query): infer return type from schema for 1-level deep nested paths #14632
 * types(connection): make transaction() return type match the executor function #14661 #14656
 * docs: fix docs links in index.md [mirasayon](https://github.com/mirasayon)

8.4.5 / 2024-07-05
==================
 * types: correct this for validate.validator schematype option #14720 #14696
 * docs(model): note that insertMany() with lean skips applying defaults #14723 #14698

8.4.4 / 2024-06-25
==================
 * perf: avoid unnecesary get() call and use faster approach for converting to string #14673 #14394
 * fix(projection): handle projections on arrays in Model.hydrate() projection option #14686 #14680
 * fix(document): avoid passing validateModifiedOnly to subdocs so subdocs get fully validating if they're directly modified #14685 #14677
 * fix: handle casting primitive array with $elemMatch in bulkWrite() #14687 #14678
 * fix(query): cast $pull using embedded discriminator schema when discriminator key is set in filter #14676 #14675
 * types(connection): fix return type of withSession() #14690 [tt-public](https://github.com/tt-public)
 * types: add $documents pipeline stage and fix $unionWith type #14666 [nick-statsig](https://github.com/nick-statsig)
 * docs(findoneandupdate): improve example that shows findOneAndUpdate() returning doc before updates were applied #14671 #14670

7.7.0 / 2024-06-18
==================
 * feat(model): add throwOnValidationError option for opting into getting MongooseBulkWriteError if all valid operations succeed in bulkWrite() and insertMany() #14599 #14587 #14572 #13410

8.4.3 / 2024-06-17
==================
 * fix: remove 0x flamegraph files from release

8.4.2 / 2024-06-17
==================
 * perf: more toObject() perf improvements #14623 #14606 #14394
 * fix(model): check the value of overwriteModels in options when calling discriminator() #14646 [uditha-g](https://github.com/uditha-g)
 * fix: avoid throwing TypeError when deleting an null entry on a populated Map #14654 [futurliberta](https://github.com/futurliberta)
 * fix(connection): fix up some inconsistencies in operation-end event and add to docs #14659 #14648
 * types: avoid inferring Boolean, Buffer, ObjectId as Date in schema definitions under certain circumstances #14667 #14630
 * docs: add note about parallelism in transations #14647 [fiws](https://github.com/fiws)

6.13.1 / 2024-09-06
===================
 * fix: remove empty $and, $or, $not that were made empty by scrict mode #14749 #13086 [0x0a0d](https://github.com/0x0a0d)

6.13.0 / 2024-06-06
===================
 * feat(model): add throwOnValidationError option for opting into getting MongooseBulkWriteError if all valid operations succeed in bulkWrite() and insertMany() #14599 #14587 #14572 #13410

7.6.13 / 2024-06-05
===================
 * fix(query): shallow clone $or and $and array elements to avoid mutating query filter arguments #14614 #14610
 * types: pass DocType down to subdocuments so HydratedSingleSubdocument and HydratedArraySubdocument toObject() returns correct type #14612 #14601
 * docs(migrating_to_7): add id setter to Mongoose 7 migration guide #14645 #13672

8.4.1 / 2024-05-31
==================
 * fix: pass options to clone instead of get in applyVirtuals #14606 #14543 [andrews05](https://github.com/andrews05)
 * fix(document): fire pre validate hooks on 5 level deep single nested subdoc when modifying after save() #14604 #14591
 * fix: ensure buildBulkWriteOperations target shard if shardKey is set #14622 #14621 [matlpriceshape](https://github.com/matlpriceshape)
 * types: pass DocType down to subdocuments so HydratedSingleSubdocument and HydratedArraySubdocument toObject() returns correct type #14612 #14601

6.12.9 / 2024-05-24
===================
 * fix(cast): cast $comment to string in query filters #14590 #14576
 * types(model): allow passing strict type checking override to create() #14571 #14548

7.6.12 / 2024-05-21
===================
 * fix(array): avoid converting to $set when calling pull() on an element in the middle of the array #14531 #14502
 * fix: bump mongodb driver to 5.9.2 #14561 [lorand-horvath](https://github.com/lorand-horvath)
 * fix(update): cast array of strings underneath doc array with array filters #14605 #14595

8.4.0 / 2024-05-17
==================
 * feat: upgrade mongodb -> 6.6.2 #14584
 * feat: add transactionAsyncLocalStorage option to opt in to automatically setting session on all transactions #14583 #13889
 * feat: handle initially null driver when instantiating Mongoose for Rollup support #14577 #12335
 * feat(mongoose): export omitUndefined() helper #14582 #14569
 * feat: add Model.listSearchIndexes() #14519 #14450
 * feat(connection): add listDatabases() function #14506 #9048
 * feat(schema): add schema-level readConcern option to apply default readConcern for all queries #14579 #14511
 * fix(error): remove model property from CastError to avoid printing all model properties to console #14568 #14529
 * fix(model): make bulkWrite() and insertMany() throw if throwOnValidationError set and all ops invalid #14587 #14572
 * fix(document): ensure transform function passed to toObject() options applies to subdocs #14600 #14589
 * types: add inferRawDocType helper #13900 #13772
 * types(document): make document _id type default to unknown instead of any #14541

8.3.5 / 2024-05-15
==================
 * fix(query): shallow clone $or, $and if merging onto empty query filter #14580 #14567
 * types(model+query): pass TInstanceMethods to QueryWithHelpers so populated docs have methods #14581 #14574
 * docs(typescript): clarify that setting THydratedDocumentType on schemas is necessary for correct method context #14575 #14573

8.3.4 / 2024-05-06
==================
 * perf(document): avoid cloning options using spread operator for perf reasons #14565 #14394
 * fix(query): apply translateAliases before casting to avoid strictMode error when using aliases #14562 #14521
 * fix(model): consistent top-level timestamps option for bulkWrite operations
#14546 #14536
 * docs(connections): improve description of connection creation patterns #14564 #14528

8.3.3 / 2024-04-29
==================
 * perf(document): add fast path for applying non-nested virtuals to JSON #14543
 * fix: make hydrate() recursively hydrate virtual populate docs if hydratedPopulatedDocs is set #14533 #14503
 * fix: improve timestamps option handling in bulkWrite #14546 #14536 [sderrow](https://github.com/sderrow)
 * fix(model): make recompileSchema() overwrite existing document array discriminators #14527
 * types(schema): correctly infer Array<Schema.Types.*> #14534 #14367
 * types(query+populate): apply populate overrides to doc toObject() result #14525 #14441
 * types: add null to select override return type for findOne #14545 [sderrow](https://github.com/sderrow)

8.3.2 / 2024-04-16
==================
 * fix(populate): avoid match function filtering out null values in populate result #14518 #14494
 * types(query): make FilterQuery props resolve to any for generics support #14510 #14473 #14459
 * types(DocumentArray): pass DocType generic to Document for correct toJSON() and toObject() return types #14526 #14469
 * types(models): fix incorrect bulk write options #14513 [emiljanitzek](https://github.com/emiljanitzek)
 * docs: add documentation for calling schema.post() with async function #14514 #14305

7.6.11 / 2024-04-11
===================
 * fix(populate): avoid match function filtering out null values in populate result #14518
 * fix(schema): support setting discriminator options in Schema.prototype.discriminator() #14493 #14448
 * fix(schema): deduplicate idGetter so creating multiple models with same schema doesn't result in multiple id getters #14492 #14457

6.12.8 / 2024-04-10
===================
 * fix(document): handle virtuals that are stored as objects but getter returns string with toJSON #14468 #14446
 * fix(schematype): consistently set wasPopulated to object with `value` property rather than boolean #14418
 * docs(model): add extra note about lean option for insertMany() skipping casting #14415 #14376

8.3.1 / 2024-04-08
==================
 * fix(document): make update minimization unset property rather than setting to null #14504 #14445
 * fix(model): make Model.recompileSchema() also re-apply discriminators #14500 #14444
 * fix(schema): deduplicate idGetter so creating multiple models with same schema doesn't result in multiple id getters #14492
 * fix: update kareem -> 2.6.3 for index.d.ts #14508 #14497
 * fix(mongoose): make setDriver() update mongoose.model() connections and collections #14505
 * types(validation): support function for validator message property, and add support for accessing validator reason #14499 #14496
 * docs: remove typo #14501 [epmartini](https://github.com/epmartini)

8.3.0 / 2024-04-03
==================
 * feat: use mongodb@6.5.0
 * feat(document): add validateAllPaths option to validate() and validateSync() #14467 #14414
 * feat: pathsToSave option to save() function #14385 #9583
 * feat(query): add options parameter to Query.prototype.sort() #14375 #14365
 * feat: add function SchemaType.prototype.validateAll #14434 #6910
 * fix: handle array schema definitions with of keyword #14447 #14416
 * types: add overwriteMiddlewareResult and skipMiddlewareFunction to types #14328 #14829

8.2.4 / 2024-03-28
==================
 * types(query): bring "getFilter" and "getQuery" in-line with "find" and other types #14463 [hasezoey](https://github.com/hasezoey)
 * types(schema): re-export the defintion for SearchIndexDescription #14464 [noseworthy](https://github.com/noseworthy)
 * docs: removed unused hook from docs #14461 [bernardarhia](https://github.com/bernardarhia)

8.2.3 / 2024-03-21
==================
 * fix(schema): avoid returning string 'nested' as schematype #14453 #14443 #14435
 * types(schema): add missing search index types #14449 [noseworthy](https://github.com/noseworthy)
 * types: improve the typing of FilterQuery<T> type to prevent it from only getting typed to any #14436 #14398 #14397

8.2.2 / 2024-03-15
==================
 * fix(model): improve update minimizing to only minimize top-level properties in the update #14437 #14420 #13782
 * fix: add Null check in case schema.options['type'][0] is undefined #14431 [Atharv-Bobde](https://github.com/Atharv-Bobde)
 * types: consistently infer array of objects in schema as a DocumentArray #14430 #14367
 * types: add TypeScript interface for the new PipelineStage - Vector Search - solving issue #14428 #14429 [jkorach](https://github.com/jkorach)
 * types: add pre and post function types on Query class #14433 #14432 [IICarst](https://github.com/IICarst)
 * types(model): make bulkWrite() types more flexible to account for casting #14423
 * docs: update version support documentation for mongoose 5 & 6 #14427 [hasezoey](https://github.com/hasezoey)

7.6.10 / 2024-03-13
===================
 * docs(model): add extra note about lean option for insertMany() skipping casting #14415
 * docs(mongoose): add options.overwriteModel details to mongoose.model() docs #14422

8.2.1 / 2024-03-04
==================
 * fix(document): make $clone avoid converting subdocs into POJOs #14395 #14353
 * fix(connection): avoid unhandled error on createConnection() if on('error') handler registered #14390 #14377
 * fix(schema): avoid applying default write concern to operations that are in a transaction #14391 #11382
 * types(querycursor): correct cursor async iterator type with populate() support #14384 #14374
 * types: missing typescript details on options params of updateMany, updateOne, etc. #14382 #14379 #14378 [FaizBShah](https://github.com/FaizBShah) [sderrow](https://github.com/sderrow)
 * types: allow Record<string, string> as valid query select argument #14371 [sderrow](https://github.com/sderrow)

6.12.7 / 2024-03-01
===================
 * perf(model): make insertMany() lean option skip hydrating Mongoose docs #14376 #14372
 * perf(document+schema): small optimizations to make init() faster #14383 #14113
 * fix(connection): don't modify passed options object to `openUri()` #14370 #13376 #13335
 * fix(ChangeStream): bubble up resumeTokenChanged changeStream event #14355 #14349 [3150](https://github.com/3150)

7.6.9 / 2024-02-26
==================
 * fix(document): handle embedded recursive discriminators on nested path defined using Schema.prototype.discriminator #14256 #14245
 * types(model): correct return type for findByIdAndDelete() #14233 #14190
 * docs(connections): add note about using asPromise() with createConnection() for error handling #14364 #14266
 * docs(model+query+findoneandupdate): add more details about overwriteDiscriminatorKey option to docs #14264 #14246

8.2.0 / 2024-02-22
==================
 * feat(model): add recompileSchema() function to models to allow applying schema changes after compiling #14306 #14296
 * feat: add middleware for bulkWrite() and createCollection() #14358 #14263 #7893
 * feat(model): add `hydratedPopulatedDocs` option to make hydrate recursively hydrate populated docs #14352 #4727
 * feat(connection): add withSession helper #14339 #14330

8.1.3 / 2024-02-16
==================
 * fix: avoid corrupting $set-ed arrays when transaction error occurs #14346 #14340
 * fix(populate): handle ref() functions that return a model instance #14343 #14249
 * fix: insert version key when using insertMany even if `toObject.versionKey` set to false #14344
 * fix(cursor): make aggregation cursor support transform option to match query cursor #14348 #14331
 * docs(document): clarify that transform function option applies to subdocs #13757

8.1.2 / 2024-02-08
==================
 * fix: include virtuals in document array toString() output if toObject.virtuals set #14335 #14315
 * fix(document): handle setting nested path to spread doc with extra properties #14287 #14269
 * fix(populate): call setter on virtual populated path with populated doc instead of undefined #14314
 * fix(QueryCursor): remove callback parameter of AggregationCursor and QueryCursor #14299 [DevooKim](https://github.com/DevooKim)
 * types: add typescript support for arbitrary fields for the options parameter of Model functions which are of type MongooseQueryOptions #14342 #14341 [FaizBShah](https://github.com/FaizBShah)
 * types(model): correct return type for findOneAndUpdate with includeResultMetadata and lean set #14336 #14303
 * types(connection): add type definition for `createCollections()` #14295 #14279
 * docs(timestamps): clarify that replaceOne() and findOneAndReplace() overwrite timestamps #14337 #14309

8.1.1 / 2024-01-24
==================
 * fix(model): throw readable error when calling Model() with a string instead of model() #14288 #14281
 * fix(document): handle setting nested path to spread doc with extra properties #14287 #14269
 * types(query): add back context and setDefaultsOnInsert as Mongoose-specific query options #14284 #14282
 * types(query): add missing runValidators back to MongooseQueryOptions #14278 #14275

6.12.6 / 2024-01-22
===================
 * fix(collection): correctly handle buffer timeouts with find() #14277
 * fix(document): allow calling push() with different $position arguments #14254

8.1.0 / 2024-01-16
==================
 * feat: upgrade MongoDB driver -> 6.3.0 #14241 #14189 #14108 #14104
 * feat: add Atlas search index helpers to Models and Schemas #14251 #14232
 * feat(connection): add listCollections() helper to connections #14257
 * feat(schematype): merge rather than overwrite default schematype validators #14124 #14070
 * feat(types): support type hints in InferSchemaType #14008 [JavaScriptBach](https://github.com/JavaScriptBach)

8.0.4 / 2024-01-08
==================
 * fix(update): set CastError path to full path if casting update fails #14161 #14114
 * fix: cast error when there is an elemMatch in the and clause #14171 [tosaka-n](https://github.com/tosaka-n)
 * fix: allow defining index on base model that applies to all discriminators #14176 [peplin](https://github.com/peplin)
 * fix(model): deep clone bulkWrite() updateOne arguments to avoid mutating documents in update #14197 #14164
 * fix(populate): handle deselecting _id with array of fields in populate() #14242 #14231
 * types(model+query): use stricter typings for updateX(), replaceOne(),deleteX() Model functions #14228 #14204
 * types: fix return types for findByIdAndDelete overrides #14196 #14190
 * types(schema): add missing omit() method #14235 [amitbeck](https://github.com/amitbeck)
 * types(model): add missing strict property to bulkWrite() top level options #14239
 * docs(compatibility): add note that Mongoose 5.13 is fully compatible with MongoDB server 5 #14230 #14149
 * docs: add shared schemas guide #14211
 * docs: update TLS/SSL guide for Mongoose v8 - MongoDB v6 driver deprecations #14170 [andylwelch](https://github.com/andylwelch)
 * docs: update findOneAndUpdate tutorial to use includeResultMetadata #14208 #14207
 * docs: clarify disabling _id on subdocs #14195 #14194

7.6.8 / 2024-01-08
==================
 * perf(schema): remove unnecessary lookahead in numeric subpath check
 * fix(discriminator): handle reusing schema with embedded discriminators defined using Schema.prototype.discriminator #14202 #14162
 * fix(ChangeStream): avoid suppressing errors in closed change stream #14206 #14177

6.12.5 / 2024-01-03
===================
 * perf(schema): remove unnecessary lookahead in numeric subpath check
 * fix(document): allow setting nested path to null #14226
 * fix(document): avoid flattening dotted paths in mixed path underneath nested path #14198 #14178
 * fix: add ignoreAtomics option to isModified() for better backwards compatibility with Mongoose 5 #14213

6.12.4 / 2023-12-27
===================
 * fix: upgrade mongodb driver -> 4.17.2
 * fix(document): avoid treating nested projection as inclusive when applying defaults #14173 #14115
 * fix: account for null values when assigning isNew property #14172 #13883

8.0.3 / 2023-12-07
==================
 * fix(schema): avoid creating unnecessary clone of schematype in nested array so nested document arrays use correct constructor #14128 #14101
 * docs(connections): add example of registering connection event handlers #14150
 * docs(populate): add example of using `refPath` and `ref` functions #14133 #13834
 * types: handle using BigInt global class in schema definitions #14160 #14147
 * types: make findOneAndDelete() without options return result doc, not ModifyResult #14153 #14130
 * types(model): add no-generic override for insertMany() with options #14152 #13999
 * types: add missing Type for applyDefaults #14159 [jaypea](https://github.com/jaypea)

7.6.7 / 2023-12-06
==================
 * fix: avoid minimizing single nested subdocs if they are required #14151 #14058
 * fix(populate): allow deselecting discriminator key when populating #14155 #3230
 * fix: allow adding discriminators using Schema.prototype.discriminator() to subdocuments after defining parent schema #14131 #14109
 * fix(schema): avoid creating unnecessary clone of schematype in nested array so nested document arrays use correct constructor #14128 #14101
 * fix(populate): call transform object with single id instead of array when populating a justOne path under an array #14135 #14073
 * types: add back mistakenly removed findByIdAndRemove() function signature #14136 #14132

8.0.2 / 2023-11-28
==================
 * fix(populate): set populated docs in correct order when populating virtual underneath doc array with justOne #14105
 * fix(populate): fix curPath to update appropriately #14099 #14098 [csy1204](https://github.com/csy1204)
 * types: make property names show up in intellisense for UpdateQuery #14123 #14090
 * types(document): correct return type for doc.deleteOne() re: Mongoose 8 breaking change #14110 #14081
 * types: correct types for when includeResultMetadata: true is set #14078
 * types(models): allow specifying timestamps as inline option for bulkWrite() operations #14112 #14072
 * docs: fix rendering of 7.x server compatibility #14086 [laupow](https://github.com/laupow)
 * docs(source/api): fix "index.js" -> "mongoose.js" rename #14125
 * docs(README): update breaking change version #14126

7.6.6 / 2023-11-27
==================
 * perf: avoid double-running setter logic when calling `push()` #14120 #11380
 * fix(populate): set populated docs in correct order when populating virtual underneath doc array with justOne #14105 #14018
 * fix: bump mongodb driver -> 5.9.1 #14084 #13829 [lorand-horvath](https://github.com/lorand-horvath)
 * types: allow defining document array using [{ prop: String }] syntax #14095 #13424
 * types: correct types for when includeResultMetadata: true is set #14078 #13987 [prathamVaidya](https://github.com/prathamVaidya)
 * types(query): base filters and projections off of RawDocType instead of DocType so autocomplete doesn't show populate #14118 #14077
 * types: make property names show up in intellisense for UpdateQuery #14123 #14090
 * types(model): support calling Model.validate() with pathsToSkip option #14088 #14003
 * docs: remove "DEPRECATED" warning mistakenly added to read() tags param #13980

8.0.1 / 2023-11-15
==================
 * fix: retain key order with aliases when creating indexes with alias #14042 [meabed](https://github.com/meabed)
 * fix: handle nonexistent collection with diffIndexes #14029 #14010
 * types(model+query): correctly remove count from TypeScript types to reflect removal of runtime support #14076 #14067 #14062
 * types: correct `this` parameter for methods and statics #14028 #14027 [ruxxzebre](https://github.com/ruxxzebre)
 * types(model+query): unpack arrays in distinct return type #14047 #14026
 * types: add missing Types.UUID typings #14023 #13103 [k725](https://github.com/k725)
 * docs: add mongoose 8 to mongodb server compatibility guide #14064
 * docs: fix typo in queries.md #14065 [MuhibAhmed](https://github.com/MuhibAhmed)

7.6.5 / 2023-11-14
==================
 * fix: handle update validators and single nested doc with numeric paths #14066 #13977
 * fix: handle recursive schema array in discriminator definition #14068 #14055
 * fix: diffIndexes treats namespace error as empty #14048 #14029
 * docs(migrating_to_7): add note about requiring new with ObjectId #14021 #14020

6.12.3 / 2023-11-07
===================
 * fix(ChangeStream): correctly handle hydrate option when using change stream as stream instead of iterator #14052
 * fix(schema): fix dangling reference to virtual in tree after `removeVirtual()` #14019 #13085
 * fix(document): avoid unmarking modified on nested path if no initial value stored and already modified #14053 #14024
 * fix(document): consistently avoid marking subpaths of nested paths as modified #14053 #14022

8.0.0 / 2023-10-31
==================
 * docs: add version support notes for Mongoose 8, including EOL date for Mongoose 6

7.6.4 / 2023-10-30
==================
 * fix(connection): retain modified status for documents created outside a transaction during transaction retries #14017 #13973
 * fix(schema): handle recursive schemas in discriminator definitions #14011 #13978
 * fix: handle casting $or underneath $elemMatch #14007 #13974
 * fix(populate): allow using options: { strictPopulate: false } to disable strict populate #13863
 * docs: fix differences between sample codes and documentation #13998 [suzuki](https://github.com/suzuki)
 * docs: fix missing import and change wrong variable name #13992 [suzuki](https://github.com/suzuki)

6.12.2 / 2023-10-25
===================
 * fix: add fullPath to ValidatorProps #13995 [Freezystem](https://github.com/Freezystem)

8.0.0-rc0 / 2023-10-24
======================
 * BREAKING CHANGE: use MongoDB node driver 6, drop support for rawResult option and findOneAndRemove() #13753
 * BREAKING CHANGE: apply minimize by default when updating document #13843
 * BREAKING CHANGE: remove `id` setter #13784
 * BREAKING CHANGE: remove overwrite option for updateOne(), findOneAndUpdate(), etc. #13989 #13578
 * BREAKING CHANGE: make model.prototype.deleteOne() return query, not promise #13660 #13369
 * BREAKING CHANGE: remove `Model.count()`, `Query.prototype.count()` #13618 #13598
 * BREAKING CHANGE: allow null values for string enum #13620 #3044
 * BREAKING CHANGE: make base schema paths come before discriminator schema paths when running setters, validators, etc. #13846 #13794
 * BREAKING CHANGE: make Model.validate() use Model.castObject() to cast, and return casted copy of object instead of modifying in place #13287 #12668
 * BREAKING CHANGE: make internal file names all camelCase #13950 #13909 #13308
 * BREAKING CHANGE: make create() wait for all documents to finish inserting or error out before throwing an error if ordered = false #13621 #4628
 * BREAKING CHANGE: refactor out `mongoose/lib/mongoose.js` file to allow importing Mongoose without MongoDB driver #13905
 * BREAKING CHANGE(types): allow `null` for optional fields #13901
 * BREAKING CHANGE(types): infer return types types for Model.distinct and Query.distinct #13836 [kaulshashank](https://github.com/kaulshashank)

7.6.3 / 2023-10-17
==================
 * fix(populate): handle multiple spaces when specifying paths to populate using space-delimited paths #13984 #13951
 * fix(update): avoid applying defaults on query filter when upserting with empty update #13983 #13962
 * fix(model): add versionKey to bulkWrite when inserting or upserting #13981 #13944
 * docs: fix typo in timestamps docs #13976 [danielcoker](https://github.com/danielcoker)

7.6.2 / 2023-10-13
==================
 * perf: avoid storing a separate entry in schema subpaths for every element in an array #13953 #13874
 * fix(document): avoid triggering setter when initializing Model.prototype.collection to allow defining collection as a schema path name #13968 #13956
 * fix(model): make bulkSave() save changes in discriminator paths if calling bulkSave() on base model #13959 #13907
 * fix(document): allow calling $model() with no args for TypeScript #13963 #13878
 * fix(schema): handle embedded discriminators defined using Schema.prototype.discriminator() #13958 #13898
 * types(model): make InsertManyResult consistent with return type of insertMany #13965 #13904
 * types(models): add cleaner type definitions for insertMany() with no generics to prevent errors when using insertMany() in generic classes #13964 #13957
 * types(schematypes): allow defining map path using type: 'Map' in addition to type: Map #13960 #13755

6.12.1 / 2023-10-12
===================
 * fix(mongoose): correctly handle global applyPluginsToChildSchemas option #13945 #13887 [hasezoey](https://github.com/hasezoey)
 * fix: Document.prototype.isModified support for a string of keys as first parameter #13940 #13674 [k-chop](https://github.com/k-chop)

7.6.1 / 2023-10-09
==================
 * fix: bump bson to match mongodb@5.9.0 exactly #13947 [hasezoey](https://github.com/hasezoey)
 * fix: raw result deprecation message #13954 [simllll](https://github.com/simllll)
 * type: add types for includeResultMetadata #13955 [simllll](https://github.com/simllll)
 * perf(npmignore): ignore newer files #13946 [hasezoey](https://github.com/hasezoey)
 * perf: move mocha config from package.json to mocharc #13948 [hasezoey](https://github.com/hasezoey)

7.6.0 / 2023-10-06
==================
 * feat: upgrade mongodb node driver -> 5.9.0 #13927 #13926 [sanguineti](https://github.com/sanguineti)
 * fix: avoid CastError when passing different value of discriminator key in `$or` #13938 #13906

7.5.4 / 2023-10-04
==================
 * fix: avoid stripping out `id` property when `_id` is set #13933 #13892 #13867
 * fix(QueryCursor): avoid double-applying schema paths so you can include select: false fields with + projection using cursors #13932 #13773
 * fix(query): allow deselecting discriminator key using - syntax #13929 #13760
 * fix(query): handle $round in $expr as array #13928 #13881
 * fix(document): call pre('validate') hooks when modifying a path underneath triply nested subdoc #13912 #13876
 * fix(mongoose): correctly handle global applyPluginsToChildSchemas option #13911 #13887
 * types: add insertMany array overload with options #13931 [t1bb4r](https://github.com/t1bb4r)
 * docs(compatibility): add Mongoose 7 support to compatibility matrix #13875
 * docs: amend some awkward FAQ wording #13925 [peteboere](https://github.com/peteboere)

7.5.3 / 2023-09-25
==================
 * fix(document): handle MongoDB Long when casting BigInts #13869 #13791
 * fix(model): make bulkSave() persist changes that happen in pre('save') middleware #13885 #13799
 * fix: handle casting $elemMatch underneath $not underneath another $elemMatch #13893 #13880
 * fix(model): make bulkWrite casting respect global setDefaultsOnInsert #13870 #13823
 * fix(document): handle default values for discriminator key with embedded discriminators #13891 #13835
 * fix: account for null values when assigning isNew property within document array #13883
 * types: avoid "interface can only extend object types with statically known members" error in TypeScript 4 #13871
 * docs(deprecations): fix typo in includeResultMetadata deprecation docs #13884 #13844
 * docs: fix pre element overflow in home page #13868 [ghoshRitesh12](https://github.com/ghoshRitesh12)

7.5.2 / 2023-09-15
==================
 * fix(schema): handle number discriminator keys when using Schema.prototype.discriminator() #13858 #13788
 * fix: ignore `id` property when calling `set()` with both `id` and `_id` specified to avoid `id` setter overwriting #13762
 * types: pass correct document type to required and default function #13851 #13797
 * docs(model): add examples of using diffIndexes() to syncIndexes()and diffIndexes() api docs #13850 #13771

7.5.1 / 2023-09-11
==================
 * fix: set default value for _update when no update object is provided and versionKey is set to false #13795 #13783 [MohOraby](https://github.com/MohOraby)
 * fix: avoid unexpected error when accessing null array element on discriminator array when populating #13716 [ZSabakh](https://github.com/ZSabakh)
 * types(schematypes): use DocType for instance method this #13822 #13800 [pshaddel](https://github.com/pshaddel)
 * types: remove duplicated 'exists' method in Model interface in models.d.ts #13818 [ohzeno](https://github.com/ohzeno)
 * docs(model): replace outdated docs on deprecated findOneAndUpdate() overwrite option #13821 #13715
 * docs: add example of using `virtuals.pathsToSkip` option for `toObject()` and `toJSON()` #13798 [RobertHunter-Pluto](https://github.com/RobertHunter-Pluto)

7.5.0 / 2023-08-29
==================
 * feat: use mongodb driver v5.18.1
 * feat: allow top level dollar keys with findOneAndUpdate(), update() for MongoDB 5 #13786
 * fix(document): make array getters avoid unintentionally modifying array, defer getters until index access instead #13774
 * feat: deprecate `overwrite` option for findOneAndUpdate() #13578
 * feat: add pathsToSkip option for Model.validate #13663 #10353
 * feat: support alias when declaring index #13659 #13276
 * fix(query): remove unnecessary check for atomic operators in findOneAndReplace() #13678
 * types: add SearchMeta Interface for Atlas Search #13792 [mreouven](https://github.com/mreouven)
 * types(schematypes): add missing BigInt SchemaType #13787

7.4.5 / 2023-08-25
==================
 * fix(debug): avoid putting virtuals and getters in debug output #13778
 * fix(model): make Model.bulkWrite() with empty array and ordered false not throw an error #13664
 * fix(document): correctly handle inclusive/exclusive projections when applying subdocument defaults #13763 #13720

6.12.0 / 2023-08-24
===================
 * feat: use mongodb driver v4.17.1
 * fix(model): make Model.bulkWrite() with empty array and ordered false not throw an error #13664
 * fix(document): correctly handle inclusive/exclusive projections when applying subdocument defaults #13763 #13720

7.4.4 / 2023-08-22
==================
 * fix(connection): reset document state in between transaction retries #13726 #13698
 * fix(cursor): bubble up resumeTokenChanged event from change streams #13736 #13607
 * fix(query+populate): add refPath to projection by default, unless explicitly excluded #13758
 * fix(schema): support 'ascending', 'asc', 'descending', 'desc' for index direction #13761 #13725
 * fix(ChangeStream): add _bindEvents to addListener function for observable support #13759 [yury-ivaniutsenka](https://github.com/yury-ivaniutsenka)
 * types: infer return type when using `get()`, `markModified()`, etc. with known property name literal #13739 [maybesmurf](https://github.com/maybesmurf)
 * types: add missing typings for option includeResultMetadata #13747 #13746 [Idnan](https://github.com/Idnan)
 * types: export InferSchemaType #13737
 * docs(middleware): clarify that query middleware applies to document by default #13734 #13713
 * docs: add brief note on TypeScript generic usage for embedded discriminator path() calls #13728 #10435
 * docs: link v7 migration guide #13742 [Cooldogyum](https://github.com/Cooldogyum)
 * docs(migrating_to_6): add note about incompatible packages #13733

6.11.6 / 2023-08-21
===================
 * fix(model): avoid hanging on empty bulkWrite() with ordered: false #13701 #13684 [JavaScriptBach](https://github.com/JavaScriptBach)
 * types: augment bson.ObjectId instead of adding on own type #13515 #12537 [hasezoey](https://github.com/hasezoey)

7.4.3 / 2023-08-11
==================
 * fix: avoid applying map property getters when saving #13704 #13657
 * fix(query): allow deselecting discriminator key #13722 #13679
 * types(models+query): return lean type when passing QueryOptions with lean: true to relevant model functions like find() and findOne() #13721 #13705
 * types(schema): correct return type for Schema.prototype.indexes() #13718 #13702
 * types: allow accessing options from pre middleware #13708 #13633
 * types: add UpdateQueryKnownOnly type for stricter UpdateQuery type checking #13699 #13630
 * types(schema): support required: { isRequired: true } syntax in schema definition #13680
 * docs(middleware): clarify that doc.deleteOne() doesn't run query middleware currently #13707 #13669

7.4.2 / 2023-08-03
==================
 * fix(model): avoid hanging on empty bulkWrite() with ordered: false #13684 #13664
 * fix: Document.prototype.isModified support for a string of keys as first parameter #13674 #13667 [gastoncasini](https://github.com/gastoncasini)
 * fix: disable id virtual if alias:id set #13654 #13650
 * fix: support timestamps:false on bulkWrite with updateOne and updateMany #13649 #13611
 * docs(typescript): highlight auto type inference for methods and statics, add info on using methods with generics #13696 #12942
 * docs(middleware): fix old example using post('remove') #13683 #13518
 * docs(deprecations): quick fix for includeResultMetadata docs #13695

6.11.5 / 2023-08-01
===================
 * fix(schema): make Schema.prototype.clone() avoid creating different copies of subdocuments and single nested paths underneath single nested paths #13671 #13626
 * fix: custom debug function not processing all args #13418

7.4.1 / 2023-07-24
==================
 * fix(document): correctly clean up nested subdocs modified state on save() #13644 #13609
 * fix(schema): avoid propagating toObject.transform and toJSON.transform option to implicitly created schemas #13634 #13599
 * fix: prevent schema options overwriting user defined writeConcern #13612 #13592
 * types: correctly handle pre('deleteOne', { document: true }) #13632
 * types(schema): handle type: Schema.Types.Map in TypeScript #13628
 * types: Add inline comment to to tell the default value of the runValidator flag in the queryOptions types #13636 [omran95](https://github.com/omran95)
 * docs: rework several code examples that still use callbacks #13635 #13616
 * docs: remove callbacks from validation description #13638 #13501

7.4.0 / 2023-07-18
==================
 * perf: speed up mapOfSubdocs benchmark by 4x by avoiding unnecessary O(n^2) loop in getPathsToValidate() #13614
 * feat: upgrade to MongoDB Node.js driver 5.7.0 #13591
 * BREAKING CHANGE: add `id` setter which allows modifying `_id` by setting `id` (Note this change was originally shipped as a `feat`, but later reverted in Mongoose 8 due to compatibility issues) #13517
 * feat: support generating custom cast error message with a function #13608 #3162
 * feat(query): support MongoDB driver's includeResultMetadata option for findOneAndUpdate #13584 #13539
 * feat(connection): add Connection.prototype.removeDb() for removing a related connection #13580 #11821
 * feat(query): delay converting documents into POJOs until query execution, allow querying subdocuments with defaults disabled #13522
 * feat(model): add option "aggregateErrors" for create() #13544 [hasezoey](https://github.com/hasezoey)
 * feat(schema): add collectionOptions option to schemas #13513
 * fix: move all MongoDB-specific connection logic into driver layer, add createClient() method to handle creating MongoClient #13542
 * fix(document): allow setting keys with dots in mixed paths underneath nested paths #13536
 * types: augment bson.ObjectId instead of adding on own type #13515 #12537 [hasezoey](https://github.com/hasezoey)
 * docs(guide): fix md lint #13593 [hasezoey](https://github.com/hasezoey)
 * docs: changed the code from 'await author.save()' to 'await story1.save()' #13596 [SomSingh23](https://github.com/SomSingh23)

6.11.4 / 2023-07-17
===================
 * perf: speed up mapOfSubdocs benchmark by 4x by avoiding unnecessary O(n^2) loop in getPathsToValidate() #13614

7.3.4 / 2023-07-12
==================
 * chore: release 7.4.4 to overwrite accidental publish of 5.13.20 to latest tag

6.11.3 / 2023-07-11
===================
 * fix: avoid prototype pollution on init
 * fix(schema): correctly handle uuids with populate() #13317 #13595

7.3.3 / 2023-07-10
==================
 * fix: avoid prototype pollution on init
 * fix(document): clean up all array subdocument modified paths on save() #13589 #13582
 * types: avoid unnecessary MergeType<> if TOverrides not set, clean up statics and insertMany() type issues #13577 #13529

7.3.2 / 2023-07-06
==================
 * fix(model): avoid TypeError if insertMany() fails with error that does not have writeErrors property #13579 #13531
 * fix(query): convert findOneAndUpdate to findOneAndReplace when overwrite set for backwards compat with Mongoose 6 #13572 #13550
 * fix(query): throw readable error when executing a Query instance without an associated model #13571 #13570
 * types: support mongoose.Schema.ObjectId as alias for mongoose.Schema.Types.ObjectId #13543 #13534
 * docs(connections): clarify that socketTimeoutMS now defaults to 0 #13576 #13537
 * docs(migrating_to_7): add mapReduce() removal to migration guide #13568 #13548
 * docs(schemas): fix typo in schemas.md #13540 [Metehan-Altuntekin](https://github.com/Metehan-Altuntekin)

7.3.1 / 2023-06-21
==================
 * fix(query): respect query-level strict option on findOneAndReplace() #13516 #13507
 * docs(connections): expand docs on serverSelectionTimeoutMS #13533 #12967
 * docs: add example of accessing save options in pre save #13498
 * docs(connections+faq): add info on localhost vs 127.0.0.1
 * docs(SchemaType): validate members are validator & message (not msg) #13521 [lorand-horvath](https://github.com/lorand-horvath)

7.3.0 / 2023-06-14
==================
 * feat: upgrade mongodb -> 5.6.0 #13455 [lorand-horvath](https://github.com/lorand-horvath)
 * feat(aggregate): add Aggregate.prototype.finally() to be consistent with Promise API for TypeScript #13509
 * feat(schema): support selecting subset of fields to apply optimistic concurrency to #13506 #10591
 * feat(model): add `ordered` option to `Model.create()` #13472 #4038
 * feat(schema): consistently add .get() function to all SchemaType classes
 * feat(populate): pass virtual to match function to allow merging match options #13477 #12443
 * types: allow overwriting Paths in select() to tell TypeScript which fields are projected #13478 #13224
 * types(schema): add validateModifiedOnly as schema option #13503 #10153
 * docs: add note about validateModifiedOnly as a schema option #13503 #10153
 * docs(migrating_to_7): update migrating_to_7.md to include Model.countDocuments #13508 [Climax777](https://github.com/Climax777)
 * docs(further_reading): remove style for "img" [hasezoey](https://github.com/hasezoey)

7.2.4 / 2023-06-12
==================
 * fix(query): handle non-string discriminator key values in query #13496 #13492

7.2.3 / 2023-06-09
==================
 * fix(model): ignore falsy last argument to create() for backwards compatibility #13493 #13491 #13487 [MohOraby](https://github.com/MohOraby)
 * types: remove generic param that's causing issues for typegoose #13494 #13482
 * types(aggregate): allow object syntax for $mergeObjects #13470 #13060
 * docs(connection): clarify how Connection.prototype.destroy() is different from close() #13475
 * docs(populate): fix accidental removal of text #13480
 * docs: add additional notes for Atlas X.509 authentication #13452 [alexbevi](https://github.com/alexbevi)
 * docs(populate): add a little more info on why we recommend using ObjectId for _id #13474 #13400

6.11.2 / 2023-06-08
===================
 * fix(cursor): allow find middleware to modify query cursor options #13476 #13453 #13435

7.2.2 / 2023-05-30
==================
 * fix(schema): make bulkWrite updateOne() and updateMany() respect timestamps option when set by merging schemas #13445
 * fix(schema): recursively copy schemas from different modules when calling new Schema() #13441 #13275
 * fix(update): allow setting paths with dots under non-strict paths #13450 #13434
 * types: improve function parameter types for ToObjectOptions transform option #13446 #13421
 * docs: add nextjs page with link to next starter app and couple FAQs #13444 #13430
 * docs(connections): add section on multi tenant #13449 #11187
 * docs(connection+model): expand docs on accessors for underlying collections #13448 #13334

7.2.1 / 2023-05-24
==================
 * fix(array): track correct changes when setting nested array of primitives #13422 #13372
 * fix(query): handle plus path in projection with findOneAndUpdate() #13437 #13413
 * fix(cursor): handle calling skipMiddlewareFunction() in pre('find') middleware with cursors #13436 #13411
 * fix(model): include inspect output in castBulkWrite() error #13426
 * fix: avoid setting null property when updating using update pipeline with child timestamps but no top-level timestamps #13427 #13379
 * docs: remove callback based examples #13433 #13401
 * docs(connections): add details about keepAlive deprecation #13431
 * docs: add list of supported patterns for error message templating #13425 #13311

7.2.0 / 2023-05-19
==================
 * feat: upgrade mongodb -> 5.5.0
 * feat(document): add flattenObjectIds option to toObject() and toJSON() #13383 #13341
 * feat(query): add translateAliases option to automatically call translate aliases on query fields #13397 #8678 #7511
 * feat(schema): propagate toObject and toJSON options to implicitly created schemas #13325
 * feat(model): add throwOnValidationError option for opting into getting MongooseBulkWriteError if all valid operations succeed in bulkWrite() and insertMany() #13410 #13256
 * feat(types+mongoose): export MongooseError #13403 #13387 [ramos-ph](https://github.com/ramos-ph)

7.1.2 / 2023-05-18
==================
 * fix: set timestamps on single nested subdoc in insertMany() #13416 #13343
 * fix: mention model name in missing virtual option in getModelsMapForPopulate #13408 #13406 [hasezoey](https://github.com/hasezoey)
 * fix: custom debug function not processing all args #13418 #13364
 * docs: add virtuals schema options #13407 [hasezoey](https://github.com/hasezoey)
 * docs: clarify `JSON.stringify()` virtuals docs #13273 [iatenine](https://github.com/iatenine)

7.1.1 / 2023-05-10
==================
 * fix(document): handle set() from top-level underneath a map of mixed #13386
 * fix: don't modify passed options object to `createConnection()` #13376
 * types: make lean() not clobber result type for updateOne(), etc. #13389 #13382
 * types: handle union types in FlattenMaps #13368 #13346 [Jokero](https://github.com/Jokero)
 * types(document): correct return type for Model.prototype.deleteOne(): promise, not query #13367 #13223
 * types: update document.d.ts $set function params to match set #13304 [jeffersonlipsky](https://github.com/jeffersonlipsky)
 * docs: add excludeIndexes to the guide schema options list #13377 #13287
 * docs: fix broken "fork me" on home page #13336

6.11.1 / 2023-05-08
===================
 * fix(query): apply schema-level paths before calculating projection for findOneAndUpdate() #13348 #13340
 * fix: add SUPPRESS_JEST_WARNINGS environment variable to hide jest warnings #13384 #13373
 * types(model): allow overwriting expected param type for bulkWrite() #13292 [hasezoey](https://github.com/hasezoey)

6.11.0 / 2023-05-01
===================
 * feat: upgrade to mongodb 4.16.0 for Deno+Atlas connection fix #13337 #13075
 * perf: speed up creating maps of subdocuments #13280 #13191 #13271
 * fix(query): set ObjectParameterError if calling findOneAndX() with filter as non-object #13338
 * fix(document): merge Document $inc calls instead of overwriting #13322
 * fix(update): handle casting doubly nested arrays with $pullAll #13285
 * docs: backport documentation versioning changes to 6.x #13253 #13190 [hasezoey](https://github.com/hasezoey)

7.1.0 / 2023-04-27
==================
 * feat: upgrade mongodb -> 5.3.0
 * feat(schema): add BigInt support, upgrade mongodb -> 5.3.0 #13318 #13081 #6936
 * feat: handle MongoDB's new UUID type, export mongoose.Types.UUID #13323 #13103
 * feat: implement createCollections() #13324
 * feat(query): add isPathSelectedInclusive function on query #13177
 * types: added overloads for Schema.pre/post with different values for SchemaPreOptions #12680 [jpilgrim](https://github.com/jpilgrim)
 * types(query): make lean() flatten out inferred maps into Record<string, V> #13326 #13010
 * docs: update README deno url #13332
 * docs: update jsdoc to use full URLs instead of non-prefix absolute urls (also fix some urls) #13328 [hasezoey](https://github.com/hasezoey)
 * docs: reload api js files on change #13313 [hasezoey](https://github.com/hasezoey)
 * docs: update website sidebar to be better use-able #13321 [hasezoey](https://github.com/hasezoey)
 * docs: fix schematype @see links #13310 [hasezoey](https://github.com/hasezoey)
 * docs(subdocuments): remove callback usage, use deleteOne() rather than remove() re: #13284 #13316

7.0.5 / 2023-04-24
==================
 * fix(schema): correctly handle uuids with populate() #13317 #13267
 * fix(schema): add clusteredIndex to schema options #13286 [jakesjews](https://github.com/jakesjews)
 * fix(document): use collection.findOne() for saving docs with no changes to avoid firing findOne middleware #13298
 * types(schema): avoid circular constraint in TSchemaOptions with --incremental by deferring ResolveSchemaOptions<> #13291 #13129
 * docs(subdocs): fix mention of subdocument ".remove" function #13312 [hasezoey](https://github.com/hasezoey)
 * docs: add mongoose.Promise removal to migrating to 7 guide #13295
 * docs: updated formatting of Error Handling section to better highlight the two kinds of possible errors #13279 [Ankit-Mandal](https://github.com/Ankit-Mandal)
 * docs: fix broken link #13301 #13281

7.0.4 / 2023-04-17
==================
 * fix(schema): fix dangling reference to virtual in tree after removeVirtual() #13255 #13085
 * fix(query): cast query filters on `findOneAndUpdate()` #13220 #13219 [dermasmid](https://github.com/dermasmid)
 * types(model): aligned watch() type for mongodb 4.6.0 #13208 #13206
 * docs: fix async function anchors #13226 [hasezoey](https://github.com/hasezoey)
 * docs: fix schema syntax in exemple #13262 [c-marc](https://github.com/c-marc)
 * docs: rework scripts to allow easier setting of current and past versions #13222
#13148 [hasezoey](https://github.com/hasezoey)

6.10.5 / 2023-04-06
===================
 * perf(document): avoid unnecessary loops, conditionals, string manipulation on Document.prototype.get() for 10x speedup on top-level properties #12953
 * fix(model): execute valid write operations if calling bulkWrite() with ordered: false #13218 #13176
 * fix(array): pass-through all parameters #13202 #13201 [hasezoey](https://github.com/hasezoey)
 * fix: improve error message when sorting by empty string #13249 #10182
 * docs: add version support and check version docs #13251 #13193

5.13.17 / 2023-04-04
====================
 * fix: backport fix for array filters handling $or and $and #13195 #13192 #10696 [raj-goguardian](https://github.com/raj-goguardian)
 * fix: update the isIndexEqual function to take into account non-text indexes when checking compound indexes that include both text and non-text indexes #13138 #13136 [rdeavila94](https://github.com/rdeavila94)

7.0.3 / 2023-03-23
==================
 * fix(query): avoid executing transforms if query wasn't executed #13185 #13165
 * fix(schema): make creating top-level virtual underneath subdocument equivalent to creating virtual on the subdocument #13197 #13189
 * fix(timestamps): set timestamps on empty replaceOne() #13196 #13170
 * fix(types): change return type of lean() to include null if nullable #13155 #13151 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(types): fixed type of DocumentArray constructor parameter #13183 #13087 [lpizzinidev](https://github.com/lpizzinidev)
 * docs: refactor header naming to lessen conflicts #12901 [hasezoey](https://github.com/hasezoey)
 * docs: change header levels to be consistent across files #13173 [hasezoey](https://github.com/hasezoey)

6.10.4 / 2023-03-21
===================
 * fix(document): apply setters on resulting value when calling Document.prototype.$inc() #13178 #13158
 * fix(model): add results property to unordered insertMany() to make it easy to identify exactly which documents were inserted #13163 #12791
 * docs(guide+schematypes): add UUID to schematypes guide #13184

7.0.2 / 2023-03-15
==================
 * fix: validate array elements when passing array path to validateSync() in pathsToValidate #13167 #13159
 * fix(schema): propagate typeKey down to implicitly created subdocuments #13164 #13154
 * fix(types): add index param to eachAsync fn #13153 [krosenk729](https://github.com/krosenk729)
 * fix(types/documentarray): type DocumentArray constructor parameter as object #13089 #13087 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(types): type query `select()` as string, string[], or record; not `any` #13146 #13142 [rbereziuk](https://github.com/rbereziuk)
 * fix(types/query): change QueryOptions lean type to Record<string, any> #13150 [lpizzinidev](https://github.com/lpizzinidev)
 * docs: add and run eslint-plugin-markdown #13156 [hasezoey](https://github.com/hasezoey)
 * docs(generateSearch): fix search generation for API #13161 [hasezoey](https://github.com/hasezoey)
 * docs(generateSearch): move config missing error to require #13160 [hasezoey](https://github.com/hasezoey)
 * chore: remove unused docs libraries #13172 [hasezoey](https://github.com/hasezoey)

6.10.3 / 2023-03-13
===================
 * fix(connection): add stub implementation of doClose to base connection class #13157
 * fix(types): add cursor.eachAsync index parameter #13162 #13153 [hasezoey](https://github.com/hasezoey)
 * docs: fix 6.x docs sidebar links #13147 #13144 [hasezoey](https://github.com/hasezoey)
 * docs(validation): clarify that validation runs as first pre(save) middleware #13062

6.10.2 / 2023-03-07
===================
 * fix(document): avoid setting array default if document array projected out by sibling projection #13135 #13043 #13003
 * fix(documentarray): set correct document array path if making map of document arrays #13133
 * fix: undo accidental change to `engines` in `package.json` #13124 [lorand-horvath](https://github.com/lorand-horvath)
 * docs: quick improvement to Model.init() docs #13054

7.0.1 / 2023-03-06
==================
 * fix(aggregate): added await to prevent exception in aggregate exec #13126 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(types): handle Record<string, never> as value for HydratedDocument TOverrides parameter #13123 #13094
 * fix(types): remove "update" function #13120 [hasezoey](https://github.com/hasezoey)
 * docs(compatibility): added mongoDB server compatibility for mongoose 7 #13102 [lpizzinidev](https://github.com/lpizzinidev)
 * docs: Updated callback method for Model.findOne() #13096 [Arghyahub](https://github.com/Arghyahub)
 * chore: update github actions to not use ubuntu-18.04 anymore #13137 [hasezoey](https://github.com/hasezoey)

6.10.1 / 2023-03-03
===================
 * fix: avoid removing empty query filters in `$and` and `$or` #13086 #12898
 * fix(schematype): fixed validation for required UUID field #13018 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(types): add missing Paths generic param to `Model.populate()` #13070
 * docs(migrating_to_6): added info about removal of reconnectTries and reconnectInterval options #13083 [lpizzinidev](https://github.com/lpizzinidev)
 * docs: fix code in headers for migrating_to_5 #13077 [hasezoey](https://github.com/hasezoey)
 * docs: backport misc documentation changes into 6.x #13091 [hasezoey](https://github.com/hasezoey)

7.0.0 / 2023-02-27
==================
 * BREAKING CHANGE: copy schema options when merging schemas using new Schema() or Schema.prototype.add() #13092
 * feat(types): export mongodb types more robustly #12948 [simon-abbott](https://github.com/simon-abbott)
 * docs: fix populate docs #13090 [hasezoey](https://github.com/hasezoey)
 * docs(migrating_to_6): added info about removal of reconnectTries and reconnectInterval options #13083 [lpizzinidev](https://github.com/lpizzinidev)

7.0.0-rc0 / 2023-02-23
======================
 * BREAKING CHANGE: remove support for callbacks #11431
 * BREAKING CHANGE: upgrade to MongoDB node driver 5.x, bson 5.x #12955
 * BREAKING CHANGE: make `strictQuery: false` by default #11861 #11807 #11514
 * BREAKING CHANGE: remove support for setting schema path definitions to primitives, except `_id: false` #12832 #7558 [lpizzinidev](https://github.com/lpizzinidev)
 * BREAKING CHANGE: discriminator schemas now inherit base schema options by default #12928 #12135
 * BREAKING CHANGE: orFail() now throws on updateOne() and updateMany() if matchedCount === 0, not modifiedCount === 0 #11620
 * BREAKING CHANGE: remove support for custom promise libraries #12878 #12872 [lpizzinidev](https://github.com/lpizzinidev)
 * BREAKING CHANGE: select('name -path') behaves as select('name') if path has schema-level select: true #11694
 * BREAKING CHANGE(types): remove support for document interfaces that extends Document #11615
 * BREAKING CHANGE: pluralize 'human' as 'humans', not 'humen' #13037
 * BREAKING CHANGE: renamed schema option supressReservedKeysWarning -> suppressReservedKeysWarning #11495
 * BREAKING CHANGE: remove unused DisconnectedError #13028 [lpizzinidev](https://github.com/lpizzinidev)
 * BREAKING CHANGE: remove unsupported query options maxScan and snapshot #13023 #13022 [hasezoey](https://github.com/hasezoey)

6.10.0 / 2023-02-22
===================
 * feat: upgrade to mongodb driver 4.14.0 #13036
 * feat: added Schema.prototype.omit() function #12939 #12931 [lpizzinidev](https://github.com/lpizzinidev)
 * feat(index): added createInitialConnection option to Mongoose constructor #13021 #12965 [lpizzinidev](https://github.com/lpizzinidev)

6.9.3 / 2023-02-22
==================
 * fix(connection): delay calculating `autoCreate` and `autoIndex` until after initial connection established #13007 #12940 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(discriminator): allows update doc with discriminatorKey #13056 #13055 [abarriel](https://github.com/abarriel)
 * fix(query): avoid sending unnecessary empty projection to MongoDB server #13059 #13050
 * fix(model): avoid sending null session option with document operations #13053 #13052 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(types): use MergeTypes for type overrides in HydratedDocument #13066 #13040
 * docs(middleware): list validate as a potential query middleware #13057 #12680
 * docs(getters-setters): explain that getters do not run by default on toJSON() #13058 #13049
 * docs: refactor docs generation scripts #13044 [hasezoey](https://github.com/hasezoey)

5.13.16 / 2023-02-20
====================
 * fix: make access to process.versions lazy #12584 [maciasello](https://github.com/maciasello)
 * fix(types): add missing type definitions for `bulkSave()` #12019
 * docs: backport documentation URL updates #12692 [hasezoey](https://github.com/hasezoey)

6.9.2 / 2023-02-16
==================
 * fix(model): fixed post('save') callback parameter #13030 #13026 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(UUID): added null check to prevent error on binaryToString conversion #13034 #13032 #13029 [lpizzinidev](https://github.com/lpizzinidev) [Freezystem](https://github.com/Freezystem)
 * fix(query): revert breaking changes introduced by #12797 #12999 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(document): make array $shift() use $pop instead of overwriting array #13004
 * docs: update & remove old links #13019 [hasezoey](https://github.com/hasezoey)
 * docs(middleware): describe how to access model from document middleware #13031 [AxeOfMen](https://github.com/AxeOfMen)
 * docs: update broken & outdated links #13001 [hasezoey](https://github.com/hasezoey)
 * chore: change deno tests to also use MMS #12918 [hasezoey](https://github.com/hasezoey)

6.9.1 / 2023-02-06
==================
 * fix(document): isModified should not be triggered when setting a nested boolean to the same value as previously #12994 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(document): save newly set defaults underneath single nested subdocuments #13002 #12905
 * fix(update): handle custom discriminator model name when casting update #12947 [wassil](https://github.com/wassil)
 * fix(connection): handles unique autoincrement ID for connections #12990 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(types): fix type of options of Model.aggregate #12933 [ghost91-](https://github.com/ghost91-)
 * fix(types): fix "near" aggregation operator input type #12954 [Jokero](https://github.com/Jokero)
 * fix(types): add missing Top operator to AccumulatorOperator type declaration #12952 [lpizzinidev](https://github.com/lpizzinidev)
 * docs(transactions): added example for Connection.transaction() method #12943 #12934 [lpizzinidev](https://github.com/lpizzinidev)
 * docs(populate): fix out of date comment referencing onModel property #13000
 * docs(transactions): fix typo in transactions.md #12995 [Parth86](https://github.com/Parth86)

6.9.0 / 2023-01-25
==================
 * feat(schema): add removeVirtual(path) function to schema #12920 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(cast): remove empty `$or` conditions after strict applied #12898 [0x0a0d](https://github.com/0x0a0d)
 * docs: fixed typo #12946 [Gbengstar](https://github.com/Gbengstar)

6.8.5 / 2023-01-23
==================
 * fix(query): correctly pass context when casting $elemMatch #12915 #12909 #12902 [MohOraby](https://github.com/MohOraby)

6.8.4 / 2023-01-17
==================
 * fix(collection): handle creating model when connection disconnected with bufferCommands = false #12889
 * fix(populate): merge instead of overwrite when match is on _id #12891
 * fix: add guard to stop loadClass copying Document if Document is used as base of loaded class (same hack as implemented for Model already) #12820 [sgpinkus](https://github.com/sgpinkus)
 * fix(types): correctly infer types on document arrays #12884 #12882 [JavaScriptBach](https://github.com/JavaScriptBach)
 * fix(types): added omit for ArraySubdocument type in LeanType declaration #12903 [piyushk96](https://github.com/piyushk96)
 * fix(types): add returnDocument type safety #12906 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs(typescript): add notes about virtual context to Mongoose 6 migration and TypeScript virtuals docs #12912 #12806
 * docs(schematypes): removed dead link and fixed formatting #12897 #12885 [lpizzinidev](https://github.com/lpizzinidev)
 * docs: fix link to lean api #12910 [manniL](https://github.com/manniL)
 * docs: list all possible strings for schema.pre in one place #12868
 * docs: add list of known incompatible npm packages #12892 [IslandRhythms](https://github.com/IslandRhythms)

6.8.3 / 2023-01-06
==================
 * perf: improve performance of assignRawDocsToIdStructure for faster populate on large docs #12867 [Uzlopak](https://github.com/Uzlopak)
 * fix(model): ensure consistent ordering of validation errors in insertMany() with ordered: false and rawResult: true #12866
 * fix: avoid passing final callback to pre hook, because calling the callback can mess up hook execution #12836
 * fix(types): avoid inferring timestamps if methods, virtuals, or statics set #12871
 * fix(types): correctly infer string enums on const arrays #12870 [JavaScriptBach](https://github.com/JavaScriptBach)
 * fix(types): allow virtuals to be invoked in the definition of other virtuals #12874 [sffc](https://github.com/sffc)
 * fix(types): add type def for Aggregate#model without arguments #12864 [hasezoey](https://github.com/hasezoey)
 * docs(discriminators): add section about changing discriminator key #12861
 * docs(typescript): explain that virtuals inferred from schema only show up on Model, not raw document type #12860 #12684

6.8.2 / 2022-12-28
==================
 * fix(schema): propagate strictQuery to implicitly created schemas for embedded discriminators #12827 #12796
 * fix(model): respect discriminators with Model.validate() #12824 #12621
 * fix(query): fix unexpected validation error when doing findOneAndReplace() with a nullish value #12826 #12821
 * fix(discriminator): apply built-in plugins to discriminator schema even if mergeHooks and mergePlugins are both false #12833 #12696
 * fix(types): add option "overwriteModels" as a schema option #12817 #12816 [hasezoey](https://github.com/hasezoey)
 * fix(types): add property "defaultOptions" #12818 [hasezoey](https://github.com/hasezoey)
 * docs: make search bar respect documentation version, so you can search 5.x docs #12548
 * docs(typescript): make note about recommending strict mode when using auto typed schemas #12825 #12420
 * docs: add section on sorting to query docs #12588 [IslandRhythms](https://github.com/IslandRhythms)
 * test(query.test): add write-concern option #12829 [hasezoey](https://github.com/hasezoey)

6.8.1 / 2022-12-19
==================
 * fix(query): avoid throwing circular dependency error if same object is used in multiple properties #12774 [orgads](https://github.com/orgads)
 * fix(map): return value from super.delete() #12777 [danbrud](https://github.com/danbrud)
 * fix(populate): handle virtual populate underneath document array with justOne=true and sort set where 1 element has only 1 result #12815 #12730
 * fix(update): handle embedded discriminators when casting array filters #12802 #12565
 * fix(populate): avoid calling transform if there's no populate results and using lean #12804 #12739
 * fix(model): prevent index creation on syncIndexes if not necessary #12785 #12250 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(types): correctly infer this when using pre('updateOne') with { document: true, query: false } #12778
 * fix(types): make InferSchemaType: consider { required: boolean } required if it isn't explicitly false #12784 [JavaScriptBach](https://github.com/JavaScriptBach)
 * docs: replace many occurrences of "localhost" with "127.0.0.1" #12811 #12741 [hasezoey](https://github.com/hasezoey) [SadiqOnGithub](https://github.com/SadiqOnGithub)
 * docs(mongoose): Added missing options to set #12810 [lpizzinidev](https://github.com/lpizzinidev)
 * docs: add info on `$locals` parameters to getters/setters tutorial #12814 #12550 [IslandRhythms](https://github.com/IslandRhythms)
 * docs: make Document.prototype.$clone() public #12803
 * docs(query): updated explanation for slice #12776 #12474 [lpizzinidev](https://github.com/lpizzinidev)
 * docs(middleware): fix broken links #12787 [lpizzinidev](https://github.com/lpizzinidev)
 * docs(queries): fixed broken links #12790 [lpizzinidev](https://github.com/lpizzinidev)

6.8.0 / 2022-12-05
==================
 * feat: add alpha support for Deno #12397 #9056
 * feat: add deprecation warning for default strictQuery #12666
 * feat: upgrade to MongoDB driver 4.12.1
 * feat(schema): add doc as second params to validation message function #12564 #12651 [IslandRhythms](https://github.com/IslandRhythms)
 * feat(document): add $clone method #12549 #11849 [lpizzinidev](https://github.com/lpizzinidev)
 * feat(populate): allow overriding `localField` and `foreignField` for virtual populate #12657 #6963 [IslandRhythms](https://github.com/IslandRhythms)
 * feat(schema+types): add { errorHandler: true } option to Schema post() for better TypeScript support #12723 #12583
 * feat(debug): allow setting debug on a per-connection basis #12704 #12700 [lpizzinidev](https://github.com/lpizzinidev)
 * feat: add rewind function to QueryCursor #12710 [passabilities](https://github.com/passabilities)
 * feat(types): infer timestamps option from schema #12731 #12069
 * docs: change links to not link to api.html anymore #12644 [hasezoey](https://github.com/hasezoey)

6.7.5 / 2022-11-30
==================
 * fix(schema): copy indexes when calling add() with schema instance #12737 #12654
 * fix(query): handle deselecting _id when another field has schema-level select: false #12736 #12670
 * fix(types): support using UpdateQuery in bulkWrite() #12742 #12595
 * docs(middleware): added note about execution policy on subdocuments #12735 #12694 [lpizzinidev](https://github.com/lpizzinidev)
 * docs(validation): clarify context for update validators in validation docs #12738 #12655 [IslandRhythms](https://github.com/IslandRhythms)

6.7.4 / 2022-11-28
==================
 * fix: allow setting global strictQuery after Schema creation #12717 #12703 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(cursor): make eachAsync() avoid modifying batch when mixing parallel and batchSize #12716
 * fix(types): infer virtuals in query results #12727 #12702 #12684
 * fix(types): correctly infer ReadonlyArray types in schema definitions #12720
 * fix(types): avoid typeof Query with generics for TypeScript 4.6 support #12712 #12688
 * chore: avoid bundling .tgz files when publishing #12725 [hasezoey](https://github.com/hasezoey)

6.7.3 / 2022-11-22
==================
 * fix(document): handle setting array to itself after saving and pushing a new value #12672 #12656
 * fix(types): update replaceWith pipeline stage #12715 [coyotte508](https://github.com/coyotte508)
 * fix(types): remove incorrect modelName type definition #12682 #12669 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(schema): fix setupTimestamps for browser.umd #12683 [raphael-papazikas](https://github.com/raphael-papazikas)
 * docs: correct justOne description #12686 #12599 [tianguangcn](https://github.com/tianguangcn)
 * docs: make links more consistent #12690 #12645 [hasezoey](https://github.com/hasezoey)
 * docs(document): explain that $isNew is false in post('save') hooks #12685 #11990
 * docs: fixed line causing a "used before defined" linting error #12707 [sgpinkus](https://github.com/sgpinkus)

6.7.2 / 2022-11-07
==================
 * fix(discriminator): skip copying base schema plugins if `applyPlugins == false` #12613 #12604 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(types): add UUID to types #12650 #12593
 * fix(types): allow setting SchemaTypeOptions' index property to IndexOptions #12562
 * fix(types): set this to doc type in SchemaType.prototype.validate() #12663 #12590
 * fix(types): correct handling for model<any> #12659 #12573
 * fix(types): pre hook with deleteOne should resolve this as Query #12642 #12622 [lpizzinidev](https://github.com/lpizzinidev)

6.7.1 / 2022-11-02
==================
 * fix(query): select Map field with select: false when explicitly requested #12616 #12603 [lpizzinidev](https://github.com/lpizzinidev)
 * fix: correctly find paths underneath single nested document with an array of mixed #12605 #12530
 * fix(populate): better support for populating maps of arrays of refs #12601 #12494
 * fix(types): add missing create constructor signature override type #12585 [naorpeled](https://github.com/naorpeled)
 * fix(types): make array paths optional in inferred type of array default returns undefined #12649 #12420
 * fix(types): improve ValidateOpts type #12606 [Freezystem](https://github.com/Freezystem)
 * docs: add Lodash guide highlighting issues with cloneDeep() #12609
 * docs: removed v5 link from v6 docs #12641 #12624 [lpizzinidev](https://github.com/lpizzinidev)
 * docs: removed outdated connection example #12618 [lpizzinidev](https://github.com/lpizzinidev)

6.7.0 / 2022-10-24
==================
 * feat: upgrade to mongodb driver 4.11.0 #12446
 * feat: add UUID Schema Type (BSON Buffer SubType 4) #12268 #3208 [hasezoey](https://github.com/hasezoey)
 * feat(aggregation): add $fill pipeline stage #12545 [raphael-papazikas](https://github.com/raphael-papazikas)
 * feat(types+schema): allow defining schema paths using mongoose.Types.* to work around TS type inference issues #12352
 * feat(schema): add alias() method that makes it easier to define multiple aliases for a given path #12368
 * feat(model): add mergeHooks option to Model.discriminator() to avoid duplicate hooks #12542
 * feat(document): add $timestamps() method to set timestamps for save(), bulkSave(), and insertMany() #12540

6.6.7 / 2022-10-21
==================
 * fix: correct browser build and improve isAsyncFunction check for browser #12577 #12576 #12392
 * fix(query): allow overwriting discriminator key with overwriteDiscriminatorKey if strict: 'throw' #12578 #12513

6.6.6 / 2022-10-20
==================
 * fix(update): handle runValidators when using $set on a doc array in discriminator schema #12571 #12518
 * fix(document): allow creating document with document array and top-level key named schema #12569 #12480
 * fix(cast): make schema-level strictQuery override schema-level strict for query filters #12570 #12508
 * fix(aggregate): avoid adding extra $match stage if user manually set discriminator key to correct value in first pipeline stage #12568 #12478
 * fix: Throws error when updating a key name that match the discriminator key name on nested object #12534 #12517 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(types): add limit to $filter expression #12553 [raphael-papazikas](https://github.com/raphael-papazikas)
 * fix(types): correct replaceWith type pipeline stage #12535 [FabioCingottini](https://github.com/FabioCingottini)
 * fix(types): add missing densify type pipeline type #12533 [FabioCingottini](https://github.com/FabioCingottini)
 * docs(populate): added transform option description #12560 #12551 [lpizzinidev](https://github.com/lpizzinidev)
 * docs(connection): add sample to useDb() documentation #12541 [lpizzinidev](https://github.com/lpizzinidev)
 * docs(guide): update broken read-preference links #12538 #12525 [hasezoey](https://github.com/hasezoey)
 * chore: add TypeScript version field to issue template #12532 [hasezoey](https://github.com/hasezoey)

6.6.5 / 2022-10-05
==================
 * fix(document): set defaults on subdocuments underneath init-ed single nested subdocument #12523 #12515
 * fix: make Jest fake timers check more robust to other libs that overwrite time functions #12527 #12514
 * fix(types): indicate that Schema.prototype.discriminator() returns this #12522 #12457
 * fix(types): add "estimatedDocumentCount" and "countDocuments" as possible hooks #12519 #12516
 * docs(models): add section on MongoDB Views #12526 #5694
 * docs(subdocs): clarify that populated docs are not subdocs #12521 #12398
 * docs(change-streams): remove unnecessary obsolete comment about needing to use mongodb driver change streams #12444

6.6.4 / 2022-10-03
==================
 * fix(model): avoid saving applied defaults if path is deselected #12506 #12414
 * fix(types): correct DocType for auto typed query helpers #12342
 * fix(types): avoid "excessively deep" type instantiation error when using bulkWrite() with type that extends from document #12277
 * fix(types): avoid relying on typeof this, which isn't supported in TypeScript < 4.4 #12375
 * docs(schema): correct example for Schema.prototype.discriminator() #12493
 * docs(typescript): clean up query helpers examples #12342
 * chore: use mongodb-memory-server for testing #12262 [hasezoey](https://github.com/hasezoey)

6.6.3 / 2022-09-30
==================
 * fix(query): treat findOne(_id) as equivalent to findOne({ _id }) #12485 #12325
 * fix(timestamps): findOneAndUpdate creates subdocs with timestamps in reverse order #12484 #12475 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(types): make schema.plugin() more flexible for schemas that don't define any generics #12486 #12454
 * fix(types): add "array of array key-value pairs" as a argument option for "query.sort()" #12483 #12434 [hasezoey](https://github.com/hasezoey)
 * fix(types): remove unused defaults in "PluginFunction" #12459 [hasezoey](https://github.com/hasezoey)
 * fix(types): update DiscriminatorSchema to have better names and combine statics #12460 [hasezoey](https://github.com/hasezoey)

6.6.2 / 2022-09-26
==================
 * fix(model): avoid deleting shared schema methods in fix for #12254 #12423
 * fix(document): set $inc default value in case field has not been specified on the document #12435 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(query): handle `select: false` on map paths in query results #12467 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(types): add HydratedDocumentFromSchema to make it easier to pull inferred hydrated doc type #12464 #12319
 * fix(types): add sanitizeFilter to types #12465 [zrosenbauer](https://github.com/zrosenbauer)
 * fix(types): infer number enum types from schema if using enum: [0, 1] as const #12463 #12242
 * docs(validation): add section on global schematype validation, clean up other issues #12430
 * docs: add clarification about overwrite flag in model.js #12447 [Tzvika-m](https://github.com/Tzvika-m)
 * docs: change to consistent "Example:" for jsdoc comments #12432 [hasezoey](https://github.com/hasezoey)

6.6.1 / 2022-09-14
==================
 * fix: correctly apply defaults after subdoc init #12328
 * fix(array): avoid using default _id when using pull() #12294
 * fix: allow null values inside $expr objects #12429 [MartinDrost](https://github.com/MartinDrost)
 * fix(query): use correct Query constructor when cloning query #12418
 * docs(website): remove setting "latest38x" which is not used anywhere #12396 [hasezoey](https://github.com/hasezoey)

6.6.0 / 2022-09-08
==================
 * feat: upgrade mongodb driver -> 4.9.1 #12370 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * feat: re-export default Mongoose instance properties for ESM named imports support #12256
 * feat(model): add option to skip invalid fields with castObject() #12156 [IslandRhythms](https://github.com/IslandRhythms)
 * feat: use setPrototypeOf() instead of __proto__ to allow running on Deno #12315
 * feat(QueryCursor): add support for AbortSignal on eachAsync() #12323
 * feat(types): add types for new $densify operator #12118 [IslandRhythms](https://github.com/IslandRhythms)

6.5.5 / 2022-09-07
==================
 * fix(setDefaultsOnInsert): avoid applying defaults on insert if nested property set #12279
 * fix(model): make applyHooks() and applyMethods() handle case where custom method is set to Mongoose implementation #12254
 * fix(types): add string "ascending" and "descending" index-directions #10269
 * docs: upgrade dox to 1.0.0 #12403 [hasezoey](https://github.com/hasezoey)
 * docs: update old mongodb nodejs driver documentation urls #12387 [hasezoey](https://github.com/hasezoey)
 * docs: update JSDOC ... (spread) definition #12388 [hasezoey](https://github.com/hasezoey)
 * refactor(model): allow optionally passing indexes to createIndexes and cleanIndexes #12280 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)

6.5.4 / 2022-08-30
==================
 * fix(document): allow calling $assertPopulated() with values to better support manual population #12233
 * fix(connection+mongoose): better handling for calling model() with 1 argument #12359
 * fix(model): allow defining discriminator virtuals and methods using schema options #12326
 * fix(types): fix MongooseQueryMiddleware missing "findOneAndReplace" and "replaceOne" #12330 #12329 [Jule-](https://github.com/Jule-) [lpizzinidev](https://github.com/lpizzinidev)
 * fix(types): fix replaceOne return type #12351 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(types): use this for return type from $assertPopulated() #12234
 * docs: highlight how to connect using auth in README #12354 [AntonyOnScript](https://github.com/AntonyOnScript)
 * docs: improve jsdoc comments for private methods #12337 [hasezoey](https://github.com/hasezoey)
 * docs: fix minor typo in compatibility table header #12355 [skyme5](https://github.com/skyme5)

6.5.3 / 2022-08-24
==================
 * fix(document): handle maps when applying defaults to nested paths #12322
 * fix(schema): make ArraySubdocuments apply _id defaults on init #12264
 * fix(populate): handle specifying recursive populate as a string with discriminators #12266
 * perf(types): remove extends Query in Schema.pre() and Schema.post(), loosen `discriminator()` generic #10349
 * perf(types): some more micro-optimizations re: #10349, remove extra type checking on $ne, etc.
 * fix(types): infer schema on `connection.model()` #12298 #12125 [hasezoey](https://github.com/hasezoey)
 * fix(types): add missing `findById()` type definitions #12309 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(types): allow $search in $lookup pipeline stages for MongoDB v6.x support #12278 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(types): add parameter "options" to "Model.remove" #12258 [hasezoey](https://github.com/hasezoey)
 * fix(types): sync single-generic-no-constraint "model" between "index.d.ts" and "connection.d.ts" #12299 [hasezoey](https://github.com/hasezoey)
 * fix(types): update isDirectModified typing #12290 [gabrielDonnantuoni](https://github.com/gabrielDonnantuoni)
 * docs: update links on api docs #12293 [eatmoarrice](https://github.com/eatmoarrice)
 * docs: add note about language_override option #12310 [IslandRhythms](https://github.com/IslandRhythms)
 * docs(document): add "String[]" to Document.depopulate as jsdoc parameter type #12300 [hasezoey](https://github.com/hasezoey)
 * docs: update Node.js EventEmitter url #12303 [rainrisa](https://github.com/rainrisa)

5.13.15 / 2022-08-22
====================
 * fix: backport fix for CVE-2022-2564 #12281 [shubanker](https://github.com/shubanker)
 * docs: fix broken link from findandmodify method deprecation #11366 [laissonsilveira](https://github.com/laissonsilveira)

6.5.2 / 2022-08-09
==================
 * fix(aggregate): avoid throwing error when disconnecting with change stream open #12201 [ramos-ph](https://github.com/ramos-ph)
 * fix(query): overwrite top-level key if using Query.prototype.set() to set to undefined #12155
 * fix(query): shallow clone options before modifying #12176
 * fix(types): auto schema type inference on `Connection.prototype.model()` #12240 [hasezoey](https://github.com/hasezoey)
 * fix(types): better typescript support for schema plugins #12139 [emiljanitzek](https://github.com/emiljanitzek)
 * fix(types): make bulkWrite() type param optional #12221 #12212
 * docs: misc cleanup #12199 [hasezoey](https://github.com/hasezoey)
 * docs: highlight current top-most visible header in navbar #12222 [hasezoey](https://github.com/hasezoey)
 * docs(populate): improve examples for Document.prototype.populate() #12111
 * docs(middleware): clarify document vs model in middleware docs #12113

6.5.1 / 2022-08-03
==================
 * fix(timestamps): set timestamps on child schema when child schema has timestamps: true but parent schema does not #12119
 * fix(schema+timestamps): handle insertMany() with timestamps and discriminators #12150
 * fix(model+query): handle populate with lean transform that deletes _id #12143
 * fix(types): allow $pull with _id #12142
 * fix(types): add schema plugin option inference #12196 [hasezoey](https://github.com/hasezoey)
 * fix(types): pass type to mongodb bulk write operation #12167 [emiljanitzek](https://github.com/emiljanitzek)
 * fix(types): map correct generics from model to schema #12125 [emiljanitzek](https://github.com/emiljanitzek)
 * fix(types): avoid baffling circular reference when using PopulatedDoc with a bidirectional reference #12136
 * fix(types): allow using path with $count #12149
 * docs(compatibility): change to use a table #12200 [hasezoey](https://github.com/hasezoey)
 * docs(api_split.pug): add "code" to sidebar entries #12153 [hasezoey](https://github.com/hasezoey)
 * docs: add "code" to Headers (and index list) #12152 [hasezoey](https://github.com/hasezoey)

6.5.0 / 2022-07-26
==================
 * perf(document): avoid creating unnecessary empty objects when creating a state machine #11988
 * feat: upgrade mongodb driver -> 4.8.1 #12103 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * feat(model): allow passing timestamps option to Model.bulkSave(...) #12082 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * feat(model): add castObject() function that casts a POJO to the model's schema #11945
 * feat(document): add $inc() helper that increments numeric paths #12115
 * feat(schema): add schema level lean option [IslandRhythms](https://github.com/IslandRhythms)
 * feat(schema): add global id option to disable id on schemas #12067 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(connection): re-run Model.init() if re-connecting after explicitly closing a connection #12130
 * feat(model): add applyDefaults() helper that allows applying defaults to document or POJO #11945
 * feat(model): allow calling hydrate() with { setters: true } #11653
 * feat(model): add hydrate option to Model.watch() to automatically hydrate fullDocument #12121
 * feat(types): add support for automatically typed virtuals in schemas #11908 [mohammad0-0ahmad](https://github.com/mohammad0-0ahmad)

6.4.7 / 2022-07-25
==================
 * fix(virtualtype): use $locals for default virtual getter/setter rather than top-level doc #12124
 * fix(document): call subdocument getters if child schema has getters: true #12105
 * fix(schematype): actually always return "this" where specified #12141 [hasezoey](https://github.com/hasezoey)
 * fix(types): correct return value for Model.exists() #12094
 * docs(guides): add link to advanced schemas doc #12073
 * docs: handle @see in jsdoc #12144 [hasezoey](https://github.com/hasezoey)
 * docs: make use of the deprecated tag available in jsdoc for documentation #12080 [hasezoey](https://github.com/hasezoey)
 * docs(api_split): add basic DEPRECATED output #12146 [hasezoey](https://github.com/hasezoey)
 * docs: various jsdoc cleanup #12140 [hasezoey](https://github.com/hasezoey)
 * docs(api_split.pug): add "code" to parameter name #12145 [hasezoey](https://github.com/hasezoey)

6.4.6 / 2022-07-20
==================
 * fix(schema): disallow setting __proto__ when creating schema with dotted properties #12085
 * fix(document): avoid mutating original object passed to $set() when applying defaults to nested properties #12102
 * fix(query): apply lean transform option to top-level document #12093
 * docs(migrating_to_6): correct example for `isObjectIdOrHexString()` #12123 [LokeshKanumoori](https://github.com/LokeshKanumoori)

6.4.5 / 2022-07-18
==================
 * fix(model+timestamps): set timestamps on subdocuments in insertMany() #12060
 * fix: correct isAtlas check #12110 [skrtheboss](https://github.com/skrtheboss)
 * fix(types): fix various issues with auto typed schemas #12042 [mohammad0-0ahmad](https://github.com/mohammad0-0ahmad)
 * fix(types): allow any value for AddFields #12096
 * fix(types): allow arbitrary expressions for ConcatArrays #12058
 * fix(types): make $addToSet fields mutable to allow programatically constructing $addToSet #12091
 * fix(types): add $let as a possible expression to $addFields #12087 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(types): fix $switch expression type #12088 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(types): correct options type for syncIndexes() #12101 [lpizzinidev](https://github.com/lpizzinidev)
 * fix(types): avoid treating | undefined types as any in `Require_id` to better support `_id: String` with auto-typed schemas #12070
 * docs: fix up various jsdoc issues #12086 [hasezoey](https://github.com/hasezoey)
 * docs: add sanitizeFilter to mongoose.set() options #12112 [pathei-kosmos](https://github.com/pathei-kosmos)

6.4.4 / 2022-07-08
==================
 * fix(types): allow using an object to configure timestamps #12061 [lantw44](https://github.com/lantw44)
 * fix(types): support findOneAndReplace with rawResult #12062 [lantw44](https://github.com/lantw44)
 * docs: upgrade API documentation parser #12078 #12072 #12071 #12024 [hasezoey](https://github.com/hasezoey)
 * docs(document): add more info on $isNew #11990
 * docs: add SchemaType doValidate() to docs #12068

6.4.3 / 2022-07-05
==================
 * fix(document): handle validating deeply nested subdocuments underneath nested paths with required: false #12021
 * fix(types): infer schematype type from schema paths when calling `SchemaType.path()` #11987
 * fix(types): add $top and $topN aggregation operators #12053
 * fix(types): clean up a couple of issues with $add and $ifNull #12017
 * fix(types): allow $cond with $in #12028
 * docs: add path level descending index example in docs #12023 [MitchellCash](https://github.com/MitchellCash)
 * docs: add Buffer, Decimal128, Map to docs #11971

6.4.2 / 2022-07-01
==================
 * fix: keep autoIndex & autoCreate as true by default if read preference is primaryPreferred #11976
 * fix(types): improve inferred Schema Type to handle nested paths and ObjectIds #12007 [iammola](https://github.com/iammola)
 * fix(types): avoid inferring doc type from param to create() #12001
 * fix(types): make populate Paths generic consistently overwrite doc interface #11955
 * fix(types): allow null at ne expression second parameter #11996 [jyeros](https://github.com/jyeros)
 * fix(types): change index "weights" to be more explicit #11997 [hasezoey](https://github.com/hasezoey)

6.4.1 / 2022-06-27
==================
 * fix(schema): allow 0 for numbers if required and ref both set #11912
 * fix(query): skip applying default projections over slice projections #11940
 * fix(types): handle arrays in ApplyBasicQueryCasting correctly #11964
 * fix(types): fix $match typings #11969 [andreialecu](https://github.com/andreialecu)
 * fix(types): avoid adding non-existent properties from model constructor for typegoose #11960
 * fix(types): make Mongoose UpdateQuery compatible with MongoDB `UpdateFilter` #11911
 * fix(types): simplify MergeType constraints #11978
 * fix(types): correct references to Buffer for @types/node >= 16.0.0 < 16.6.0 #11963
 * fix(types): re-add the possibility to pass undefined for projection in Model.find #11965 [ghost91-](https://github.com/ghost91-)
 * fix(types): fix typo for indexes #11953 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(document+types): document merge option #11913
 * docs: update schematypes.md #11981 [korzio](https://github.com/korzio)
 * docs: update validation.md #11982 [korzio](https://github.com/korzio)

6.4.0 / 2022-06-17
==================
 * feat: upgrade mongodb driver -> 4.7.0 #11909 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * feat(types+document): add $assertPopulated() for working with manually populated paths in TypeScript #11843
 * feat(mongoose): add setDriver() function to allow overwriting driver in a more consistent way #11900
 * feat(types): add helpers to infer schema type automatically #11563 [mohammad0-0ahmad](https://github.com/mohammad0-0ahmad)
 * feat: add `transform` option to `lean()` #10423 [IslandRhythms](https://github.com/IslandRhythms)
 * feat(base): add support to set default immutable for createdAt globally #11888 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix: make doValidate() on document array elements run validation on the whole subdoc #11902
 * feat(types): add expression typings to Aggregate stages #11370 [Uzlopak](https://github.com/Uzlopak)
 * fix: remove `on` from schema reserved keys #11580 [IslandRhythms](https://github.com/IslandRhythms)

6.3.9 / 2022-06-17
==================
 * fix(document): handle nested paths underneath subdocuments when getting all subdocuments for pre save hooks #11917
 * fix(types): correct typing in post aggregate hooks #11924 [GCastilho](https://github.com/GCastilho)
 * docs: remove connect-option reconnectTries and reconnectInterval #11930 [Uzlopak](https://github.com/Uzlopak)

6.3.8 / 2022-06-13
==================
 * fix: revert 670b445b0fc perf optimizations that caused some test failures #11541

6.3.7 / 2022-06-13
==================
 * fix(schema+document): allow disabling _id on subdocuments by default #11541
 * fix(update): respect global strictQuery option when casting array filters #11836
 * perf(document): avoid unnecessarily creating new options object on every `$set` #11541
 * fix: toJSON with undefined path #11922 [kerryChen95](https://github.com/kerryChen95)
 * fix: add refPath to SchemaTypeOptions class #11862
 * fix(types): handle boolean default functions #11828
 * docs(populate): make path names in refPath section consistent #11724

6.3.6 / 2022-06-07
==================
 * fix(update): apply timestamps to nested subdocs within $push and $addToSet #11775
 * fix(document): use shallow clone instead of deep clone for `toObject()` options #11776
 * fix: avoid checking for ObjectId with instanceof #11891 [noseworthy](https://github.com/noseworthy)
 * fix(types): Allow sorting by text score #11893
 * fix(types): allow schematype get() functions to return undefined #11561
 * fix(types): add Schema.discriminator #11855 [Uzlopak](https://github.com/Uzlopak)
 * fix(types): discriminator generic type not being passed to schema #11898 [GCastilho](https://github.com/GCastilho)

6.3.5 / 2022-05-30
==================
 * fix(document): avoid infinite recursion when calling toObject() on self-referencing document #11756
 * fix(document): avoid manually populating documents that are manually populated in another doc with different unpopulatedValue #11442
 * fix(document): fix ObjectId conversion for external schemas #11841 [coyotte508](https://github.com/coyotte508)
 * fix: fix codeql warnings #11817 [Uzlopak](https://github.com/Uzlopak)
 * fix(types): allow passing TVirtuals to Schema class #11543
 * fix(types): Type of Connection.transaction() #11825 [dwrss](https://github.com/dwrss)
 * docs(typescript): add coverage for TypeScript query helpers #11709
 * docs: fix documention of error handling #11844 [Uzlopak](https://github.com/Uzlopak)
 * docs: typings mongoose.Error should reference to MongooseError #11850 [Uzlopak](https://github.com/Uzlopak)
 * chore: improve issue templates #11794 [Uzlopak](https://github.com/Uzlopak)
 * chore: use ts-benchmark instead of internal TS benchmarking #11798 [mohammad0-0ahmad](https://github.com/mohammad0-0ahmad)

6.3.4 / 2022-05-19
==================
 * fix(schema): disallow using schemas with schema-level projection with map subdocuments #11698
 * fix(document): avoid setting nested paths to null when they're undefined #11723
 * fix: allow using comment with findOneAndUpdate(), count(), `distinct()` and `hint` with `findOneAndUpdate()` #11793
 * fix(document): clean modified subpaths when setting nested path to null after modifying subpaths #11764
 * fix(types): allow calling `deleteModel()` with RegExp in TypeScript #11812
 * docs(typescript): add section on PopulatedDoc to TypeScript populate docs #11685

6.3.3 / 2022-05-09
==================
 * perf: avoid leaking memory when using populate() with QueryCursor because of reusing populate options with `_docs` #11641
 * fix(types): add `_id` back for LeanDocument #11769 #11761 [taxilian](https://github.com/taxilian)
 * fix(model): add skipValidation option for bulkWrite() to allow skipping validation for `insertOne` and `replaceOne` #11663
 * fix(document): correctly $__reset() subdocuments that are under nested paths #11672
 * fix(query): handle casting BSONRegExp instances as RegExps in queries #11597
 * fix: correctly cast $not in $expr #11689
 * perf: optimize size of browser bundle, use buffer v.5.7.1 package to match buffer package of mongodb in browser bundle #11765 [Uzlopak](https://github.com/Uzlopak)
 * docs: Query.populate docs do not include using an array of strings for the path param #11768 #11641 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * chore: add GitHub workflow to close stale "can't reproduce", "help", "needs clarification" issues #11753 [Uzlopak](https://github.com/Uzlopak)
 * chore: remove Makefile dependency for compiling docs #11751 [Uzlopak](https://github.com/Uzlopak)

6.3.2 / 2022-05-02
==================
 * perf: avoid registering event listeners on subdocuments to reduce memory usage #11541
 * fix(setDefaultsOnInsert): set default if sibling of nested path is $set #11668
 * perf(document): remove unnecessary workaround for ignoring subpaths of arrays #11541
 * fix(types): various fixes and improvements for types #11650 [taxilian](https://github.com/taxilian)
 * fix(types): make mongoose typings work without esmModuleInterop true #11695 [Uzlopak](https://github.com/Uzlopak)
 * fix(types): support populate(path, fields, model) syntax #11649 #11598 [mohammad0-0ahmad](https://github.com/mohammad0-0ahmad)
 * fix(types): correct SchemaTypeOptions.get function signature #11561
 * fix: fix browser build for Webpack 5 #11717
 * docs: improve readme #11705 [mahendrap1512](https://github.com/mahendrap1512)

6.3.1 / 2022-04-21
==================
 * perf: improve perf of key order #11639 [Uzlopak](https://github.com/Uzlopak)
 * fix(timestamps): set createdAt when creating new single nested subdocuments #11603
 * fix: improve CastError message when throwing StrictModeError #11506
 * fix: upgrade bson to match mongodb@4.5 #11676
 * fix(populate): avoid populating single nested subdocs underneath arrays if there's no `ref` #11538
 * fix: handle { capped: number } in schema definition with `createCollection()` #11539
 * fix: call markModified before setting changes in Array and in DocumentArray methods #11660 [josegl](https://github.com/josegl)
 * fix: only allow using minus path to remove auto-selected discriminatorKey from projection #11546
 * fix(types): set context on virtual getters/setters by default #11543
 * fix(types): correct return type for Connection.prototype.transaction #9919
 * fix(types): allow model as document interface key when using `extends Document` #11629
 * docs: improve populate typing #11690 [onichandame](https://github.com/onichandame)
 * docs: add information regarding typings-tests #11691 [Uzlopak](https://github.com/Uzlopak)
 * docs: fix jsdoc for mongoose.createConnection #11693 [Uzlopak](https://github.com/Uzlopak)

6.3.0 / 2022-04-14
==================
 * fix: upgrade mongodb driver -> 4.5.0 #11623 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * feat(schema): allow defining discriminators on schema and in schema definition #7971 [IslandRhythms](https://github.com/IslandRhythms)
 * feat(base): add option to set allowDiskUse globally #11554 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * feat(schema): add `removeIndex()` and `clearIndex()` #11547 [IslandRhythms](https://github.com/IslandRhythms)
 * feat(cursor): add `continueOnError` option to allow executing `eachAsync()` on all docs even if error occurs #6355
 * feat(query): add `versionKey` option to `lean()` for removing version key from lean docs #8934 [IslandRhythms](https://github.com/IslandRhythms)
 * feat(types): create new ProjectionType type for select(), find(), etc. #11437
 * chore: use webpack 5 for browser build #11584 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)

6.2.11 / 2022-04-13
===================
 * fix(document): handle validation with triply nested document arrays #11564
 * fix(query): skip applying string schema setters on $regex #11426
 * fix: skip findOneAndReplace() validation if runValidators = false #11559
 * fix(model): correctly handle schema-level collations in syncIndexes() #7621
 * fix(types): correct populate query return type with lean #11560 [mohammad0-0ahmad](https://github.com/mohammad0-0ahmad)
 * fix(types): allow using { type: Mixed } as schema type definition for any path #10900
 * docs: fix example on Schema.prototype.post() #11648 [EmilienLeroy](https://github.com/EmilienLeroy)
 * docs: fix typo in methods/index.js #11651 [eltociear](https://github.com/eltociear)

6.2.10 / 2022-04-04
===================
 * fix(types): improve lastErrorObject typing for rawResults #11602 [simllll](https://github.com/simllll)
 * docs(typescript): add note about deprecating extends Document #11619 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs: consistent syntax highlighting with upgraded highlight.js #11579 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)

6.2.9 / 2022-03-28
==================
 * perf(document+model): make a few small optimizations #11380
 * fix(types): improve populate return type #11560 [mohammad0-0ahmad](https://github.com/mohammad0-0ahmad)
 * fix(document): avoid marking paths as modified on subdocument defaults #11528
 * docs(schema): add example to index `expires` option #11557 [boly38](https://github.com/boly38)
 * docs(model): add change stream docs #11275
 * docs(lambda): update Lambda docs for Mongoose 6 #11275
 * docs(connections): add note about connecting with X509 #11333
 * docs(populate): fix incorrect path name in `refPath` example #11565 [chandiwalaaadhar](https://github.com/chandiwalaaadhar)

6.2.8 / 2022-03-22
==================
 * fix(document): handle casting array of spread docs #11522
 * fix(document): avoid setting nested properties on top-level document when initing with strict: false #11526
 * fix(document): correctly handle deeply nested subdocuments when getting paths to validate #11501
 * fix(types): avoid making TInstanceMethods any by default leading to `this = any` in middleware #11435
 * fix(types): allow defining array default if using Types.Array<> in document interface #11391
 * docs(migrating_to_6): describe breaking change in Mongoose 6 about default query populate model #11289
 * docs(middleware): fix typo #11537 [x1489](https://github.com/x1489)

6.2.7 / 2022-03-16
==================
 * perf(document): avoid running validation on every array element if there's no validators to run #11380
 * fix(cursor): correctly populate in batches when batchSize is set #11509
 * fix(connection): avoid setting MongoClient on useDb() connections until after setting on base connection #11445
 * fix(schema): throw more helpful error when using schema from a different version of Mongoose module #10453
 * fix: add missing timeseries expiration handling #11489 #11229 [Uzlopak](https://github.com/Uzlopak)
 * docs: correct Model.findOneAndReplace docs param naming #11524 [anatolykopyl](https://github.com/anatolykopyl)

6.2.6 / 2022-03-11
==================
 * fix(types): correct reference to cursor TypeScript bindings #11513 [SimonHausdorf](https://github.com/SimonHausdorf)
 * fix(types): allow calling Query.prototype.populate() with array of strings #11518
 * fix(types): export and refactor types of PreMiddlewareFunction, PreSaveMiddlewareFunction, PostMiddlewareFunction, ErrorHandlingMiddlewareFunction #11485 [Uzlopak](https://github.com/Uzlopak)

6.2.5 / 2022-03-09
==================
 * fix(mongoose): add isObjectIdOrHexString() to better capture the most common use case for `isValidObjectId()` #11419
 * fix(query): prevent modifying discriminator key in updates using operators other than `$set` #11456
 * fix(populate+types): call foreignField functions with doc as 1st param, better typings for `localField` and `foreignField` functions #11321
 * fix(populate): return an array when using populate count on an array localField #11307
 * fix(query): avoid error when using $not with arrays #11467
 * perf: only deep clone validators if necessary #11412 [Uzlopak](https://github.com/Uzlopak)
 * fix(types): rename definition files to lowercase to avoid typescript bug #11469
 * fix(types): aggregate.sort() accepts a string but also `{ field: 'asc'|'ascending'|'desc'|'descending' }` #11479 [simonbrunel](https://github.com/simonbrunel)
 * fix(types): extract and refactor aggregationcursor and querycursor #11488 [Uzlopak](https://github.com/Uzlopak)
 * fix(types): extract and refactor schemaoptions #11484 [Uzlopak](https://github.com/Uzlopak)
 * fix(types): make first param to `Query.prototype.populate()` a string #11475 [minhthinhls](https://github.com/minhthinhls)
 * fix(types): improve type checking for doc arrays in schema definitions #11241
 * docs: fix length comparaison in lean.test.js #11493 [zazapeta](https://github.com/zazapeta)
 * docs(timestamps): fix typo #11481 [saibbyweb](https://github.com/saibbyweb)
 * docs: fix broken link to rawResult #11459 [chhiring90](https://github.com/chhiring90)

6.2.4 / 2022-02-28
==================
 * fix(query): correctly return full deleteOne(), deleteMany() result #11211
 * fix(query): handle update validators on deeply nested subdocuments #11455 #11394
 * fix(discriminator): handle modifying multiple nested paths underneath a discriminator #11428
 * perf: improve isAsyncFunction #11408 [Uzlopak](https://github.com/Uzlopak)
 * fix(index.d.ts): add typedefs for Schema `pick()` #11448 [Moisei-Shkil](https://github.com/Moisei-Shkil)
 * fix(index.d.ts): allow type override for distinct() #11306
 * fix(index.d.ts): allow array of validators in schema definition #11355
 * fix(index.d.ts): improve connection typings #11418 [Uzlopak](https://github.com/Uzlopak)
 * docs: add timestamps docs #11336
 * docs(timestamps): explain how timestamps works under the hood #11336
 * docs(migrating_to_6): add model.exists breaking change returning doument instead of boolean #11407 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs(index.d.ts): add docs for FilterQuery, UpdateQuery, and LeanDocument #11457 [Moisei-Shkil](https://github.com/Moisei-Shkil)

6.2.3 / 2022-02-21
==================
 * fix(model): avoid dropping base model indexes when using discriminators with `Connection.prototype.syncIndexes()` #11424 #11421 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(document): handle array defaults when selecting element underneath array #11376
 * fix(populate): correctly handle depopulating populated subdocuments #11436
 * fix(utils): improve deepEqual() handling for comparing objects with non-objects #11417
 * fix(schema): allow declaring array of arrays using `[{ type: [String] }]` #11252
 * perf: improve validation sync and async by replacing forEach with classic for loops #11414 [Uzlopak](https://github.com/Uzlopak)
 * perf: make hasDollarKeys faster #11401 [Uzlopak](https://github.com/Uzlopak)
 * fix(index.d.ts): ValidationError `errors` only contains CastError or ValidationError #11369 [Uzlopak](https://github.com/Uzlopak)
 * fix(index.d.ts): make InsertManyResult.insertedIds return an array of Types.ObjectId by default #11197
 * fix(index.d.ts): allow pre('save') middleware with pre options #11257
 * fix(index.d.ts): add `suppressReservedKeysWarning` option to schema #11439 [hiukky](https://github.com/hiukky)
 * docs(connections): improve replica set hostname docs with correct error message and info about `err.reason.servers` #11200
 * docs(populate): add virtual populate match option documentation #11411 [remirobichet](https://github.com/remirobichet)
 * docs(document): add note to API docs that flattenMaps defaults to `true` for `toJSON()` but not `toObject()` #11213
 * docs(document+model): add populate option to populate() API docs #11170
 * docs(migrating_to_6): add additional info about removing omitUndefined #11038
 * docs(migrating_to_6): add model.exists breaking change returning doument instead of boolean [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)

6.2.2 / 2022-02-16
==================
 * fix: fix QueryCursor and AggregationCursor compatibility with Node v17.5 #11381 [benjamingr](https://github.com/benjamingr)
 * fix: better esm support, no necessity for setting allowSyntheticDefaultImports and esModuleInterop #11343 [Uzlopak](https://github.com/Uzlopak)
 * fix(model): apply projection parameter to hydrate() #11375
 * fix: fix issue with creating arrays of length > 10000 #11405 [Uzlopak](https://github.com/Uzlopak)
 * fix(document): minimize single nested subdocs #11247
 * fix(connection): handle reopening base connection with useDb() #11240
 * perf: use property access instead of `get()` helper where possible #11389 [Uzlopak](https://github.com/Uzlopak)
 * fix: use `isArray()` instead of `instanceof Array` #11393 [Uzlopak](https://github.com/Uzlopak)
 * perf: improve performance of `cast$expr()` #11388 [Uzlopak](https://github.com/Uzlopak)
 * perf: remove `startsWith()` from `isOperator()` #11400 [Uzlopak](https://github.com/Uzlopak)
 * fix(index.d.ts): extract `PipelineStage` into separate file #11368 [Uzlopak](https://github.com/Uzlopak)
 * fix(index.d.ts): fix $search highlight path option type #11373 [lmX2015](https://github.com/lmX2015)
 * docs: update changelog file to CHANGELOG.md #11365 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs: fix broken links #11388 #11377 [saibbyweb](https://github.com/saibbyweb)
 * docs: remove double determiners in connections docs #11340 [Erma32](https://github.com/Erma32)

6.2.1 / 2022-02-07
==================
 * perf: improve performance especially of validate and clone #11298 [Uzlopak](https://github.com/Uzlopak)
 * perf: remove regexp-clone #11327 [Uzlopak](https://github.com/Uzlopak)
 * fix(document): handle initing nested properties in non-strict documents #11309
 * fix(query): cast $elemMatch underneath $all #11314
 * fix(populate): respect schema-level strictPopulate option #11290
 * fix: set default for dotted path projection #11293 [noseworthy](https://github.com/noseworthy)
 * fix(model): correctly handle writeConcern.w = 0 when saving #11300
 * fix(model): throw VersionError when saving with no changes and optimisticConcurrency = true #11295
 * fix(query): avoid adding $each to $addToSet on mixed arrays #11284
 * fix(index.d.ts): allow using type: [Schema.Types.ObjectId] for ObjectId arrays #11194
 * fix(index.d.ts): make Types.DocumentArray<> convert type to subdoc, rename TMethods -> TMethodsAndOverrides #11061
 * fix(index.d.ts): support passing generic to createCollection() and `collection()` for integration with MongoDB Node driver's collection class #11131
 * fix(index.d.ts): add strictPopulate to MongooseOptions #11276
 * docs: mark Mongoose 6 as compatible with MongoDB 4 #11320 [JavaScriptBach](https://github.com/JavaScriptBach)
 * docs: remove documentation for useNestedStrict #11313 [mark-langer](https://github.com/mark-langer)
 * docs: add "new" to ObjectId class in aggregate.js docs #11322 [JavanPoirier](https://github.com/JavanPoirier)
 * chore: handle eslint configuration in .eslintrc.json #11326 [Uzlopak](https://github.com/Uzlopak)
 * refactor: add parenthesis for constructors in tests #11330 [apeltop](https://github.com/apeltop)

6.2.0 / 2022-02-02
==================
 * feat: upgrade MongoDB driver to 4.3.1
 * feat(connection+mongoose): add support for continueOnError for syncIndexes #11266 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * feat(query): cast literals in `$expr` where possible #10663
 * feat(schema+mongoose): add pluginTags to allow applying global plugins to only schemas with matching tags #9780
 * feat(discriminator): support overwriteModels:true to reuse discriminator names #11244 #10931 [IslandRhythms](https://github.com/IslandRhythms)
 * feat(index.d.ts): add DocType generic param to Model functions that return queries to better support projections #11156
 * feat(error): export MongooseServerSelectionError #11202
 * feat(schematype): add validators, path, isRequired to public API and TypeScript types #11139
 * fix(model): make exists(...) return lean document with _id or null instead of boolean #11142 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(model): support storing versionKey in nested paths #10980
 * fix(index.d.ts): add options to `bulkSave()` type def #11201 [Uzlopak](https://github.com/Uzlopak)
 * fix(index.d.ts): better support for query projections #11210 [EugeneKorshenko](https://github.com/EugeneKorshenko)

6.1.10 / 2022-02-01
===================
 * fix(mongoose): correctly handle destructured isValidObjectId #11304
 * fix(mongoose): defer to MongoDB driver isValid() for `isValidObjectId()` #11227

6.1.9 / 2022-01-31
==================
 * fix(query): respect nested schema strict as default when casting query filters #11291
 * fix(mongoose): make isValidObjectId() consistent with isValid(), make `ObjectId()` casting more flexible #11209
 * fix(setDefaultsOnInsert): ignore defaults underneath maps #11235
 * fix(query): avoid setting nested schema properties that are stripped out by strictQuery to undefined in query filter #11291
 * fix: check for all flags in a regex deepequal #11242 [Uzlopak](https://github.com/Uzlopak)
 * fix: replace substr with substring #11278 [Uzlopak](https://github.com/Uzlopak)
 * docs: port for documentation testing in CONTRIBUTING.md #11273 [Uzlopak](https://github.com/Uzlopak)

6.1.8 / 2022-01-24
==================
 * fix(connection): stop leaking sessions in .transaction() #11259 #11256 [Uzlopak](https://github.com/Uzlopak)
 * perf: remove sliced in favor of Array.prototype.slice() #11238 [Uzlopak](https://github.com/Uzlopak)
 * perf: improve setDottedPath #11264 [Uzlopak](https://github.com/Uzlopak)
 * fix(document): handle edge case where NestJS sets String.type = String, mixing up schema definitions #11199
 * fix: remove obsolete code after upgrading to bson4 #11265 [Uzlopak](https://github.com/Uzlopak)
 * fix: remove util.isArray in favor of Array.isArray #11234 [Uzlopak](https://github.com/Uzlopak)
 * fix(index.d.ts): avoid UnpackedIntersection making `findOne().populate()` result non-nullable #11041
 * docs(migration): add note to change default functions to schema #11245 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs: updated docs and issue templates for new FAQs #11171 [IslandRhythms](https://github.com/IslandRhythms)
 * chore: fix casting benchmark #11262 [Uzlopak](https://github.com/Uzlopak)
 * chore: add mongodb-memory-server to test easier locally #11255 [Uzlopak](https://github.com/Uzlopak)
 * chore: fix testing tsconfig #11243 [Uzlopak](https://github.com/Uzlopak)
 * refactor: move utils.random to test folder #11239 [Uzlopak](https://github.com/Uzlopak)

6.1.7 / 2022-01-17
==================
 * fix(model): correct handling for $push on a nested array #11108
 * fix(update): correctly apply timestamps to update pipelines #11151
 * fix(document): correctly handle modifying array subdocument after setting array subdocument to itself #11172
 * fix(index.d.ts): allow passing options to model() in place of removed `skipInit` #11137
 * fix(aggregate): allow passing verbosity to Aggregate.prototype.explain() #11144
 * fix(index.d.ts): avoid TypeScript inferring _id as any type with HydratedDocument #11085
 * docs: fix Node.js Driver compat link #11214 [wesbos](https://github.com/wesbos)
 * docs: remove extraneous backquote #11204 [joebowbeer](https://github.com/joebowbeer)

6.1.6 / 2022-01-10
==================
 * perf(document): delay creating document event emitter until used to improve memory usage, several small improvements to improve initing docs with large arrays #10400
 * fix(model): avoid `bulkSave()` error when `versionKey: false` #11186 #11071 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(model): revert #11079: `findByIdAndUpdate(undefined)` breaking change #11149
 * fix(index.d.ts): support strings in deep populate #11181 [ivalduan](https://github.com/ivalduan)
 * fix(index.d.ts): rename map() -> transform() to line up with change in v6.0 #11161
 * fix(index.d.ts): allow new Model<DocType>(obj) for stricter type checks #11148
 * fix(index.d.ts): make Schema.prototype.pre() and post() generics default to HydratedDocument<DocType> #11180
 * docs: improve autoCreate docs #11116
 * docs(schematype): add missing parameter to example #11185 [kerolloz](https://github.com/kerolloz)
 * docs(connections): use updated link to list of MongoDB Node driver `connect()` options #11184 [splinter](https://github.com/splinter)
 * docs(aggregate): fix formatting #11191 [enieber](https://github.com/enieber)
 * docs: fix broken link #11179 [khairnarsaurabh23](https://github.com/khairnarsaurabh23)

6.1.5 / 2022-01-04
==================
 * perf(index.d.ts): simplify Schema typedef for query helpers and methods to significantly reduce TS compiler overhead #10349
 * fix(document): allow populating deeply nested models as strings #11168 #11160 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(query): allow calling limit() and skip() with a string #11017
 * fix(cursor): propery apply selected fields when loading discriminator docs with query cursor #11130
 * fix(mongoose+connection): clone schema correctly when passing instance of another Mongoose instance's Schema to Connection.prototype.model() #11047
 * fix(index.d.ts): handle primitives with FlattenMaps #11117
 * fix(index.d.ts): enforce id on lean query result type #11118
 * fix(index.d.ts): export facet stage type #11150 [mhoc](https://github.com/mhoc)
 * fix(index.d.ts): correct return type of projection method #11176 [EugeneKorshenko](https://github.com/EugeneKorshenko)
 * fix(index.d.ts): additional fix for `$group` pipeline stage #11140 #11067 [EugeneKorshenko](https://github.com/EugeneKorshenko)
 * docs: update CONTRIBUTING.md for TS tests #11164 [ahmedelshenawy25](https://github.com/ahmedelshenawy25)
 * docs: use es6 object destructuring instead of regular dot operator for accessing value in object #11147 [Shivaansh-Agarwal](https://github.com/Shivaansh-Agarwal)

6.1.4 / 2021-12-27
==================
 * fix(document): handle save with undefined nested doc under subdoc #11110
 * fix(document): allow manually populating subdocument refs with `create()` #10856
 * fix(populate): handles refPath underneath map of subdocuments #9359
 * fix(update): throw error when calling findByIdAndUpdate with undefined id #11079 [gramliu](https://github.com/gramliu)
 * fix(mongoose): export ConnectionStates #11133 [orgads](https://github.com/orgads)
 * fix(index.d.ts): unpack array when using generic type override with `populate()` #11027
 * fix(index.d.ts): fix typings in Merge stage #11132
 * fix(index.d.ts): PipelineStage.Merge interface definition is wrong #11109
 * docs(typescript): add note about Schema.Types.ObjectId vs Types.ObjectId in document definition #10949
 * docs(connection): clarify that "connected" and "open" are different #10886
 * docs(populate): correct refPath example to not use on as a schema path name #11113
 * docs: fix `strictQuery` example #11135 [MontgomeryWatts](https://github.com/MontgomeryWatts)

5.13.14 / 2021-12-27
====================
 * fix(timestamps): avoid setting createdAt on documents that already exist but dont have createdAt #11024
 * docs(models): fix up nModified example for 5.x #11055

6.1.3 / 2021-12-21
==================
 * perf(populate): avoid duplicate model names when using refPath to avoid O(n^2) memory growth with number of array elements #10983
 * fix(schema+model): cast paths marked with ref when hydrating #11052
 * fix(schema): handle default function that returns null on document arrays #11058
 * fix(document): clean modified paths when setting deeply nested subdocument #11060
 * fix(populate): report full path when throwing strictPopulate error with deep populate #10923
 * fix(connection): allow calling `setClient()` when disconnected #11114 [hustxiaoc](https://github.com/hustxiaoc)
 * fix(index.d.ts): fix typings in Group stage #11124 [DavideViolante](https://github.com/DavideViolante)
 * fix(index.d.ts): add Mongoose.prototype.trusted() function to type defs #10957
 * fix(index.d.ts): allow use type string in $unset update with aggregation pipeline #11107 [rpenido](https://github.com/rpenido)
 * fix(index.d.ts) treat _id like other fields in $project #11102
 * docs(migrating_to_6): add omitUndefined to Mongoose 6 migration guide #10672
 * docs: add MongooseDocumentArray to API docs #10998
 * docs: fix typo in model.js #11121 [eltociear](https://github.com/eltociear)
 * docs: fix typo in validation.md #11103 [warlock1996](https://github.com/warlock1996)

6.1.2 / 2021-12-14
==================
 * fix: upgrade mongodb driver to 4.2.2 #11092 [lorand-horvath](https://github.com/lorand-horvath)
 * fix(model): respect discriminators when calling Model.watch() #11007
 * fix(populate): allow referencing parent connection models by name when using `useDb()` #11003
 * fix(query): support options param to `Query.prototype.countDocuments()` #11037
 * fix(query): correctly use awaitData instead of awaitdata in `Query.prototype.tailable()` #10875
 * fix(index.d.ts): fix replaceRoot type #11098 [alibehroozi](https://github.com/alibehroozi)
 * fix(index.d.ts): add missing syncIndexes() definition to Mongoose global and Connection class #11065
 * fix(index.d.ts): add boolean type for transform option #11057 [AliYusuf95](https://github.com/AliYusuf95)
 * docs(model.estimatedDocumentCount): add await into example to get value from the Query #11044 [olecom](https://github.com/olecom)
 * docs: fix broken build from awaitdata comment #11096 [medolino](https://github.com/medolino)
 * docs: correct Query.prototype.transform() docs #11094 [medolino](https://github.com/medolino)

6.1.1 / 2021-12-09
==================
 * fix(document): allow setting nested path to instance of document #11011
 * fix(update): respect strict option when casting array filters #11062
 * fix(index.d.ts): allow SchemaTypes.Mixed for all schema definition properties to allow using union types #10900
 * fix(index.d.ts): correct types for Schema.prototype.obj and `Model.schema` #10895
 * docs(migrating_to_6): add note about Types.ObjectId() being a class and requiring `new` #10960

6.1.0 / 2021-12-07
==================
 * feat(populate): support ref on subdocuments #10856
 * feat(document): add `ownerDocument()` method to top-level document for consistency with subdocs #10884 [IslandRhythms](https://github.com/IslandRhythms)
 * fix: upgrade to mongodb driver 4.2.1 #11032 #10985 [lorand-horvath](https://github.com/lorand-horvath) [has-n](https://github.com/has-n)
 * feat(schema): support `timeseries` option for MongoDB 5 time series collections support #10611
 * feat(mongoose): add global `strictPopulate` option #10694 [IslandRhythms](https://github.com/IslandRhythms)
 * feat(mongoose+connection): add global `mongoose.syncIndexes()` and `Connection.prototype.syncIndexes()` #10893 [IslandRhythms](https://github.com/IslandRhythms)
 * feat(query): support removing fields from projections #10630 [canac](https://github.com/canac)
 * feat(aggregate): add unionWith method to aggregate #10961 [saeidasadi](https://github.com/saeidasadi)
 * fix(index.d.ts): types for aggregation pipeline stages #10971 [jeremyben](https://github.com/jeremyben)

6.0.15 / 2021-12-06
===================
 * fix(document): avoid overwriting schema methods when creating a new document with `new Model()` and `strict: false` #11001
 * fix(document): avoid overwriting top-level document _id with nested `_id` when `strict = false` #10934
 * fix(collection): avoid double-calling callback on sync error #10956
 * fix(connection): handle direct connection to uninitialized replica set that then becomes initialized #10948
 * fix(index.d.ts): allow partial updates on subdocuments for defaults #10947
 * fix(index.d.ts): handle buffer type in schema definitions #11026

6.0.14 / 2021-11-29
===================
 * fix(document): catch errors in required functions #10968
 * fix(connection): clone schema when passing a schema from a different copy of Mongoose to `Connection#model()` #10904
 * fix(populate): set empty array [] on virtual populate with no result #10992
 * fix(query): handle orFail() with replaceOne() #10963
 * fix(populate): use Model by default when using Model.populate() on a POJO #10978
 * fix(document): throw VersionError if saving a document with version bump and document isn't found #10974
 * fix(index.d.ts): make populate type param optional #10989 [mohd-akram](https://github.com/mohd-akram)
 * docs(migrating_to_6): add a note about minimize and toObject() behavior change in v5.10.5 #10827
 * docs: remove duplicate `path` in docs #11020 [ItWorksOnMyMachine](https://github.com/ItWorksOnMyMachine)
 * docs: fix typo in populate docs #11015 [gavi-shandler](https://github.com/gavi-shandler)
 * docs: fix typo in model.js #10982 [eltociear](https://github.com/eltociear)

6.0.13 / 2021-11-15
===================
 * fix(document): allows validating doc again if pre validate errors out #10830
 * fix: upgrade to mongodb driver 4.1.4 #10955 [mohd-akram](https://github.com/mohd-akram)
 * fix(schema): handle functions with accidental type properties in schema definitions #10807
 * fix(path): add check to avoid flattening dotted paths on Mongoose docs, improve error when flattening dotted paths causes conflicts #10825
 * fix(index.d.ts): rename EnforceDocument -> HydratedDocument, export HydratedDocument for easier typing for users #10843
 * fix(index.d.ts): handle maps in TypeScript schema definitions #10838
 * fix(index.d.ts): add clone to query #10943 [asportnoy](https://github.com/asportnoy)
 * fix(index.d.ts): add strictQuery global option #10933
 * fix(index.d.ts): add generic to allow overriding `Schema#clone()` return type #10951 [StefanoA1](https://github.com/StefanoA1)
 * docs(typescript): add quick guide to virtuals in TypeScript #10754
 * docs(aggregate): remove exec() from AggregationCursor example, no longer correct for Mongoose 6 #10862
 * docs(document.js): fix link leading to old github pages site #10958 [PuneetGopinath](https://github.com/PuneetGopinath)
 * docs: fixed typo in document.js #10950 [Haosik](https://github.com/Haosik)

5.13.13 / 2021-11-02
====================
 * fix: upgrade to mongodb@3.7.3 #10909 [gaurav-sharma-gs](https://github.com/gaurav-sharma-gs)
 * fix: correctly emit end event in before close #10916 [iovanom](https://github.com/iovanom)
 * fix(index.d.ts): improve ts types for query set #10942 [jneal-afs](https://github.com/jneal-afs)

6.0.12 / 2021-10-21
===================
 * fix(cursor): remove the logic for emitting close, rely on autoDestroy option for Node 12 support #10906 [iovanom](https://github.com/iovanom)
 * fix(map): support passing flattenMaps: false to Map toJSON(), make `toJSON()` flatten maps by default in TypeScript #10872
 * fix: upgrade to mongodb driver 4.1.3 #10911 [orgads](https://github.com/orgads)
 * fix(index.d.ts): correct TS function signature for `SchemaType.prototype.set()` #10799
 * fix(index.d.ts): support implicit $in in FilterQuery #10826
 * fix(index.d.ts): More precise type for Schema.clone() #10899 [coyotte508](https://github.com/coyotte508)
 * fix(index.d.ts): add caster property to schema arrays and document arrays #10865
 * docs: update `updateMany()` and `deleteMany()` docs to reflect new `matchedCount`, `modifiedCount`, `deletedCount` properties #10908 [IslandRhythms](https://github.com/IslandRhythms)
 * docs: fix broken links to populate virtuals #10870 [IslandRhythms](https://github.com/IslandRhythms)
 * docs: updated docs to have returnOriginal, removed new and returnDocument #10887 [IslandRhythms](https://github.com/IslandRhythms)

5.13.12 / 2021-10-19
====================
 * fix(cursor): use stream destroy method on close to prevent emitting duplicate 'close' #10897 [iovanom](https://github.com/iovanom)
 * fix(index.d.ts): backport streamlining of FilterQuery and DocumentDefinition to avoid "excessively deep and possibly infinite" TS errors #10617

6.0.11 / 2021-10-14
===================
 * perf(index.d.ts): remove some unnecessary definitions, streamline some union types to reduce number of instantiations #10349
 * fix(cursor): use stream destroy method on close to prevent emitting duplicate 'close' #10878 #10876 [iovanom](https://github.com/iovanom)
 * fix: create indexes when readPreference=primary is set #10861 #10855 [gemyero](https://github.com/gemyero)
 * fix(document): avoid depopulating when setting array of subdocs from different doc #10819
 * fix(index.d.ts): allow modifying properties of UpdateQuery instances #10786
 * fix(index.d.ts): add generic Paths to populate() to allow overriding path types #10758

5.13.11 / 2021-10-12
====================
 * fix: upgrade mongodb -> 3.7.2 #10871 [winstonralph](https://github.com/winstonralph)
 * fix(connection): call setMaxListeners(0) on MongoClient to avoid event emitter memory leak warnings with `useDb()` #10732

6.0.10 / 2021-10-08
===================
 * fix(query): add back strictQuery option to avoid empty filter issues, tie it to `strict` by default for compatibility #10781 #10763
 * fix(model): avoid unnecessarily dropping text indexes in `syncIndexes()` #10851 #10850 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(query): avoid trying to call toArray() on cursor if find() error occurred #10845
 * fix: accepts uppercase values in mongoose.isValidObjectId #10846 [foxadb](https://github.com/foxadb)
 * perf(document): further reduce unnecessary objects and keys to minimize document memory overhead #10400
 * fix(index.d.ts): restore unpacked type and avoid distributive conditional types #10859 [dbellavista](https://github.com/dbellavista)
 * fix(index.d.ts): add correct null typings for `findOneAndUpdate()` and `findByIdAndUpdate()` #10820
 * fix(index.d.ts): make insertMany() correctly return Promise<Array> if passing single document to `insertMany()` #10802
 * fix(index.d.ts): avoid weird issue where TypeScript 4.3.x and 4.4.x makes string extend Function #10746
 * fix(index.d.ts): allow type: `SchemaTypeOptions[]` when defining schema #10789
 * fix(index.d.ts): allow using `$in` with enum fields #10757 #10734
 * fix(index.d.ts): add missing fields and options params to Model constructor #10817
 * fix(index.d.ts): support extending type for mongoose.models #10806 [MunifTanjim](https://github.com/MunifTanjim)
 * docs: enhance docs section linking #10779 [saveman71](https://github.com/saveman71)
 * docs(middleware): add missing query middleware #10721
 * docs: fix typo #10853 [mdatif796](https://github.com/mdatif796)
 * docs: add missing to #10848 [digidub](https://github.com/digidub)

5.13.10 / 2021-10-05
====================
 * fix(index.d.ts): allow using type: SchemaDefinitionProperty in schema definitions #10674
 * fix(index.d.ts): allow AnyObject as param to findOneAndReplace() #10714

6.0.9 / 2021-10-04
==================
 * fix(document): init non-schema values if strict is set to false #10828
 * fix(document): correctly track saved state for deeply nested objects #10773
 * fix(array): avoid mutating arrays passed into Model() constructor #10766
 * fix(cursor): allow using find().cursor() before connecting, report errors in pre('find') hooks when using `.cursor()` #10785
 * fix(populate): support ref: Model with virtual populate #10695
 * fix(schema): support type: { subpath: String } in document array definitions and improve schema `interpretAsType` error messages if type name is undefined #10750
 * fix: upgrade to mongodb driver 4.1.2 #10810 [orgads](https://github.com/orgads)
 * fix(subdocument): add extra precaution to throw an error if a subdocument is a parent of itself in `ownerDocument()` #9259
 * perf(index.d.ts): make `model()` call more strict to improve VS Code autocomplete perf #10801 [traverse1984](https://github.com/traverse1984)
 * fix(index.d.ts): allow calling depopulate with 0 args #10793
 * fix(index.d.ts): Add type definitions for allowDiskUse #10791 [coyotte508](https://github.com/coyotte508)
 * docs(populate): expand virtual populate docs with info on principle of least cardinality and other info #10558
 * docs: add migration guide to side bar #10769
 * docs(connections+api): clarify that maxPoolSize is now 100 by default #10809
 * docs(schema): add Schema#virtuals to docs as a public property #10829
 * docs: remove array indexes section from FAQ #10784 [Duchynko](https://github.com/Duchynko)
 * docs(model): fix broken example #10831 [Okekeprince1](https://github.com/Okekeprince1)
 * docs: fix markdown issue with schemas.md #10839 [aseerkt](https://github.com/aseerkt)

6.0.8 / 2021-09-27
==================
 * fix: support $set on elements of map of subdocuments #10720
 * fix(schematype): handle schema type definition where unique: false and `index` not set #10738
 * fix(timestamps): handle `createdAt` with custom `typeKey` #10768 #10761 [jclaudan](https://github.com/jclaudan)
 * fix(model): amend Model.translateAliases to observe non-aliased sub schemas #10772 [frisbee09](https://github.com/frisbee09)
 * fix: allow ObjectId#valueOf() to override built-in `Object#valueOf()`, clarify using `==` with ObjectIds in migration guide #10741
 * fix: use process.emitWarning() instead of console.warn() for warnings #10687
 * fix(index.d.ts): allow array of schema type options for string[], `number[]` property Schema definitions #10731
 * fix(index.d.ts): make built-in subdocument properties not required in UpdateQuery #10597
 * docs(ssl): correct sslCA option and clarify that sslCA should be the path to the CA file #10705

6.0.7 / 2021-09-20
==================
 * fix(populate): wrap populate filters in trusted() so they work with `sanitizeFilter` #10740
 * fix(aggregate): handle calling aggregate() before initial connection succeeds #10722
 * fix(query): avoid throwing error when using `$not` with `$size` #10716 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(discriminator): handle setting nested discriminator paths #10702
 * fix(documentarray): don't throw TypeError on DocumentArray#create() when top-level doc has populated paths #10749
 * fix(update): avoid setting single nested subdoc defaults if subdoc isn't set #10660
 * fix: delay creating id virtual until right before model compilation to allow plugins to disable the `id` option #10701
 * fix(connection): correct `auth` object when using `user` option to `connect()` #10727 #10726 [saveman71](https://github.com/saveman71)
 * fix(timestamps): avoid calling getters when checking whether `createdAt` is set #10742 [kaishu16](https://github.com/kaishu16)
 * fix(index.d.ts): allow using strings for ObjectIds with $in #10735
 * fix(index.d.ts): add TVirtuals generic to Model to make it easier to separate virtuals from DocType #10689
 * fix(index.d.ts): add Model.bulkSave() definition #10745
 * fix(index.d.ts): allow RegExp for `match` in schema definition #10744 [easen-amp](https://github.com/easen-amp)
 * fix(index.d.ts): allow arbitrary additional keys in QueryOptions #10688
 * docs: correct TypeScript schema generic params in docs #10739 [minifjurt123](https://github.com/minifjurt123)
 * docs: fix h2 header links #10682 [IslandRhythms](https://github.com/IslandRhythms)

6.0.6 / 2021-09-15
==================
 * perf(index.d.ts): streamline SchemaDefinitionType and SchemaTypeOptions to reduce number of instantiations and speed up lib checking #10349
 * perf(document): make $locals a getter/setter, avoid creating unnecessary `undefined` properties in Document constructor, remove unnecessary event listeners #10400
 * fix(connection): use username parameter for MongoDB driver instead of user #10727 [saveman71](https://github.com/saveman71)
 * fix(update): handle casting $or and $and in array filters #10696
 * fix(connection): allow calling connection helpers before calling `mongoose.connect()` #10706
 * fix(document): correctly handle subpaths of arrays that contain non-alphanumeric chars like `-` #10709
 * fix(index.d.ts): correct return value for findOneAndUpdate(), `findByIdAndUpdate()` to support query helpers #10658
 * fix(index.d.ts): add missing methods to ValidationError & ValidatorError classes #10725 [medfreeman](https://github.com/medfreeman)
 * perf(subdocument): make internal $isSingleNested and `$isDocumentArrayElement` properties constants on the prototype rather than setting them on every instance #10400
 * docs: improve Document#populate documentation, tests #10728 [saveman71](https://github.com/saveman71)

6.0.5 / 2021-09-06
==================
 * fix(model): allow calling Model.validate() static with POJO array #10669
 * fix(cast): let $expr through in query filters if strict mode enabled #10662
 * fix(map): propagate flattenMaps option down to nested maps #10653
 * fix(setDefaultsOnInsert): avoid adding unnecessary auto _id to $setOnInsert #10646
 * fix(schema): support object with values and message syntax for Number enums #10648
 * fix(index.d.ts): fix Document#populate() type #10651 [thiagokisaki](https://github.com/thiagokisaki)
 * fix(index.d.ts): allow using $in and $nin on array paths #10605
 * fix(index.d.ts): make _id required in query results and return value from `create()` #10657
 * docs: update deprecations.md to reflect version 6 #10673 [multiwebinc](https://github.com/multiwebinc)
 * docs: fix typo in queries.md #10681 [yogabonito](https://github.com/yogabonito)
 * docs: fix typo in models.md #10680 [yogabonito](https://github.com/yogabonito)
 * ci: add test for ubuntu-20.04 #10679 [YC](https://github.com/YC)

5.13.9 / 2021-09-06
===================
 * fix(populate): avoid setting empty array on lean document when populate result is undefined #10599
 * fix(document): make depopulate() handle populated paths underneath document arrays #10592
 * fix: peg @types/bson version to 1.x || 4.0.x to avoid stubbed 4.2.x release #10678
 * fix(index.d.ts): simplify UpdateQuery to avoid "excessively deep and possibly infinite" errors with `extends Document` and `any` #10647
 * fix(index.d.ts): allow specifying weights as an IndexOption #10586
 * fix: upgrade to mpath v0.8.4 re: security issue #10683

6.0.4 / 2021-09-01
==================
 * fix(schema): handle maps of maps #10644
 * fix: avoid setting defaults on insert on a path whose subpath is referenced in the update #10624
 * fix(index.d.ts): simplify UpdateQuery to avoid "excessively deep and possibly infinite" errors with `extends Document` and `any` #10617
 * fix(index.d.ts): allow using type: [documentDefinition] when defining a doc array in a schema #10605
 * docs: remove useNewUrlParser, useUnifiedTopology, some other legacy options from docs #10631 #10632
 * docs(defaults): clarify that setDefaultsOnInsert is true by default in 6.x #10643
 * test: use async/await instead of co #10633 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)

6.0.3 / 2021-08-30
==================
 * fix: handle buffering with find() now that find() no longer accepts a callback #10639 #10634 #10610

6.0.2 / 2021-08-26
==================
 * fix(query): handle find() when buffering on initial connection #10610
 * fix(populate): get doc schema using $__schema to avoid paths named `schema` #10619
 * docs: use async/await in the quickstart #10610
 * docs: fix links to guide, schematypes, connections in v5.x docs #10607
 * docs: add link to 6.x migration guide to schemas guide #10616
 * docs: add migration to 6.x in Migration Guides section #10618 [HunterKohler](https://github.com/HunterKohler)
 * docs: fix missing URL part on layout.pug #10622 [ItsLhun](https://github.com/ItsLhun)

6.0.1 / 2021-08-25
==================
 * fix(aggregate): allow calling Model.aggregate() with options #10604 [amitbeck](https://github.com/amitbeck)
 * fix(index.d.ts): add instance, options, schema properties to SchemaType class #10609
 * fix(index.d.ts): allow querying array of strings by string #10605
 * fix(index.d.ts): allow using type: SchemaDefinitionProperty in schema definitions #10605
 * fix(index.d.ts): remove strictQuery option #10598 [thiagokisaki](https://github.com/thiagokisaki)
 * docs: add link to migration guide in changelog #10600 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs: fix docs build for v5.x docs #10607
 * docs(query): add note about strict option to setOptions() #10602

6.0.0 / 2021-08-24
==================
 * Follow the [migration guide](https://mongoosejs.com/docs/migrating_to_6.html) to get a list of all breaking changes in v6.0.
 * BREAKING CHANGE: remove the deprecated safe option in favor of write concerns
 * fix: upgrade to mongodb driver 4.1.1
 * fix: consistently use $__parent to store subdoc parent as a property, and `$parent()` as a getter function #10584 #10414
 * fix: allow calling `countDocuments()` with options

6.0.0-rc2 / 2021-08-23
======================
 * BREAKING CHANGE: make document set() set keys in the order they're defined in the schema, not in the user specified object #4665
 * BREAKING CHANGE: remove most schema reserved words - can now opt in to using `save`, `isNew`, etc. as schema paths #9010 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * BREAKING CHANGE: upgrade mquery -> 4.x #10579
 * BREAKING CHANGE: remove some legacy type aliases for TypeScript
 * fix(document): pass depopulated value to array element validators for consistency #10585 #8042

5.13.8 / 2021-08-23
===================
 * fix(populate): handle populating subdoc array virtual with sort #10552
 * fix(model): check for code instead of codeName when checking for existing collections for backwards compat with MongoDB 3.2 #10420
 * fix(index.d.ts): correct value of this for custom query helper methods #10545
 * fix(index.d.ts): allow strings for ObjectIds in nested properties #10573
 * fix(index.d.ts): add match to VirtualTypeOptions.options #8749
 * fix(index.d.ts): allow QueryOptions populate parameter type PopulateOptions #10587 [osmanakol](https://github.com/osmanakol)
 * docs(api): add Document#$where to API docs #10583

6.0.0-rc1 / 2021-08-12
======================
 * feat: upgrade to MongoDB driver 4.1.0 #10567 #10560
 * feat: add `valueOf()` to ObjectId prototype #7299
 * BREAKING CHANGE: rename History.md -> CHANGELOG.md #10542

5.13.7 / 2021-08-11
===================
 * perf(index.d.ts): loosen up restrictions on ModelType generic for Schema for a ~50% perf improvement when compiling TypeScript and using intellisense #10536 #10515 #10349
 * fix(index.d.ts): fix broken `Schema#index()` types #10562 [JaredReisinger](https://github.com/JaredReisinger)
 * fix(index.d.ts): allow using SchemaTypeOptions with array of raw document interfaces #10537
 * fix(index.d.ts): define IndexOptions in terms of mongodb.IndexOptions #10563 [JaredReisinger](https://github.com/JaredReisinger)
 * fix(index.d.ts): improve intellisense for DocumentArray `push()` #10546
 * fix(index.d.ts): correct type for expires #10529
 * fix(index.d.ts): add Query#model property to ts bindings #10531
 * refactor(index.d.ts): make callbacks use the new Callback and CallbackWithoutResult types #10550 [thiagokisaki](https://github.com/thiagokisaki)

5.13.6 / 2021-08-09
===================
 * fix: upgrade mongodb driver -> 3.6.11 #10543 [maon-fp](https://github.com/maon-fp)
 * fix(schema): throw more helpful error when defining a document array using a schema from a different copy of the Mongoose module #10453
 * fix: add explicit check on constructor property to avoid throwing an error when checking objects with null prototypes #10512
 * fix(cursor): make sure to clear stack every 1000 docs when calling `next()` to avoid stack overflow with large batch size #10449
 * fix(index.d.ts): allow calling new Model(...) with generic Model param #10526
 * fix(index.d.ts): update type declarations of Schema.index method #10538 #10530 [Raader](https://github.com/Raader)
 * fix(index.d.ts): add useNewUrlParser and useUnifiedTopology to ConnectOptions #10500
 * fix(index.d.ts): add missing type for diffIndexes #10547 [bvgusak](https://github.com/bvgusak)
 * fix(index.d.ts): fixed incorrect type definition for Query's .map function #10544 [GCastilho](https://github.com/GCastilho)
 * docs(schema): add more info and examples to Schema#indexes() docs #10446
 * chore: add types property to package.json #10557 [thiagokisaki](https://github.com/thiagokisaki)

6.0.0-rc0 / 2021-08-03
======================
 * BREAKING CHANGE: upgrade to MongoDB Node.js driver 4.x. This adds support for MongoDB 5.0, drops support for Node.js < 12.0.0 #10338 #9840 #8759
 * BREAKING CHANGE(connection): make connections not thenable, add `Connection#asPromise()` to use a connection as a promise #8810
 * BREAKING CHANGE: throw an error if the same query object is executed multiple times #7398
 * BREAKING CHANGE: Mongoose arrays are now proxies, which means directly setting an array index `doc.arr[0] = 'test'` triggers change tracking #8884
 * BREAKING CHANGE: make Document#populate() return a promise if a callback isn't passed, remove `execPopulate()` #3834
 * BREAKING CHANGE: virtual getters and setters are now executed in forward order, rather than reverse order. This means you can add getters/setters to populated virtuals #8897 [ggurkal](https://github.com/ggurkal)
 * BREAKING CHANGE: make setDefaultsOnInsert true by default. Set to `false` to disable it. #8410
 * BREAKING CHANGE: throw error by default if populating a path that isn't in the schema #5124
 * BREAKING CHANGE: make schema paths declared with `type: { name: String }` create a single nested subdoc, remove `typePojoToMixed` because it is now always false #7181
 * BREAKING CHANGE: remove context option for queries, always use `context: 'query'` #8395
 * BREAKING CHANGE: array subdocument class now inherits from single subdocument class #8554
 * BREAKING CHANGE: if model is registered on a non-default connection, don't register it on mongoose global #5758
 * BREAKING CHANGE: `Aggregate#cursor()` now returns aggregation cursor, rather than aggregate instance #10410 [IslandRhythms](https://github.com/IslandRhythms)
 * BREAKING CHANGE: `useStrictQuery` is removed, `strict` applies for both #9015
 * BREAKING CHANGE: overwrite instead of merging when setting nested paths #9121
 * BREAKING CHANGE: call ref and refPath functions with subdoc being populated, not top-level doc #8469
 * BREAKING CHANGE: remove useFindAndModify option, always use MongoDB's native `findOneAndReplace()` rather than legacy `findAndModify()` #8737
 * BREAKING CHANGE: always pass unpopulated value to validators #8042 [IslandRhythms](https://github.com/IslandRhythms)
 * BREAKING CHANGE: rename Embedded/SingleNestedPath -> Subdocument/SubdocumentPath #10419
 * BREAKING CHANGE: call setters with priorVal as 2nd parameter, and with new subdocument as context if creating new document #8629
 * BREAKING CHANGE: pass document as first parameter to `default` functions #9633 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * BREAKING CHANGE: make filter, flat, flatMap, map, and slice return vanilla JS arrays #8356
 * BREAKING CHANGE: make autoCreate true by default #8814
 * BREAKING CHANGE: clone schema passed to discriminator() #8552
 * BREAKING CHANGE: make autoIndex and autoCreate default to false if connection's read preference is 'secondary' or 'secondaryPreferred' #9374 [chumager](https://github.com/chumager)
 * BREAKING CHANGE: make deepEqual treat objects with different order of keys as different #9571 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * BREAKING CHANGE: Make Model.exists() return a query rather than a promise, and resolve to doc or null, rather than true/false #8097
 * BREAKING CHANGE: `Model.create([])` now returns an empty array rather than undefined #8792 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * BREAKING CHANGE: `createdAt` schema path is now `immutable` by default #10139 [IslandRhythms](https://github.com/IslandRhythms)
 * BREAKING CHANGE: dont start buffering when database is disconnected #8702
 * BREAKING CHANGE: emit 'disconnected' when losing connectivity to replica set primary #9262
 * BREAKING CHANGE: Make Aggregate#model() always return a model rather than an aggregate instance #7702
 * BREAKING CHANGE: remove omitUndefined option for updates - Mongoose now always removes `undefined` keys in updates #7680
 * BREAKING CHANGE: remove Aggregate#addCursorFlag(), use `Aggregate#options()` instead #8701
 * BREAKING CHANGE: rename Query#map() -> Query#transform() to avoid conflating with Array#map() and chaining #7951
 * BREAKING CHANGE: remove storeSubdocumentValidationError schema option, never store subdocument ValidationErrors #5226
 * BREAKING CHANGE(query): make find() with explain() return object instead of an array #8551
 * BREAKING CHANGE: allow undefined in number arrays unlles `required` #8738
 * BREAKING CHANGE: remove isAsync option for validators in favor of checking if a function is an async function #10502
 * BREAKING CHANGE: drop support for Model#model #8958 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * BREAKING CHANGE: remove useNestedStrict, use nested schema strict mode when casting updates unless `strict` is explicitly specified in query options #8961
 * BREAKING CHANGE: remove `safe-buffer`, make MongooseBuffer extend from native Buffer #9199 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * BREAKING CHANGE(schema): skip adding id virtual if schema doesn't have an `_id` path #3936
 * BREAKING CHANGE: remove skipInit parameter to mongoose.model() #4625
 * BREAKING CHANGE: make pluralize convert "goose" to "geese" #9278
 * BREAKING CHANGE: the `Schema#noId` option is now removed, please use `_id` instead #9398
 * BREAKING CHANGE: remove MONGOOSE_DRIVER_PATH, use a setDriver() function on Mongoose instance instead #9604
 * feat(mongoose+query): add `sanitizeFilter` option and `mongoose.trusted()` to defend against query selector injection attacks #3944
 * feat(query): add Query#clone() so you can more easily re-execute a query #8708
 * feat(virtual+populate): allow `foreignField` to be a function #8568 [BJvdA](https://github.com/BJvdA)

5.13.5 / 2021-07-30
===================
 * perf(index.d.ts): improve typescript type checking performance #10515 [andreialecu](https://github.com/andreialecu)
 * fix(index.d.ts): fix debug type in MongooseOptions #10510 [thiagokisaki](https://github.com/thiagokisaki)
 * docs(api): clarify that `depopulate()` with no args depopulates all #10501 [gfrancz](https://github.com/gfrancz)

5.13.4 / 2021-07-28
===================
 * fix: avoid pulling non-schema paths from documents into nested paths #10449
 * fix(update): support overwriting nested map paths #10485
 * fix(update): apply timestamps to subdocs that would be newly created by `$setOnInsert` #10460
 * fix(map): correctly clone subdocs when calling toObject() on a map #10486
 * fix(cursor): cap parallel batchSize for populate at 5000 #10449
 * fix(index.d.ts): improve autocomplete for new Model() by making `doc` an object with correct keys #10475
 * fix(index.d.ts): add MongooseOptions interface #10471 [thiagokisaki](https://github.com/thiagokisaki)
 * fix(index.d.ts): make LeanDocument work with PopulatedDoc #10494
 * docs(mongoose+connection): correct default value for bufferTimeoutMS #10476
 * chore: remove unnecessary 'eslint-disable' comments #10466 [thiagokisaki](https://github.com/thiagokisaki)

5.13.3 / 2021-07-16
===================
 * fix(model): avoid throwing error when bulkSave() called on a document with no changes #10437
 * fix(timestamps): apply timestamps when creating new subdocs with `$addToSet` and with positional operator #10447
 * fix(schema): allow calling Schema#loadClass() with class that has a static getter with no setter #10436
 * fix(model): handle re-applying object defaults after explicitly unsetting #10442 [semirturgay](https://github.com/semirturgay)
 * fix: bump mongodb driver -> 3.6.10 #10440 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(index.d.ts): consistently use NativeDate instead of Date for Date validators and timestamps functions #10426
 * fix(index.d.ts): allow calling `discriminator()` with non-document #10452 #10421 [DouglasGabr](https://github.com/DouglasGabr)
 * fix(index.d.ts): allow passing ResultType generic to Schema#path() #10435

5.13.2 / 2021-07-03
===================
 * fix: hardcode @types/node version for now to avoid breaking changes from DefinitelyTyped/DefinitelyTyped#53669 #10415
 * fix(index.d.ts): allow using type: Date with Date paths in SchemaDefinitionType #10409
 * fix(index.d.ts): allow extra VirtualTypeOptions for better plugin support #10412
 * docs(api): add SchemaArray to docs #10397
 * docs(schema+validation): fix broken links #10396
 * docs(transactions): add note about creating a connection to transactions docs #10406

5.13.1 / 2021-07-02
===================
 * fix(discriminator): allow using array as discriminator key in schema and as tied value #10303
 * fix(index.d.ts): allow using & Document in schema definition for required subdocument arrays #10370
 * fix(index.d.ts): if using DocType that doesn't extends Document, default to returning that DocType from `toObject()` and `toJSON()` #10345
 * fix(index.d.ts): use raw DocType instead of LeanDocument when using `lean()` with queries if raw DocType doesn't `extends Document` #10345
 * fix(index.d.ts): remove err: any in callbacks, use `err: CallbackError` instead #10340
 * fix(index.d.ts): allow defining map of schemas in TypeScript #10389
 * fix(index.d.ts): correct return type for Model.createCollection() #10359
 * docs(promises+discriminators): correctly escape () in regexp to pull in examples correctly #10364
 * docs(update): fix outdated URL about unindexed upsert #10406 [grimmer0125](https://github.com/grimmer0125)
 * docs(index.d.ts): proper placement of mongoose.Date JSDoc [thiagokisaki](https://github.com/thiagokisaki)

5.13.0 / 2021-06-28
===================
 * feat(query): add sanitizeProjection option to opt in to automatically sanitizing untrusted query projections #10243
 * feat(model): add `bulkSave()` function that saves multiple docs in 1 `bulkWrite()` #9727 #9673 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * feat(document): allow passing a list of virtuals or `pathsToSkip` to apply in `toObject()` and `toJSON()` #10120
 * fix(model): make Model.validate use object under validation as context by default #10360 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * feat(document): add support for pathsToSkip in validate and validateSync #10375 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * feat(model): add `diffIndexes()` function that calculates what indexes `syncIndexes()` will create/drop without actually executing any changes #10362 [IslandRhythms](https://github.com/IslandRhythms)
 * feat(document): avoid using sessions that have ended, so you can use documents that were loaded in the session after calling `endSession()` #10306

5.12.15 / 2021-06-25
====================
 * fix(index.d.ts): add extra TInstanceMethods generic param to `Schema` for cases when we can't infer from Model #10358
 * fix(index.d.ts): added typings for near() in model aggregation #10373 [tbhaxor](https://github.com/tbhaxor)
 * fix(index.d.ts): correct function signature for `Query#cast()` #10388 [lkho](https://github.com/lkho)
 * docs(transactions): add import statement #10365 [JimLynchCodes](https://github.com/JimLynchCodes)
 * docs(schema): add missing `discriminatorKey` schema option #10386 #10376 [IslandRhythms](https://github.com/IslandRhythms)
 * docs(index.d.ts): fix typo #10363 [houssemchebeb](https://github.com/houssemchebeb)

5.12.14 / 2021-06-15
====================
 * fix(schema): check that schema type is an object when setting isUnderneathDocArray #10361 [vmo-khanus](https://github.com/vmo-khanus)
 * fix(document): avoid infinite recursion when setting single nested subdoc to array #10351
 * fix(populate): allow populating nested path in schema using `Model.populate()` #10335
 * fix(drivers): emit operation-start/operation-end events to allow inspecting when operations start and end
 * fix(index.d.ts): improve typings for virtuals #10350 [thiagokisaki](https://github.com/thiagokisaki)
 * fix(index.d.ts): correct constructor type for Document #10328
 * fix(index.d.ts): add `ValidationError` as a possible type for `ValidationError#errors` #10320 [IslandRhythms](https://github.com/IslandRhythms)
 * fix: remove unnecessary async devDependency that's causing npm audit warnings #10281
 * docs(typescript): add schemas guide #10308
 * docs(model): add options parameter description to `Model.exists()` #10336 [Aminoiz](https://github.com/Aminoiz)

5.12.13 / 2021-06-04
====================
 * perf(document): avoid creating nested paths when running `$getAllSubdocs()` #10275
 * fix: make returnDocument option work with `findOneAndUpdate()` #10232 #10231 [cnwangjie](https://github.com/cnwangjie)
 * fix(document): correctly reset subdocument when resetting a map subdocument underneath a single nested subdoc after save #10295
 * perf(query): avoid setting non-null sessions to avoid overhead from $getAllSubdocs() #10275
 * perf(document): pre split schematype paths when compiling schema to avoid extra overhead of splitting when hydrating documents #10275
 * perf(schema): pre-calculate mapPaths to avoid looping over every path for each path when initing doc #10275
 * fix(index.d.ts): drill down into nested arrays when creating LeanDocument type #10293

5.12.12 / 2021-05-28
====================
 * fix(documentarray): retain atomics when setting to a new array #10272
 * fix(query+model): fix deprecation warning for `returnOriginal` with `findOneAndUpdate()` #10298 #10297 #10292 #10285 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(index.d.ts): make `map()` result an array if used over an array #10288 [quantumsheep](https://github.com/quantumsheep)

5.12.11 / 2021-05-24
====================
 * fix(populate): skip applying setters when casting arrays for populate() to avoid issues with arrays of immutable elements #10264
 * perf(schematype): avoid cloning setters every time we run setters #9588
 * perf(get): add benchmarks and extra cases to speed up get() #9588
 * perf(array): improve array constructor performance on small arrays to improve nested array perf #9588
 * fix(index.d.ts): allow using type: [String] with string[] when using SchemaDefinition with generic #10261
 * fix(index.d.ts): support ReadonlyArray as well as regular array where possible in schema definitions #10260
 * docs(connection): document noListener option to useDb #10278 [stuartpb](https://github.com/stuartpb)
 * docs: migrate raw tutorial content from pug / JS to markdown #10271
 * docs: fix typo #10269 [sanjib](https://github.com/sanjib)

5.12.10 / 2021-05-18
====================
 * fix(query): allow setting `defaults` option on result documents from query options #7287 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(populate): handle populating embedded discriminator with custom tiedValue #10231
 * fix(document): allow passing space-delimited string of `pathsToValidate` to `validate()` and `validateSync()` #10258
 * fix(model+schema): support `loadClass()` on classes that have `collection` as a static property #10257 #10254 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(SchemaArrayOptions): correct property name #10236
 * fix(index.d.ts): add any to all query operators to minimize likelihood of "type instantiation is excessively deep" when querying docs with 4-level deep subdocs #10189
 * fix(index.d.ts): add $parent() in addition to parent() in TS definitions
 * fix(index.d.ts): correct async iterator return type for QueryCursor #10253 #10252 #10251 [borfig](https://github.com/borfig)
 * fix(index.d.ts): add `virtualsOnly` parameter to `loadClass()` function signature [IslandRhythms](https://github.com/IslandRhythms)
 * docs(typescript): add typescript populate docs #10212
 * docs: switch from AWS to Azure Functions for search #10244

5.12.9 / 2021-05-13
===================
 * fix(schema): ensure add() overwrites existing schema paths by default #10208 #10203
 * fix(schema): support creating nested paths underneath document arrays #10193
 * fix(update): convert nested dotted paths in update to nested paths to avoid ending up with dotted properties in update #10200
 * fix(document): allow calling validate() and validateSync() with `options` as first parameter #10216
 * fix(schema): apply static properties to model when using loadClass() #10206
 * fix(index.d.ts): allow returning Promise<void> from middleware functions #10229
 * fix(index.d.ts): add pre('distinct') hooks to TypeScript #10192

5.12.8 / 2021-05-10
===================
 * fix(populate): handle populating immutable array paths #10159
 * fix(CastError): add `toJSON()` function to ensure `name` property always ends up in `JSON.stringify()` output #10166 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(query): add allowDiskUse() method to improve setting MongoDB 4.4's new `allowDiskUse` option #10177
 * fix(populate): allow populating paths under mixed schematypes where some documents have non-object properties #10191
 * chore: remove unnecessary driver dynamic imports so Mongoose can work with Parcel #9603
 * fix(index.d.ts): allow any object as parameter to create() and `insertMany()` #10144
 * fix(index.d.ts): allow creating Model class with raw interface, no `extends Document` #10144
 * fix(index.d.ts): separate UpdateQuery from `UpdateWithAggregationPipeline` for cases when `UpdateQuery` is used as a function param #10186
 * fix(index.d.ts): don't require error value in pre/post hooks #10213 [michaln-q](https://github.com/michaln-q)
 * docs(typescript): add a typescript intro tutorial and statics tutorial #10021
 * docs(typescript): add query helpers tutorial #10021
 * docs(deprecations): add note that you can safely ignore `useFindAndModify` and `useCreateIndex` deprecation warnings #10155
 * chore(workflows): add node 16 to github actions #10201 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)

5.12.7 / 2021-04-29
===================
 * fix(document): make $getPopulatedDocs() return populated virtuals #10148
 * fix(discriminator): take discriminator schema's single nested paths over base schema's #10157
 * fix(discriminator): allow numbers and ObjectIds as tied values for discriminators #10130
 * fix(document): avoid double validating paths underneath mixed objects in save() #10141
 * fix(schema): allow path() to return single nested paths within document arrays #10164
 * fix(model+query): consistently wrap query callbacks in `process.nextTick()` to avoid clean stack traces causing memory leak when using synchronous recursion like `async.whilst()` #9864
 * fix(cursor): correctly report CastError when using noCursorTimeout flag #10150
 * fix(index.d.ts): add CastError constructor #10176
 * fix(index.d.ts): allow setting mongoose.pluralize(null) in TypeScript #10185
 * docs: add link to transactions guide from nav bar #10143
 * docs(validation): add section about custom error messages #10140
 * docs: make headers linkable via clicking #10156
 * docs: broken link in document.js #10190 [joostdecock](https://github.com/joostdecock)
 * docs: make navbar responsive on legacy 2.x docs #10171 [ad99526](https://github.com/ad99526)

5.12.6 / 2021-04-27
===================
 * fix(query): allow setting `writeConcern` schema option to work around MongoDB driver's `writeConcern` deprecation warning #10083 #10009 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(populate): dedupe when virtual populate foreignField is an array to avoid duplicate docs in result #10117
 * fix(populate): add `localField` filter to `$elemMatch` on virtual populate when custom `match` has a `$elemMatch` and `foreignField` is an array #10117
 * fix(query): convert projection string values to numbers as a workaround for #10142
 * fix(document): set version key filter on `save()` when using `optimisticConcurrency` if no changes in document #10128 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(model): use `obj` as `context` in `Model.validate()` if `obj` is a document #10132
 * fix(connection): avoid db events deprecation warning when using `useDb()` with `useUnifiedTopology` #8267
 * fix: upgrade to sift@13.5.2 to work around transitive dev dependency security warning #10121
 * fix(index.d.ts): allow any object as parameter to `create()` and `insertMany()` #10144
 * fix(index.d.ts): clarify that `eachAsync()` callback receives a single doc rather than array of docs unless `batchSize` is set #10135
 * fix(index.d.ts): clarify that return value from `validateSync()` is a ValidationError #10147 [michaln-q](https://github.com/michaln-q)
 * fix(index.d.ts): add generic type for Model constructor #10074 [Duchynko](https://github.com/Duchynko)
 * fix(index.d.ts): add parameter type in merge #10168 [yoonhoGo](https://github.com/yoonhoGo)

5.12.5 / 2021-04-19
===================
 * fix(populate): handle populating underneath document array when document array property doesn't exist in db #10003
 * fix(populate): clear out dangling pointers to populated docs so query cursor with populate() can garbage collect populated subdocs #9864
 * fix(connection): pull correct `autoCreate` value from Mongoose global when creating new model before calling `connect()` #10091
 * fix(populate): handle populating paths on documents with discriminator keys that point to non-existent discriminators #10082
 * fix(index.d.ts): allow numbers as discriminator names #10115
 * fix(index.d.ts): allow `type: Boolean` in Schema definitions #10085
 * fix(index.d.ts): allow passing array of aggregation pipeline stages to `updateOne()` and `updateMany()` #10095
 * fix(index.d.ts): support legacy 2nd param callback syntax for `deleteOne()`, `deleteMany()` #10122
 * docs(mongoose): make `useCreateIndex` always `false` in docs #10033
 * docs(schema): fix incorrect links from schema API docs #10111

5.12.4 / 2021-04-15
===================
 * fix: upgrade mongodb driver -> 3.6.6 #10079
 * fix: store fields set with select:false at schema-level when saving a new document #10101 [ptantiku](https://github.com/ptantiku)
 * fix(populate): avoid turning already populated field to null when populating an existing lean document #10068 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(populate): correctly populate lean subdocs with `_id` property #10069
 * fix(model): insertedDocs may contain docs that weren't inserted #10098 [olnazx](https://github.com/olnazx)
 * fix(schemaType): make type Mixed cast error objects to pojos #10131 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(populate): support populating embedded discriminators in nested arrays #9984
 * fix(populate): handle populating map paths using trailing `.$*` #10123
 * fix(populate): allow returning primitive from `transform()` function for single conventional populate #10064
 * fix(index.d.ts): allow generic classes of `T` to use `T & Document` internally #10046
 * fix(index.d.ts): allow `$pull` with `$` paths #10075
 * fix(index.d.ts): use correct `Date` type for `$currentDate` #10058
 * fix(index.d.ts): add missing asyncInterator to Query type def #10094 [borfig](https://github.com/borfig)
 * fix(index.d.ts): allow RHS of `$unset` properties to be any value #10066
 * fix(index.d.ts): allow setting SchemaType `index` property to a string #10077
 * refactor(index.d.ts): move discriminator() to common interface #10109 [LoneRifle](https://github.com/LoneRifle)

5.12.3 / 2021-03-31
===================
 * fix: avoid setting schema-level collation on text indexes #10044 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(query): add `writeConcern()` method to avoid writeConcern deprecation warning #10009
 * fix(connection): use queueing instead of event emitter for `createCollection()` and other helpers to avoid event emitter warning #9778
 * fix(connection): scope `Connection#id` to Mongoose instance so id always lines up with `mongoose.connections` index #10025 [IslandRhythms](https://github.com/IslandRhythms)
 * fix: avoid throwing in `promiseOrCallback()` if 3rd param isn't an EventEmitter #10055 [emrebass](https://github.com/emrebass)
 * fix(index.d.ts): add Model as 2nd generic param to `Model.discriminator()` #10054 [coro101](https://github.com/coro101)
 * fix(index.d.ts): add docs to `next()` callback for `pre('insertMany')` hooks #10078 #10072 [pezzu](https://github.com/pezzu)
 * fix(index.d.ts): add `transform` to PopulateOptions interface #10061
 * fix(index.d.ts): add DocumentQuery type for backwards compatibility #10036

5.12.2 / 2021-03-22
===================
 * fix(QueryCursor): consistently execute `post('find')` hooks with an array of docs #10015 #9982 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(schema): support setting `ref` as an option on an array SchemaType #10029
 * fix(query): apply schema-level `select` option from array schematypes #10029
 * fix(schema): avoid possible prototype pollution with `Schema()` constructor #10035 [zpbrent](https://github.com/zpbrent)
 * fix(model): make bulkWrite skip timestamps with timestamps: false #10050 [SoftwareSing](https://github.com/SoftwareSing)
 * fix(index.d.ts): make query methods return `QueryWithHelpers` so query helpers pass through chaining #10040
 * fix(index.d.ts): add `upserted` array to `updateOne()`, `updateMany()`, `update()` result #10042
 * fix(index.d.ts): add back `Aggregate#project()` types that were mistakenly removed in 5.12.0 #10043
 * fix(index.d.ts): always allow setting `type` in Schema to a SchemaType class or a Schema instance #10030
 * docs(transactions): introduce `session.withTransaction()` before `session.startTransaction()` because `withTransaction()` is the recommended approach #10008
 * docs(mongoose+browser): fix broken links to info about `mongoose.Types` #10016

5.12.1 / 2021-03-18
===================
 * fix: update mongodb -> 3.6.5 to fix circular dependency warning #9900
 * fix(document): make `toObject()` use child schema `flattenMaps` option by default #9995
 * fix(ObjectId): make `isValidObjectId()` check that length 24 strings are hex chars only #10010 #9996 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(query): correctly cast embedded discriminator paths when discriminator key is specified in array filter #9977
 * fix(schema): skip `populated()` check when calling `applyGetters()` with a POJO for mongoose-lean-getters support #9986
 * fix(populate): support populating dotted subpath of a populated doc that has the same id as a populated doc #10005
 * fix(index.d.ts): correct `this` for query helpers #10028 [francescov1](https://github.com/francescov1)
 * fix(index.d.ts): avoid omitting function property keys in LeanDocuments, because TS can't accurately infer what's a function if using generic functions #9989
 * fix(index.d.ts): correct type definition for `SchemaType#cast()` #10039 #9980
 * fix(index.d.ts): make SchemaTypeOptions a class, add missing `SchemaType#OptionsConstructor` #10001
 * fix(index.d.ts): support calling `findByIdAndUpdate()` with filter, update, callback params #9981

5.12.0 / 2021-03-11
===================
 * feat(populate): add `transform` option that Mongoose will call on every populated doc #3775
 * feat(query): make `Query#pre()` and `Query#post()` public #9784
 * feat(document): add `Document#getPopulatedDocs()` to return an array of all populated documents in a document #9702 [IslandRhythms](https://github.com/IslandRhythms)
 * feat(document): add `Document#getAllSubdocs()` to return an array of all single nested and array subdocuments #9764 [IslandRhythms](https://github.com/IslandRhythms)
 * feat(schema): allow `schema` as a schema path name #8798 [IslandRhythms](https://github.com/IslandRhythms)
 * feat(QueryCursor): Add batch processing for eachAsync #9902 [khaledosama999](https://github.com/khaledosama999)
 * feat(connection): add `noListener` option to help with use cases where you're using `useDb()` on every request #9961
 * feat(index): emit 'createConnection' event when user calls `mongoose.createConnection()` #9985
 * feat(connection+index): emit 'model' and 'deleteModel' events on connections when creating and deleting models #9983
 * feat(query): allow passing `explain` option to `Model.exists()` #8098 [IslandRhythms](https://github.com/IslandRhythms)

5.11.20 / 2021-03-11
====================
 * fix(query+populate): avoid unnecessarily projecting in subpath when populating a path that uses an elemMatch projection #9973
 * fix(connection): avoid `db` events deprecation warning with 'close' events #10004 #9930
 * fix(index.d.ts): make `$pull` more permissive to allow dotted paths #9993

5.11.19 / 2021-03-05
====================
 * fix(document): skip validating array elements that aren't modified when `validateModifiedOnly` is set #9963
 * fix(timestamps): apply timestamps on `findOneAndReplace()` #9951
 * fix(schema): correctly handle trailing array filters when looking up schema paths #9977
 * fix(schema): load child class getter for virtuals instead of base class when using `loadClass()` #9975
 * fix(index.d.ts): allow creating statics without passing generics to `Schema` constructor #9969
 * fix(index.d.ts): add QueryHelpers generic to schema and model, make all query methods instead return QueryWithHelpers #9850
 * fix(index.d.ts): support setting `type` to an array of schemas when using SchemaDefinitionType #9962
 * fix(index.d.ts): add generic to plugin schema definition #9968 [emiljanitzek](https://github.com/emiljanitzek)
 * docs: small typo fix #9964 [KrishnaMoorthy12](https://github.com/KrishnaMoorthy12)

5.11.18 / 2021-02-23
====================
 * fix(connection): set connection state to `disconnected` if connecting string failed to parse #9921
 * fix(connection): remove `db` events deprecation warning if `useUnifiedTopology = true` #9930
 * fix(connection): fix promise chaining for openUri #9960 [lantw44](https://github.com/lantw44)
 * fix(index.d.ts): add `PopulatedDoc` type to make it easier to define populated docs in interfaces #9818
 * fix(index.d.ts): allow explicitly overwriting `toObject()` return type for backwards compatibility #9944
 * fix(index.d.ts): correctly throw error when interface path type doesn't line up with schema path type #9958 [ShadiestGoat](https://github.com/ShadiestGoat)
 * fix(index.d.ts): remove `any` from `deleteX()` and `updateX()` query params and return values #9959 [btd](https://github.com/btd)
 * fix(index.d.ts): add non-generic versions of `Model.create()` for better autocomplete #9928
 * docs: correctly handle multiple `&gt` in API descriptions #9940

5.11.17 / 2021-02-17
====================
 * fix(populate): handle `perDocumentLimit` when multiple documents reference the same populated doc #9906
 * fix(document): handle directly setting embedded document array element with projection #9909
 * fix(map): cast ObjectId to string inside of MongooseMap #9938 [HunterKohler](https://github.com/HunterKohler)
 * fix(model): use schema-level default collation for indexes if index doesn't have collation #9912
 * fix(index.d.ts): make `SchemaTypeOptions#type` optional again to allow alternative typeKeys #9927
 * fix(index.d.ts): support `{ type: String }` in schema definition when using SchemaDefinitionType generic #9911
 * docs(populate+schematypes): document the `$*` syntax for populating every entry in a map #9907
 * docs(connection): clarify that `Connection#transaction()` promise resolves to a command result #9919

5.11.16 / 2021-02-12
====================
 * fix(document): skip applying array element setters when init-ing an array #9889
 * fix: upgrade to mongodb driver 3.6.4 #9893 [jooeycheng](https://github.com/jooeycheng)
 * fix: avoid copying Object.prototype properties when cloning #9876
 * fix(aggregate): automatically convert functions to strings when using `$function` operator #9897
 * fix: call pre-remove hooks for subdocuments #9895 #9885 [IslandRhythms](https://github.com/IslandRhythms)
 * docs: fix confusing sentence in Schema docs #9914 [namenyi](https://github.com/namenyi)

5.11.15 / 2021-02-03
====================
 * fix(document): fix issues with `isSelected` as an path in a nested schema #9884 #9873 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(index.d.ts): better support for `SchemaDefinition` generics when creating schema #9863 #9862 #9789
 * fix(index.d.ts): allow required function in array definition #9888 [Ugzuzg](https://github.com/Ugzuzg)
 * fix(index.d.ts): reorder create typings to allow array desctructuring #9890 [Ugzuzg](https://github.com/Ugzuzg)
 * fix(index.d.ts): add missing overload to Model.validate #9878 #9877 [jonamat](https://github.com/jonamat)
 * fix(index.d.ts): throw compiler error if schema says path is a String, but interface says path is a number #9857
 * fix(index.d.ts): make `Query` a class, allow calling `Query#where()` with object argument and with no arguments #9856
 * fix(index.d.ts): support calling `Schema#pre()` and `Schema#post()` with options and array of hooked function names #9844
 * docs(faq): mention other debug options than console #9887 [dandv](https://github.com/dandv)
 * docs(connections): clarify that Mongoose can emit 'error' both during initial connection and after initial connection #9853

5.11.14 / 2021-01-28
====================
 * fix(populate): avoid inferring `justOne` from parent when populating a POJO with a manually populated path #9833 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(document): apply setters on each element of the array when setting a populated array #9838
 * fix(map): handle change tracking on maps of subdocs #9811 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(document): remove dependency on `documentIsSelected` symbol #9841 [IslandRhythms](https://github.com/IslandRhythms)
 * fix(error): make ValidationError.toJSON to include the error name correctly #9849 [hanzki](https://github.com/hanzki)
 * fix(index.d.ts): indicate that `Document#remove()` returns a promise, not a query #9826
 * fix(index.d.ts): allow setting `SchemaType#enum` to TypeScript enum with `required: true` #9546

5.11.13 / 2021-01-20
====================
 * fix(map): handle change tracking on map of arrays #9813
 * fix(connection): allow passing options to `Connection#transaction()` #9834 [pnutmath](https://github.com/pnutmath)
 * fix(index.d.ts): make `Query#options#rawResult` take precedence over `new`+`upsert` #9816
 * fix(index.d.ts): changed setOptions's 'overwrite' argument to optional #9824 [pierissimo](https://github.com/pierissimo)
 * fix(index.d.ts): allow setting `mongoose.Promise` #9820
 * fix(index.d.ts): add `Aggregate#replaceRoot()` #9814
 * fix(index.d.ts): make `Model.create()` with a spread return a promise of array rather than single doc #9817
 * fix(index.d.ts): use SchemaDefinitionProperty generic for SchemaTypeOptions if specified #9815
 * docs(populate): add note about setting `toObject` for populate virtuals #9822

5.11.12 / 2021-01-14
====================
 * fix(document): handle using `db` as a document path #9798
 * fix(collection): make sure to call `onOpen()` if `autoCreate === false` #9807
 * fix(index.d.ts): correct query type for `findOneAndUpdate()` and `findByIdAndUpdate()` with `rawResult = true` #9803
 * fix(index.d.ts): require setting `new: true` or `returnOriginal: false` to skip null check with `findOneAndUpdate()` #9654
 * fix(index.d.ts): make methods and statics optional on schema #9801
 * fix(index.d.ts): remove non backwards compatible methods restriction #9801
 * docs: removed the extra word on comment doc #9794 [HenriqueLBorges](https://github.com/HenriqueLBorges)

5.11.11 / 2021-01-08
====================
 * fix(model): support calling `create()` with `undefined` as first argument and no callback #9765
 * fix(index.d.ts): ensure TypeScript knows that `this` refers to `DocType` in schema methods with strict mode #9755
 * fix(index.d.ts): make SchemaDefinition accept a model generic #9761 [mroohian](https://github.com/mroohian)
 * fix(index.d.ts): add `Aggregate#addFields()` #9774
 * fix(index.d.ts): allow setting `min` and `max` to [number, string] and [Date, string] #9762
 * fix(index.d.ts): improve context and type bindings for `Schema#methods` and `Schema#statics` #9717
 * docs: add recommended connection option #9768 [Fernando-Lozano](https://github.com/Fernando-Lozano)
 * chore: correct improper date in History.md #9783 [botv](https://github.com/botv)

5.11.10 / 2021-01-04
====================
 * fix(model): support `populate` option for `insertMany()` as a workaround for mongoose-autopopulate #9720
 * perf(schema): avoid creating extra array when initializing array of arrays #9588
 * perf(schema): avoid setting `arrayPath` when casting to a non-array, avoid unnecessarily setting atomics #9588
 * perf(schema): avoid expensive `String#slice()` call when creating a new array #9588
 * fix(queryhelpers): avoid modifying `lean.virtuals` in place #9754
 * fix: fall back to legacy treatment for square brackets if square brackets contents aren't a number #9640
 * fix(document): make fix for #9396 handle null values more gracefully #9709
 * fix(index.d.ts): add missing overloaded function for Document#populate() #9744 [sahasayan](https://github.com/sahasayan)
 * fix(index.d.ts): allow Model.create param1 overwrite #9753 [hasezoey](https://github.com/hasezoey)
 * fix(index.d.ts): improve autocomplete for query middleware #9752 [3Aahmednaser94](https://github.com/3Aahmednaser94)
 * fix(index.d.ts): add missing function for Aggregate#group() #9750 [coro101](https://github.com/coro101)
 * fix(index.d.ts): add missing `Aggregate#project()` #9763 [vorticalbox](https://github.com/vorticalbox)
 * fix(index.d.ts): allow `null` as an enum value for schematypes #9746
 * docs(guide+schema): make schema API docs and guide docs' list of Schema options line up #9749
 * docs(documents): add some more details about what the `save()` promise resolves to #9689
 * docs(subdocs): add section about subdocument defaults #7291
 * chore: run GitHub CI on PRs and update badge #9760 [YC](https://github.com/YC)

5.11.9 / 2020-12-28
===================
 * fix(document): keeps atomics when assigning array to filtered array #9651
 * fix(document): apply `defaults` option to subdocument arrays #9736
 * fix(index.d.ts): allow passing generic parameter to overwrite `lean()` result type #9728
 * fix(index.d.ts): add missing pre hook for findOneAndUpdate #9743 [sahasayan](https://github.com/sahasayan)
 * fix(index.d.ts): schema methods & statics types #9725
 * fix(index.d.ts): allow `id` paths with non-string values in TypeScript #9723
 * fix(index.d.ts): support calling `createIndexes()` and `ensureIndexes()` with just callback #9706
 * fix(index.d.ts): include `__v` in LeanDocuments #9687
 * fix(index.d.ts): add missing `Aggregate#append()` #9714
 * chore: add eslint typescript support and lint index.d.ts file #9729 [simllll](https://github.com/simllll)
 * chore: add Github Actions #9688 [YC](https://github.com/YC)

5.11.8 / 2020-12-14
===================
 * fix(index.d.ts): add missing single document populate #9696 [YC](https://github.com/YC)
 * fix(index.d.ts): make options optional for `toObject` #9700
 * fix(index.d.ts): added missing match and model methods in Aggregate class #9710 [manekshms](https://github.com/manekshms)
 * fix(index.d.ts): make options optional for `createIndexes()` and `ensureIndexes()` #9706
 * fix(index.d.ts): support passing a function to `ValidateOpts.message` #9697
 * docs: add media query for ::before on headings #9705 #9704 [YC](https://github.com/YC)

5.11.7 / 2020-12-10
===================
 * fix(document): ensure calling `get()` with empty string returns undefined for mongoose-plugin-autoinc #9681
 * fix(model): set `isNew` to false for documents that were successfully inserted by `insertMany` with `ordered = false` when an error occurred #9677
 * fix(index.d.ts): add missing Aggregate#skip() & Aggregate#limit() #9692 [sahasayan](https://github.com/sahasayan)
 * fix(index.d.ts): make `Document#id` optional so types that use `id` can use `Model<IMyType & Document>` #9684

5.11.6 / 2020-12-09
===================
 * fix(middleware): ensure sync errors in pre hooks always bubble up to the calling code #9659
 * fix(index.d.ts): allow passing ObjectId properties as strings to `create()` and `findOneAndReplace()` #9676
 * fix(index.d.ts): allow calling `mongoose.model()` and `Connection#model()` with model as generic param #9685 #9678 [sahasayan](https://github.com/sahasayan)
 * fix(index.d.ts): Fix return type of Model#aggregate() #9680 [orgads](https://github.com/orgads)
 * fix(index.d.ts): optional next() parameter for post middleware #9683 [isengartz](https://github.com/isengartz)
 * fix(index.d.ts): allow array of validators in SchemaTypeOptions #9686 [cjroebuck](https://github.com/cjroebuck)

5.11.5 / 2020-12-07
===================
 * fix(map): support `null` in maps of subdocs #9628
 * fix(index.d.ts): support object syntax for `validate` #9667
 * fix(index.d.ts): Allow number for Schema expires #9670 [alecgibson](https://github.com/alecgibson)
 * fix(index.d.ts): allow definining arbitrary properties on SchemaTypeOpts for plugins like mongoose-autopopulate #9669
 * fix(index.d.ts): add mongoose.models #9661 #9660 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(index.d.ts): allow the next() argument to be optional #9665 #9664 [sahasayan](https://github.com/sahasayan)
 * fix(index.d.ts): add missing `VirtualType#applyGetters()` and `applySetters()`, `Schema#virtuals`, `Schema#childSchemas`, `Query#_mongooseOptions` #9658
 * fix(index.d.ts): add `id` to LeanDocuments in case it is defined in the user's schema #9657
 * fix(index.d.ts): add missing types for hook functions #9653
 * fix(index.d.ts): improve support for strict null checks with `upsert` and `orFail()` #9654
 * fix(index.d.ts): make return values for `insertMany()` more consistent #9662
 * fix(index.d.ts): Change options in Connection#collection() to be optional #9663 [orgads](https://github.com/orgads)
 * fix(index.d.ts): add the missing generic declaration for Schema #9655 [sahasayan](https://github.com/sahasayan)
 * fix(index.d.ts): add missing `SchemaTypeOpts` and `ConnectionOptions` aliases for backwards compat
 * docs(populate): remove `sort()` from `limit` example to avoid potential confusion #9584
 * docs(compatibility): add MongoDB server 4.4 version compatibility #9641

5.11.4 / 2020-12-04
===================
 * fix(index.d.ts): add `Document#__v` so documents have a Version by default #9652 [sahasayan](https://github.com/sahasayan)
 * fix(index.d.ts): add missing `session` option to `SaveOptions` #9642
 * fix(index.d.ts): add `Schema#paths`, `Schema#static(obj)`, `Embedded#schema`, `DocumentArray#schema`, make Schema inherit from EventEmitter #9650
 * fix(index.d.ts): order when cb is optional in method #9647 [CatsMiaow](https://github.com/CatsMiaow)
 * fix(index.d.ts): use DocumentDefinition for `FilterQuery` #9649
 * fix(index.d.ts): correct callback result types for `find()`, `findOne()`, `findById()` #9648
 * fix(index.d.ts): remove `Document#parent()` method because it conflicts with existing user code #9645
 * fix(index.d.ts): add missing `Connection#db` property #9643
 * test(typescript): add `tsconfig.json` file for intellisense #9611 [alecgibson](https://github.com/alecgibson)

5.11.3 / 2020-12-03
===================
 * fix(index.d.ts): make Mongoose collection inherit MongoDB collection #9637 #9630 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(index.d.ts): add `Document#_id` so documents have an id by default #9632
 * fix(index.d.ts): allow inline schema definitions for nested properties #9639 [Green-Cat](https://github.com/Green-Cat)
 * fix(index.d.ts): add support for missing error message definitions #9638 [SaifAlsabe](https://github.com/SaifAlsabe)
 * fix(schema+discriminator): support defining recursive embedded discriminators by passing document array schematype to discriminator #9600
 * fix(index.d.ts): make it possible to use `LeanDocument` with arrays #9620
 * fix(index.d.ts): add `ModelUpdateOptions` as alias for `QueryOptions` for backwards compat #9637

5.11.2 / 2020-12-02
===================
 * fix(index.d.ts): add missing query options and model `findById()` function #9626 #9620
 * fix(index.d.ts): support defining schema paths as arrays of functions #9617
 * fix(index.d.ts): add automatic `_id` for Document, support creating Mongoose globals and accessing collection name #9618
 * fix(index.d.ts): add missing global `get()` and `set()` #9616
 * fix(index.d.ts): add missing `new` and `returnOriginal` options to QueryOptions, add missing model static properties #9627 #9616 #9615
 * fix(index.d.ts): allow `useCreateIndex` in connection options #9621

5.11.1 / 2020-12-01
===================
 * fix(index.d.ts): add missing SchemaOptions #9606
 * fix(index.d.ts): allow using `$set` in updates #9609
 * fix(index.d.ts): add support for using return value of `createConnection()` as a connection as well as a promise #9612 #9610 [alecgibson](https://github.com/alecgibson)
 * fix(index.d.ts): allow using `Types.ObjectId()` without `new` in TypeScript #9608

5.11.0 / 2020-11-30
===================
 * feat: add official TypeScript definitions `index.d.ts` file #8108
 * feat(connection): add bufferTimeoutMS option that configures how long Mongoose will allow commands to buffer #9469
 * feat(populate): support populate virtuals with `localField` and `foreignField` as arrays #6608
 * feat(populate+virtual): feat: support getters on populate virtuals, including `get` option for `Schema#virtual()` #9343
 * feat(populate+schema): add support for `populate` schematype option that sets default populate options #6029
 * feat(QueryCursor): execute post find hooks for each doc in query cursor #9345
 * feat(schema): support overwriting cast logic for individual schematype instances #8407
 * feat(QueryCursor): make cursor `populate()` in batch when using `batchSize` #9366 [biomorgoth](https://github.com/biomorgoth)
 * chore: remove changelog from published bundle #9404
 * feat(model+mongoose): add `overwriteModels` option to bypass `OverwriteModelError` globally #9406
 * feat(model+query): allow defining middleware for all query methods or all document methods, but not other middleware types #9190
 * feat(document+model): make change tracking skip saving if new value matches last saved value #9396
 * perf(utils): major speedup for `deepEqual()` on documents and arrays #9396
 * feat(schema): support passing a TypeScript enum to `enum` validator in schema #9547 #9546 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * feat(debug): #8963 `shell` option for date format (ISODate) #9532 [FlameFractal](https://github.com/FlameFractal)
 * feat(document): support square bracket indexing for `get()`, `set()` #9375
 * feat(document): support array and space-delimited syntax for `Document#$isValid()`, `isDirectSelected()`, `isSelected()`, `$isDefault()` #9474
 * feat(string): make `minLength` and `maxLength` behave the same as `minlength` and `maxlength` #8777 [m-weeks](https://github.com/m-weeks)
 * feat(document): add `$parent()` as an alias for `parent()` for documents and subdocuments to avoid path name conflicts #9455

5.10.19 / 2020-11-30
====================
 * fix(query): support passing an array to `$type` in query filters #9577
 * perf(schema): avoid creating unnecessary objects when casting to array #9588
 * docs: make example gender neutral #9601 [rehatkathuria](https://github.com/rehatkathuria)

5.10.18 / 2020-11-29
====================
 * fix(connection): connect and disconnect can be used destructured #9598 #9597 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)

5.10.17 / 2020-11-27
====================
 * fix(document): allow setting fields after an undefined field #9587 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)

5.10.16 / 2020-11-25
====================
 * fix(connection): copy config options from connection rather than base connection when calling `useDb()` #9569
 * fix(schema): support `of` for array type definitions to be consistent with maps #9564
 * docs(dates): fix broken example reference #9557 [kertof](https://github.com/kertof)
 * docs(virtualtype): remove unintentional h2 tag re: tj/dox#60 #9568

5.10.15 / 2020-11-16
====================
 * fix(array): make sure `Array#toObject()` returns a vanilla JavaScript array in Node.js 6+ #9540
 * fix(connection): make `disconnect()` stop Mongoose if it is trying to reconnect #9531
 * fix: ensure `Document#overwrite()` correctly overwrites maps #9549
 * fix(document): make transform work with nested paths #9544 #9543 [jonathan-wilkinson](https://github.com/jonathan-wilkinson)
 * fix(query): maxTimeMS in count, countDocuments, distinct #9552 [FlameFractal](https://github.com/FlameFractal)
 * fix(schema): remove warning re: `increment` as a schema path name #9538
 * fix(model): automatically set `partialFilterExpression` for indexes in discriminator schemas #9542

5.10.14 / 2020-11-12
====================
 * fix(update): handle casting immutable object properties with `$setOnInsert` #9537
 * fix(discriminator): overwrite instead of merge if discriminator schema specifies a path is single nested but base schema has path as doc array #9534
 * docs(middleware): clarify that you need to set both `document` and `query` on `remove` hooks to get just document middleware #9530 [mustafaKamal-fe](https://github.com/mustafaKamal-fe)
 * docs(CONTRIBUTING): remove mmapv1 recommendation and clean up a few other details #9529
 * refactor: remove duplicate function definition #9527 [ksullivan](https://github.com/ksullivan)

5.10.13 / 2020-11-06
====================
 * fix: upgrade mongodb driver -> 3.6.3 for Lambda cold start fixes #9521 #9179 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(document): correctly handle setting props to other nested props #9519

5.10.12 / 2020-11-04
====================
 * fix(connection): catch and report sync errors in connection wrappers like `startSession()` #9515
 * fix(document): ignore getters when diffing values for change tracking #9501
 * fix(connection): avoid executing promise handler unless it's a function #9507 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(error): throw more helpful error when connecting to a non-SSL MongoDB server with SSL enabled #9511
 * docs(model+query): clarify that `deleteOne` and `deleteMany` trigger middleware #9504
 * docs(ssl): add note about `ssl` defaulting to `true` for srv connection strings #9511

5.10.11 / 2020-10-26
====================
 * fix(connection): when calling `mongoose.connect()` multiple times in parallel, make 2nd call wait for connection before resolving #9476
 * fix(map): make `save()` persist `Map#clear()` #9493
 * fix(document): avoid overwriting array subdocument when setting dotted path that isn't selected #9427
 * fix(connection): don't throw Atlas error if server discovery doesn't find any servers #9470
 * docs: update options for Model.findOneAndUpdate #9499 [radamson](https://github.com/radamson)

5.10.10 / 2020-10-23
====================
 * fix(schema): handle merging schemas from separate Mongoose module instances when schema has a virtual #9471
 * fix(connection): make connection.then(...) resolve to a connection instance #9497 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(aggregate): when using $search with discriminators, add `$match` as the 2nd stage in pipeline rather than 1st #9487
 * fix(query): cast $nor within $elemMatch #9479
 * docs(connection): add note about 'error' event versus 'disconnected' event #9488 [tareqdayya](https://github.com/tareqdayya)

5.10.9 / 2020-10-09
===================
 * fix(update): strip out unused array filters to avoid "filter was not used in the update" error #9468
 * fix(mongoose): allow setting `autoCreate` as a global option to be consistent with `autoIndex` #9466

5.10.8 / 2020-10-05
===================
 * fix(schema): handle setting nested paths underneath single nested subdocs #9459
 * fix(schema+index): allow calling `mongoose.model()` with schema from a different Mongoose module instance #9449
 * fix(transaction): fix saving new documents w/ arrays in transactions #9457 [PenguinToast](https://github.com/PenguinToast)
 * fix(document): track `reason` on cast errors that occur while init-ing a document #9448
 * fix(model): make `createCollection()` not throw error when collection already exists to be consistent with v5.9 #9447
 * docs(connections): add SSL connections docs #9443
 * docs(query_casting): fix typo #9458 [craig-davis](https://github.com/craig-davis)

5.10.7 / 2020-09-24
===================
 * fix(schema): set correct path and schema on nested primitive arrays #9429
 * fix(document): pass document to required validator so `required` can use arrow functions #9435 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(document): handle required when schema has property named `isSelected` #9438
 * fix(timestamps): allow using timestamps when schema has a property named 'set' #9428
 * fix(schema): make `Schema#clone()` use parent Mongoose instance's Schema constructor #9426

5.10.6 / 2020-09-18
===================
 * fix(populate): handle `options.perDocumentLimit` option same as `perDocumentLimit` when calling `populate()` #9418
 * fix(document): invalidate path if default function throws an error #9408
 * fix: ensure subdocument defaults run after initial values are set when initing #9408
 * docs(faq+queries): add more detail about duplicate queries, including an faq entry #9386
 * docs: replace var with let and const in docs and test files #9414 [jmadankumar](https://github.com/jmadankumar)
 * docs(model+query): document using array of strings as projection #9413
 * docs(middleware): add missing backtick #9425 [tphobe9312](https://github.com/tphobe9312)

5.10.5 / 2020-09-11
===================
 * fix: bump mongodb -> 3.6.2 #9411 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(query+aggregate+cursor): support async iteration over a cursor instance as opposed to a Query or Aggregate instance #9403
 * fix(document): respect child schema `minimize` if `toObject()` is called without an explicit `minimize` #9405
 * docs(guide): use const instead of var #9394 [nainardev](https://github.com/nainardev)
 * docs(query): link to lean, findOneAndUpdate, query casting tutorials from query docs #9410

5.10.4 / 2020-09-09
===================
 * fix(document): allow setting nested path to instance of model #9392
 * fix: handle `findOneAndRemove()` with `orFail()` #9381
 * fix(schema): support setting `_id` option to `false` after instantiating schema #9390
 * docs(document): fix formatting on `getChanges()` #9376

5.10.3 / 2020-09-03
===================
 * fix: upgrade mongodb -> 3.6.1 #9380 [lamhieu-vk](https://github.com/lamhieu-vk)
 * fix(populate): allow populating paths underneath subdocument maps #9359
 * fix(update): handle casting map paths when map is underneath a single nested subdoc #9298
 * fix(discriminator): avoid removing nested path if both base and discriminator schema have the same nested path #9362
 * fix(schema): support `Schema#add()` with schematype instances with different paths #9370
 * docs(api): fix typo in `Query#get()` example #9372 [elainewlin](https://github.com/elainewlin)

5.10.2 / 2020-08-28
===================
 * fix(model): avoid uncaught error if `insertMany()` fails due to server selection error #9355
 * fix(aggregate): automatically convert accumulator function options to strings #9364
 * fix(document): handle `pull()` on a document array when `_id` is an alias #9319
 * fix(queryhelpers): avoid path collision error when projecting in discriminator key with `.$` #9361
 * fix: fix typo in error message thrown by unimplemented createIndex #9367 [timhaley94](https://github.com/timhaley94)
 * docs(plugins): note that plugins should be applied before you call `mongoose.model()` #7723

5.10.1 / 2020-08-26
===================
 * fix(mongoose): fix `.then()` is not a function error when calling `mongoose.connect()` multiple times #9358 #9335 #9331
 * fix: allow calling `create()` after `bulkWrite()` by clearing internal casting context #9350
 * fix(model): dont wipe out changes made while `save()` is in-flight #9327
 * fix(populate): skip checking `refPath` if the path to populate is undefined #9340
 * fix(document): allow accessing document values from function `default` on array #9351
 * fix(model): skip applying init hook if called with `schema.pre(..., { document: false })` #9316
 * fix(populate): support `retainNullValues` when setting `_id` to `false` for subdocument #9337 #9336 [FelixRe0](https://github.com/FelixRe0)
 * docs: update connect example to avoid deprecation warnings #9332 [moander](https://github.com/moander)

5.10.0 / 2020-08-14
===================
 * feat: upgrade to MongoDB driver 3.6 for full MongoDB 4.4 support
 * feat(connection): add `Connection#transaction()` helper that handles resetting Mongoose document state if the transaction fails #8380
 * feat(connection): make transaction() helper reset array atomics after failed transaction
 * feat(schema+model): add `optimisticConcurrency` option to use OCC for `save()` #9001 #5424
 * feat(aggregate): add `Aggregate#search()` for Atlas Text Search #9115
 * feat(mongoose): add support for setting `setDefaultsOnInsert` as a global option #9036 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * feat(mongoose): add support for setting `returnOriginal` as a global option #9189 #9183 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * feat(mongoose): allow global option mongoose.set('strictQuery', true) #9016 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * feat(document): add Document#getChanges #9097 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * feat(document): support `defaults` option to disable adding defaults to a single document #8271
 * feat(SingleNestedPath+DocumentArray): add static `set()` function for global options, support setting `_id` globally #8883
 * feat(query): handle casting `$or` when each clause contains a different discriminator key #9018
 * feat(query): add overwriteDiscriminatorKey option that allows changing the discriminator key in `findOneAndUpdate()`, `updateOne()`, etc. #6087
 * fix(connection): make calling `mongoose.connect()` while already connected a no-op #9203
 * feat(connection): add `getClient()` and `setClient()` function for interacting with a connection's underlying MongoClient instance #9164
 * feat(document+populate): add `parent()` function that allows you to get the parent document for populated docs #8092
 * feat(document): add `useProjection` option to `toObject()` and `toJSON()` for hiding deselected fields on newly created documents #9118

5.9.29 / 2020-08-13
===================
 * fix(document): support setting nested path to itself when it has nested subpaths #9313
 * fix(model): make `syncIndexes()` report error if it can't create an index #9303
 * fix: handle auth error when Atlas username is incorrect #9300

5.9.28 / 2020-08-07
===================
 * fix(connection): consistently stop buffering when "reconnected" is emitted #9295
 * fix(error): ensure `name` and `message` show up on individual ValidatorErrors when calling JSON.stringify() on a ValidationError #9296
 * fix(document): keeps manually populated paths when setting a nested path to itself #9293
 * fix(document): allow saving after setting document array to itself #9266
 * fix(schema): handle `match` schema validator with `/g` flag #9287
 * docs(guide): refactor transactions examples to async/await #9204

5.9.27 / 2020-07-31
===================
 * fix: upgrade mongodb driver -> 3.5.10 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs(transactions): make transactions docs use async/await for readability #9204

5.9.26 / 2020-07-27
===================
 * fix(document): allow unsetting boolean field by setting the field to `undefined` #9275
 * fix(document): throw error when overwriting a single nested subdoc changes an immutable path within the subdoc #9281
 * fix(timestamps): apply timestamps to `bulkWrite()` updates when not using `$set` #9268
 * fix(browser): upgrade babel to v7 to work around an issue with `extends Error` #9273
 * fix: make subdocument's `invalidate()` methods have the same return value as top-level document #9271
 * docs(model): make `create()` docs use async/await, and add another warning about how `create()` with options requires array syntax #9280
 * docs(connections): clarify that Mongoose can emit 'connected' when reconnecting after losing connectivity #9240
 * docs(populate): clarify that you can't filter based on foreign document properties when populating #9279
 * docs(document+model): clarify how `validateModifiedOnly` option works #9263
 * docs: remove extra poolSize option in comment #9270 [shahvicky](https://github.com/shahvicky)
 * docs: point bulkWrite() link to mongoose docs instead of localhost #9284

5.9.25 / 2020-07-17
===================
 * fix(discriminator): allow passing a compiled model's schema as a parameter to `discriminator()` #9238
 * fix(connection): throw more readable error when querying db before initial connection when `bufferCommands = false` #9239
 * fix(indexes): don't unnecessarily drop text indexes when running `syncIndexes()` #9225
 * fix: make Boolean _castNullish respect omitUndefined #9242 [ehpc](https://github.com/ehpc)
 * fix(populate): populate single nested discriminator underneath doc array when populated docs have different model but same id #9244
 * docs(mongoose): correct formatting typo #9247 [JNa0](https://github.com/JNa0)

5.9.24 / 2020-07-13
===================
 * fix(connection): respect connection-level `bufferCommands` option if `mongoose.connect()` is called after `mongoose.model()` #9179
 * fix(document): clear out `priorDoc` after overwriting single nested subdoc so changes after overwrite get persisted correctly #9208
 * fix(connection): dont overwrite user-specified `bufferMaxEntries` when setting `bufferCommands` #9218
 * fix(model): allow passing projection to `Model.hydrate()` #9209
 * fix(schema+document): support adding `null` to schema boolean's `convertToFalse` set #9223
 * docs(model): make `find` and `findOne()` examples use async/await and clarify `find({})` is find all #9210

4.13.21 / 2020-07-12
====================
 * fix(query): delete top-level `_bsontype` property in queries to prevent silent empty queries #8222

5.9.23 / 2020-07-10
===================
 * fix(model): fix `syncIndexes()` error when db index has a collation but Mongoose index does not #9224 [clhuang](https://github.com/clhuang)
 * fix(array): only cast array to proper depth if it contains an non-array value #9217 #9215 [cyrilgandon](https://github.com/cyrilgandon)
 * docs(schematype): document the `transform` option #9211
 * docs(mongoose): fix typo #9212 [JNa0](https://github.com/JNa0)

5.9.22 / 2020-07-06
===================
 * fix(schema): treat `{ type: mongoose.Schema.Types.Array }` as equivalent to `{ type: Array }` #9194
 * fix: revert fix for #9107 to avoid issues when calling `connect()` multiple times #9167
 * fix(update): respect storeSubdocValidationError option with update validators #9172
 * fix: upgrade to safe-buffer 5.2 #9198
 * docs: add a note about SSL validation to migration guide #9147
 * docs(schemas): fix inconsistent header #9196 [samtsai15](https://github.com/samtsai15)

5.9.21 / 2020-07-01
===================
 * fix: propagate `typeKey` option to implicitly created schemas from `typePojoToMixed` #9185 [joaoritter](https://github.com/joaoritter)
 * fix(populate): handle embedded discriminator `refPath` with multiple documents #9153
 * fix(populate): handle deselected foreign field with `perDocumentLimit` and multiple documents #9175
 * fix(document): disallow `transform` functions that return promises #9176 #9163 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(document): use strict equality when checking mixed paths for modifications #9165
 * docs: add target="_blank" to all edit links #9058

5.9.20 / 2020-06-22
===================
 * fix(populate): handle populating primitive array under document array discriminator #9148
 * fix(connection): make sure to close previous connection when calling `openUri()` on an already open connection #9107
 * fix(model): fix conflicting $setOnInsert default values with `update` values in bulkWrite #9160 #9157 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs(validation): add note about validateBeforeSave and invalidate #9144 [dandv](https://github.com/dandv)
 * docs: specify the array field syntax for invalidate #9137 [dandv](https://github.com/dandv)
 * docs: fix several typos and broken references #9024 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs: fix minor typo #9143 [dandv](https://github.com/dandv)

5.9.19 / 2020-06-15
===================
 * fix: upgrade mongodb driver -> 3.5.9 #9124 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix: copy `required` validator on single nested subdoc correctly when calling `Schema#clone()` #8819
 * fix(discriminator): handle `tiedValue` when casting update on nested paths #9108
 * fix(model): allow empty arrays for bulkWrite #9132 #9131 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(schema): correctly set partialFilterExpression for nested schema indexes #9091
 * fix(castArrayFilters): handle casting on all fields of array filter #9122 [lafeuil](https://github.com/lafeuil)
 * fix(update): handle nested path createdAt when overwriting parent path #9105
 * docs(subdocs): add some notes on the difference between single nested subdocs and nested paths #9085
 * docs(subdocs): improve docs on `typePojoToMixed` #9085
 * docs: add note about connections in `globalSetup` with Jest #9063
 * docs: add schema and how to set default sub-schema to schematype options #9111 [dfle](https://github.com/dfle)
 * docs(index): use `const` instead of `var` in examples #9125 [dmcgrouther](https://github.com/dmcgrouther)
 * docs: corrected markdown typo #9117

5.9.18 / 2020-06-05
===================
 * fix: improve atlas error in the event of incorrect password #9095
 * docs: add edit link for all docs pages #9058
 * fix(document): allow accessing `$locals` when initializing document #9099 #9098 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(query): make `setDefaultsOnInsert` a mongoose option so it doesn't end up in debug output #9086
 * docs(connection+index): add serverSelectionTimeoutMS and heartbeatFrequencyMS to `connect()` and `openUri()` options #9071
 * docs(geojson): add notes about geojson 2dsphere indexes #9044
 * docs: make active page bold in navbar #9062
 * docs: correct a typo in a code snippet #9089 [Elvis-Sarfo](https://github.com/Elvis-Sarfo)

5.9.17 / 2020-06-02
===================
 * fix(document): avoid tracking changes like `splice()` on slice()-ed arrays #9011
 * fix(populate): make populating a nested path a no-op #9073
 * fix(document): clear nested cast errors when overwriting an array path #9080
 * fix: upgrade mongodb to v3.5.8 #9069 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs(document): add validateModifiedOnly to Document#save(), Document#validateSync() and Document#validate() #9078 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs(faq): fix typo #9075 [tigransimonyan](https://github.com/tigransimonyan)
 * docs: document all parameters to .debug #9029 [dandv](https://github.com/dandv)
 * docs: fix property value in Getters example #9061 [ismet](https://github.com/ismet)

5.9.16 / 2020-05-25
===================
 * perf(error): convert errors to classes extending Error for lower CPU overhead #9021 [zbjornson](https://github.com/zbjornson)
 * fix(query): throw CastError if filter `$and`, `$or`, `$nor` contain non-object values #8948
 * fix(bulkwrite): cast filter & update to schema after applying timestamps #9030 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(document): don't overwrite defaults with undefined keys in nested documents #9039 [vitorhnn](https://github.com/vitorhnn)
 * fix(discriminator): remove discriminator schema nested paths pulled from base schema underneath a mixed path in discriminator schema #9042
 * fix(model): make syncIndexes() not drop index if all user-specified collation options are the same #8994
 * fix(document): make internal `$__.scope` property a symbol instead to work around a bug with fast-safe-stringify #8955
 * docs: model.findByIdAndUpdate() 'new' param fix #9026 [dandv](https://github.com/dandv)

5.9.15 / 2020-05-18
===================
 * fix(schema): treat creating dotted path with no parent as creating a nested path #9020
 * fix(documentarray): make sure you can call `unshift()` after `map()` #9012 [philippejer](https://github.com/philippejer)
 * fix(model): cast bulkwrite according to discriminator schema if discriminator key is present #8982 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(schema): remove `db` from reserved keywords #8940
 * fix(populate): treat populating a doc array that doesn't have a `ref` as a no-op #8946
 * fix(timestamps): set createdAt and updatedAt on doubly nested subdocs when upserting #8894
 * fix(model): allow POJOs as schemas for model.discriminator(...) #8991 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(model): report `insertedDocs` on `insertMany()` errors #8938
 * fix(model): ensure consistent `writeErrors` property on insertMany error with `ordered: false`, even if only one op failed #8938
 * docs: add anchor tag to strictQuery and strict #9014 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs(faq): remove faq ipv6 #9004
 * docs: add note about throwing error only after validation and fix broken reference to api/CastError #8993 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs: fix typos in documents.pug #9005 [dandv](https://github.com/dandv)

5.9.14 / 2020-05-13
===================
 * fix(cursor): add index as second parameter to eachAsync callback #8972 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(query): cast filter according to discriminator schema if discriminator key in filter #8881
 * fix(model): fix throwing error when populating virtual path defined on child discriminator #8924 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(errors): handle case when user has make `Error.prototype.toJSON` read only #8986 [osher](https://github.com/osher)
 * fix(model): add `kind` to cast errors thrown by query execution #8953 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(update): use child schema strict on single nested updates if useNestedStrict not set #8922
 * docs(model): improve `save()` docs #8956 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs: add immutable type to Schema Types #8987 [Andrew5569](https://github.com/Andrew5569)
 * docs: sort schema reserved keys in documentation #8966 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)

5.9.13 / 2020-05-08
===================
 * fix(schema): mark correct path as modified when setting a path underneath a nested array of documents #8926
 * fix(query): Query#select({ field: false }) should not overwrite schema selection options #8929 #8923
 * fix(update): handle immutable properties are ignored in bulk upserts #8952 [philippejer](https://github.com/philippejer)
 * docs(browser): add back sample webpack config #8890
 * docs(faq): fix broken reference in limit vs perDocumentLimit #8937

5.9.12 / 2020-05-04
===================
 * fix(document): report cast error on array elements with array index instead of just being a cast error for the whole array #8888
 * fix(connection): throw more helpful error in case of IP whitelisting issue with Atlas #8846
 * fix(schema): throw error on schema with reserved key with type of object #8869 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(connection): inherit config for useDB from default connection #8267 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(query): set mongodb options for `distinct()` #8906 [clhuang](https://github.com/clhuang)
 * fix(schema): allow adding descending indexes on schema #8895 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(document): set defaults if setting nested path to empty object with `minimize: false` #8829
 * fix(populate): check discriminator existence before accessing schema in getModelsMapForPopulate #8837 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs: fix broken references to Mongoose#Document API, and prefer mongoose.model(...) over Document#model(...) #8914 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs(model): adds options.limit to Model.insertMany(...) #8864 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs: add flattenMaps and aliases to Document#toObject() #8901 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs(model): add options.overwrite to findOneAndUpdate #8865 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs(populate+faq): separate limit-vs-perDocumentLimit into its own section, add FAQ for populate and limit #8917 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)

5.9.11 / 2020-04-30
===================
 * fix: upgrade mongodb driver -> 3.5.7 #8842 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix: validate nested paths on Model.validate(...) #8848 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(populate): make doc.execPopulate(options) a shorthand for doc.populate(options).execPopulate() #8840 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(model): return validation errors when all docs are invalid & rawResult set #8853 [tusharf5](https://github.com/tusharf5)
 * fix(schemaType): treat select: null or select: undefined as not specified #8850 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix: fix stream close event listener being called multiple times in Node 14 #8835 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(populate): handle `clone` with `lean` when setting a path to `null` #8807
 * docs(faq): clarify setting paths under document arrays with `markModified()` #8854
 * docs: fix race condition in creating connection for lambda #8845 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs: add options.path for Model.populate(...) #8833 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs: use ES6 classes for custom schema type example #8802

5.9.10 / 2020-04-20
===================
 * fix: upgrade mongodb -> 3.5.6, bson -> 1.1.4 #8719
 * fix(document): avoid calling `$set()` on object keys if object path isn't in schema #8751
 * fix(timestamps): handle timestamps on doubly nested subdocuments #8799
 * fix(schematype): throw error if default is set to a schema instance #8751
 * fix: handle $elemMatch projection with `select: false` in schema #8818 #8806 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs: make FAQ questions more linkable #8825 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs(validation): use `init()` as opposed to `once('index')` in `unique` example #8816
 * docs: clarify `insertMany()` return value #8820 [dandv](https://github.com/dandv)
 * docs(populate+query): fix typos #8793 #8794 [dandv](https://github.com/dandv)
 * docs(model): document skipId parameter #8791 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)

5.9.9 / 2020-04-13
==================
 * fix(model): make Model.bulkWrite accept `strict` option #8782 #8788 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(virtual): make populated virtual getter return value when it is passed in #8775 #8774 [makinde](https://github.com/makinde)
 * fix(document): handle validating document array whose docs contain maps and nested paths #8767
 * fix(document): skip discriminator key when overwriting a document #8765
 * fix(populate): support `clone` option with `lean` #8761 #8760
 * docs(transactions): use `endSession()` in all transactions examples #8741
 * docs(queries): expand streaming section to include async iterators, cursor timeouts, and sesssion idle timeouts #8720
 * docs(model+query+findoneandupdate): add docs for `returnOriginal` option #8766
 * docs(model): fix punctuation #8788 [dandv](https://github.com/dandv)
 * docs: fix typos #8780 #8799 [dandv](https://github.com/dandv)

5.9.8 / 2020-04-06
==================
 * fix(map): run getters when calling `Map#get()` #8730
 * fix(populate): handle `refPath` function in embedded discriminator #8731
 * fix(model): allow setting timestamps to false for bulkWrite #8758 #8745 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(model): pass custom options to `exists()` when no changes to save #8764 #8739 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(update): respect `useNestedStrict: false` when updating a single nested path #8735
 * fix(schema): allow `modelName` as a schema path, since `modelName` is a static property on models #7967
 * docs(promises): add section about using `exec()` with queries and `await` #8747
 * docs(connections): clarify that `connectTimeoutMS` doesn't do anything with `useUnifiedTopology`, should use `serverSelectionTimeoutMS` #8721
 * chore: upgrade mpath -> 0.7.0 #8762 [roja548](https://github.com/roja548)

5.9.7 / 2020-03-30
==================
 * fix(map): avoid infinite loop when setting a map of documents to a document copied using spread operator #8722
 * fix(query): clean stack trace for filter cast errors so they include the calling file #8691
 * fix(model): make bulkWrite updates error if `strict` and `upsert` are set and `filter` contains a non-schema path #8698
 * fix(cast): make internal `castToNumber()` allow undefined #8725 [p3x-robot](https://github.com/p3x-robot)

5.9.6 / 2020-03-23
==================
 * fix(document): allow saving document with nested document array after setting `nestedArr.0` #8689
 * docs(connections): expand section about multiple connections to describe patterns for exporting schemas #8679
 * docs(populate): add note about `execPopulate()` to "populate an existing document" section #8671 #8275
 * docs: fix broken links #8690 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs(guide): fix typos #8704 [MateRyze](https://github.com/MateRyze)
 * docs(guide): fix minor typo #8683 [pkellz](https://github.com/pkellz)

5.9.5 / 2020-03-16
==================
 * fix: upgrade mongodb driver -> 3.5.5 #8667 #8664 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(connection): emit "disconnected" after losing connectivity to every member of a replica set with `useUnifiedTopology: true` #8643
 * fix(array): allow calling `slice()` after `push()` #8668 #8655 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(map): avoid marking map as modified if setting `key` to the same value #8652
 * fix(updateValidators): don't run `Mixed` update validator on dotted path underneath mixed type #8659
 * fix(populate): ensure top-level `limit` applies if one document being populated has more than `limit` results #8657
 * fix(populate): throw error if both `limit` and `perDocumentLimit` are set #8661 #8658 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs(findOneAndUpdate): add a section about the `rawResult` option #8662
 * docs(guide): add section about `loadClass()` #8623
 * docs(query): improve `Query#populate()` example to clarify that `sort` doesn't affect the original result's order #8647

5.9.4 / 2020-03-09
==================
 * fix(document): allow `new Model(doc)` to set immutable properties when doc is a mongoose document #8642
 * fix(array): make sure you can call `unshift()` after `slice()` #8482
 * fix(schema): propagate `typePojoToMixed` to implicitly created arrays #8627
 * fix(schema): also propagate `typePojoToMixed` option to schemas implicitly created because of `typePojoToMixed` #8627
 * fix(model): support passing `background` option to `syncIndexes()` #8645
 * docs(schema): add a section about the `_id` path in schemas #8625
 * docs(virtualtype+populate): document using `match` with virtual populate #8616
 * docs(guide): fix typo #8648 [sauzy34](https://github.com/sauzy34)

5.9.3 / 2020-03-02
==================
 * fix: upgrade mongodb driver -> 3.5.4 #8620
 * fix(document): set subpath defaults when overwriting single nested subdoc #8603
 * fix(document): make calling `validate()` with single nested subpath only validate that single nested subpath #8626
 * fix(browser): make `mongoose.model()` return a class in the browser to allow hydrating populated data in the browser #8605
 * fix(model): make `syncIndexes()` and `cleanIndexes()` drop compound indexes with `_id` that aren't in the schema #8559
 * docs(connection+index): add warnings to explain that bufferMaxEntries does nothing with `useUnifiedTopology` #8604
 * docs(document+model+query): add `options.timestamps` parameter docs to `findOneAndUpdate()` and `findByIdAndUpdate()` #8619
 * docs: fix out of date links to tumblr #8599

5.9.2 / 2020-02-21
==================
 * fix(model): add discriminator key to bulkWrite filters #8590
 * fix(document): when setting nested array path to non-nested array, wrap values top-down rather than bottom up when possible #8544
 * fix(document): dont leave nested key as undefined when setting nested key to empty object with minimize #8565
 * fix(document): avoid throwing error if setting path to Mongoose document with nullish `_doc` #8565
 * fix(update): handle Binary type correctly with `runValidators` #8580
 * fix(query): run `deleteOne` hooks only on `Document#deleteOne()` when setting `options.document = true` for `Schema#pre()` #8555
 * fix(document): allow calling `validate()` in post validate hook without causing parallel validation error #8597
 * fix(virtualtype): correctly copy options when cloning #8587
 * fix(collection): skip creating capped collection if `autoCreate` set to `false` #8566
 * docs(middleware): clarify that updateOne and deleteOne hooks are query middleware by default, not document middleware #8581
 * docs(aggregate): clarify that `Aggregate#unwind()` can take object parameters as well as strings #8594

5.9.1 / 2020-02-14
==================
 * fix(model): set session when calling `save()` with no changes #8571
 * fix(schema): return correct pathType when single nested path is embedded under a nested path with a numeric name #8583
 * fix(queryhelpers): remove `Object.values()` for Node.js 4.x-6.x support #8596
 * fix(cursor): respect sort order when using `eachAsync()` with `parallel` and a sync callback #8577
 * docs: update documentation of custom _id overriding in discriminators #8591 [sam-mfb](https://github.com/sam-mfb)

5.9.0 / 2020-02-13
==================
 * fix: upgrade to MongoDB driver 3.5 #8520 #8563
 * feat(schematype): support setting default options for schema type (`trim` on all strings, etc.) #8487
 * feat(populate): add `perDocumentLimit` option that limits per document in `find()` result, rather than across all documents #7318
 * feat(schematype): enable setting `transform` option on individual schematypes #8403
 * feat(timestamps): allow setting `currentTime` option for setting custom function to get the current time #3957
 * feat(connection): add `Connection#watch()` to watch for changes on an entire database #8425
 * feat(document): add `Document#$op` property to make it easier to tell what operation is running in middleware #8439
 * feat(populate): support `limit` as top-level populate option #8445

5.8.13 / 2020-02-13
===================
 * fix(populate): use safe get to avoid crash if schematype doesn't have options #8586

5.8.12 / 2020-02-12
===================
 * fix(query): correctly cast dbref `$id` with `$elemMatch` #8577
 * fix(populate): handle populating when some embedded discriminator schemas have `refPath` but none of the subdocs have `refPath` #8553
 * docs: add useUnifiedTopology to homepage example #8558 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * refactor(utils): moving promiseOrCallback to helpers/promiseOrCallback #8573 [hugosenari](https://github.com/hugosenari)

5.8.11 / 2020-01-31
===================
 * fix(document): allow calling `validate()` multiple times in parallel on subdocs to avoid errors if Mongoose double-validates [taxilian](https://github.com/taxilian) #8548 #8539
 * fix(connection): allow calling initial `mongoose.connect()` after connection helpers on the same tick #8534
 * fix(connection): throw helpful error when callback param to `mongoose.connect()` or `mongoose.createConnection()` is not a function #8556
 * fix(drivers): avoid unnecessary caught error when importing #8528
 * fix(discriminator): remove unnecessary `utils.merge()` [samgladstone](https://github.com/samgladstone) #8542
 * docs: add "built with mongoose" page #8540

5.8.10 / 2020-01-27
===================
 * perf(document): improve performance of document creation by skipping unnecessary split() calls #8533 [igrunert-atlassian](https://github.com/igrunert-atlassian)
 * fix(document): only call validate once for deeply nested subdocuments #8532 #8531 [taxilian](https://github.com/taxilian)
 * fix(document): create document array defaults in forward order, not reverse #8514
 * fix(document): allow function as message for date min/max validator #8512
 * fix(populate): don't try to populate embedded discriminator that has populated path but no `refPath` #8527
 * fix(document): plugins from base schema when creating a discriminator #8536 [samgladstone](https://github.com/samgladstone)
 * fix(document): ensure parent and ownerDocument are set for subdocs in document array defaults #8509
 * fix(document): dont set undefined keys to null if minimize is false #8504
 * fix(update): bump timestamps when using update aggregation pipelines #8524
 * fix(model): ensure `cleanIndexes()` drops indexes with different collations #8521
 * docs(model): document `insertMany` `lean` option #8522
 * docs(connections): document `authSource` option #8517

5.8.9 / 2020-01-17
==================
 * fix(populate): skip populating embedded discriminator array values that don't have a `refPath` #8499
 * docs(queries): clarify when to use queries versus aggregations #8494

5.8.8 / 2020-01-14
==================
 * fix(model): allow using `lean` with `insertMany()` #8507 #8234 [ntsekouras](https://github.com/ntsekouras)
 * fix(document): don't throw parallel validate error when validating subdoc underneath modified nested path #8486
 * fix: allow `typePojoToMixed` as top-level option #8501 #8500 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs(populate+schematypes): make note of `_id` getter for ObjectIds in populate docs #8483

5.8.7 / 2020-01-10
==================
 * fix(documentarray): modify ownerDocument when setting doc array to a doc array thats part of another document #8479
 * fix(document): ensure that you can call `splice()` after `slice()` on an array #8482
 * docs(populate): improve cross-db populate docs to include model refs #8497

5.8.6 / 2020-01-07
====================
 * chore: merge changes from 4.13.20 and override mistaken publish to latest tag

4.13.20 / 2020-01-07
====================
 * fix(schema): make aliases handle mongoose-lean-virtuals #6069

5.8.5 / 2020-01-06
==================
 * fix(document): throw error when running `validate()` multiple times on the same document #8468
 * fix(model): ensure deleteOne() and deleteMany() set discriminator filter even if no conditions passed #8471
 * fix(document): allow pre('validate') hooks to throw errors with `name = 'ValidationError'` #8466
 * fix(update): move top level $set of immutable properties to $setOnInsert so upserting with immutable properties actually sets the property #8467
 * fix(document): avoid double-running validators on single nested subdocs within single nested subdocs #8468
 * fix(populate): support top-level match option for virtual populate #8475
 * fix(model): avoid applying skip when populating virtual with count #8476

5.8.4 / 2020-01-02
==================
 * fix(populate): ensure populate virtual gets set to empty array if `localField` is undefined in the database #8455
 * fix(connection): wrap `mongoose.connect()` server selection timeouts in MongooseTimeoutError for more readable stack traces #8451
 * fix(populate): allow deselecting `foreignField` from projection by prefixing with `-` #8460
 * fix(populate): support embedded discriminators with `refPath` when not all discriminator schemas have `refPath` #8452
 * fix(array): allow defining `enum` on array if an array of numbers #8449

5.8.3 / 2019-12-23
==================
 * fix: upgrade mongodb -> 3.4.1 #8430 [jaschaio](https://github.com/jaschaio)
 * fix(populate): don't add empty subdocument to array when populating path underneath a non-existent document array #8432
 * fix(schema): handle `_id` option for document array schematypes #8450
 * fix(update): call setters when updating mixed type #8444
 * docs(connections): add note about MongoTimeoutError.reason #8402

5.8.2 / 2019-12-20
==================
 * fix(schema): copy `.add()`-ed paths when calling `.add()` with schema argument #8429
 * fix(cursor): pull schema-level readPreference when using `Query#cursor()` #8421
 * fix(cursor): wait for all promises to resolve if `parallel` is greater than number of documents #8422
 * fix(document): depopulate entire array when setting array path to a partially populated array #8443
 * fix: handle setDefaultsOnInsert with deeply nested subdocs #8392
 * fix(document): report `DocumentNotFoundError` if underlying document deleted but no changes made #8428 #8371 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * docs(populate): clarify limitations of `limit` option for populate and suggest workaround #8409
 * docs(deprecations): explain which connection options are no longer relevant with useUnifiedTopology #8411
 * chore: allow browser build to be published #8435 #8427 [captaincaius](https://github.com/captaincaius)

5.8.1 / 2019-12-12
==================
 * fix(documentarray): dont attempt to cast when modifying array returned from map() #8399
 * fix(document): update single nested subdoc parent when setting to existing single nested doc #8400
 * fix(schema): add `$embeddedSchemaType` property to arrays for consistency with document arrays #8389

5.8.0 / 2019-12-09
==================
 * feat: wrap server selection timeout errors in `MongooseTimeoutError` to retain original stack trace #8259
 * feat(model): add `Model.validate()` function that validates a POJO against the model's schema #7587
 * feat(schema): add `Schema#pick()` function to create a new schema with a picked subset of the original schema's paths #8207
 * feat(schema): add ability to change CastError message using `cast` option to SchemaType #8300
 * feat(schema): group indexes defined in schema path with the same name #6499
 * fix(model): build all indexes even if one index fails #8185 [unusualbob](https://github.com/unusualbob)
 * feat(browser): pre-compile mongoose/browser #8350 [captaincaius](https://github.com/captaincaius)
 * fix(connection): throw error when setting unsupported option #8335 #6899 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * feat(schema): support `enum` validator for number type #8139
 * feat(update): allow using MongoDB 4.2 update aggregation pipelines, with no Mongoose casting #8225
 * fix(update): make update validators run on all subpaths when setting a nested path, even omitted subpaths #3587
 * feat(schema): support setting `_id` as an option to single nested schema paths #8137
 * feat(query): add Query#mongooseOptions() function #8296
 * feat(array): make `MongooseArray#push()` support using `$position` #4322
 * feat(schema): make pojo paths optionally become subdoc instead of Mixed #8228 [captaincaius](https://github.com/captaincaius)
 * feat(model): add Model.cleanIndexes() to drop non-schema indexes #6676
 * feat(document): make `updateOne()` document middleware pass `this` to post hooks #8262
 * feat(aggregate): run pre/post aggregate hooks on `explain()` #5887
 * docs(model+query): add `session` option to docs for findOneAndX() methods #8396

5.7.14 / 2019-12-06
===================
 * fix(cursor): wait until all `eachAsync()` functions finish before resolving the promise #8352
 * fix(update): handle embedded discriminator paths when discriminator key is defined in the update #8378
 * fix(schematype): handle passing `message` function to `SchemaType#validate()` as positional arg #8360
 * fix(map): handle cloning a schema that has a map of subdocuments #8357
 * docs(schema): clarify that `uppercase`, `lowercase`, and `trim` options for SchemaString don't affect RegExp queries #8333

5.7.13 / 2019-11-29
===================
 * fix: upgrade mongodb driver -> 3.3.5 #8383
 * fix(model): catch the error when insertMany fails to initialize the document #8365 #8363 [Fonger](https://github.com/Fonger)
 * fix(schema): add array.$, array.$.$ subpaths for nested arrays #6405
 * docs(error): add more detail about the ValidatorError class, including properties #8346
 * docs(connection): document `Connection#models` property #8314

5.7.12 / 2019-11-19
===================
 * fix: avoid throwing error if calling `push()` on a doc array with no parent #8351 #8317 #8312 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(connection): only buffer for "open" events when calling connection helper while connecting #8319
 * fix(connection): pull default database from connection string if specified #8355 #8354 [zachazar](https://github.com/zachazar)
 * fix(populate+discriminator): handle populating document whose discriminator value is different from discriminator model name #8324
 * fix: add `mongoose.isValidObjectId()` function to test whether Mongoose can cast a value to an objectid #3823
 * fix(model): support setting `excludeIndexes` as schema option for subdocs #8343
 * fix: add SchemaMapOptions class for options to map schematype #8318
 * docs(query): remove duplicate omitUndefined options #8349 [mdumandag](https://github.com/mdumandag)
 * docs(schema): add Schema#paths docs to public API docs #8340

5.7.11 / 2019-11-14
===================
 * fix: update mongodb driver -> 3.3.4 #8276
 * fix(model): throw readable error when casting bulkWrite update without a 'filter' or 'update' #8332 #8331 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)
 * fix(connection): bubble up connected/disconnected events with unified topology #8338 #8337
 * fix(model): delete $versionError after saving #8326 #8048 [Fonger](https://github.com/Fonger)
 * test(model): add test for issue #8040 #8341 [Fonger](https://github.com/Fonger)

5.7.10 / 2019-11-11
===================
 * perf(cursor): remove unnecessary `setTimeout()` in `eachAsync()`, 4x speedup in basic benchmarks #8310
 * docs(README): re-order sections for better readability #8321 [dandv](https://github.com/dandv)
 * chore: make npm test not hard-code file paths #8322 [stieg](https://github.com/stieg)

5.7.9 / 2019-11-08
==================
 * fix(schema): support setting schema path to an instance of SchemaTypeOptions to fix integration with mongoose-i18n-localize #8297 #8292
 * fix(populate): make `retainNullValues` set array element to `null` if foreign doc with that id was not found #8293
 * fix(document): support getter setting virtual on manually populated doc when calling toJSON() #8295
 * fix(model): allow objects with `toBSON()` to make it to `save()` #8299

5.7.8 / 2019-11-04
==================
 * fix(document): allow manually populating path within document array #8273
 * fix(populate): update top-level `populated()` when updating document array with populated subpaths #8265
 * fix(cursor): throw error when using aggregation cursor as async iterator #8280
 * fix(schema): retain `_id: false` in schema after nesting in another schema #8274
 * fix(document): make Document class an event emitter to support defining documents without models in node #8272
 * docs: document return types for `.discriminator()` #8287
 * docs(connection): add note about exporting schemas, not models, in multi connection paradigm #8275
 * docs: clarify that transforms defined in `toObject()` options are applied to subdocs #8260

5.7.7 / 2019-10-24
==================
 * fix(populate): make populate virtual consistently an empty array if local field is only empty arrays #8230
 * fix(query): allow findOne(objectid) and find(objectid) #8268

5.7.6 / 2019-10-21
==================
 * fix: upgrade mongodb driver -> 3.3.3 to fix issue with failing to connect to a replica set if one member is down #8209
 * fix(document): fix TypeError when setting a single nested subdoc with timestamps #8251
 * fix(cursor): fix issue with long-running `eachAsync()` cursor #8249 #8235
 * fix(connection): ensure repeated `close` events from useUnifiedTopology don't disconnect Mongoose from replica set #8224
 * fix(document): support calling `Document` constructor directly in Node.js #8237
 * fix(populate): add document array subpaths to parent doc `populated()` when calling `DocumentArray#push()` #8247
 * fix(options): add missing minlength and maxlength to SchemaStringOptions #8256
 * docs: add documentarraypath to API docs, including DocumentArrayPath#discriminator() #8164
 * docs(schematypes): add a section about the `type` property #8227
 * docs(api): fix Connection.close return param #8258 [gosuhiman](https://github.com/gosuhiman)
 * docs: update link to broken image on home page #8253 [krosenk729](https://github.com/krosenk729)

5.7.5 / 2019-10-14
==================
 * fix(query): delete top-level `_bsontype` property in queries to prevent silent empty queries #8222
 * fix(update): handle subdocument pre('validate') errors in update validation #7187
 * fix(subdocument): make subdocument#isModified use parent document's isModified #8223
 * docs(index): add favicon to home page #8226
 * docs: add schema options to API docs #8012
 * docs(middleware): add note about accessing the document being updated in pre('findOneAndUpdate') #8218
 * refactor: remove redundant code in ValidationError #8244 [AbdelrahmanHafez](https://github.com/AbdelrahmanHafez)

5.7.4 / 2019-10-09
==================
 * fix(schema): handle `required: null` and `required: undefined` as `required: false` #8219
 * fix(update): support updating array embedded discriminator props if discriminator key in $elemMatch #8063
 * fix(populate): allow accessing populate virtual prop underneath array when virtual defined on top level #8198
 * fix(model): support passing `options` to `Model.remove()` #8211
 * fix(document): handle `Document#set()` merge option when setting underneath single nested schema #8201
 * fix: use options constructor class for all schematypes #8012

5.7.3 / 2019-09-30
==================
 * fix: make CoreMongooseArray#includes() handle `fromIndex` parameter #8203
 * fix(update): cast right hand side of `$pull` as a query instead of an update for document arrays #8166
 * fix(populate): handle virtual populate of an embedded discriminator nested path #8173
 * docs(validation): remove deprecated `isAsync` from validation docs in favor of emphasizing promises #8184
 * docs(documents): add overwriting section #8178
 * docs(promises): add note about queries being thenable #8110
 * perf: avoid update validators going into Mixed types #8192 [birdofpreyru](https://github.com/birdofpreyru)
 * refactor: remove async as a prod dependency #8073

5.7.2 / 2019-09-23
==================
 * fix(mongoose): support `mongoose.set('autoIndex', false)` #8158
 * fix(discriminator): support `tiedValue` parameter for embedded discriminators analagous to top-level discriminators #8164
 * fix(query): handle `toConstructor()` with entries-style sort syntax #8159
 * fix(populate): avoid converting mixed paths into arrays if populating an object path under `Mixed` #8157
 * fix: use $wrapCallback when using promises for mongoose-async-hooks
 * fix: handle queries with setter that converts value to Number instance #8150
 * docs: add mongoosejs-cli to readme #8142
 * docs: fix example typo for Schema.prototype.plugin() #8175 [anaethoss](https://github.com/anaethoss)

5.7.1 / 2019-09-13
==================
 * fix(query): fix TypeError when calling `findOneAndUpdate()` with `runValidators` #8151 [fernandolguevara](https://github.com/fernandolguevara)
 * fix(document): throw strict mode error if setting an immutable path with strict mode: false #8149
 * fix(mongoose): support passing options object to Mongoose constructor #8144
 * fix(model): make syncIndexes() handle changes in index key order #8135
 * fix(error): export StrictModeError as a static property of MongooseError #8148 [ouyuran](https://github.com/ouyuran)
 * docs(connection+mongoose): add `useUnifiedTopology` option to `connect()` and `openUri()` docs #8146

5.7.0 / 2019-09-09
==================
 * feat(document+query): support conditionally immutable schema paths #8001
 * perf(documentarray): refactor to use ES6 classes instead of mixins, ~30% speedup #7895
 * feat: use MongoDB driver 3.3.x for MongoDB 4.2 support #8083 #8078
 * feat(schema+query): add pre('validate') and post('validate') hooks for update validation #7984
 * fix(timestamps): ensure updatedAt gets incremented consistently using update with and without $set #4768
 * feat(query): add `Query#get()` to make writing custom setters that handle both queries and documents easier #7312
 * feat(document): run setters on defaults #8012
 * feat(document): add `aliases: false` option to `Document#toObject()` #7548
 * feat(timestamps): support skipping updatedAt and createdAt for individual save() and update() #3934
 * docs: fix index creation link in guide #8138 [joebowbeer](https://github.com/joebowbeer)

5.6.13 / 2019-09-04
===================
 * fix(parallel): fix parallelLimit when fns is empty #8130 #8128 [sibelius](https://github.com/sibelius)
 * fix(document): ensure nested mixed validator gets called exactly once #8117
 * fix(populate): handle `justOne = undefined` #8125 [taxilian](https://github.com/taxilian)

5.6.12 / 2019-09-03
===================
 * fix(schema): handle required validator correctly with `clone()` #8111
 * fix(schema): copy schematype getters and setters when cloning #8124 [StphnDamon](https://github.com/StphnDamon)
 * fix(discriminator): avoid unnecessarily cloning schema to avoid leaking memory on repeated `discriminator()` calls #2874
 * docs(schematypes): clarify when Mongoose uses `toString()` to convert an object to a string #8112 [TheTrueRandom](https://github.com/TheTrueRandom)
 * docs(plugins): fix out of date link to npm docs #8100
 * docs(deprecations): fix typo #8109 [jgcmarins](https://github.com/jgcmarins)
 * refactor(model): remove dependency on `async.parallelLimit()` for `insertMany()` #8073

5.6.11 / 2019-08-25
===================
 * fix(model): allow passing options to `exists()` #8075
 * fix(document): make `validateUpdatedOnly` option handle pre-existing errors #8091
 * fix: throw readable error if middleware callback isnt a function #8087
 * fix: don't throw error if calling `find()` on a nested array #8089
 * docs(middleware): clarify that you must add middleware before compiling your model #5087
 * docs(query): add missing options to `setOptions()` #8099

5.6.10 / 2019-08-20
===================
 * fix(schema): fix require() path to work around yet another bug in Jest #8053
 * fix(document): skip casting when initing a populated path #8062
 * fix(document): prevent double-calling validators on mixed objects with nested properties #8067
 * fix(query): handle schematype with `null` options when checking immutability #8070 [rich-earth](https://github.com/rich-earth)
 * fix(schema): support `Schema#path()` to get schema path underneath doc array #8057
 * docs(faq): add disable color instruction #8066

5.6.9 / 2019-08-07
==================
 * fix(model): delete versionError after saving to prevent memory leak #8048
 * fix(cursor): correctly handle batchSize option with query cursor #8039
 * fix(populate): handle virtual populate with count = 0 if virtual embedded in doc array #7573
 * fix(schema): allow declaring ObjectId array with `{ type: 'ObjectID' }`, last 'D' case insensitive #8034

5.6.8 / 2019-08-02
==================
 * fix(aggregate): allow modifying pipeline in pre('aggregate') hooks #8017
 * fix(query): make `findOneAndReplace()` work with `orFail()` #8030
 * fix(document): allow saving an unchanged document if required populated path is null #8018
 * fix(debug): support disabling colors in debug mode #8033 [Mangosteen-Yang](https://github.com/Mangosteen-Yang)
 * docs: add async-await guide #8028 [Rossh87](https://github.com/Rossh87)
 * docs(plugins): rewrite plugins docs to be more modern and not use strange `= exports` syntax #8026
 * docs(transactions): clarify relationship between `session` in docs and MongoDB driver ClientSession class, link to driver docs #8009

5.6.7 / 2019-07-26
==================
 * fix(document): support validators on nested arrays #7926
 * fix(timestamps): handle `timestamps: false` in child schema #8007
 * fix(query): consistently support `new` option to `findOneAndX()` as an alternative to `returnOriginal` #7846
 * fix(document): make `inspect()` never return `null`, because a document or nested path is never `== null` #7942
 * docs(query+lean): add links to mongoose-lean-virtuals, mongoose-lean-getters, mongoose-lean-defaults #5606
 * docs: add example for `Schema#pre(Array)` #8022 [Mangosteen-Yang](https://github.com/Mangosteen-Yang)
 * docs(schematype): updated comment from Schema.path to proper s.path #8013 [chrisweilacker](https://github.com/chrisweilacker)
 * chore: upgrade nyc #8015 [kolya182](https://github.com/kolya182)

5.6.6 / 2019-07-22
==================
 * fix(populate): handle refPath returning a virtual with `Query#populate()` #7341
 * fix(populate): handle `refPath` in discriminator when populating top-level model #5109
 * fix(mongoose): ensure destucturing and named imports work for Mongoose singleton methods like `set()`, etc. #6039
 * fix(query): add missing options for deleteOne and deleteMany in Query #8004 [Fonger](https://github.com/Fonger)
 * fix(schema): make embedded discriminators `instanceof` their parent types #5005
 * fix(array): make `validators` a private property that doesn't show up in for/in #6572
 * docs(api): fix array API docs that vanished because of #7798 #7979
 * docs(discriminators+api): add single nested discriminator to discriminator docs and API docs #7983
 * docs(connection+mongoose): make option lists consistent between `mongoose.connect()`, `mongoose.createConnection()`, and `conn.openUri()` #7976
 * docs(validation): clarify resolve(false) vs reject() for promise-based async custom validators #7761
 * docs(guide): use correct `mongoose.set()` instead of `mongoose.use()` #7998
 * docs: add redis cache example #7997 [usama-asfar](https://github.com/usama-asfar)

5.6.5 / 2019-07-17
==================
 * fix(document): handle setting non-schema path to ObjectId or Decimal128 if strict: false #7973
 * fix(connection): remove backwards-breaking multiple mongoose.connect() call for now #7977
 * fix(schema): print invalid value in error message when a schema path is set to undefined or null #7956
 * fix(model): throw readable error if calling `new Model.discriminator()` #7957
 * fix(mongoose): export `cast()` function #7975 [perfectstorm88](https://github.com/perfectstorm88)
 * docs(model): fix link to Model.inspect() and add example #7990
 * docs: fix broken anchor links on validation tutorial #7966
 * docs(api): fix broken links to split API pages #7978
 * chore: create LICENSE.md #7989 [Fonger](https://github.com/Fonger)

5.6.4 / 2019-07-08
==================
 * fix(schema): support pre(Array, Function) and post(Array, Function) #7803
 * fix(document): load docs with a `once` property successfully #7958
 * fix(queryhelpers): ensure parent `select` overwrites child path `select` if parent is nested #7945
 * fix(schema): make `clone()` correctly copy array embedded discriminators #7954
 * fix(update): fix error when update property gets casted to null #7949
 * fix(connection): bubble up attemptReconnect event for now #7872
 * docs(tutorials): add virtuals tutorial #7965
 * docs(connection): add section on connection handling #6997

5.6.3 / 2019-07-03
==================
 * fix(document): respect projection when running getters #7940
 * fix(model): call createCollection() in syncIndexes() to ensure the collection exists #7931
 * fix(document): consistently use post-order traversal for gathering subdocs for hooks #7929
 * fix(schema): ensure `Schema#pathType()` returns correct path type given non-existent positional path #7935
 * fix(ChangeStream): set `closed` if emitting close event #7930
 * fix(connection): bubble up 'attemptReconnect' event from MongoDB connection #7872
 * docs: fix broken .jade links on search page #7932
 * docs: correct link to `Query#select()` #7953 [rayhatfield](https://github.com/rayhatfield)
 * docs(README): add list of related projects #7773

4.13.19 / 2019-07-02
====================
 * fix(aggregate): make `setOptions()` work as advertised #7950 #6011 [cdimitroulas](https://github.com/cdimitroulas)

5.6.2 / 2019-06-28
==================
 * fix(update): allow using `update()` with immutable `createdAt` #7917
 * fix(model): pass `doc` parameter to save() error handling middleware #7832
 * fix(mongoose): add applyPluginsToChildSchemas option to allow opting out of global plugins for child schemas #7916
 * docs(connection): document `useCache` option for `useDb()` #7923
 * docs: fix broken link in FAQ #7925 [christophergeiger3](https://github.com/christophergeiger3)

5.6.1 / 2019-06-24
==================
 * fix(update): skip setting defaults for single embedded subdocs underneath maps #7909
 * fix(document): copy date objects correctly when strict = false #7907
 * feat(mongoose): throw an error if calling `mongoose.connect()` multiple times while connected #7905 [Fonger](https://github.com/Fonger)
 * fix(document): copies virtuals from array subdocs when casting array of docs with same schema #7898
 * fix(schema): ensure clone() copies single embedded discriminators correctly #7894
 * fix(discriminator): merge instead of overwriting conflicting nested schemas in discriminator schema #7884
 * fix(populate): ignore nullish arguments when calling `populate()` #7913 [rayhatfield](https://github.com/rayhatfield)
 * docs: add getters/setters tutorial #7919
 * docs: clean up error docs so they refer to `Error` rather than `MongooseError` #7867
 * docs: fix a couple broken links #7921 [kizmo04](https://github.com/kizmo04)
 * refactor: remove unnecessary if #7911 [rayhatfield](https://github.com/rayhatfield)

5.6.0 / 2019-06-14
==================
 * feat(schematype): add `immutable` option to disallow changing a given field #7671
 * docs: split API docs into separate pages to make API documentation more Google-able #7812
 * perf(array): remove all mixins in favor of ES6 classes, ~20% faster in basic benchmarks #7798
 * feat(document): use promise rejection error message when async custom validator throws an error #4913
 * feat(virtual): pass document as 3rd parameter to virtual getters and setters to enable using arrow functions #4143
 * feat(model): add `Model.exists()` function to quickly check whether a document matching `filter` exists #6872
 * feat(index+connection): support setting global and connection-level `maxTimeMS`
 * feat(populate): support setting `ref` to a function for conventional populate #7669
 * feat(document): add overwrite() function that overwrites all values in a document #7830
 * feat(populate): support `PopulateOptions#connection` option to allow cross-db populate with refPath #6520
 * feat(populate): add skipInvalidIds option to silently skip population if id is invalid, instead of throwing #7706
 * feat(array): skip empty array default if there's a 2dsphere index on a geojson path #3233
 * feat(query): add `getFilter()` as an alias of `getQuery()` to be more in line with API docs #7839
 * feat(model): add Model.inspect() to make models not clutter `util.inspect()` #7836
 * perf(discriminator): skip calling `createIndex()` on indexes that are defined in the base schema #7379
 * docs: upgrade from Jade to latest Pug #7812
 * docs(README): update reference to example schema.js #7899 [sharils](https://github.com/sharils)
 * docs(README): improve variable name #7900 [sharils](https://github.com/sharils)
 * chore: replace charAt(0) with startsWith #7897 [Fonger](https://github.com/Fonger)
 * chore: replace indexOf with includes, startsWith and endsWith for String #7897 [Fonger](https://github.com/Fonger)

5.5.15 / 2019-06-12
===================
 * fix(connection): reject initial connect promise even if there is an on('error') listener #7850
 * fix(map): make `of` automatically convert POJOs to schemas unless typeKey is set #7859
 * fix(update): use discriminator schema to cast update if discriminator key specified in filter #7843
 * fix(array): copy atomics from source array #7891 #7889 [jyrkive](https://github.com/jyrkive)
 * fix(schema): return this when Schema.prototype.add is called with Schema #7887 [Mickael-van-der-Beek](https://github.com/Mickael-van-der-Beek)
 * fix(document): add `numAffected` and `result` to DocumentNotFoundError for better debugging #7892 #7844

5.5.14 / 2019-06-08
===================
 * fix(query): correct this scope of setters in update query #7876 [Fonger](https://github.com/Fonger)
 * fix(model): reset modifiedPaths after successful insertMany #7852 #7873 [Fonger](https://github.com/Fonger)
 * fix(populate): allow using `refPath` with virtual populate #7848
 * fix(document): prepend private methods getValue and setValue with $ #7870 [Fonger](https://github.com/Fonger)
 * fix: update mongodb driver -> 3.2.7 #7871 [Fonger](https://github.com/Fonger)
 * docs(tutorials): add tutorial about custom casting functions #7045
 * docs(connection): fix outdated events document #7874 [Fonger](https://github.com/Fonger)
 * docs: fix typo in lean docs #7875 [tannakartikey](https://github.com/tannakartikey)
 * docs: move off of KeenIO for tracking and use self-hosted analytics instead

5.5.13 / 2019-06-05
===================
 * fix(model): support passing deleteOne options #7860 #7857 [Fonger](https://github.com/Fonger)
 * fix(update): run setters on array elements when doing $addToSet, $push, etc #4185
 * fix(model): support getting discriminator by value when creating a new model #7851
 * docs(transactions): add section about the `withTransaction()` helper #7598
 * docs(schema): clarify relationship between Schema#static() and Schema#statics #7827
 * docs(model): fix typo `projetion` to `projection` #7868 [dfdeagle47](https://github.com/dfdeagle47)
 * docs(schema): correct schema options lists #7828

5.5.12 / 2019-05-31
===================
 * fix(document): fix unexpected error when loading a document with a nested property named `schema` #7831
 * fix(model): skip applying static hooks by default if static name conflicts with query middleware (re: mongoose-delete plugin) #7790
 * fix(query): apply schema-level projections to the result of `findOneAndReplace()` #7654
 * fix: upgrade mongodb driver -> 3.2.6
 * docs(tutorials): add findOneAndUpdate() tutorial #7847
 * docs(validation): add `updateOne()` and `updateMany()` to list of update validator operations #7845
 * docs(model): make sure options lists in `update()` API line up #7842

5.5.11 / 2019-05-23
===================
 * fix(discriminator): allow numeric discriminator keys for embedded discriminators #7808
 * chore: add Node.js 12 to travis build matrix #7784

5.5.10 / 2019-05-20
===================
 * fix(discriminator): allow user-defined discriminator path in schema #7807
 * fix(query): ensure `findOneAndReplace()` sends `replacement` to server #7654
 * fix(cast): allow `[]` as a value when casting `$nin` #7806
 * docs(model): clarify that setters do run on `update()` by default #7801
 * docs: fix typo in FAQ #7821 [jaona](https://github.com/jaona)

5.5.9 / 2019-05-16
==================
 * fix(query): skip schema setters when casting $regexp $options #7802 [Fonger](https://github.com/Fonger)
 * fix(populate): don't skip populating doc array properties whose name conflicts with an array method #7782
 * fix(populate): make populated virtual return undefined if not populated #7795
 * fix(schema): handle custom setters in arrays of document arrays #7804 [Fonger](https://github.com/Fonger)
 * docs(tutorials): add query casting tutorial #7789

5.5.8 / 2019-05-13
==================
 * fix(document): run pre save hooks on nested child schemas #7792
 * fix(model): set $session() before validation middleware for bulkWrite/insertMany #7785 #7769 [Fonger](https://github.com/Fonger)
 * fix(query): make `getPopulatedPaths()` return deeply populated paths #7757
 * fix(query): suppress findAndModify deprecation warning when using `Model.findOneAndUpdate()` #7794
 * fix: upgrade mongodb -> 3.2.4 #7794
 * fix(document): handle a couple edge cases with atomics that happen when schema defines an array property named 'undefined' #7756
 * docs(discriminator): correct function parameters #7786 [gfpacheco](https://github.com/gfpacheco)

5.5.7 / 2019-05-09
==================
 * fix(model): set $session() before pre save middleware runs when calling save() with options #7742
 * fix(model): set $session before pre remove hooks run when calling remove() with options #7742
 * fix(schema): support `remove()` on nested path #2398
 * fix(map): handle setting populated map element to doc #7745
 * fix(query): return rawResult when inserting with options `{new:false,upsert:true,rawResult:true}` #7774 #7770 [LiaanM](https://github.com/LiaanM)
 * fix(schematype): remove internal `validators` option because it conflicts with Backbone #7720

5.5.6 / 2019-05-06
==================
 * fix(document): stop converting arrays to objects when setting non-schema path to array with strict: false #7733
 * fix(array): make two Mongoose arrays `assert.deepEqual()` each other if they have the same values #7700
 * fix(populate): support populating a path in a document array embedded in an array #7647
 * fix(populate): set populate virtual count to 0 if local field is empty #7731
 * fix(update): avoid throwing cast error if casting array filter that isn't in schema with strictQuery = false #7728
 * docs: fix typo in `distinct()` description #7767 [phil-r](https://github.com/phil-r)

5.5.5 / 2019-04-30
==================
 * fix(document): ensure nested properties within single nested subdocs get set correctly when overwriting single nested subdoc #7748
 * fix(document): skip non-object `validators` in schema types #7720
 * fix: bump mongodb driver -> 3.2.3 #7752
 * fix(map): disallow setting map key with special properties #7750 [Fonger](https://github.com/Fonger)

5.5.4 / 2019-04-25
==================
 * fix(document): avoid calling custom getters when saving #7719
 * fix(timestamps): handle child schema timestamps correctly when reusing child schemas #7712
 * fix(query): pass correct callback for _legacyFindAndModify #7736 [Fonger](https://github.com/Fonger)
 * fix(model+query): allow setting `replacement` parameter for `findOneAndReplace()` #7654
 * fix(map): make `delete()` unset the key in the database #7746 [Fonger](https://github.com/Fonger)
 * fix(array): use symbol for `_schema` property to avoid confusing deep equality checks #7700
 * fix(document): prevent `depopulate()` from removing fields with empty array #7741 #7740 [Fonger](https://github.com/Fonger)
 * fix: make `MongooseArray#includes` support ObjectIds #7732 #6354 [hansemannn](https://github.com/hansemannn)
 * fix(document): report correct validation error index when pushing onto doc array #7744 [Fonger](https://github.com/Fonger)

5.5.3 / 2019-04-22
==================
 * fix: add findAndModify deprecation warning that references the useFindAndModify option #7644
 * fix(document): handle pushing a doc onto a discriminator that contains a doc array #7704
 * fix(update): run setters on array elements when doing $set #7679
 * fix: correct usage of arguments while buffering commands #7718 [rzymek](https://github.com/rzymek)
 * fix(document): avoid error clearing modified subpaths if doc not defined #7715 [bitflower](https://github.com/bitflower)
 * refactor(array): move `_parent` property behind a symbol #7726 #7700
 * docs(model): list out all operations and options for `bulkWrite()` #7055
 * docs(aggregate): use `eachAsync()` instead of nonexistent `each()` #7699
 * docs(validation): add CastError validation example #7514
 * docs(query+model): list out all options and callback details for Model.updateX() and Query#updateX() #7646

5.5.2 / 2019-04-16
==================
 * fix(document): support setting nested path to non-POJO object #7639
 * perf(connection): remove leaked event handler in `Model.init()` so `deleteModel()` frees all memory #7682
 * fix(timestamps): handle custom statics that conflict with built-in functions (like mongoose-delete plugin) #7698
 * fix(populate): make `Document#populated()` work for populated subdocs #7685
 * fix(document): support `.set()` on document array underneath embedded discriminator path #7656

5.5.1 / 2019-04-11
==================
 * fix(document): correctly overwrite all properties when setting a single nested subdoc #7660 #7681
 * fix(array): allow customization of array required validator #7696 [freewil](https://github.com/freewil)
 * fix(discriminator): handle embedded discriminators when casting array defaults #7687
 * fix(collection): ensure collection functions return a promise even if disconnected #7676
 * fix(schematype): avoid indexing properties with `{ unique: false, index: false }` #7620
 * fix(aggregate): make `Aggregate#model()` with no arguments return the aggregation's model #7608

5.5.0 / 2019-04-08
==================
 * feat(model): support applying hooks to custom static functions #5982
 * feat(populate): support specifying a function as `match` #7397
 * perf(buffer): avoid calling `defineProperties()` in Buffer constructor #7331
 * feat(connection): add `plugin()` for connection-scoped plugins #7378
 * feat(model): add Model#deleteOne() and corresponding hooks #7538
 * feat(query): support hooks for `Query#distinct()` #5938
 * feat(model): print warning when calling create() incorrectly with a session #7535
 * feat(document): add Document#isEmpty() and corresponding helpers for nested paths #5369
 * feat(document): add `getters` option to Document#get() #7233
 * feat(query): add Query#projection() to get or overwrite the current projection #7384
 * fix(document): set full validator path on validatorProperties if `propsParameter` set on validator #7447
 * feat(document): add Document#directModifiedPaths() #7373
 * feat(document): add $locals property #7691
 * feat(document): add validateUpdatedOnly option that only validates modified paths in `save()` #7492 [captaincaius](https://github.com/captaincaius)
 * chore: upgrade MongoDB driver to v3.2.0 #7641
 * fix(schematype): deprecate `isAsync` option for custom validators #6700
 * chore(mongoose): deprecate global.MONGOOSE_DRIVER_PATH so we can be webpack-warning-free in 6.0 #7501

5.4.23 / 2019-04-08
===================
 * fix(document): report cast error when string path in schema is an array in MongoDB #7619
 * fix(query): set deletedCount on result of remove() #7629
 * docs(subdocs): add note about parent() and ownerDocument() to subdocument docs #7576

5.4.22 / 2019-04-04
===================
 * fix(aggregate): allow modifying options in pre('aggregate') hook #7606
 * fix(map): correctly init maps of maps when loading from MongoDB #7630
 * docs(model+query): add `omitUndefined` option to docs for updateX() and findOneAndX() #3486
 * docs: removed duplicate Query.prototype.merge() reference from doc #7684 [shihabmridha](https://github.com/shihabmridha)
 * docs(schema): fix shardKey type to object instead of bool #7668 [kyletsang](https://github.com/kyletsang)
 * docs(api): fix `Model.prototypedelete` link #7665 [pixcai](https://github.com/pixcai)

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
 * fix(mongoose): ensure virtuals set on subdocs in global plugins get applied #7572
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
