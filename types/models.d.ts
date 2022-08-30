declare module 'mongoose' {
  import mongodb = require('mongodb');

  export interface AcceptsDiscriminator {
    /** Adds a discriminator type. */
    discriminator<D>(name: string | number, schema: Schema, value?: string | number | ObjectId): Model<D>;
    discriminator<T, U>(name: string | number, schema: Schema<T, U>, value?: string | number | ObjectId): U;
  }

  interface MongooseBulkWriteOptions {
    skipValidation?: boolean;
  }

  interface InsertManyOptions extends
    PopulateOption,
    SessionOption {
    limit?: number;
    rawResult?: boolean;
    ordered?: boolean;
    lean?: boolean;
  }

  type InsertManyResult<T> = mongodb.InsertManyResult<T> & {
    insertedIds: {
      [key: number]: InferId<T>;
    };
    mongoose?: { validationErrors?: Array<Error.CastError | Error.ValidatorError> };
  };

  type UpdateWriteOpResult = mongodb.UpdateResult;

  interface MapReduceOptions<T, K, R> {
    map: Function | string;
    reduce: (key: K, vals: T[]) => R;
    /** query filter object. */
    query?: any;
    /** sort input objects using this key */
    sort?: any;
    /** max number of documents */
    limit?: number;
    /** keep temporary data default: false */
    keeptemp?: boolean;
    /** finalize function */
    finalize?: (key: K, val: R) => R;
    /** scope variables exposed to map/reduce/finalize during execution */
    scope?: any;
    /** it is possible to make the execution stay in JS. Provided in MongoDB > 2.0.X default: false */
    jsMode?: boolean;
    /** provide statistics on job execution time. default: false */
    verbose?: boolean;
    readPreference?: string;
    /** sets the output target for the map reduce job. default: {inline: 1} */
    out?: {
      /** the results are returned in an array */
      inline?: number;
      /**
       * {replace: 'collectionName'} add the results to collectionName: the
       * results replace the collection
       */
      replace?: string;
      /**
       * {reduce: 'collectionName'} add the results to collectionName: if
       * dups are detected, uses the reducer / finalize functions
       */
      reduce?: string;
      /**
       * {merge: 'collectionName'} add the results to collectionName: if
       * dups exist the new docs overwrite the old
       */
      merge?: string;
    };
  }

  interface GeoSearchOptions {
    /** x,y point to search for */
    near: number[];
    /** the maximum distance from the point near that a result can be */
    maxDistance: number;
    /** The maximum number of results to return */
    limit?: number;
    /** return the raw object instead of the Mongoose Model */
    lean?: boolean;
  }

  interface ModifyResult<T> {
    value: Require_id<T> | null;
    /** see https://www.mongodb.com/docs/manual/reference/command/findAndModify/#lasterrorobject */
    lastErrorObject?: {
      updatedExisting?: boolean;
      upserted?: mongodb.ObjectId;
    };
    ok: 0 | 1;
  }

  type WriteConcern = mongodb.WriteConcern;

  /** A list of paths to validate. If set, Mongoose will validate only the modified paths that are in the given list. */
  type PathsToValidate = string[] | string;
  /**
   * @deprecated
   */
  type pathsToValidate = PathsToValidate;

  interface SaveOptions extends
    SessionOption {
    checkKeys?: boolean;
    j?: boolean;
    safe?: boolean | WriteConcern;
    timestamps?: boolean | QueryTimestampsConfig;
    validateBeforeSave?: boolean;
    validateModifiedOnly?: boolean;
    w?: number | string;
    wtimeout?: number;
  }

  interface RemoveOptions extends SessionOption, Omit<mongodb.DeleteOptions, 'session'> {}

  const Model: Model<any>;
  interface Model<T, TQueryHelpers = {}, TMethodsAndOverrides = {}, TVirtuals = {}, TSchema = any> extends
    NodeJS.EventEmitter,
    AcceptsDiscriminator,
    IndexManager,
    SessionStarter {
    new <DocType = T>(doc?: DocType, fields?: any | null, options?: boolean | AnyObject): HydratedDocument<T, TMethodsAndOverrides,
    IfEquals<TVirtuals, {}, ObtainSchemaGeneric<TSchema, 'TVirtuals'>, TVirtuals>> & ObtainSchemaGeneric<TSchema, 'TStaticMethods'>;

    aggregate<R = any>(pipeline?: PipelineStage[], options?: mongodb.AggregateOptions, callback?: Callback<R[]>): Aggregate<Array<R>>;
    aggregate<R = any>(pipeline: PipelineStage[], callback?: Callback<R[]>): Aggregate<Array<R>>;

    /** Base Mongoose instance the model uses. */
    base: Mongoose;

    /**
     * If this is a discriminator model, `baseModelName` is the name of
     * the base model.
     */
    baseModelName: string | undefined;

    /* Cast the given POJO to the model's schema */
    castObject(obj: AnyObject): T;

    /**
     * Sends multiple `insertOne`, `updateOne`, `updateMany`, `replaceOne`,
     * `deleteOne`, and/or `deleteMany` operations to the MongoDB server in one
     * command. This is faster than sending multiple independent operations (e.g.
     * if you use `create()`) because with `bulkWrite()` there is only one network
     * round trip to the MongoDB server.
     */
    bulkWrite(writes: Array<mongodb.AnyBulkWriteOperation<T extends {} ? T : any>>, options: mongodb.BulkWriteOptions & MongooseBulkWriteOptions, callback: Callback<mongodb.BulkWriteResult>): void;
    bulkWrite(writes: Array<mongodb.AnyBulkWriteOperation<T extends {} ? T : any>>, callback: Callback<mongodb.BulkWriteResult>): void;
    bulkWrite(writes: Array<mongodb.AnyBulkWriteOperation<T extends {} ? T : any>>, options?: mongodb.BulkWriteOptions & MongooseBulkWriteOptions): Promise<mongodb.BulkWriteResult>;

    /**
     * Sends multiple `save()` calls in a single `bulkWrite()`. This is faster than
     * sending multiple `save()` calls because with `bulkSave()` there is only one
     * network round trip to the MongoDB server.
     */
    bulkSave(documents: Array<Document>, options?: mongodb.BulkWriteOptions & { timestamps?: boolean }): Promise<mongodb.BulkWriteResult>;

    /** Collection the model uses. */
    collection: Collection;

    /** Creates a `count` query: counts the number of documents that match `filter`. */
    count(callback?: Callback<number>): QueryWithHelpers<number, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;
    count(filter: FilterQuery<T>, callback?: Callback<number>): QueryWithHelpers<number, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /** Creates a `countDocuments` query: counts the number of documents that match `filter`. */
    countDocuments(filter: FilterQuery<T>, options?: QueryOptions<T>, callback?: Callback<number>): QueryWithHelpers<number, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;
    countDocuments(callback?: Callback<number>): QueryWithHelpers<number, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /** Creates a new document or documents */
    create<DocContents = AnyKeys<T>>(docs: Array<T | DocContents>, options?: SaveOptions): Promise<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>[]>;
    create<DocContents = AnyKeys<T>>(docs: Array<T | DocContents>, callback: Callback<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>[]>): void;
    create<DocContents = AnyKeys<T>>(doc: DocContents | T): Promise<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>;
    create<DocContents = AnyKeys<T>>(...docs: Array<T | DocContents>): Promise<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>[]>;
    create<DocContents = AnyKeys<T>>(doc: T | DocContents, callback: Callback<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>): void;

    /**
     * Create the collection for this model. By default, if no indexes are specified,
     * mongoose will not create the collection for the model until any documents are
     * created. Use this method to create the collection explicitly.
     */
    createCollection<T extends mongodb.Document>(options: mongodb.CreateCollectionOptions & Pick<SchemaOptions, 'expires'> | null, callback: Callback<mongodb.Collection<T>>): void;
    createCollection<T extends mongodb.Document>(callback: Callback<mongodb.Collection<T>>): void;
    createCollection<T extends mongodb.Document>(options?: mongodb.CreateCollectionOptions & Pick<SchemaOptions, 'expires'>): Promise<mongodb.Collection<T>>;

    /** Connection the model uses. */
    db: Connection;

    /**
     * Deletes all of the documents that match `conditions` from the collection.
     * Behaves like `remove()`, but deletes all documents that match `conditions`
     * regardless of the `single` option.
     */
    deleteMany(filter?: FilterQuery<T>, options?: QueryOptions<T>, callback?: CallbackWithoutResult): QueryWithHelpers<mongodb.DeleteResult, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;
    deleteMany(filter: FilterQuery<T>, callback: CallbackWithoutResult): QueryWithHelpers<mongodb.DeleteResult, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;
    deleteMany(callback: CallbackWithoutResult): QueryWithHelpers<mongodb.DeleteResult, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /**
     * Deletes the first document that matches `conditions` from the collection.
     * Behaves like `remove()`, but deletes at most one document regardless of the
     * `single` option.
     */
    deleteOne(filter?: FilterQuery<T>, options?: QueryOptions<T>, callback?: CallbackWithoutResult): QueryWithHelpers<mongodb.DeleteResult, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;
    deleteOne(filter: FilterQuery<T>, callback: CallbackWithoutResult): QueryWithHelpers<mongodb.DeleteResult, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;
    deleteOne(callback: CallbackWithoutResult): QueryWithHelpers<mongodb.DeleteResult, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /**
     * Event emitter that reports any errors that occurred. Useful for global error
     * handling.
     */
    events: NodeJS.EventEmitter;

    /**
     * Finds a single document by its _id field. `findById(id)` is almost*
     * equivalent to `findOne({ _id: id })`. If you want to query by a document's
     * `_id`, use `findById()` instead of `findOne()`.
     */
    findById<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      id: any,
      projection?: ProjectionType<T> | null,
      options?: QueryOptions<T> | null,
      callback?: Callback<ResultDoc | null>
    ): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;
    findById<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      id: any,
      projection?: ProjectionType<T> | null,
      callback?: Callback<ResultDoc | null>
    ): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    /** Finds one document. */
    findOne<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter?: FilterQuery<T>,
      projection?: ProjectionType<T> | null,
      options?: QueryOptions<T> | null,
      callback?: Callback<ResultDoc | null>
    ): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;
    findOne<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter?: FilterQuery<T>,
      projection?: ProjectionType<T> | null,
      callback?: Callback<ResultDoc | null>
    ): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;
    findOne<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter?: FilterQuery<T>,
      callback?: Callback<ResultDoc | null>
    ): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    /**
     * Shortcut for creating a new Document from existing raw data, pre-saved in the DB.
     * The document returned has no paths marked as modified initially.
     */
    hydrate(obj: any, projection?: AnyObject, options?: { setters?: boolean }): HydratedDocument<T, TMethodsAndOverrides, TVirtuals>;

    /**
     * This function is responsible for building [indexes](https://docs.mongodb.com/manual/indexes/),
     * unless [`autoIndex`](http://mongoosejs.com/docs/guide.html#autoIndex) is turned off.
     * Mongoose calls this function automatically when a model is created using
     * [`mongoose.model()`](/docs/api.html#mongoose_Mongoose-model) or
     * [`connection.model()`](/docs/api.html#connection_Connection-model), so you
     * don't need to call it.
     */
    init(callback?: CallbackWithoutResult): Promise<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>;

    /** Inserts one or more new documents as a single `insertMany` call to the MongoDB server. */
    insertMany<DocContents = T>(docs: Array<DocContents | T>, options: InsertManyOptions & { lean: true; }, callback: Callback<Array<MergeType<MergeType<T, DocContents>, Require_id<T>>>>): void;
    insertMany<DocContents = T>(docs: Array<DocContents | T>, options: InsertManyOptions & { rawResult: true; }, callback: Callback<mongodb.InsertManyResult<T>>): void;
    insertMany<DocContents = T>(docs: Array<DocContents | T>, callback: Callback<Array<HydratedDocument<MergeType<MergeType<T, DocContents>, Require_id<T>>, TMethodsAndOverrides, TVirtuals>>>): void;
    insertMany<DocContents = T>(doc: DocContents, options: InsertManyOptions & { lean: true; }, callback: Callback<Array<MergeType<MergeType<T, DocContents>, Require_id<T>>>>): void;
    insertMany<DocContents = T>(doc: DocContents, options: InsertManyOptions & { rawResult: true; }, callback: Callback<mongodb.InsertManyResult<T>>): void;
    insertMany<DocContents = T>(doc: DocContents, options: InsertManyOptions & { lean?: false | undefined }, callback: Callback<Array<HydratedDocument<MergeType<MergeType<T, DocContents>, Require_id<T>>, TMethodsAndOverrides, TVirtuals>>>): void;
    insertMany<DocContents = T>(doc: DocContents, callback: Callback<Array<HydratedDocument<MergeType<MergeType<T, DocContents>, Require_id<T>>, TMethodsAndOverrides, TVirtuals>>>): void;

    insertMany<DocContents = T>(docs: Array<DocContents | T>, options: InsertManyOptions & { lean: true; }): Promise<Array<MergeType<MergeType<T, DocContents>, Require_id<T>>>>;
    insertMany<DocContents = T>(docs: Array<DocContents | T>, options: InsertManyOptions & { rawResult: true; }): Promise<mongodb.InsertManyResult<T>>;
    insertMany<DocContents = T>(docs: Array<DocContents | T>): Promise<Array<HydratedDocument<MergeType<MergeType<T, DocContents>, Require_id<T>>, TMethodsAndOverrides, TVirtuals>>>;
    insertMany<DocContents = T>(doc: DocContents, options: InsertManyOptions & { lean: true; }): Promise<Array<MergeType<MergeType<T, DocContents>, Require_id<T>>>>;
    insertMany<DocContents = T>(doc: DocContents, options: InsertManyOptions & { rawResult: true; }): Promise<mongodb.InsertManyResult<T>>;
    insertMany<DocContents = T>(doc: DocContents, options: InsertManyOptions): Promise<Array<HydratedDocument<MergeType<MergeType<T, DocContents>, Require_id<T>>, TMethodsAndOverrides, TVirtuals>>>;
    insertMany<DocContents = T>(doc: DocContents): Promise<Array<HydratedDocument<MergeType<MergeType<T, DocContents>, Require_id<T>>, TMethodsAndOverrides, TVirtuals>>>;

    /** The name of the model */
    modelName: string;

    /** Populates document references. */
    populate(docs: Array<any>, options: PopulateOptions | Array<PopulateOptions> | string,
      callback?: Callback<(HydratedDocument<T, TMethodsAndOverrides, TVirtuals>)[]>): Promise<Array<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>>;
    populate(doc: any, options: PopulateOptions | Array<PopulateOptions> | string,
      callback?: Callback<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>): Promise<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>;


    /** Casts and validates the given object against this model's schema, passing the given `context` to custom validators. */
    validate(callback?: CallbackWithoutResult): Promise<void>;
    validate(optional: any, callback?: CallbackWithoutResult): Promise<void>;
    validate(optional: any, pathsToValidate: PathsToValidate, callback?: CallbackWithoutResult): Promise<void>;

    /** Watches the underlying collection for changes using [MongoDB change streams](https://docs.mongodb.com/manual/changeStreams/). */
    watch<ResultType extends mongodb.Document = any>(pipeline?: Array<Record<string, unknown>>, options?: mongodb.ChangeStreamOptions & { hydrate?: boolean }): mongodb.ChangeStream<ResultType>;

    /** Adds a `$where` clause to this query */
    $where(argument: string | Function): QueryWithHelpers<Array<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /** Registered discriminators for this model. */
    discriminators: { [name: string]: Model<any> } | undefined;

    /** Translate any aliases fields/conditions so the final query or document object is pure */
    translateAliases(raw: any): any;

    /** Creates a `distinct` query: returns the distinct values of the given `field` that match `filter`. */
    distinct<ReturnType = any>(field: string, filter?: FilterQuery<T>, callback?: Callback<number>): QueryWithHelpers<Array<ReturnType>, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /** Creates a `estimatedDocumentCount` query: counts the number of documents in the collection. */
    estimatedDocumentCount(options?: QueryOptions<T>, callback?: Callback<number>): QueryWithHelpers<number, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /**
     * Returns a document with its `_id` if at least one document exists in the database that matches
     * the given `filter`, and `null` otherwise.
     */
    exists(filter: FilterQuery<T>, callback: Callback<{ _id: InferId<T> } | null>): QueryWithHelpers<Pick<Document<T>, '_id'> | null, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;
    exists(filter: FilterQuery<T>): QueryWithHelpers<{ _id: InferId<T> } | null, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /** Creates a `find` query: gets a list of documents that match `filter`. */
    find<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter: FilterQuery<T>,
      projection?: ProjectionType<T> | null | undefined,
      options?: QueryOptions<T> | null | undefined,
      callback?: Callback<ResultDoc[]> | undefined
    ): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    find<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter: FilterQuery<T>,
      projection?: ProjectionType<T> | null | undefined,
      callback?: Callback<ResultDoc[]> | undefined
    ): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    find<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter: FilterQuery<T>,
      callback?: Callback<ResultDoc[]> | undefined
    ): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    find<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      callback?: Callback<ResultDoc[]> | undefined
    ): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;

    /** Creates a `findByIdAndDelete` query, filtering by the given `_id`. */
    findByIdAndDelete<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(id?: mongodb.ObjectId | any, options?: QueryOptions<T> | null, callback?: (err: CallbackError, doc: ResultDoc | null, res: any) => void): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    /** Creates a `findByIdAndRemove` query, filtering by the given `_id`. */
    findByIdAndRemove<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(id?: mongodb.ObjectId | any, options?: QueryOptions<T> | null, callback?: (err: CallbackError, doc: ResultDoc | null, res: any) => void): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    /** Creates a `findOneAndUpdate` query, filtering by the given `_id`. */
    findByIdAndUpdate<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(id: mongodb.ObjectId | any, update: UpdateQuery<T>, options: QueryOptions<T> & { rawResult: true }, callback?: (err: CallbackError, doc: any, res: any) => void): QueryWithHelpers<ModifyResult<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    findByIdAndUpdate<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(id: mongodb.ObjectId | any, update: UpdateQuery<T>, options: QueryOptions<T> & { upsert: true } & ReturnsNewDoc, callback?: (err: CallbackError, doc: ResultDoc, res: any) => void): QueryWithHelpers<ResultDoc, ResultDoc, TQueryHelpers, T>;
    findByIdAndUpdate<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(id?: mongodb.ObjectId | any, update?: UpdateQuery<T>, options?: QueryOptions<T> | null, callback?: (err: CallbackError, doc: ResultDoc | null, res: any) => void): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;
    findByIdAndUpdate<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(id: mongodb.ObjectId | any, update: UpdateQuery<T>, callback: (err: CallbackError, doc: ResultDoc | null, res: any) => void): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    /** Creates a `findOneAndDelete` query: atomically finds the given document, deletes it, and returns the document as it was before deletion. */
    findOneAndDelete<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: FilterQuery<T>, options?: QueryOptions<T> | null, callback?: (err: CallbackError, doc: ResultDoc | null, res: any) => void): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    /** Creates a `findOneAndRemove` query: atomically finds the given document and deletes it. */
    findOneAndRemove<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: FilterQuery<T>, options?: QueryOptions<T> | null, callback?: (err: CallbackError, doc: ResultDoc | null, res: any) => void): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    /** Creates a `findOneAndReplace` query: atomically finds the given document and replaces it with `replacement`. */
    findOneAndReplace<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter: FilterQuery<T>, replacement: T | AnyObject, options: QueryOptions<T> & { rawResult: true }, callback?: (err: CallbackError, doc: any, res: any) => void): QueryWithHelpers<ModifyResult<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    findOneAndReplace<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter: FilterQuery<T>, replacement: T | AnyObject, options: QueryOptions<T> & { upsert: true } & ReturnsNewDoc, callback?: (err: CallbackError, doc: ResultDoc, res: any) => void): QueryWithHelpers<ResultDoc, ResultDoc, TQueryHelpers, T>;
    findOneAndReplace<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: FilterQuery<T>, replacement?: T | AnyObject, options?: QueryOptions<T> | null, callback?: (err: CallbackError, doc: ResultDoc | null, res: any) => void): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    /** Creates a `findOneAndUpdate` query: atomically find the first document that matches `filter` and apply `update`. */
    findOneAndUpdate<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter: FilterQuery<T>,
      update: UpdateQuery<T>,
      options: QueryOptions<T> & { rawResult: true },
      callback?: (err: CallbackError, doc: any, res: any) => void
    ): QueryWithHelpers<ModifyResult<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    findOneAndUpdate<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter: FilterQuery<T>,
      update: UpdateQuery<T>,
      options: QueryOptions<T> & { upsert: true } & ReturnsNewDoc,
      callback?: (err: CallbackError, doc: ResultDoc, res: any) => void
    ): QueryWithHelpers<ResultDoc, ResultDoc, TQueryHelpers, T>;
    findOneAndUpdate<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter?: FilterQuery<T>,
      update?: UpdateQuery<T>,
      options?: QueryOptions<T> | null,
      callback?: (err: CallbackError, doc: T | null, res: any) => void
    ): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    geoSearch<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter?: FilterQuery<T>,
      options?: GeoSearchOptions,
      callback?: Callback<Array<ResultDoc>>
    ): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;

    /** Executes a mapReduce command. */
    mapReduce<Key, Value>(
      o: MapReduceOptions<T, Key, Value>,
      callback?: Callback
    ): Promise<any>;

    remove<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: any, callback?: CallbackWithoutResult): QueryWithHelpers<any, ResultDoc, TQueryHelpers, T>;
    remove<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: any, options?: RemoveOptions, callback?: CallbackWithoutResult): QueryWithHelpers<any, ResultDoc, TQueryHelpers, T>;

    /** Creates a `replaceOne` query: finds the first document that matches `filter` and replaces it with `replacement`. */
    replaceOne<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter?: FilterQuery<T>,
      replacement?: T | AnyObject,
      options?: QueryOptions<T> | null,
      callback?: Callback
    ): QueryWithHelpers<UpdateWriteOpResult, ResultDoc, TQueryHelpers, T>;

    /** Schema the model uses. */
    schema: Schema<T>;

    /**
   * @deprecated use `updateOne` or `updateMany` instead.
   * Creates a `update` query: updates one or many documents that match `filter` with `update`, based on the `multi` option.
   */
    update<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter?: FilterQuery<T>,
      update?: UpdateQuery<T> | UpdateWithAggregationPipeline,
      options?: QueryOptions<T> | null,
      callback?: Callback
    ): QueryWithHelpers<UpdateWriteOpResult, ResultDoc, TQueryHelpers, T>;

    /** Creates a `updateMany` query: updates all documents that match `filter` with `update`. */
    updateMany<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter?: FilterQuery<T>,
      update?: UpdateQuery<T> | UpdateWithAggregationPipeline,
      options?: QueryOptions<T> | null,
      callback?: Callback
    ): QueryWithHelpers<UpdateWriteOpResult, ResultDoc, TQueryHelpers, T>;

    /** Creates a `updateOne` query: updates the first document that matches `filter` with `update`. */
    updateOne<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter?: FilterQuery<T>,
      update?: UpdateQuery<T> | UpdateWithAggregationPipeline,
      options?: QueryOptions<T> | null,
      callback?: Callback
    ): QueryWithHelpers<UpdateWriteOpResult, ResultDoc, TQueryHelpers, T>;

    /** Creates a Query, applies the passed conditions, and returns the Query. */
    where<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(path: string, val?: any): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    where<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(obj: object): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    where<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;
  }
}
