declare module 'mongoose' {
  import mongodb = require('mongodb');

  export interface DiscriminatorOptions {
    value?: string | number | ObjectId;
    clone?: boolean;
    overwriteModels?: boolean;
    mergeHooks?: boolean;
    mergePlugins?: boolean;
  }

  export interface AcceptsDiscriminator {
    /** Adds a discriminator type. */
    discriminator<D>(
      name: string | number,
      schema: Schema,
      value?: string | number | ObjectId | DiscriminatorOptions
    ): Model<D>;
    discriminator<T, U>(
      name: string | number,
      schema: Schema<T, U>,
      value?: string | number | ObjectId | DiscriminatorOptions
    ): Model<U>;
  }

  export type MongooseBulkWriteResult = mongodb.BulkWriteResult & {
    mongoose?: {
      validationErrors: Error[],
      results: Array<Error | mongodb.WriteError | null>
    }
  };

  export interface MongooseBulkWriteOptions extends mongodb.BulkWriteOptions {
    session?: ClientSession;
    skipValidation?: boolean;
    throwOnValidationError?: boolean;
    strict?: boolean | 'throw';
    /** When false, do not add timestamps to documents. Can be overridden at the operation level. */
    timestamps?: boolean;
    /** set to `false` to skip all user-defined middleware, or `{ pre: false }` / `{ post: false }` to skip only pre or post hooks */
    middleware?: boolean | SkipMiddlewareOptions;
  }

  interface MongooseBulkSaveOptions extends mongodb.BulkWriteOptions {
    timestamps?: boolean;
    session?: ClientSession;
    validateBeforeSave?: boolean;
    /** set to `false` to skip all user-defined middleware, or `{ pre: false }` / `{ post: false }` to skip only pre or post hooks */
    middleware?: boolean | SkipMiddlewareOptions;
  }

  /**
   * @deprecated use AnyBulkWriteOperation instead
   */
  interface MongooseBulkWritePerWriteOptions {
    timestamps?: boolean;
    strict?: boolean | 'throw';
    session?: ClientSession;
    skipValidation?: boolean;
  }

  interface HydrateOptions {
    setters?: boolean;
    hydratedPopulatedDocs?: boolean;
    virtuals?: boolean;
    strict?: boolean | 'throw';
  }

  interface InsertManyOptions extends
    PopulateOption,
    SessionOption {
    limit?: number;
    // @deprecated, use includeResultMetadata instead
    rawResult?: boolean;
    includeResultMetadata?: boolean;
    ordered?: boolean;
    lean?: boolean;
    throwOnValidationError?: boolean;
    /** set to `false` to skip all user-defined middleware, or `{ pre: false }` / `{ post: false }` to skip only pre or post hooks */
    middleware?: boolean | SkipMiddlewareOptions;
    timestamps?: boolean | QueryTimestampsConfig;
  }

  interface InsertManyResult<T> extends mongodb.InsertManyResult<T> {
    mongoose?: { validationErrors?: Array<Error.CastError | Error.ValidatorError> };
  }

  type UpdateWriteOpResult = mongodb.UpdateResult;
  type UpdateResult = mongodb.UpdateResult;
  type DeleteResult = mongodb.DeleteResult;

  interface ModifyResult<T> {
    value: Default__v<Require_id<T>> | null;
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
    /** set to `false` to skip all user-defined middleware, or `{ pre: false }` / `{ post: false }` to skip only pre or post hooks */
    middleware?: boolean | SkipMiddlewareOptions;
  }

  interface CreateOptions extends SaveOptions {
    ordered?: boolean;
    aggregateErrors?: boolean;
  }

  interface RemoveOptions extends SessionOption, Omit<mongodb.DeleteOptions, 'session'> {}

  interface MongooseBulkWritePerOperationOptions {
    /** Skip validation for this operation. */
    skipValidation?: boolean;
    /** When false, do not add timestamps. When true, overrides the `timestamps` option set in the `bulkWrite` options. */
    timestamps?: boolean;
  }

  interface MongooseBulkUpdatePerOperationOptions extends MongooseBulkWritePerOperationOptions {
    /** When true, allows updating fields that are marked as `immutable` in the schema. */
    overwriteImmutable?: boolean;
    /** When false, do not set default values on insert. */
    setDefaultsOnInsert?: boolean;
  }

  export type InsertOneModel<TSchema extends mongodb.Document = mongodb.Document> =
    mongodb.InsertOneModel<TSchema> & MongooseBulkWritePerOperationOptions;

  export type ReplaceOneModel<TSchema extends mongodb.Document = mongodb.Document> =
    Omit<mongodb.ReplaceOneModel<TSchema>, 'filter'> &
    { filter: QueryFilter<TSchema> } &
    MongooseBulkUpdatePerOperationOptions;

  export type UpdateOneModel<TSchema extends mongodb.Document = mongodb.Document> =
    Omit<mongodb.UpdateOneModel<TSchema>, 'filter'> &
    { filter: QueryFilter<TSchema> } &
    MongooseBulkUpdatePerOperationOptions;

  export type UpdateManyModel<TSchema extends mongodb.Document = mongodb.Document> =
    Omit<mongodb.UpdateManyModel<TSchema>, 'filter'> &
    { filter: QueryFilter<TSchema> } &
    MongooseBulkUpdatePerOperationOptions;

  export type DeleteOneModel<TSchema extends mongodb.Document = mongodb.Document> =
    Omit<mongodb.DeleteOneModel<TSchema>, 'filter'> &
    { filter: QueryFilter<TSchema> };

  export type DeleteManyModel<TSchema extends mongodb.Document = mongodb.Document> =
    Omit<mongodb.DeleteManyModel<TSchema>, 'filter'> &
    { filter: QueryFilter<TSchema> };

