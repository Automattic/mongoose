/// <reference path="./aggregate.d.ts" />
/// <reference path="./callback.d.ts" />
/// <reference path="./collection.d.ts" />
/// <reference path="./connection.d.ts" />
/// <reference path="./cursor.d.ts" />
/// <reference path="./document.d.ts" />
/// <reference path="./error.d.ts" />
/// <reference path="./helpers.d.ts" />
/// <reference path="./indizes.d.ts" />
/// <reference path="./mongooseoptions.d.ts" />
/// <reference path="./pipelinestage.d.ts" />
/// <reference path="./populate.d.ts" />
/// <reference path="./query.d.ts" />
/// <reference path="./schemaoptions.d.ts" />
/// <reference path="./schematypes.d.ts" />
/// <reference path="./types.d.ts" />
/// <reference path="./utility.d.ts" />
/// <reference path="./validation.d.ts" />

declare class NativeDate extends global.Date { }

declare module 'mongoose' {
  import events = require('events');
  import mongodb = require('mongodb');
  import mongoose = require('mongoose');

  export type Mongoose = typeof mongoose;

  /**
   * Mongoose constructor. The exports object of the `mongoose` module is an instance of this
   * class. Most apps will only use this one instance.
   */
  export const Mongoose: new (options?: MongooseOptions | null) => Mongoose;

  export let Promise: any;
  export const PromiseProvider: any;

  /**
   * Can be extended to explicitly type specific models.
   */
  export interface Models {
    [modelName: string]: Model<any>
  }

  /** An array containing all models associated with this Mongoose instance. */
  export const models: Models;

  /**
   * Removes the model named `name` from the default connection, if it exists.
   * You can use this function to clean up any models you created in your tests to
   * prevent OverwriteModelErrors.
   */
  export function deleteModel(name: string | RegExp): Mongoose;

  /** Gets mongoose options */
  export function get<K extends keyof MongooseOptions>(key: K): MongooseOptions[K];

  /* ! ignore */
  export type CompileModelOptions = { overwriteModels?: boolean, connection?: Connection };

  export function model<T>(name: string, schema?: Schema<T, any, any> | Schema<T & Document, any, any>, collection?: string, options?: CompileModelOptions): Model<T>;
  export function model<T, U, TQueryHelpers = {}>(
    name: string,
    schema?: Schema<T, U, {}, TQueryHelpers>,
    collection?: string,
    options?: CompileModelOptions
  ): U;

  /** Returns an array of model names created on this instance of Mongoose. */
  export function modelNames(): Array<string>;

  /** The node-mongodb-native driver Mongoose uses. */
  export const mongo: typeof mongodb;

  /** Declares a global plugin executed on all Schemas. */
  export function plugin(fn: (schema: Schema, opts?: any) => void, opts?: any): Mongoose;

  /** Getter/setter around function for pluralizing collection names. */
  export function pluralize(fn?: ((str: string) => string) | null): ((str: string) => string) | null;

  /** Sets mongoose options */
  export function set<K extends keyof MongooseOptions>(key: K, value: MongooseOptions[K]): Mongoose;

  /**
   * _Requires MongoDB >= 3.6.0._ Starts a [MongoDB session](https://docs.mongodb.com/manual/release-notes/3.6/#client-sessions)
   * for benefits like causal consistency, [retryable writes](https://docs.mongodb.com/manual/core/retryable-writes/),
   * and [transactions](http://thecodebarbarian.com/a-node-js-perspective-on-mongodb-4-transactions.html).
   */
  export function startSession(options?: mongodb.ClientSessionOptions): Promise<mongodb.ClientSession>;
  export function startSession(options: mongodb.ClientSessionOptions, cb: Callback<mongodb.ClientSession>): void;

  /** The Mongoose version */
  export const version: string;

  export type ClientSession = mongodb.ClientSession;

  /** A list of paths to validate. If set, Mongoose will validate only the modified paths that are in the given list. */
  export type pathsToValidate = string[] | string;

  export interface AcceptsDiscriminator {
    /** Adds a discriminator type. */
    discriminator<D>(name: string | number, schema: Schema, value?: string | number | ObjectId): Model<D>;
    discriminator<T, U>(name: string | number, schema: Schema<T, U>, value?: string | number | ObjectId): U;
  }

  export type AnyKeys<T> = { [P in keyof T]?: T[P] | any };
  export interface AnyObject {
    [k: string]: any
  }
  export type Require_id<T> = T extends { _id?: any } ? (T & { _id: T['_id'] }) : (T & { _id: Types.ObjectId });

  export type HydratedDocument<DocType, TMethodsAndOverrides = {}, TVirtuals = {}> = DocType extends Document ? Require_id<DocType> : (Document<unknown, any, DocType> & Require_id<DocType> & TVirtuals & TMethodsAndOverrides);

  interface MongooseBulkWriteOptions {
    skipValidation?: boolean;
  }
  export interface ModifyResult<T> {
    value: Require_id<T> | null;
    /** see https://www.mongodb.com/docs/manual/reference/command/findAndModify/#lasterrorobject */
    lastErrorObject?: {
      updatedExisting?: boolean;
      upserted?: mongodb.ObjectId;
    };
    ok: 0 | 1;
  }

