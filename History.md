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
 * fixed; upgraded `ms` package for security vulnerability #3254 [fhemberger](https://github.com/fhemberger)
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