  export type AnyBulkWriteOperation<TSchema extends mongodb.Document = mongodb.Document> =
    | { insertOne: InsertOneModel<TSchema> }
    | { replaceOne: ReplaceOneModel<TSchema> }
    | { updateOne: UpdateOneModel<TSchema> }
    | { updateMany: UpdateManyModel<TSchema> }
    | { deleteOne: DeleteOneModel<TSchema> }
    | { deleteMany: DeleteManyModel<TSchema> };

  const Model: Model<any>;

  /*
   * Apply common casting logic to the given type, allowing:
   * - strings for ObjectIds
   * - strings and numbers for Dates
   * - strings for Buffers
   * - strings for UUIDs
   * - POJOs for subdocuments
   * - vanilla arrays of POJOs for document arrays
   * - POJOs and array of arrays for maps
   */
  type ApplyBasicCreateCasting<T> = {
    [K in keyof T]: NonNullable<T[K]> extends Map<infer KeyType extends string, infer ValueType>
      ? (Record<KeyType, ValueType> | Array<[KeyType, ValueType]> | T[K])
      : NonNullable<T[K]> extends Types.DocumentArray<infer RawSubdocType>
         ? RawSubdocType[] | T[K]
         : NonNullable<T[K]> extends Document<any, any, infer RawSubdocType>
           ? ApplyBasicCreateCasting<RawSubdocType> | T[K]
           : NonNullable<T[K]> extends Record<string, any>
             ? ApplyBasicCreateCasting<T[K]> | T[K]
             : QueryTypeCasting<T[K]>;
  };

  type HasLeanOption<TSchema> = 'lean' extends keyof ObtainSchemaGeneric<TSchema, 'TSchemaOptions'> ?
    ObtainSchemaGeneric<TSchema, 'TSchemaOptions'>['lean'] extends Record<string, any> ?
      true :
      ObtainSchemaGeneric<TSchema, 'TSchemaOptions'>['lean'] :
    false;