  export const Model: Model<any>;
  export interface Model<T, TQueryHelpers = {}, TMethodsAndOverrides = {}, TVirtuals = {}> extends
    NodeJS.EventEmitter,
    AcceptsDiscriminator,
    ModelIndexOperations {
    new <DocType = AnyKeys<T> & AnyObject>(doc?: DocType, fields?: any | null, options?: boolean | AnyObject): HydratedDocument<T, TMethodsAndOverrides, TVirtuals>;

    aggregate<R = any>(pipeline?: PipelineStage[], options?: mongodb.AggregateOptions, callback?: Callback<R[]>): Aggregate<Array<R>>;
    aggregate<R = any>(pipeline: PipelineStage[], cb: Function): Aggregate<Array<R>>;

    /** Base Mongoose instance the model uses. */
    base: Mongoose;

    /**
     * If this is a discriminator model, `baseModelName` is the name of
     * the base model.
     */
    baseModelName: string | undefined;

    /**
     * Sends multiple `insertOne`, `updateOne`, `updateMany`, `replaceOne`,
     * `deleteOne`, and/or `deleteMany` operations to the MongoDB server in one
     * command. This is faster than sending multiple independent operations (e.g.
     * if you use `create()`) because with `bulkWrite()` there is only one network
     * round trip to the MongoDB server.
     */
    bulkWrite(writes: Array<any>, options?: mongodb.BulkWriteOptions & MongooseBulkWriteOptions): Promise<mongodb.BulkWriteResult>;
    bulkWrite(writes: Array<any>, options?: mongodb.BulkWriteOptions & MongooseBulkWriteOptions, cb?: Callback<mongodb.BulkWriteResult>): void;

    /**
     * Sends multiple `save()` calls in a single `bulkWrite()`. This is faster than
     * sending multiple `save()` calls because with `bulkSave()` there is only one
     * network round trip to the MongoDB server.
     */
    bulkSave(documents: Array<Document>, options?: mongodb.BulkWriteOptions): Promise<mongodb.BulkWriteResult>;

    /** Collection the model uses. */
    collection: Collection;

    /** Creates a `count` query: counts the number of documents that match `filter`. */
    count(callback?: Callback<number>): QueryWithHelpers<number, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;
    count(filter: FilterQuery<T>, callback?: Callback<number>): QueryWithHelpers<number, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /** Creates a `countDocuments` query: counts the number of documents that match `filter`. */
    countDocuments(callback?: Callback<number>): QueryWithHelpers<number, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;
    countDocuments(filter: FilterQuery<T>, options?: QueryOptions<T>, callback?: Callback<number>): QueryWithHelpers<number, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /** Creates a new document or documents */
    create(docs: (AnyKeys<T> | AnyObject)[], options?: SaveOptions): Promise<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>[]>;
    create(docs: (AnyKeys<T> | AnyObject)[], callback: Callback<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>[]>): void;
    create(doc: AnyKeys<T> | AnyObject): Promise<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>;
    create(doc: AnyKeys<T> | AnyObject, callback: Callback<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>): void;
    create<DocContents = AnyKeys<T>>(docs: DocContents[], options?: SaveOptions): Promise<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>[]>;
    create<DocContents = AnyKeys<T>>(docs: DocContents[], callback: Callback<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>[]>): void;
    create<DocContents = AnyKeys<T>>(doc: DocContents): Promise<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>;
    create<DocContents = AnyKeys<T>>(...docs: DocContents[]): Promise<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>[]>;
    create<DocContents = AnyKeys<T>>(doc: DocContents, callback: Callback<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>): void;

    /**
     * Create the collection for this model. By default, if no indexes are specified,
     * mongoose will not create the collection for the model until any documents are
     * created. Use this method to create the collection explicitly.
     */
    createCollection<T extends mongodb.Document>(options?: mongodb.CreateCollectionOptions & Pick<SchemaOptions, 'expires'>): Promise<mongodb.Collection<T>>;
    createCollection<T extends mongodb.Document>(options: mongodb.CreateCollectionOptions & Pick<SchemaOptions, 'expires'> | null, callback: Callback<mongodb.Collection<T>>): void;

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
    hydrate(obj: any): HydratedDocument<T, TMethodsAndOverrides, TVirtuals>;

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
    insertMany(docs: Array<AnyKeys<T> | AnyObject>, options: InsertManyOptions & { rawResult: true }): Promise<InsertManyResult<T>>;
    insertMany(docs: Array<AnyKeys<T> | AnyObject>, options?: InsertManyOptions): Promise<Array<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>>;
    insertMany(doc: AnyKeys<T> | AnyObject, options: InsertManyOptions & { rawResult: true }): Promise<InsertManyResult<T>>;
    insertMany(doc: AnyKeys<T> | AnyObject, options?: InsertManyOptions): Promise<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>[]>;
    insertMany(doc: AnyKeys<T> | AnyObject, options?: InsertManyOptions, callback?: Callback<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>[] | InsertManyResult<T>>): void;
    insertMany(docs: Array<AnyKeys<T> | AnyObject>, options?: InsertManyOptions, callback?: Callback<Array<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>> | InsertManyResult<T>>): void;

    /** The name of the model */
    modelName: string;

    /** Populates document references. */
    populate(docs: Array<any>, options: PopulateOptions | Array<PopulateOptions> | string,
      callback?: Callback<(HydratedDocument<T, TMethodsAndOverrides, TVirtuals>)[]>): Promise<Array<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>>;
    populate(doc: any, options: PopulateOptions | Array<PopulateOptions> | string,
      callback?: Callback<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>): Promise<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>;

    /**
     * Starts a [MongoDB session](https://docs.mongodb.com/manual/release-notes/3.6/#client-sessions)
     * for benefits like causal consistency, [retryable writes](https://docs.mongodb.com/manual/core/retryable-writes/),
     * and [transactions](http://thecodebarbarian.com/a-node-js-perspective-on-mongodb-4-transactions.html).
     * */
    startSession(options?: mongodb.ClientSessionOptions, cb?: Callback<mongodb.ClientSession>): Promise<mongodb.ClientSession>;

    /** Casts and validates the given object against this model's schema, passing the given `context` to custom validators. */
    validate(callback?: CallbackWithoutResult): Promise<void>;
    validate(optional: any, callback?: CallbackWithoutResult): Promise<void>;
    validate(optional: any, pathsToValidate: pathsToValidate, callback?: CallbackWithoutResult): Promise<void>;

    /** Watches the underlying collection for changes using [MongoDB change streams](https://docs.mongodb.com/manual/changeStreams/). */
    watch<ResultType extends mongodb.Document = any>(pipeline?: Array<Record<string, unknown>>, options?: mongodb.ChangeStreamOptions): mongodb.ChangeStream<ResultType>;

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
    exists(filter: FilterQuery<T>): QueryWithHelpers<Pick<Document<T>, '_id'> | null, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;
    exists(filter: FilterQuery<T>, callback: Callback<Pick<Document<T>, '_id'> | null>): QueryWithHelpers<Pick<Document<T>, '_id'> | null, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /** Creates a `find` query: gets a list of documents that match `filter`. */
    find<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(callback?: Callback<ResultDoc[]>): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    find<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter: FilterQuery<T>,
      projection?: ProjectionType<T> | null,
      callback?: Callback<ResultDoc[]>
    ): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    find<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter: FilterQuery<T>, callback?: Callback<ResultDoc[]>): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    find<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter: FilterQuery<T>, projection?: ProjectionType<T> | null, options?: QueryOptions<T> | null, callback?: Callback<ResultDoc[]>): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;

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

    /** Creates a `replaceOne` query: finds the first document that matches `filter` and replaces it with `replacement`. */
    replaceOne<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter?: FilterQuery<T>,
      replacement?: T | AnyObject,
      options?: QueryOptions<T> | null,
      callback?: Callback
    ): QueryWithHelpers<any, ResultDoc, TQueryHelpers, T>;
    replaceOne<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(
      filter?: FilterQuery<T>,
      replacement?: T | AnyObject,
      options?: QueryOptions<T> | null,
      callback?: Callback
    ): QueryWithHelpers<any, ResultDoc, TQueryHelpers, T>;

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

  export type UpdateWriteOpResult = mongodb.UpdateResult;

  export interface SaveOptions {
    checkKeys?: boolean;
    j?: boolean;
    safe?: boolean | WriteConcern;
    session?: ClientSession | null;
    timestamps?: boolean;
    validateBeforeSave?: boolean;
    validateModifiedOnly?: boolean;
    w?: number | string;
    wtimeout?: number;
  }

  export interface WriteConcern {
    j?: boolean;
    w?: number | 'majority' | TagSet;
    wtimeout?: number;
  }

  export interface TagSet {
    [k: string]: string;
  }

  export interface InsertManyOptions extends
    PopulateOption {
    limit?: number;
    rawResult?: boolean;
    ordered?: boolean;
    lean?: boolean;
    session?: mongodb.ClientSession;
  }

  export type InferIdType<T> = T extends { _id?: any } ? T['_id'] : Types.ObjectId;
  export type InsertManyResult<T> = mongodb.InsertManyResult<T> & {
    insertedIds: {
      [key: number]: InferIdType<T>;
    };
    mongoose?: { validationErrors?: Array<Error.CastError | Error.ValidatorError> };
  };

  export interface MapReduceOptions<T, Key, Val> {
    map: Function | string;
    reduce: (key: Key, vals: T[]) => Val;
    /** query filter object. */
    query?: any;
    /** sort input objects using this key */
    sort?: any;
    /** max number of documents */
    limit?: number;
    /** keep temporary data default: false */
    keeptemp?: boolean;
    /** finalize function */
    finalize?: (key: Key, val: Val) => Val;
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

  export interface GeoSearchOptions {
    /** x,y point to search for */
    near: number[];
    /** the maximum distance from the point near that a result can be */
    maxDistance: number;
    /** The maximum number of results to return */
    limit?: number;
    /** return the raw object instead of the Mongoose Model */
    lean?: boolean;
  }

  export interface ToObjectOptions {
    /** apply all getters (path and virtual getters) */
    getters?: boolean;
    /** apply virtual getters (can override getters option) */
    virtuals?: boolean | string[];
    /** if `options.virtuals = true`, you can set `options.aliases = false` to skip applying aliases. This option is a no-op if `options.virtuals = false`. */
    aliases?: boolean;
    /** remove empty objects (defaults to true) */
    minimize?: boolean;
    /** if set, mongoose will call this function to allow you to transform the returned object */
    transform?: boolean | ((doc: any, ret: any, options: any) => any);
    /** if true, replace any conventionally populated paths with the original id in the output. Has no affect on virtual populated paths. */
    depopulate?: boolean;
    /** if false, exclude the version key (`__v` by default) from the output */
    versionKey?: boolean;
    /** if true, convert Maps to POJOs. Useful if you want to `JSON.stringify()` the result of `toObject()`. */
    flattenMaps?: boolean;
    /** If true, omits fields that are excluded in this document's projection. Unless you specified a projection, this will omit any field that has `select: false` in the schema. */
    useProjection?: boolean;
  }

  export type MongooseDocumentMiddleware = 'validate' | 'save' | 'remove' | 'updateOne' | 'deleteOne' | 'init';
  export type MongooseQueryMiddleware = 'count' | 'deleteMany' | 'deleteOne' | 'distinct' | 'find' | 'findOne' | 'findOneAndDelete' | 'findOneAndRemove' | 'findOneAndUpdate' | 'remove' | 'update' | 'updateOne' | 'updateMany';

  export type SchemaPreOptions = { document?: boolean, query?: boolean };
  export type SchemaPostOptions = { document?: boolean, query?: boolean };

  export type PreMiddlewareFunction<ThisType = any> = (this: ThisType, next: CallbackWithoutResultAndOptionalError) => void | Promise<void>;
  export type PreSaveMiddlewareFunction<ThisType = any> = (this: ThisType, next: CallbackWithoutResultAndOptionalError, opts: SaveOptions) => void | Promise<void>;
  export type PostMiddlewareFunction<ThisType = any, ResType = any> = (this: ThisType, res: ResType, next: CallbackWithoutResultAndOptionalError) => void | Promise<void>;
  export type ErrorHandlingMiddlewareFunction<ThisType = any, ResType = any> = (this: ThisType, err: NativeError, res: ResType, next: CallbackWithoutResultAndOptionalError) => void;

  export class Schema<DocType = any, M = Model<DocType, any, any, any>, TInstanceMethods = {}, TQueryHelpers = {}, TVirtuals = any> extends events.EventEmitter {
    /**
     * Create a new schema
     */
    constructor(definition?: SchemaDefinition<SchemaDefinitionType<DocType>>, options?: SchemaOptions);

    /** Adds key path / schema type pairs to this schema. */
    add(obj: SchemaDefinition<SchemaDefinitionType<DocType>> | Schema, prefix?: string): this;

    /**
     * Array of child schemas (from document arrays and single nested subdocs)
     * and their corresponding compiled models. Each element of the array is
     * an object with 2 properties: `schema` and `model`.
     */
    childSchemas: { schema: Schema, model: any }[];

    /** Removes all indexes on this schema */
    clearIndexes(): this;

    /** Returns a copy of this schema */
    clone<T = this>(): T;

    /** Returns a new schema that has the picked `paths` from this schema. */
    pick<T = this>(paths: string[], options?: SchemaOptions): T;

    /** Object containing discriminators defined on this schema */
    discriminators?: { [name: string]: Schema };

    /** Iterates the schemas paths similar to Array#forEach. */
    eachPath(fn: (path: string, type: SchemaType) => void): this;

    /** Defines an index (most likely compound) for this schema. */
    index(fields: IndexDefinition, options?: IndexOptions): this;

    /**
     * Returns a list of indexes that this schema declares, via `schema.index()`
     * or by `index: true` in a path's options.
     */
    indexes(): Array<IndexDefinition>;

    /** Gets a schema option. */
    get<K extends keyof SchemaOptions>(key: K): SchemaOptions[K];

    /**
     * Loads an ES6 class into a schema. Maps [setters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/set) + [getters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get), [static methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/static),
     * and [instance methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes#Class_body_and_method_definitions)
     * to schema [virtuals](http://mongoosejs.com/docs/guide.html#virtuals),
     * [statics](http://mongoosejs.com/docs/guide.html#statics), and
     * [methods](http://mongoosejs.com/docs/guide.html#methods).
     */
    loadClass(model: Function, onlyVirtuals?: boolean): this;

    /** Adds an instance method to documents constructed from Models compiled from this schema. */
    method<Context = any>(name: string, fn: (this: Context, ...args: any[]) => any, opts?: any): this;
    method(obj: Partial<TInstanceMethods>): this;

    /** Object of currently defined methods on this schema. */
    methods: { [F in keyof TInstanceMethods]: TInstanceMethods[F] } & AnyObject;

    /** The original object passed to the schema constructor */
    obj: SchemaDefinition<SchemaDefinitionType<DocType>>;

    /** Gets/sets schema paths. */
    path<ResultType extends SchemaType = SchemaType>(path: string): ResultType;
    path(path: string, constructor: any): this;

    /** Lists all paths and their type in the schema. */
    paths: {
      [key: string]: SchemaType;
    };

    /** Returns the pathType of `path` for this schema. */
    pathType(path: string): string;

    /** Registers a plugin for this schema. */
    plugin(fn: (schema: Schema<DocType>, opts?: any) => void, opts?: any): this;

    /** Defines a post hook for the model. */
    post<T = HydratedDocument<DocType, TInstanceMethods>>(method: MongooseDocumentMiddleware | MongooseDocumentMiddleware[] | RegExp, fn: PostMiddlewareFunction<T>): this;
    post<T = HydratedDocument<DocType, TInstanceMethods>>(method: MongooseDocumentMiddleware | MongooseDocumentMiddleware[] | RegExp, options: SchemaPostOptions, fn: PostMiddlewareFunction<T>): this;
    post<T extends Query<any, any>>(method: MongooseQueryMiddleware | MongooseQueryMiddleware[] | string | RegExp, fn: PostMiddlewareFunction<T>): this;
    post<T extends Query<any, any>>(method: MongooseQueryMiddleware | MongooseQueryMiddleware[] | string | RegExp, options: SchemaPostOptions, fn: PostMiddlewareFunction<T>): this;
    post<T extends Aggregate<any>>(method: 'aggregate' | RegExp, fn: PostMiddlewareFunction<T, Array<any>>): this;
    post<T extends Aggregate<any>>(method: 'aggregate' | RegExp, options: SchemaPostOptions, fn: PostMiddlewareFunction<T, Array<any>>): this;
    post<T = M>(method: 'insertMany' | RegExp, fn: PostMiddlewareFunction<T>): this;
    post<T = M>(method: 'insertMany' | RegExp, options: SchemaPostOptions, fn: PostMiddlewareFunction<T>): this;

    post<T = HydratedDocument<DocType, TInstanceMethods>>(method: MongooseDocumentMiddleware | MongooseDocumentMiddleware[] | RegExp, fn: ErrorHandlingMiddlewareFunction<T>): this;
    post<T = HydratedDocument<DocType, TInstanceMethods>>(method: MongooseDocumentMiddleware | MongooseDocumentMiddleware[] | RegExp, options: SchemaPostOptions, fn: ErrorHandlingMiddlewareFunction<T>): this;
    post<T extends Query<any, any>>(method: MongooseQueryMiddleware | MongooseQueryMiddleware[] | string | RegExp, fn: ErrorHandlingMiddlewareFunction<T>): this;
    post<T extends Query<any, any>>(method: MongooseQueryMiddleware | MongooseQueryMiddleware[] | string | RegExp, options: SchemaPostOptions, fn: ErrorHandlingMiddlewareFunction<T>): this;
    post<T extends Aggregate<any>>(method: 'aggregate' | RegExp, fn: ErrorHandlingMiddlewareFunction<T, Array<any>>): this;
    post<T extends Aggregate<any>>(method: 'aggregate' | RegExp, options: SchemaPostOptions, fn: ErrorHandlingMiddlewareFunction<T, Array<any>>): this;
    post<T = M>(method: 'insertMany' | RegExp, fn: ErrorHandlingMiddlewareFunction<T>): this;
    post<T = M>(method: 'insertMany' | RegExp, options: SchemaPostOptions, fn: ErrorHandlingMiddlewareFunction<T>): this;

    /** Defines a pre hook for the model. */
    pre<T = HydratedDocument<DocType, TInstanceMethods>>(method: 'save', fn: PreSaveMiddlewareFunction<T>): this;
    pre<T = HydratedDocument<DocType, TInstanceMethods>>(method: 'save', options: SchemaPreOptions, fn: PreSaveMiddlewareFunction<T>): this;
    pre<T = HydratedDocument<DocType, TInstanceMethods>>(method: MongooseDocumentMiddleware | MongooseDocumentMiddleware[] | RegExp, fn: PreMiddlewareFunction<T>): this;
    pre<T = HydratedDocument<DocType, TInstanceMethods>>(method: MongooseDocumentMiddleware | MongooseDocumentMiddleware[] | RegExp, options: SchemaPreOptions, fn: PreMiddlewareFunction<T>): this;
    pre<T extends Query<any, any>>(method: MongooseDocumentMiddleware | MongooseDocumentMiddleware[] | RegExp, options: SchemaPreOptions, fn: PreMiddlewareFunction<T>): this;
    pre<T extends Query<any, any>>(method: MongooseQueryMiddleware | MongooseQueryMiddleware[] | string | RegExp, fn: PreMiddlewareFunction<T>): this;
    pre<T extends Query<any, any>>(method: MongooseQueryMiddleware | MongooseQueryMiddleware[] | string | RegExp, options: SchemaPreOptions, fn: PreMiddlewareFunction<T>): this;
    pre<T extends Aggregate<any>>(method: 'aggregate' | RegExp, fn: PreMiddlewareFunction<T>): this;
    pre<T extends Aggregate<any>>(method: 'aggregate' | RegExp, options: SchemaPreOptions, fn: PreMiddlewareFunction<T>): this;
    pre<T = M>(method: 'insertMany' | RegExp, fn: (this: T, next: (err?: CallbackError) => void, docs: any | Array<any>) => void | Promise<void>): this;
    pre<T = M>(method: 'insertMany' | RegExp, options: SchemaPreOptions, fn: (this: T, next: (err?: CallbackError) => void, docs: any | Array<any>) => void | Promise<void>): this;

    /** Object of currently defined query helpers on this schema. */
    query: TQueryHelpers;

    /** Adds a method call to the queue. */
    queue(name: string, args: any[]): this;

    /** Removes the given `path` (or [`paths`]). */
    remove(paths: string | Array<string>): this;

    /** Removes index by name or index spec */
    remove(index: string | AnyObject): this;

    /** Returns an Array of path strings that are required by this schema. */
    requiredPaths(invalidate?: boolean): string[];

    /** Sets a schema option. */
    set<K extends keyof SchemaOptions>(key: K, value: SchemaOptions[K], _tags?: any): this;

    /** Adds static "class" methods to Models compiled from this schema. */
    static(name: string, fn: (this: M, ...args: any[]) => any): this;
    static(obj: { [name: string]: (this: M, ...args: any[]) => any }): this;

    /** Object of currently defined statics on this schema. */
    statics: { [name: string]: (this: M, ...args: any[]) => any };

    /** Creates a virtual type with the given name. */
    virtual<T = HydratedDocument<DocType, TInstanceMethods>>(
      name: string,
      options?: VirtualTypeOptions<T, DocType>
    ): VirtualType<T>;

    /** Object of currently defined virtuals on this schema */
    virtuals: TVirtuals;

    /** Returns the virtual type with the given `name`. */
    virtualpath<T = HydratedDocument<DocType, TInstanceMethods>>(name: string): VirtualType<T> | null;
  }

  export type NumberSchemaDefinition = typeof Number | 'number' | 'Number' | typeof Schema.Types.Number;
  export type StringSchemaDefinition = typeof String | 'string' | 'String' | typeof Schema.Types.String;
  export type BooleanSchemaDefinition = typeof Boolean | 'boolean' | 'Boolean' | typeof Schema.Types.Boolean;
  export type DateSchemaDefinition = typeof NativeDate | 'date' | 'Date' | typeof Schema.Types.Date;
  export type ObjectIdSchemaDefinition = 'ObjectId' | 'ObjectID' | typeof Schema.Types.ObjectId;

  export type SchemaDefinitionWithBuiltInClass<T> = T extends number
    ? NumberSchemaDefinition
    : T extends string
      ? StringSchemaDefinition
      : T extends boolean
        ? BooleanSchemaDefinition
        : T extends NativeDate
          ? DateSchemaDefinition
          : (Function | string);

  export type SchemaDefinitionProperty<T = undefined> = SchemaDefinitionWithBuiltInClass<T> |
  SchemaTypeOptions<T extends undefined ? any : T> |
    typeof SchemaType |
  Schema<any, any, any> |
  Schema<any, any, any>[] |
  SchemaTypeOptions<T extends undefined ? any : Unpacked<T>>[] |
  Function[] |
  SchemaDefinition<T> |
  SchemaDefinition<Unpacked<T>>[] |
    typeof Schema.Types.Mixed |
  MixedSchemaTypeOptions;

  export type SchemaDefinition<T = undefined> = T extends undefined
    ? { [path: string]: SchemaDefinitionProperty; }
    : { [path in keyof T]?: SchemaDefinitionProperty<T[path]>; };

  export type AnyArray<T> = T[] | ReadonlyArray<T>;
  export type ExtractMongooseArray<T> = T extends Types.Array<any> ? AnyArray<Unpacked<T>> : T;

  export interface MixedSchemaTypeOptions extends SchemaTypeOptions<Schema.Types.Mixed> {
    type: typeof Schema.Types.Mixed;
  }

  export type RefType =
    | number
    | string
    | Buffer
    | undefined
    | Types.ObjectId
    | Types.Buffer
    | typeof Schema.Types.Number
    | typeof Schema.Types.String
    | typeof Schema.Types.Buffer
    | typeof Schema.Types.ObjectId;


  export type InferId<T> = T extends { _id?: any } ? T['_id'] : Types.ObjectId;

  export interface VirtualTypeOptions<HydratedDocType = Document, DocType = unknown> {
    /** If `ref` is not nullish, this becomes a populated virtual. */
    ref?: string | Function;

    /**  The local field to populate on if this is a populated virtual. */
    localField?: string | ((this: HydratedDocType, doc: HydratedDocType) => string);

    /** The foreign field to populate on if this is a populated virtual. */
    foreignField?: string | ((this: HydratedDocType, doc: HydratedDocType) => string);

    /**
     * By default, a populated virtual is an array. If you set `justOne`,
     * the populated virtual will be a single doc or `null`.
     */
    justOne?: boolean;

    /** If you set this to `true`, Mongoose will call any custom getters you defined on this virtual. */
    getters?: boolean;

    /**
     * If you set this to `true`, `populate()` will set this virtual to the number of populated
     * documents, as opposed to the documents themselves, using `Query#countDocuments()`.
     */
    count?: boolean;

    /** Add an extra match condition to `populate()`. */
    match?: FilterQuery<any> | Function;

    /** Add a default `limit` to the `populate()` query. */
    limit?: number;

    /** Add a default `skip` to the `populate()` query. */
    skip?: number;

    /**
     * For legacy reasons, `limit` with `populate()` may give incorrect results because it only
     * executes a single query for every document being populated. If you set `perDocumentLimit`,
     * Mongoose will ensure correct `limit` per document by executing a separate query for each
     * document to `populate()`. For example, `.find().populate({ path: 'test', perDocumentLimit: 2 })`
     * will execute 2 additional queries if `.find()` returns 2 documents.
     */
    perDocumentLimit?: number;

    /** Additional options like `limit` and `lean`. */
    options?: QueryOptions<DocType> & { match?: AnyObject };

    /** Additional options for plugins */
    [extra: string]: any;
  }

  export class VirtualType<HydratedDocType> {
    /** Applies getters to `value`. */
    applyGetters(value: any, doc: Document): any;

    /** Applies setters to `value`. */
    applySetters(value: any, doc: Document): any;

    /** Adds a custom getter to this virtual. */
    get<T = HydratedDocType>(fn: (this: T, value: any, virtualType: VirtualType<T>, doc: T) => any): this;

    /** Adds a custom setter to this virtual. */
    set<T = HydratedDocType>(fn: (this: T, value: any, virtualType: VirtualType<T>, doc: T) => void): this;
  }

  export type ReturnsNewDoc = { new: true } | { returnOriginal: false } | { returnDocument: 'after' };

  export type ProjectionElementType = number | string;
  export type ProjectionType<T> = { [P in keyof T]?: ProjectionElementType } | AnyObject | string;

  export type SortValues = SortOrder;

  export type SortOrder = -1 | 1 | 'asc' | 'ascending' | 'desc' | 'descending';

  type _UpdateQuery<TSchema> = {
    /** @see https://docs.mongodb.com/manual/reference/operator/update-field/ */
    $currentDate?: AnyKeys<TSchema> & AnyObject;
    $inc?: AnyKeys<TSchema> & AnyObject;
    $min?: AnyKeys<TSchema> & AnyObject;
    $max?: AnyKeys<TSchema> & AnyObject;
    $mul?: AnyKeys<TSchema> & AnyObject;
    $rename?: { [key: string]: string };
    $set?: AnyKeys<TSchema> & AnyObject;
    $setOnInsert?: AnyKeys<TSchema> & AnyObject;
    $unset?: AnyKeys<TSchema> & AnyObject;

    /** @see https://docs.mongodb.com/manual/reference/operator/update-array/ */
    $addToSet?: AnyKeys<TSchema> & AnyObject;
    $pop?: AnyKeys<TSchema> & AnyObject;
    $pull?: AnyKeys<TSchema> & AnyObject;
    $push?: AnyKeys<TSchema> & AnyObject;
    $pullAll?: AnyKeys<TSchema> & AnyObject;

    /** @see https://docs.mongodb.com/manual/reference/operator/update-bitwise/ */
    $bit?: {
      [key: string]: { [key in 'and' | 'or' | 'xor']?: number };
    };
  };

  export type UpdateWithAggregationPipeline = UpdateAggregationStage[];
  export type UpdateAggregationStage = { $addFields: any } |
  { $set: any } |
  { $project: any } |
  { $unset: any } |
  { $replaceRoot: any } |
  { $replaceWith: any };

  export type __UpdateDefProperty<T> =
    [Extract<T, mongodb.ObjectId>] extends [never] ? T :
      T | string;
  export type _UpdateQueryDef<T> = {
    [K in keyof T]?: __UpdateDefProperty<T[K]>;
  };

  /**
   * Update query command to perform on the document
   * @example
   * ```js
   * { age: 30 }
   * ```
   */
  export type UpdateQuery<T> = _UpdateQuery<_UpdateQueryDef<T>> & AnyObject;

  export type DocumentDefinition<T> = {
    [K in keyof Omit<T, Exclude<keyof Document, '_id' | 'id' | '__v'>>]:
    [Extract<T[K], mongodb.ObjectId>] extends [never]
      ? T[K] extends TreatAsPrimitives
        ? T[K]
        : LeanDocumentElement<T[K]>
      : T[K] | string;
  };

  export type FlattenMaps<T> = {
    [K in keyof T]: T[K] extends Map<any, any>
      ? AnyObject : T[K] extends TreatAsPrimitives
        ? T[K] : FlattenMaps<T[K]>;
  };

  export type actualPrimitives = string | boolean | number | bigint | symbol | null | undefined;
  export type TreatAsPrimitives = actualPrimitives | NativeDate | RegExp | symbol | Error | BigInt | Types.ObjectId;

  // This will -- when possible -- extract the original type of the subdocument in question
  type LeanSubdocument<T> = T extends (Types.Subdocument<Require_id<T>['_id']> & infer U) ? LeanDocument<U> : Omit<LeanDocument<T>, '$isSingleNested' | 'ownerDocument' | 'parent'>;

  export type LeanType<T> =
    0 extends (1 & T) ? T : // any
      T extends TreatAsPrimitives ? T : // primitives
        T extends Types.Subdocument ? LeanSubdocument<T> : // subdocs
          LeanDocument<T>; // Documents and everything else

  // Used only when collapsing lean arrays for ts performance reasons:
  type LeanTypeOrArray<T> = T extends unknown[] ? LeanArray<T> : LeanType<T>;

  export type LeanArray<T extends unknown[]> =
  // By checking if it extends Types.Array we can get the original base type before collapsing down,
  // rather than trying to manually remove the old types. This matches both Array and DocumentArray
    T extends Types.Array<infer U> ? LeanTypeOrArray<U>[] :
      // If it isn't a custom mongoose type we fall back to "do our best"
      T extends unknown[][] ? LeanArray<T[number]>[] : LeanType<T[number]>[];

  export type _LeanDocument<T> = {
    [K in keyof T]: LeanDocumentElement<T[K]>;
  };

  // Keep this a separate type, to ensure that T is a naked type.
  // This way, the conditional type is distributive over union types.
  // This is required for PopulatedDoc.
  export type LeanDocumentElement<T> =
    0 extends (1 & T) ? T :// any
      T extends unknown[] ? LeanArray<T> : // Array
        T extends Document ? LeanDocument<T> : // Subdocument
          T;

  export type SchemaDefinitionType<T> = T extends Document ? Omit<T, Exclude<keyof Document, '_id' | 'id' | '__v'>> : T;

  // Helpers to simplify checks
  type IfAny<IFTYPE, THENTYPE> = 0 extends (1 & IFTYPE) ? THENTYPE : IFTYPE;
  type IfUnknown<IFTYPE, THENTYPE> = unknown extends IFTYPE ? THENTYPE : IFTYPE;

  // tests for these two types are located in test/types/lean.test.ts
  export type DocTypeFromUnion<T> = T extends (Document<infer T1, infer T2, infer T3> & infer U) ?
    [U] extends [Document<T1, T2, T3> & infer U] ? IfUnknown<IfAny<U, false>, false> : false : false;

  export type DocTypeFromGeneric<T> = T extends Document<infer IdType, infer TQueryHelpers, infer DocType> ?
    IfUnknown<IfAny<DocType, false>, false> : false;

  /**
   * Helper to choose the best option between two type helpers
   */
  export type _pickObject<T1, T2, Fallback> = T1 extends false ? T2 extends false ? Fallback : T2 : T1;

  /**
   * There may be a better way to do this, but the goal is to return the DocType if it can be infered
   * and if not to return a type which is easily identified as "not valid" so we fall back to
   * "strip out known things added by extending Document"
   * There are three basic ways to mix in Document -- "Document & T", "Document<ObjId, mixins, T>",
   * and "T extends Document". In the last case there is no type without Document mixins, so we can only
   * strip things out. In the other two cases we can infer the type, so we should
   */
  export type BaseDocumentType<T> = _pickObject<DocTypeFromUnion<T>, DocTypeFromGeneric<T>, false>;

  /**
   * Documents returned from queries with the lean option enabled.
   * Plain old JavaScript object documents (POJO).
   * @see https://mongoosejs.com/docs/tutorials/lean.html
   */
  export type LeanDocument<T> = BaseDocumentType<T> extends Document ? _LeanDocument<BaseDocumentType<T>> :
    Omit<_LeanDocument<T>, Exclude<keyof Document, '_id' | 'id' | '__v'> | '$isSingleNested'>;

  export type LeanDocumentOrArray<T> = 0 extends (1 & T) ? T :
    T extends unknown[] ? LeanDocument<T[number]>[] :
      T extends Document ? LeanDocument<T> :
        T;

  export type LeanDocumentOrArrayWithRawType<T, RawDocType> = 0 extends (1 & T) ? T :
    T extends unknown[] ? LeanDocument<RawDocType>[] :
      T extends Document ? LeanDocument<RawDocType> :
        T;

  /* for ts-mongoose */
  export class mquery { }

  export default mongoose;
}