  /**
   * Models are fancy constructors compiled from `Schema` definitions.
   * An instance of a model is called a document.
   * Models are responsible for creating and reading documents from the underlying MongoDB database
   */
  export interface Model<
    TRawDocType,
    TQueryHelpers = {},
    TInstanceMethods = {},
    TVirtuals = {},
    THydratedDocumentType = HydratedDocument<TRawDocType, TVirtuals & TInstanceMethods, TQueryHelpers, TVirtuals>,
    TSchema = any,
    TLeanResultType = TRawDocType> extends
    NodeJS.EventEmitter,
    IndexManager,
    SessionStarter {
    new <DocType = Partial<TRawDocType>>(doc?: DocType, fields?: any | null, options?: AnyObject): THydratedDocumentType;

    aggregate<R = any>(pipeline?: PipelineStage[], options?: AggregateOptions): Aggregate<Array<R>>;
    aggregate<R = any>(pipeline: PipelineStage[]): Aggregate<Array<R>>;

    /** Base Mongoose instance the model uses. */
    base: Mongoose;

    /**
     * If this is a discriminator model, `baseModelName` is the name of
     * the base model.
     */
    baseModelName: string | undefined;

    /* Cast the given POJO to the model's schema */
    castObject(obj: AnyObject, options?: { ignoreCastErrors?: boolean }): TRawDocType;

    /* Apply defaults to the given document or POJO. */
    applyDefaults(obj: AnyObject): AnyObject;
    applyDefaults(obj: TRawDocType): TRawDocType;

    /* Apply virtuals to the given POJO. */
    applyVirtuals(obj: AnyObject, virtalsToApply?: string[]): AnyObject;

    /**
     * Apply this model's timestamps to a given POJO, including subdocument timestamps
     */
    applyTimestamps(obj: AnyObject, options?: { isUpdate?: boolean, currentTime?: () => Date }): AnyObject;

    /**
     * Sends multiple `insertOne`, `updateOne`, `updateMany`, `replaceOne`,
     * `deleteOne`, and/or `deleteMany` operations to the MongoDB server in one
     * command. This is faster than sending multiple independent operations (e.g.
     * if you use `create()`) because with `bulkWrite()` there is only one network
     * round trip to the MongoDB server.
     */
    bulkWrite<DocContents = TRawDocType>(
      writes: Array<AnyBulkWriteOperation<DocContents extends mongodb.Document ? DocContents : any>>,
      options: mongodb.BulkWriteOptions & MongooseBulkWriteOptions & { ordered: false }
    ): Promise<mongodb.BulkWriteResult & { mongoose?: { validationErrors: Error[] } }>;
    bulkWrite<DocContents = TRawDocType>(
      writes: Array<AnyBulkWriteOperation<DocContents extends mongodb.Document ? DocContents : any>>,
      options?: mongodb.BulkWriteOptions & MongooseBulkWriteOptions
    ): Promise<mongodb.BulkWriteResult>;

    /**
     * Sends multiple `save()` calls in a single `bulkWrite()`. This is faster than
     * sending multiple `save()` calls because with `bulkSave()` there is only one
     * network round trip to the MongoDB server.
     */
    bulkSave(documents: Array<THydratedDocumentType>, options?: MongooseBulkSaveOptions): Promise<MongooseBulkWriteResult>;

    /** Collection the model uses. */
    collection: Collection;

    /** Creates a `countDocuments` query: counts the number of documents that match `filter`. */
    countDocuments(
      filter?: QueryFilter<TRawDocType>,
      options?: (mongodb.CountOptions & MongooseBaseQueryOptions<TRawDocType> & mongodb.Abortable) | null
    ): QueryWithHelpers<
      number,
      THydratedDocumentType,
      TQueryHelpers,
      TRawDocType,
      'countDocuments',
      TInstanceMethods & TVirtuals
    >;
    countDocuments(
      filter?: Query<any, any>,
      options?: (mongodb.CountOptions & MongooseBaseQueryOptions<TRawDocType> & mongodb.Abortable) | null
    ): QueryWithHelpers<
      number,
      THydratedDocumentType,
      TQueryHelpers,
      TRawDocType,
      'countDocuments',
      TInstanceMethods & TVirtuals
    >;

    /** Creates a new document or documents */
    create(): Promise<null>;
    create(doc: Partial<TRawDocType>): Promise<THydratedDocumentType>;
    create(docs: Array<Partial<TRawDocType>>): Promise<THydratedDocumentType[]>;
    create(docs: Array<DeepPartial<ApplyBasicCreateCasting<Require_id<TRawDocType>>>>, options: CreateOptions & { aggregateErrors: true }): Promise<(THydratedDocumentType | Error)[]>;
    create(docs: Array<DeepPartial<ApplyBasicCreateCasting<Require_id<TRawDocType>>>>, options?: CreateOptions): Promise<THydratedDocumentType[]>;
    create(doc: DeepPartial<ApplyBasicCreateCasting<Require_id<TRawDocType>>>): Promise<THydratedDocumentType>;
    create(...docs: Array<DeepPartial<ApplyBasicCreateCasting<Require_id<TRawDocType>>>>): Promise<THydratedDocumentType[]>;

    /**
     * Create the collection for this model. By default, if no indexes are specified,
     * mongoose will not create the collection for the model until any documents are
     * created. Use this method to create the collection explicitly.
     */
    createCollection<T extends mongodb.Document>(options?: mongodb.CreateCollectionOptions & Pick<SchemaOptions, 'expires'> & { middleware?: boolean | SkipMiddlewareOptions }): Promise<mongodb.Collection<T>>;

    /**
     * Create an [Atlas search index](https://www.mongodb.com/docs/atlas/atlas-search/create-index/).
     * This function only works when connected to MongoDB Atlas.
     */
    createSearchIndex(description: SearchIndexDescription): Promise<string>;

    /**
     * Creates all [Atlas search indexes](https://www.mongodb.com/docs/atlas/atlas-search/create-index/) defined in this model's schema.
     * This function only works when connected to MongoDB Atlas.
     */
    createSearchIndexes(): Promise<string[]>;

    /** Connection the model uses. */
    db: Connection;

    /**
     * Deletes all of the documents that match `conditions` from the collection.
     * Behaves like `remove()`, but deletes all documents that match `conditions`
     * regardless of the `single` option.
     */
    deleteMany(
      filter?: QueryFilter<TRawDocType>,
      options?: (mongodb.DeleteOptions & MongooseBaseQueryOptions<TRawDocType>) | null
    ): QueryWithHelpers<
      mongodb.DeleteResult,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'deleteMany',
      TInstanceMethods & TVirtuals
    >;
    deleteMany(
      filter?: Query<any, any>,
      options?: (mongodb.DeleteOptions & MongooseBaseQueryOptions<TRawDocType>) | null
    ): QueryWithHelpers<
      mongodb.DeleteResult,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'deleteMany',
      TInstanceMethods & TVirtuals
    >;

    /**
     * Deletes the first document that matches `conditions` from the collection.
     * Behaves like `remove()`, but deletes at most one document regardless of the
     * `single` option.
     */
    deleteOne(
      filter?: QueryFilter<TRawDocType>,
      options?: (mongodb.DeleteOptions & MongooseBaseQueryOptions<TRawDocType>) | null
    ): QueryWithHelpers<
      mongodb.DeleteResult,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'deleteOne',
      TInstanceMethods & TVirtuals
    >;
    deleteOne(
      filter?: Query<any, any>,
      options?: (mongodb.DeleteOptions & MongooseBaseQueryOptions<TRawDocType>) | null
    ): QueryWithHelpers<
      mongodb.DeleteResult,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'deleteOne',
      TInstanceMethods & TVirtuals
    >;

    /** Adds a discriminator type. */
    discriminator<TDiscriminatorSchema extends Schema<any, any>>(
      name: string | number,
      schema: TDiscriminatorSchema,
      value?: string | number | ObjectId | DiscriminatorOptions
    ): Model<
      TRawDocType & InferSchemaType<TDiscriminatorSchema>,
      TQueryHelpers & ObtainSchemaGeneric<TDiscriminatorSchema, 'TQueryHelpers'>,
      TInstanceMethods & ObtainSchemaGeneric<TDiscriminatorSchema, 'TInstanceMethods'>,
      TVirtuals & ObtainSchemaGeneric<TDiscriminatorSchema, 'TVirtuals'>
    > & ObtainSchemaGeneric<TSchema, 'TStaticMethods'> & ObtainSchemaGeneric<TDiscriminatorSchema, 'TStaticMethods'>;
    discriminator<D>(
      name: string | number,
      schema: Schema,
      value?: string | number | ObjectId | DiscriminatorOptions
    ): Model<D>;
    discriminator<T, U>(
      name: string | number,
      schema: Schema<T, U>,
      value?: string | number | ObjectId | DiscriminatorOptions
    ): U;

    /**
     * Delete an existing [Atlas search index](https://www.mongodb.com/docs/atlas/atlas-search/create-index/) by name.
     * This function only works when connected to MongoDB Atlas.
     */
    dropSearchIndex(name: string): Promise<void>;

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
    findById<ResultDoc = THydratedDocumentType>(
      id: any,
      projection: ProjectionType<TRawDocType> | null | undefined,
      options: QueryOptions<TRawDocType> & { lean: true }
    ): QueryWithHelpers<
      TLeanResultType | null,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOne',
      TInstanceMethods & TVirtuals
    >;
    findById<ResultDoc = THydratedDocumentType>(
      id?: any,
      projection?: ProjectionType<TRawDocType> | null | undefined,
      options?: QueryOptions<TRawDocType> | null
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TLeanResultType | null : ResultDoc | null,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOne',
      TInstanceMethods & TVirtuals
    >;

    /** Finds one document. */
    findOne<ResultDoc = THydratedDocumentType>(
      filter: QueryFilter<TRawDocType>,
      projection: ProjectionType<TRawDocType> | null | undefined,
      options: QueryOptions<TRawDocType> & { lean: true } & mongodb.Abortable
    ): QueryWithHelpers<
      TLeanResultType | null,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOne',
      TInstanceMethods & TVirtuals
    >;
    findOne(
      filter: Query<any, any>,
      projection: ProjectionType<TRawDocType> | null | undefined,
      options: QueryOptions<TRawDocType> & { lean: true } & mongodb.Abortable
    ): QueryWithHelpers<
      TLeanResultType | null,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'findOne',
      TInstanceMethods & TVirtuals
    >;
    findOne<ResultDoc = THydratedDocumentType>(
      filter?: QueryFilter<TRawDocType>,
      projection?: ProjectionType<TRawDocType> | null | undefined,
      options?: QueryOptions<TRawDocType> & mongodb.Abortable | null | undefined
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TLeanResultType | null : ResultDoc | null,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOne',
      TInstanceMethods & TVirtuals
    >;
    findOne(
      filter?: Query<any, any>,
      projection?: ProjectionType<TRawDocType> | null | undefined,
      options?: QueryOptions<TRawDocType> & mongodb.Abortable | null | undefined
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TLeanResultType | null : THydratedDocumentType | null,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'findOne',
      TInstanceMethods & TVirtuals
    >;

    /**
     * Shortcut for creating a new Document from existing raw data, pre-saved in the DB.
     * The document returned has no paths marked as modified initially.
     */
    hydrate(obj: any, projection?: ProjectionType<TRawDocType>, options?: HydrateOptions): THydratedDocumentType;

    /**
     * This function is responsible for building [indexes](https://www.mongodb.com/docs/manual/indexes/),
     * unless [`autoIndex`](http://mongoosejs.com/docs/guide.html#autoIndex) is turned off.
     * Mongoose calls this function automatically when a model is created using
     * [`mongoose.model()`](/docs/api/mongoose.html#mongoose_Mongoose-model) or
     * [`connection.model()`](/docs/api/connection.html#connection_Connection-model), so you
     * don't need to call it.
     */
    init(): Promise<THydratedDocumentType>;

    /** Inserts one or more new documents as a single `insertMany` call to the MongoDB server. */
    insertMany(
      docs: Array<TRawDocType>
    ): Promise<Array<THydratedDocumentType>>;
    insertMany(
      doc: Array<TRawDocType>,
      options: InsertManyOptions & { ordered: false; rawResult: true; }
    ): Promise<mongodb.InsertManyResult<Require_id<TRawDocType>> & {
      mongoose: {
        validationErrors: (CastError | Error.ValidatorError)[];
        results: Array<
          Error |
          Object |
          THydratedDocumentType
        >
      }
    }>;
    insertMany(
      docs: Array<TRawDocType>,
      options: InsertManyOptions & { lean: true, rawResult: true; }
    ): Promise<mongodb.InsertManyResult<Require_id<TRawDocType>>>;
    insertMany<DocContents = TRawDocType>(
      doc: DocContents | TRawDocType,
      options: InsertManyOptions & { ordered: false; rawResult: true; }
    ): Promise<mongodb.InsertManyResult<Require_id<DocContents>> & {
      mongoose: {
        validationErrors: (CastError | Error.ValidatorError)[];
        results: Array<
          Error |
          Object |
          MergeType<THydratedDocumentType, DocContents>
        >
      }
    }>;
    insertMany(
      docs: Array<TRawDocType>,
      options: InsertManyOptions & { lean: true; }
    ): Promise<Array<Require_id<TRawDocType>>>;
    insertMany(
      docs: Array<TRawDocType>,
      options: InsertManyOptions & { rawResult: true; }
    ): Promise<mongodb.InsertManyResult<Require_id<THydratedDocumentType>>>;
    insertMany<DocContents = TRawDocType>(
      docs: Array<DocContents | TRawDocType>,
      options: InsertManyOptions & { lean: true; }
    ): Promise<Array<Require_id<DocContents>>>;
    insertMany<DocContents = TRawDocType>(
      docs: Array<DocContents | TRawDocType>,
      options: InsertManyOptions & { rawResult: true; }
    ): Promise<mongodb.InsertManyResult<Require_id<DocContents>>>;
    insertMany<DocContents = TRawDocType>(
      doc: DocContents,
      options: InsertManyOptions & { lean: true; }
    ): Promise<Array<Require_id<DocContents>>>;
    insertMany<DocContents = TRawDocType>(
      doc: DocContents,
      options: InsertManyOptions & { rawResult: true; }
    ): Promise<mongodb.InsertManyResult<Require_id<DocContents>>>;
    insertMany(
      doc: Array<TRawDocType>,
      options: InsertManyOptions
    ): Promise<Array<THydratedDocumentType>>;
    insertMany<DocContents = TRawDocType>(
      docs: Array<DocContents | TRawDocType>
    ): Promise<Array<MergeType<THydratedDocumentType, Omit<DocContents, '_id'>>>>;
    insertMany<DocContents = TRawDocType>(
      doc: DocContents,
      options: InsertManyOptions
    ): Promise<Array<MergeType<THydratedDocumentType, Omit<DocContents, '_id'>>>>;
    insertMany<DocContents = TRawDocType>(
      docs: Array<DocContents | TRawDocType>,
      options: InsertManyOptions
    ): Promise<Array<MergeType<THydratedDocumentType, Omit<DocContents, '_id'>>>>;
    insertMany<DocContents = TRawDocType>(
      doc: DocContents
    ): Promise<
      Array<MergeType<THydratedDocumentType, Omit<DocContents, '_id'>>>
    >;

    /**
     * Shortcut for saving one document to the database.
     * `MyModel.insertOne(obj, options)` is almost equivalent to `new MyModel(obj).save(options)`.
     * The difference is that `insertOne()` checks if `obj` is already a document, and checks for discriminators.
     */
    insertOne(doc: Partial<ApplyBasicCreateCasting<TRawDocType>>, options?: SaveOptions): Promise<THydratedDocumentType>;

    /**
     * List all [Atlas search indexes](https://www.mongodb.com/docs/atlas/atlas-search/create-index/) on this model's collection.
     * This function only works when connected to MongoDB Atlas.
     */
    listSearchIndexes(options?: mongodb.ListSearchIndexesOptions): Promise<Array<{ name: string }>>;

    /** The name of the model */
    modelName: string;

    /** Populates document references. */
    populate(
      docs: Array<any>,
      options: PopulateOptions | Array<PopulateOptions> | string
    ): Promise<Array<THydratedDocumentType>>;
    populate(
      doc: any, options: PopulateOptions | Array<PopulateOptions> | string
    ): Promise<THydratedDocumentType>;
    populate<Paths>(
      docs: Array<any>,
      options: PopulateOptions | Array<PopulateOptions> | string
    ): Promise<Array<MergeType<THydratedDocumentType, Paths>>>;
    populate<Paths>(
      doc: any, options: PopulateOptions | Array<PopulateOptions> | string
    ): Promise<MergeType<THydratedDocumentType, Paths>>;

    /**
     * Update an existing [Atlas search index](https://www.mongodb.com/docs/atlas/atlas-search/create-index/).
     * This function only works when connected to MongoDB Atlas.
     */
    updateSearchIndex(name: string, definition: AnyObject): Promise<void>;

    /**
     * Changes the Connection instance this model uses to make requests to MongoDB.
     * This function is most useful for changing the Connection that a Model defined using `mongoose.model()` uses
     * after initialization.
     */
    useConnection(connection: Connection): this;

    /** Casts and validates the given object against this model's schema, passing the given `context` to custom validators. */
    validate(): Promise<void>;
    validate(obj: any): Promise<void>;
    validate(obj: any, pathsOrOptions: PathsToValidate): Promise<void>;
    validate(obj: any, pathsOrOptions: { pathsToSkip?: pathsToSkip }): Promise<void>;

    /** Watches the underlying collection for changes using [MongoDB change streams](https://www.mongodb.com/docs/manual/changeStreams/). */
    watch<ResultType extends mongodb.Document = any, ChangeType extends mongodb.ChangeStreamDocument = any>(pipeline?: Array<Record<string, unknown>>, options?: mongodb.ChangeStreamOptions & { hydrate?: boolean }): mongodb.ChangeStream<ResultType, ChangeType>;

    /** Adds a `$where` clause to this query */
    $where(argument: string | Function): QueryWithHelpers<Array<THydratedDocumentType>, THydratedDocumentType, TQueryHelpers, TRawDocType, 'find', TInstanceMethods & TVirtuals>;

    /** Registered discriminators for this model. */
    discriminators: { [name: string]: Model<any> } | undefined;

    /** Translate any aliases fields/conditions so the final query or document object is pure */
    translateAliases(raw: any): any;

    /** Creates a `distinct` query: returns the distinct values of the given `field` that match `filter`. */
    distinct<DocKey extends string>(
      field: DocKey,
      filter?: QueryFilter<TRawDocType>,
      options?: QueryOptions<TRawDocType>
    ): QueryWithHelpers<
      Array<
        DocKey extends keyof WithLevel1NestedPaths<TRawDocType>
          ? WithoutUndefined<Unpacked<WithLevel1NestedPaths<TRawDocType>[DocKey]>>
          : unknown
      >,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'distinct',
      TInstanceMethods & TVirtuals
    >;
    distinct<DocKey extends string>(
      field: DocKey,
      filter?: Query<any, any>,
      options?: QueryOptions<TRawDocType>
    ): QueryWithHelpers<
      Array<
        DocKey extends keyof WithLevel1NestedPaths<TRawDocType>
          ? WithoutUndefined<Unpacked<WithLevel1NestedPaths<TRawDocType>[DocKey]>>
          : unknown
      >,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'distinct',
      TInstanceMethods & TVirtuals
    >;

    /** Creates a `estimatedDocumentCount` query: counts the number of documents in the collection. */
    estimatedDocumentCount(options?: QueryOptions<TRawDocType>): QueryWithHelpers<
      number,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'estimatedDocumentCount',
      TInstanceMethods & TVirtuals
    >;

    /**
     * Returns a document with its `_id` if at least one document exists in the database that matches
     * the given `filter`, and `null` otherwise.
     */
    exists(
      filter: QueryFilter<TRawDocType>
    ): QueryWithHelpers<
      { _id: InferId<TRawDocType> } | null,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'findOne',
      TInstanceMethods & TVirtuals
    >;
    exists(
      filter: Query<any, any>
    ): QueryWithHelpers<
      { _id: InferId<TRawDocType> } | null,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'findOne',
      TInstanceMethods & TVirtuals
    >;

    /** Creates a `find` query: gets a list of documents that match `filter`. */
    find<ResultDoc = THydratedDocumentType>(
      filter: QueryFilter<TRawDocType>,
      projection: ProjectionType<TRawDocType> | null | undefined,
      options: QueryOptions<TRawDocType> & { lean: true } & mongodb.Abortable
    ): QueryWithHelpers<
      GetLeanResultType<TRawDocType, TRawDocType[], 'find'>,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'find',
      TInstanceMethods & TVirtuals
    >;
    find(
      filter: Query<any, any>,
      projection: ProjectionType<TRawDocType> | null | undefined,
      options: QueryOptions<TRawDocType> & { lean: true } & mongodb.Abortable
    ): QueryWithHelpers<
      GetLeanResultType<TRawDocType, TRawDocType[], 'find'>,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'find',
      TInstanceMethods & TVirtuals
    >;
    find<ResultDoc = THydratedDocumentType>(
      filter?: QueryFilter<TRawDocType>,
      projection?: ProjectionType<TRawDocType> | null | undefined,
      options?: QueryOptions<TRawDocType> & mongodb.Abortable
    ): QueryWithHelpers<
      ResultDoc[],
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'find',
      TInstanceMethods & TVirtuals
    >;
    find(
      filter?: Query<any, any>,
      projection?: ProjectionType<TRawDocType> | null | undefined,
      options?: QueryOptions<TRawDocType> & mongodb.Abortable
    ): QueryWithHelpers<
      THydratedDocumentType[],
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'find',
      TInstanceMethods & TVirtuals
    >;

    /** Creates a `findByIdAndDelete` query, filtering by the given `_id`. */
    findByIdAndDelete<ResultDoc = THydratedDocumentType>(
      id: mongodb.ObjectId | any,
      options: QueryOptions<TRawDocType> & { includeResultMetadata: true, lean: true }
    ): QueryWithHelpers<
      ModifyResult<TLeanResultType>,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndDelete',
      TInstanceMethods & TVirtuals
    >;
    findByIdAndDelete<ResultDoc = THydratedDocumentType>(
      id: mongodb.ObjectId | any,
      options: QueryOptions<TRawDocType> & { lean: true }
    ): QueryWithHelpers<
      TLeanResultType | null,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndDelete',
      TInstanceMethods & TVirtuals
    >;
    findByIdAndDelete<ResultDoc = THydratedDocumentType>(
      id: mongodb.ObjectId | any,
      options: QueryOptions<TRawDocType> & { includeResultMetadata: true }
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? ModifyResult<TLeanResultType> : ModifyResult<ResultDoc>,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndDelete',
      TInstanceMethods & TVirtuals
    >;
    findByIdAndDelete<ResultDoc = THydratedDocumentType>(
      id?: mongodb.ObjectId | any,
      options?: QueryOptions<TRawDocType> | null
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TLeanResultType | null : ResultDoc | null,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndDelete',
      TInstanceMethods & TVirtuals
    >;


    /** Creates a `findOneAndUpdate` query, filtering by the given `_id`. */
    findByIdAndUpdate<ResultDoc = THydratedDocumentType>(
      filter: QueryFilter<TRawDocType>,
      update: UpdateQuery<TRawDocType>,
      options: QueryOptions<TRawDocType> & { includeResultMetadata: true, lean: true }
    ): QueryWithHelpers<
      ModifyResult<TRawDocType>,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndUpdate',
      TInstanceMethods & TVirtuals
    >;
    findByIdAndUpdate(
      filter: Query<any, any>,
      update: UpdateQuery<TRawDocType>,
      options: QueryOptions<TRawDocType> & { includeResultMetadata: true, lean: true }
    ): QueryWithHelpers<
      ModifyResult<TRawDocType>,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndUpdate',
      TInstanceMethods & TVirtuals
    >;
    findByIdAndUpdate<ResultDoc = THydratedDocumentType>(
      id: mongodb.ObjectId | any,
      update: UpdateQuery<TRawDocType>,
      options: QueryOptions<TRawDocType> & { lean: true }
    ): QueryWithHelpers<
      TLeanResultType | null,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndUpdate',
      TInstanceMethods & TVirtuals
    >;
    findByIdAndUpdate<ResultDoc = THydratedDocumentType>(
      id: mongodb.ObjectId | any,
      update: UpdateQuery<TRawDocType>,
      options: QueryOptions<TRawDocType> & { includeResultMetadata: true }
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? ModifyResult<TLeanResultType> : ModifyResult<ResultDoc>,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndUpdate',
      TInstanceMethods & TVirtuals
    >;
    findByIdAndUpdate<ResultDoc = THydratedDocumentType>(
      id: mongodb.ObjectId | any,
      update: UpdateQuery<TRawDocType>,
      options: QueryOptions<TRawDocType> & { upsert: true } & ReturnsNewDoc
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TLeanResultType : ResultDoc,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndUpdate',
      TInstanceMethods & TVirtuals
    >;
    findByIdAndUpdate<ResultDoc = THydratedDocumentType>(
      id?: mongodb.ObjectId | any,
      update?: UpdateQuery<TRawDocType>,
      options?: QueryOptions<TRawDocType> | null
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TLeanResultType | null : ResultDoc | null,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndUpdate',
      TInstanceMethods & TVirtuals
    >;

    /** Creates a `findOneAndDelete` query: atomically finds the given document, deletes it, and returns the document as it was before deletion. */
    findOneAndDelete<ResultDoc = THydratedDocumentType>(
      filter: QueryFilter<TRawDocType>,
      options: QueryOptions<TRawDocType> & { lean: true }
    ): QueryWithHelpers<
      TLeanResultType | null,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndDelete',
      TInstanceMethods & TVirtuals
    >;
    findOneAndDelete(
      filter: Query<any, any>,
      options: QueryOptions<TRawDocType> & { lean: true }
    ): QueryWithHelpers<
      TLeanResultType | null,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndDelete',
      TInstanceMethods & TVirtuals
    >;
    findOneAndDelete<ResultDoc = THydratedDocumentType>(
      filter: QueryFilter<TRawDocType>,
      options: QueryOptions<TRawDocType> & { includeResultMetadata: true }
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? ModifyResult<TRawDocType> : ModifyResult<ResultDoc>,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndDelete',
      TInstanceMethods & TVirtuals
    >;
    findOneAndDelete(
      filter: Query<any, any>,
      options: QueryOptions<TRawDocType> & { includeResultMetadata: true }
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? ModifyResult<TRawDocType> : ModifyResult<THydratedDocumentType>,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndDelete',
      TInstanceMethods & TVirtuals
    >;
    findOneAndDelete<ResultDoc = THydratedDocumentType>(
      filter?: QueryFilter<TRawDocType> | null,
      options?: QueryOptions<TRawDocType> | null
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TRawDocType | null : ResultDoc | null,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndDelete',
      TInstanceMethods & TVirtuals
    >;
    findOneAndDelete(
      filter?: Query<any, any> | null,
      options?: QueryOptions<TRawDocType> | null
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TRawDocType | null : THydratedDocumentType | null,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndDelete',
      TInstanceMethods & TVirtuals
    >;

    /** Creates a `findOneAndReplace` query: atomically finds the given document and replaces it with `replacement`. */
    findOneAndReplace<ResultDoc = THydratedDocumentType>(
      filter: QueryFilter<TRawDocType>,
      replacement: TRawDocType | AnyObject,
      options: QueryOptions<TRawDocType> & { lean: true }
    ): QueryWithHelpers<
      TLeanResultType | null,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndReplace',
      TInstanceMethods & TVirtuals
    >;
    findOneAndReplace(
      filter: Query<any, any>,
      replacement: TRawDocType | AnyObject,
      options: QueryOptions<TRawDocType> & { lean: true }
    ): QueryWithHelpers<
      TLeanResultType | null,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndReplace',
      TInstanceMethods & TVirtuals
    >;
    findOneAndReplace<ResultDoc = THydratedDocumentType>(
      filter: QueryFilter<TRawDocType>,
      replacement: TRawDocType | AnyObject,
      options: QueryOptions<TRawDocType> & { includeResultMetadata: true }
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? ModifyResult<TLeanResultType> : ModifyResult<ResultDoc>,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndReplace',
      TInstanceMethods & TVirtuals
    >;
    findOneAndReplace(
      filter: Query<any, any>,
      replacement: TRawDocType | AnyObject,
      options: QueryOptions<TRawDocType> & { includeResultMetadata: true }
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? ModifyResult<TLeanResultType> : ModifyResult<THydratedDocumentType>,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndReplace',
      TInstanceMethods & TVirtuals
    >;
    findOneAndReplace<ResultDoc = THydratedDocumentType>(
      filter: QueryFilter<TRawDocType>,
      replacement: TRawDocType | AnyObject,
      options: QueryOptions<TRawDocType> & { upsert: true } & ReturnsNewDoc
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TLeanResultType : ResultDoc,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndReplace',
      TInstanceMethods & TVirtuals
    >;
    findOneAndReplace(
      filter: Query<any, any>,
      replacement: TRawDocType | AnyObject,
      options: QueryOptions<TRawDocType> & { upsert: true } & ReturnsNewDoc
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TLeanResultType : THydratedDocumentType,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndReplace',
      TInstanceMethods & TVirtuals
    >;
    findOneAndReplace<ResultDoc = THydratedDocumentType>(
      filter?: QueryFilter<TRawDocType>,
      replacement?: TRawDocType | AnyObject,
      options?: QueryOptions<TRawDocType> | null
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TLeanResultType | null : ResultDoc | null,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndReplace',
      TInstanceMethods & TVirtuals
    >;
    findOneAndReplace(
      filter?: Query<any, any>,
      replacement?: TRawDocType | AnyObject,
      options?: QueryOptions<TRawDocType> | null
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TLeanResultType | null : THydratedDocumentType | null,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndReplace',
      TInstanceMethods & TVirtuals
    >;

    /** Creates a `findOneAndUpdate` query: atomically find the first document that matches `filter` and apply `update`. */
    findOneAndUpdate<ResultDoc = THydratedDocumentType>(
      filter: QueryFilter<TRawDocType>,
      update: UpdateQuery<TRawDocType>,
      options: QueryOptions<TRawDocType> & { includeResultMetadata: true, lean: true }
    ): QueryWithHelpers<
      ModifyResult<TRawDocType>,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndUpdate',
      TInstanceMethods & TVirtuals
    >;
    findOneAndUpdate(
      filter: Query<any, any>,
      update: UpdateQuery<TRawDocType>,
      options: QueryOptions<TRawDocType> & { includeResultMetadata: true, lean: true }
    ): QueryWithHelpers<
      ModifyResult<TRawDocType>,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndUpdate',
      TInstanceMethods & TVirtuals
    >;
    findOneAndUpdate<ResultDoc = THydratedDocumentType>(
      filter: QueryFilter<TRawDocType>,
      update: UpdateQuery<TRawDocType>,
      options: QueryOptions<TRawDocType> & { lean: true }
    ): QueryWithHelpers<
      GetLeanResultType<TRawDocType, TRawDocType, 'findOneAndUpdate'> | null,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndUpdate',
      TInstanceMethods & TVirtuals
    >;
    findOneAndUpdate(
      filter: Query<any, any>,
      update: UpdateQuery<TRawDocType>,
      options: QueryOptions<TRawDocType> & { lean: true }
    ): QueryWithHelpers<
      GetLeanResultType<TRawDocType, TRawDocType, 'findOneAndUpdate'> | null,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndUpdate',
      TInstanceMethods & TVirtuals
    >;
    findOneAndUpdate<ResultDoc = THydratedDocumentType>(
      filter: QueryFilter<TRawDocType>,
      update: UpdateQuery<TRawDocType>,
      options: QueryOptions<TRawDocType> & { includeResultMetadata: true }
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? ModifyResult<TLeanResultType> : ModifyResult<ResultDoc>,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndUpdate',
      TInstanceMethods & TVirtuals
    >;
    findOneAndUpdate(
      filter: Query<any, any>,
      update: UpdateQuery<TRawDocType>,
      options: QueryOptions<TRawDocType> & { includeResultMetadata: true }
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? ModifyResult<TLeanResultType> : ModifyResult<THydratedDocumentType>,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndUpdate',
      TInstanceMethods & TVirtuals
    >;
    findOneAndUpdate<ResultDoc = THydratedDocumentType>(
      filter: QueryFilter<TRawDocType>,
      update: UpdateQuery<TRawDocType>,
      options: QueryOptions<TRawDocType> & { upsert: true } & ReturnsNewDoc
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TLeanResultType : ResultDoc,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndUpdate',
      TInstanceMethods & TVirtuals
    >;
    findOneAndUpdate(
      filter: Query<any, any>,
      update: UpdateQuery<TRawDocType>,
      options: QueryOptions<TRawDocType> & { upsert: true } & ReturnsNewDoc
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TLeanResultType : THydratedDocumentType,
      THydratedDocumentType,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndUpdate',
      TInstanceMethods & TVirtuals
    >;
    findOneAndUpdate<ResultDoc = THydratedDocumentType>(
      filter?: QueryFilter<TRawDocType>,
      update?: UpdateQuery<TRawDocType>,
      options?: QueryOptions<TRawDocType> | null
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TLeanResultType | null : ResultDoc | null,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndUpdate',
      TInstanceMethods & TVirtuals
    >;
    findOneAndUpdate<ResultDoc = THydratedDocumentType>(
      filter?: Query<any, any>,
      update?: UpdateQuery<TRawDocType>,
      options?: QueryOptions<TRawDocType> | null
    ): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TLeanResultType | null : ResultDoc | null,
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'findOneAndUpdate',
      TInstanceMethods & TVirtuals
    >;

    /** Creates a `replaceOne` query: finds the first document that matches `filter` and replaces it with `replacement`. */
    replaceOne<ResultDoc = THydratedDocumentType>(
      filter?: QueryFilter<TRawDocType>,
      replacement?: TRawDocType | AnyObject,
      options?: (mongodb.ReplaceOptions & QueryOptions<TRawDocType>) | null
    ): QueryWithHelpers<UpdateWriteOpResult, ResultDoc, TQueryHelpers, TLeanResultType, 'replaceOne', TInstanceMethods & TVirtuals>;
    replaceOne<ResultDoc = THydratedDocumentType>(
      filter?: Query<any, any>,
      replacement?: TRawDocType | AnyObject,
      options?: (mongodb.ReplaceOptions & QueryOptions<TRawDocType>) | null
    ): QueryWithHelpers<UpdateWriteOpResult, ResultDoc, TQueryHelpers, TLeanResultType, 'replaceOne', TInstanceMethods & TVirtuals>;

    /** Apply changes made to this model's schema after this model was compiled. */
    recompileSchema(): void;

    /** Schema the model uses. */
    schema: TSchema;

    /** Creates a `updateMany` query: updates all documents that match `filter` with `update`. */
    updateMany(
      filter: QueryFilter<TRawDocType>,
      update: UpdateQuery<TRawDocType> | UpdateWithAggregationPipeline,
      options?: (mongodb.UpdateOptions & MongooseUpdateQueryOptions<TRawDocType>) | null
    ): QueryWithHelpers<UpdateWriteOpResult, THydratedDocumentType, TQueryHelpers, TLeanResultType, 'updateMany', TInstanceMethods & TVirtuals>;
    updateMany(
      filter: Query<any, any>,
      update: UpdateQuery<TRawDocType> | UpdateWithAggregationPipeline,
      options?: (mongodb.UpdateOptions & MongooseUpdateQueryOptions<TRawDocType>) | null
    ): QueryWithHelpers<UpdateWriteOpResult, THydratedDocumentType, TQueryHelpers, TLeanResultType, 'updateMany', TInstanceMethods & TVirtuals>;

    /** Creates a `updateOne` query: updates the first document that matches `filter` with `update`. */
    updateOne(
      filter: QueryFilter<TRawDocType>,
      update: UpdateQuery<TRawDocType> | UpdateWithAggregationPipeline,
      options?: (mongodb.UpdateOptions & MongooseUpdateQueryOptions<TRawDocType>) | null
    ): QueryWithHelpers<UpdateWriteOpResult, THydratedDocumentType, TQueryHelpers, TLeanResultType, 'updateOne', TInstanceMethods & TVirtuals>;
    updateOne(
      filter: Query<any, any>,
      update: UpdateQuery<TRawDocType> | UpdateWithAggregationPipeline,
      options?: (mongodb.UpdateOptions & MongooseUpdateQueryOptions<TRawDocType>) | null
    ): QueryWithHelpers<UpdateWriteOpResult, THydratedDocumentType, TQueryHelpers, TLeanResultType, 'updateOne', TInstanceMethods & TVirtuals>;

    /** Creates a Query, applies the passed conditions, and returns the Query. */
    where<ResultDoc = THydratedDocumentType>(
      path: string,
      val?: any
    ): QueryWithHelpers<HasLeanOption<TSchema> extends true ? TRawDocType[] : ResultDoc[], ResultDoc, TQueryHelpers, TRawDocType, 'find', TInstanceMethods>;
    where<ResultDoc = THydratedDocumentType>(obj: object): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TRawDocType[] : ResultDoc[],
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'find',
      TInstanceMethods & TVirtuals
    >;
    where<ResultDoc = THydratedDocumentType>(): QueryWithHelpers<
      HasLeanOption<TSchema> extends true ? TRawDocType[] : ResultDoc[],
      ResultDoc,
      TQueryHelpers,
      TLeanResultType,
      'find',
      TInstanceMethods & TVirtuals
    >;

    /**
     * If auto encryption is enabled, returns a ClientEncryption instance that is configured with the same settings that
     * Mongoose's underlying MongoClient is using.  If the client has not yet been configured, returns null.
     */
    clientEncryption(): mongodb.ClientEncryption | null;
  }
}
