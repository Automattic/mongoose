/// <reference path="./PipelineStage.d.ts" />

import events = require('events');
import mongodb = require('mongodb');
import mongoose = require('mongoose');
import stream = require('stream');

declare module 'mongoose' {

  export enum ConnectionStates {
    disconnected = 0,
    connected = 1,
    connecting = 2,
    disconnecting = 3,
    uninitialized = 99,
  }

  class NativeDate extends global.Date {}

  /** The Mongoose Date [SchemaType](/docs/schematypes.html). */
  export type Date = Schema.Types.Date;

  /**
   * The Mongoose Decimal128 [SchemaType](/docs/schematypes.html). Used for
   * declaring paths in your schema that should be
   * [128-bit decimal floating points](http://thecodebarbarian.com/a-nodejs-perspective-on-mongodb-34-decimal.html).
   * Do not use this to create a new Decimal128 instance, use `mongoose.Types.Decimal128`
   * instead.
   */
  export type Decimal128 = Schema.Types.Decimal128;

  /**
   * The Mongoose Mixed [SchemaType](/docs/schematypes.html). Used for
   * declaring paths in your schema that Mongoose's change tracking, casting,
   * and validation should ignore.
   */
  export type Mixed = Schema.Types.Mixed;

  /**
   * Mongoose constructor. The exports object of the `mongoose` module is an instance of this
   * class. Most apps will only use this one instance.
   */
  export const Mongoose: new (options?: MongooseOptions | null) => typeof mongoose;

  /**
   * The Mongoose Number [SchemaType](/docs/schematypes.html). Used for
   * declaring paths in your schema that Mongoose should cast to numbers.
   */
  export type Number = Schema.Types.Number;

  /**
   * The Mongoose ObjectId [SchemaType](/docs/schematypes.html). Used for
   * declaring paths in your schema that should be
   * [MongoDB ObjectIds](https://docs.mongodb.com/manual/reference/method/ObjectId/).
   * Do not use this to create a new ObjectId instance, use `mongoose.Types.ObjectId`
   * instead.
   */
  export type ObjectId = Schema.Types.ObjectId;

  export let Promise: any;
  export const PromiseProvider: any;

  /** The various Mongoose SchemaTypes. */
  export const SchemaTypes: typeof Schema.Types;

  /** Expose connection states for user-land */
  export const STATES: typeof ConnectionStates;

  /** Opens Mongoose's default connection to MongoDB, see [connections docs](https://mongoosejs.com/docs/connections.html) */
  export function connect(uri: string, options: ConnectOptions, callback: CallbackWithoutResult): void;
  export function connect(uri: string, callback: CallbackWithoutResult): void;
  export function connect(uri: string, options?: ConnectOptions): Promise<Mongoose>;

  /**
     * Makes the indexes in MongoDB match the indexes defined in every model's
     * schema. This function will drop any indexes that are not defined in
     * the model's schema except the `_id` index, and build any indexes that
     * are in your schema but not in MongoDB.
     */
  export function syncIndexes(options?: SyncIndexesOptions): Promise<ConnectionSyncIndexesResult>;
  export function syncIndexes(options: SyncIndexesOptions | null, callback: Callback<ConnectionSyncIndexesResult>): void;

  /* Tells `sanitizeFilter()` to skip the given object when filtering out potential query selector injection attacks.
   * Use this method when you have a known query selector that you want to use. */
  export function trusted<T>(obj: T): T;

  /** The Mongoose module's default connection. Equivalent to `mongoose.connections[0]`, see [`connections`](#mongoose_Mongoose-connections). */
  export const connection: Connection;

  /** An array containing all connections associated with this Mongoose instance. */
  export const connections: Connection[];

  /**
   * Can be extended to explicitly type specific models.
   */
  interface Models {
    [modelName: string]: Model<any>
  }

  /** An array containing all models associated with this Mongoose instance. */
  export const models: Models;
  /** Creates a Connection instance. */
  export function createConnection(uri: string, options?: ConnectOptions): Connection;
  export function createConnection(): Connection;
  export function createConnection(uri: string, options: ConnectOptions, callback: Callback<Connection>): void;

  /**
   * Removes the model named `name` from the default connection, if it exists.
   * You can use this function to clean up any models you created in your tests to
   * prevent OverwriteModelErrors.
   */
  export function deleteModel(name: string | RegExp): typeof mongoose;

  export function disconnect(): Promise<void>;
  export function disconnect(cb: CallbackWithoutResult): void;

  /** Gets mongoose options */
  export function get<K extends keyof MongooseOptions>(key: K): MongooseOptions[K];

  /* ! ignore */
  type CompileModelOptions = { overwriteModels?: boolean, connection?: Connection };

  /**
   * Returns true if Mongoose can cast the given value to an ObjectId, or
   * false otherwise.
   */
  export function isValidObjectId(v: Types.ObjectId): true;
  export function isValidObjectId(v: any): boolean;

  export function model<T>(name: string, schema?: Schema<T, any, any> | Schema<T & Document, any, any>, collection?: string, options?: CompileModelOptions): Model<T>;
  export function model<T, U, TQueryHelpers = {}>(
    name: string,
    schema?: Schema<T, U, TQueryHelpers>,
    collection?: string,
    options?: CompileModelOptions
  ): U;

  /** Returns an array of model names created on this instance of Mongoose. */
  export function modelNames(): Array<string>;

  /** The node-mongodb-native driver Mongoose uses. */
  export const mongo: typeof mongodb;

  /**
   * Mongoose uses this function to get the current time when setting
   * [timestamps](/docs/guide.html#timestamps). You may stub out this function
   * using a tool like [Sinon](https://www.npmjs.com/package/sinon) for testing.
   */
  export function now(): NativeDate;

  /** Declares a global plugin executed on all Schemas. */
  export function plugin(fn: (schema: Schema, opts?: any) => void, opts?: any): typeof mongoose;

  /** Getter/setter around function for pluralizing collection names. */
  export function pluralize(fn?: ((str: string) => string) | null): ((str: string) => string) | null;

  /** Sets mongoose options */
  export function set<K extends keyof MongooseOptions>(key: K, value: MongooseOptions[K]): typeof mongoose;

  /**
   * _Requires MongoDB >= 3.6.0._ Starts a [MongoDB session](https://docs.mongodb.com/manual/release-notes/3.6/#client-sessions)
   * for benefits like causal consistency, [retryable writes](https://docs.mongodb.com/manual/core/retryable-writes/),
   * and [transactions](http://thecodebarbarian.com/a-node-js-perspective-on-mongodb-4-transactions.html).
   */
  export function startSession(options?: mongodb.ClientSessionOptions): Promise<mongodb.ClientSession>;
  export function startSession(options: mongodb.ClientSessionOptions, cb: Callback<mongodb.ClientSession>): void;

  /** The Mongoose version */
  export const version: string;

  export type CastError = Error.CastError;
  export type SyncIndexesError = Error.SyncIndexesError;

  type Mongoose = typeof mongoose;

  interface MongooseOptions {
    /** true by default. Set to false to skip applying global plugins to child schemas */
    applyPluginsToChildSchemas?: boolean;

    /**
     * false by default. Set to true to apply global plugins to discriminator schemas.
     * This typically isn't necessary because plugins are applied to the base schema and
     * discriminators copy all middleware, methods, statics, and properties from the base schema.
     */
    applyPluginsToDiscriminators?: boolean;

    /**
     * Set to `true` to make Mongoose call` Model.createCollection()` automatically when you
     * create a model with `mongoose.model()` or `conn.model()`. This is useful for testing
     * transactions, change streams, and other features that require the collection to exist.
     */
    autoCreate?: boolean;

    /**
     * true by default. Set to false to disable automatic index creation
     * for all models associated with this Mongoose instance.
     */
    autoIndex?: boolean;

    /** enable/disable mongoose's buffering mechanism for all connections and models */
    bufferCommands?: boolean;

    bufferTimeoutMS?: number;

    /** false by default. Set to `true` to `clone()` all schemas before compiling into a model. */
    cloneSchemas?: boolean;

    /**
     * If `true`, prints the operations mongoose sends to MongoDB to the console.
     * If a writable stream is passed, it will log to that stream, without colorization.
     * If a callback function is passed, it will receive the collection name, the method
     * name, then all arguments passed to the method. For example, if you wanted to
     * replicate the default logging, you could output from the callback
     * `Mongoose: ${collectionName}.${methodName}(${methodArgs.join(', ')})`.
     */
    debug?:
      | boolean
      | { color?: boolean; shell?: boolean }
      | stream.Writable
      | ((collectionName: string, methodName: string, ...methodArgs: any[]) => void);

    /** If set, attaches [maxTimeMS](https://docs.mongodb.com/manual/reference/operator/meta/maxTimeMS/) to every query */
    maxTimeMS?: number;

    /**
     * true by default. Mongoose adds a getter to MongoDB ObjectId's called `_id` that
     * returns `this` for convenience with populate. Set this to false to remove the getter.
     */
    objectIdGetter?: boolean;

    /**
     * Set to `true` to default to overwriting models with the same name when calling
     * `mongoose.model()`, as opposed to throwing an `OverwriteModelError`.
     */
    overwriteModels?: boolean;

    /**
     * If `false`, changes the default `returnOriginal` option to `findOneAndUpdate()`,
     * `findByIdAndUpdate`, and `findOneAndReplace()` to false. This is equivalent to
     * setting the `new` option to `true` for `findOneAndX()` calls by default. Read our
     * `findOneAndUpdate()` [tutorial](https://mongoosejs.com/docs/tutorials/findoneandupdate.html)
     * for more information.
     */
    returnOriginal?: boolean;

    /**
     * false by default. Set to true to enable [update validators](
     * https://mongoosejs.com/docs/validation.html#update-validators
     * ) for all validators by default.
     */
    runValidators?: boolean;

    sanitizeFilter?: boolean;

    sanitizeProjection?: boolean;

    /**
     * true by default. Set to false to opt out of Mongoose adding all fields that you `populate()`
     * to your `select()`. The schema-level option `selectPopulatedPaths` overwrites this one.
     */
    selectPopulatedPaths?: boolean;

    setDefaultsOnInsert?: boolean;

    /** true by default, may be `false`, `true`, or `'throw'`. Sets the default strict mode for schemas. */
    strict?: boolean | 'throw';

    /** true by default. set to `false` to allow populating paths that aren't in the schema */
    strictPopulate?: boolean;

    /**
     * false by default, may be `false`, `true`, or `'throw'`. Sets the default
     * [strictQuery](https://mongoosejs.com/docs/guide.html#strictQuery) mode for schemas.
     */
    strictQuery?: boolean | 'throw';

    /**
     * `{ transform: true, flattenDecimals: true }` by default. Overwrites default objects to
     * `toJSON()`, for determining how Mongoose documents get serialized by `JSON.stringify()`
     */
    toJSON?: ToObjectOptions;

    /** `{ transform: true, flattenDecimals: true }` by default. Overwrites default objects to `toObject()` */
    toObject?: ToObjectOptions;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface ClientSession extends mongodb.ClientSession { }

  interface ConnectOptions extends mongodb.MongoClientOptions {
    /** Set to false to [disable buffering](http://mongoosejs.com/docs/faq.html#callback_never_executes) on all models associated with this connection. */
    bufferCommands?: boolean;
    /** The name of the database you want to use. If not provided, Mongoose uses the database name from connection string. */
    dbName?: string;
    /** username for authentication, equivalent to `options.auth.user`. Maintained for backwards compatibility. */
    user?: string;
    /** password for authentication, equivalent to `options.auth.password`. Maintained for backwards compatibility. */
    pass?: string;
    /** Set to false to disable automatic index creation for all models associated with this connection. */
    autoIndex?: boolean;
    /** Set to `true` to make Mongoose automatically call `createCollection()` on every model created on this connection. */
    autoCreate?: boolean;
  }

  class Connection extends events.EventEmitter {
    /** Returns a promise that resolves when this connection successfully connects to MongoDB */
    asPromise(): Promise<this>;

    /** Closes the connection */
    close(callback: CallbackWithoutResult): void;
    close(force: boolean, callback: CallbackWithoutResult): void;
    close(force?: boolean): Promise<void>;

    /** Retrieves a collection, creating it if not cached. */
    collection<T = AnyObject>(name: string, options?: mongodb.CreateCollectionOptions): Collection<T>;

    /** A hash of the collections associated with this connection */
    collections: { [index: string]: Collection };

    /** A hash of the global options that are associated with this connection */
    config: any;

    /** The mongodb.Db instance, set when the connection is opened */
    db: mongodb.Db;

    /**
     * Helper for `createCollection()`. Will explicitly create the given collection
     * with specified options. Used to create [capped collections](https://docs.mongodb.com/manual/core/capped-collections/)
     * and [views](https://docs.mongodb.com/manual/core/views/) from mongoose.
     */
    createCollection<T = AnyObject>(name: string, options?: mongodb.CreateCollectionOptions): Promise<mongodb.Collection<T>>;
    createCollection<T = AnyObject>(name: string, cb: Callback<mongodb.Collection<T>>): void;
    createCollection<T = AnyObject>(name: string, options: mongodb.CreateCollectionOptions, cb?: Callback<mongodb.Collection<T>>): Promise<mongodb.Collection<T>>;

    /**
     * Removes the model named `name` from this connection, if it exists. You can
     * use this function to clean up any models you created in your tests to
     * prevent OverwriteModelErrors.
     */
    deleteModel(name: string): this;

    /**
     * Helper for `dropCollection()`. Will delete the given collection, including
     * all documents and indexes.
     */
    dropCollection(collection: string): Promise<void>;
    dropCollection(collection: string, cb: CallbackWithoutResult): void;

    /**
     * Helper for `dropDatabase()`. Deletes the given database, including all
     * collections, documents, and indexes.
     */
    dropDatabase(): Promise<void>;
    dropDatabase(cb: CallbackWithoutResult): void;

    /** Gets the value of the option `key`. Equivalent to `conn.options[key]` */
    get(key: string): any;

    /**
     * Returns the [MongoDB driver `MongoClient`](http://mongodb.github.io/node-mongodb-native/3.5/api/MongoClient.html) instance
     * that this connection uses to talk to MongoDB.
     */
    getClient(): mongodb.MongoClient;

    /**
     * The host name portion of the URI. If multiple hosts, such as a replica set,
     * this will contain the first host name in the URI
     */
    host: string;

    /**
     * A number identifier for this connection. Used for debugging when
     * you have [multiple connections](/docs/connections.html#multiple_connections).
     */
    id: number;

    /**
     * A [POJO](https://masteringjs.io/tutorials/fundamentals/pojo) containing
     * a map from model names to models. Contains all models that have been
     * added to this connection using [`Connection#model()`](/docs/api/connection.html#connection_Connection-model).
     */
    models: { [index: string]: Model<any> };

    /** Defines or retrieves a model. */
    model<T>(name: string, schema?: Schema<any>, collection?: string, options?: CompileModelOptions): Model<T>;
    model<T, U, TQueryHelpers = {}>(
      name: string,
      schema?: Schema<T, U, TQueryHelpers>,
      collection?: string,
      options?: CompileModelOptions
    ): U;

    /** Returns an array of model names created on this connection. */
    modelNames(): Array<string>;

    /** The name of the database this connection points to. */
    name: string;

    /** Opens the connection with a URI using `MongoClient.connect()`. */
    openUri(uri: string, options?: ConnectOptions): Promise<Connection>;
    openUri(uri: string, callback: (err: CallbackError, conn?: Connection) => void): Connection;
    openUri(uri: string, options: ConnectOptions, callback: (err: CallbackError, conn?: Connection) => void): Connection;

    /** The password specified in the URI */
    pass: string;

    /**
     * The port portion of the URI. If multiple hosts, such as a replica set,
     * this will contain the port from the first host name in the URI.
     */
    port: number;

    /** Declares a plugin executed on all schemas you pass to `conn.model()` */
    plugin(fn: (schema: Schema, opts?: any) => void, opts?: any): Connection;

    /** The plugins that will be applied to all models created on this connection. */
    plugins: Array<any>;

    /**
     * Connection ready state
     *
     * - 0 = disconnected
     * - 1 = connected
     * - 2 = connecting
     * - 3 = disconnecting
     */
    readyState: number;

    /** Sets the value of the option `key`. Equivalent to `conn.options[key] = val` */
    set(key: string, value: any): any;

    /**
     * Set the [MongoDB driver `MongoClient`](http://mongodb.github.io/node-mongodb-native/3.5/api/MongoClient.html) instance
     * that this connection uses to talk to MongoDB. This is useful if you already have a MongoClient instance, and want to
     * reuse it.
     */
    setClient(client: mongodb.MongoClient): this;

    /**
     * _Requires MongoDB >= 3.6.0._ Starts a [MongoDB session](https://docs.mongodb.com/manual/release-notes/3.6/#client-sessions)
     * for benefits like causal consistency, [retryable writes](https://docs.mongodb.com/manual/core/retryable-writes/),
     * and [transactions](http://thecodebarbarian.com/a-node-js-perspective-on-mongodb-4-transactions.html).
     */
    startSession(options?: mongodb.ClientSessionOptions): Promise<mongodb.ClientSession>;
    startSession(options: mongodb.ClientSessionOptions, cb: Callback<mongodb.ClientSession>): void;

    /**
     * Makes the indexes in MongoDB match the indexes defined in every model's
     * schema. This function will drop any indexes that are not defined in
     * the model's schema except the `_id` index, and build any indexes that
     * are in your schema but not in MongoDB.
     */
    syncIndexes(options?: SyncIndexesOptions): Promise<ConnectionSyncIndexesResult>;
    syncIndexes(options: SyncIndexesOptions | null, callback: Callback<ConnectionSyncIndexesResult>): void;

    /**
     * _Requires MongoDB >= 3.6.0._ Executes the wrapped async function
     * in a transaction. Mongoose will commit the transaction if the
     * async function executes successfully and attempt to retry if
     * there was a retryable error.
     */
    transaction(fn: (session: mongodb.ClientSession) => Promise<any>): Promise<any>;

    /** Switches to a different database using the same connection pool. */
    useDb(name: string, options?: { useCache?: boolean, noListener?: boolean }): Connection;

    /** The username specified in the URI */
    user: string;

    /** Watches the entire underlying database for changes. Similar to [`Model.watch()`](/docs/api/model.html#model_Model.watch). */
    watch<ResultType = any>(pipeline?: Array<any>, options?: mongodb.ChangeStreamOptions): mongodb.ChangeStream<ResultType>;
  }

   /*
   * section collection.js
   * http://mongoosejs.com/docs/api.html#collection-js
   */
  interface CollectionBase<T> extends mongodb.Collection<T> {
    /*
      * Abstract methods. Some of these are already defined on the
      * mongodb.Collection interface so they've been commented out.
      */
    ensureIndex(...args: any[]): any;
    findAndModify(...args: any[]): any;
    getIndexes(...args: any[]): any;

    /** The collection name */
    collectionName: string;
    /** The Connection instance */
    conn: Connection;
    /** The collection name */
    name: string;
  }

  /*
   * section drivers/node-mongodb-native/collection.js
   * http://mongoosejs.com/docs/api.html#drivers-node-mongodb-native-collection-js
   */
  let Collection: Collection;
  interface Collection<T = AnyObject> extends CollectionBase<T> {
    /**
     * Collection constructor
     * @param name name of the collection
     * @param conn A MongooseConnection instance
     * @param opts optional collection options
     */
    // eslint-disable-next-line @typescript-eslint/no-misused-new
    new(name: string, conn: Connection, opts?: any): Collection<T>;
    /** Formatter for debug print args */
    $format(arg: any): string;
    /** Debug print helper */
    $print(name: any, i: any, args: any[]): void;
    /** Retrieves information about this collections indexes. */
    getIndexes(): any;
  }

  class Document<T = any, TQueryHelpers = any, DocType = any> {
    constructor(doc?: any);

    /** This documents _id. */
    _id?: T;

    /** This documents __v. */
    __v?: any;

    /* Get all subdocs (by bfs) */
    $getAllSubdocs(): Document[];

    /** Don't run validation on this path or persist changes to this path. */
    $ignore(path: string): void;

    /** Checks if a path is set to its default. */
    $isDefault(path: string): boolean;

    /** Getter/setter, determines whether the document was removed or not. */
    $isDeleted(val?: boolean): boolean;

    /** Returns an array of all populated documents associated with the query */
    $getPopulatedDocs(): Document[];

    /**
     * Returns true if the given path is nullish or only contains empty objects.
     * Useful for determining whether this subdoc will get stripped out by the
     * [minimize option](/docs/guide.html#minimize).
     */
    $isEmpty(path: string): boolean;

    /** Checks if a path is invalid */
    $isValid(path: string): boolean;

    /**
     * Empty object that you can use for storing properties on the document. This
     * is handy for passing data to middleware without conflicting with Mongoose
     * internals.
     */
    $locals: Record<string, unknown>;

    /** Marks a path as valid, removing existing validation errors. */
    $markValid(path: string): void;

    /**
     * A string containing the current operation that Mongoose is executing
     * on this document. May be `null`, `'save'`, `'validate'`, or `'remove'`.
     */
    $op: string | null;

    /**
     * Getter/setter around the session associated with this document. Used to
     * automatically set `session` if you `save()` a doc that you got from a
     * query with an associated session.
     */
    $session(session?: mongodb.ClientSession | null): mongodb.ClientSession;

    /** Alias for `set()`, used internally to avoid conflicts */
    $set(path: string, val: any, options?: any): this;
    $set(path: string, val: any, type: any, options?: any): this;
    $set(value: any): this;

    /** Set this property to add additional query filters when Mongoose saves this document and `isNew` is false. */
    $where: Record<string, unknown>;

    /** If this is a discriminator model, `baseModelName` is the name of the base model. */
    baseModelName?: string;

    /** Collection the model uses. */
    collection: Collection;

    /** Connection the model uses. */
    db: Connection;

    /** Removes this document from the db. */
    delete(options?: QueryOptions): QueryWithHelpers<any, this, TQueryHelpers>;
    delete(options: QueryOptions, cb?: Callback): void;
    delete(cb: Callback): void;

    /** Removes this document from the db. */
    deleteOne(options?: QueryOptions): QueryWithHelpers<any, this, TQueryHelpers>;
    deleteOne(options: QueryOptions, cb?: Callback): void;
    deleteOne(cb: Callback): void;

    /**
     * Takes a populated field and returns it to its unpopulated state. If called with
     * no arguments, then all populated fields are returned to their unpopulated state.
     */
    depopulate(path?: string | string[]): this;

    /**
     * Returns the list of paths that have been directly modified. A direct
     * modified path is a path that you explicitly set, whether via `doc.foo = 'bar'`,
     * `Object.assign(doc, { foo: 'bar' })`, or `doc.set('foo', 'bar')`.
     */
    directModifiedPaths(): Array<string>;

    /**
     * Returns true if this document is equal to another document.
     *
     * Documents are considered equal when they have matching `_id`s, unless neither
     * document has an `_id`, in which case this function falls back to using
     * `deepEqual()`.
     */
    equals(doc: Document<T>): boolean;

    /** Hash containing current validation errors. */
    errors?: Error.ValidationError;

    /** Returns the value of a path. */
    get(path: string, type?: any, options?: any): any;

    /**
     * Returns the changes that happened to the document
     * in the format that will be sent to MongoDB.
     */
    getChanges(): UpdateQuery<this>;

    /** The string version of this documents _id. */
    id?: any;

    /** Signal that we desire an increment of this documents version. */
    increment(): this;

    /**
     * Initializes the document without setters or marking anything modified.
     * Called internally after a document is returned from mongodb. Normally,
     * you do **not** need to call this function on your own.
     */
    init(obj: any, opts?: any, cb?: Callback<this>): this;

    /** Marks a path as invalid, causing validation to fail. */
    invalidate(path: string, errorMsg: string | NativeError, value?: any, kind?: string): NativeError | null;

    /** Returns true if `path` was directly set and modified, else false. */
    isDirectModified(path: string): boolean;

    /** Checks if `path` was explicitly selected. If no projection, always returns true. */
    isDirectSelected(path: string): boolean;

    /** Checks if `path` is in the `init` state, that is, it was set by `Document#init()` and not modified since. */
    isInit(path: string): boolean;

    /**
     * Returns true if any of the given paths is modified, else false. If no arguments, returns `true` if any path
     * in this document is modified.
     */
    isModified(path?: string | Array<string>): boolean;

    /** Boolean flag specifying if the document is new. */
    isNew: boolean;

    /** Checks if `path` was selected in the source query which initialized this document. */
    isSelected(path: string): boolean;

    /** Marks the path as having pending changes to write to the db. */
    markModified(path: string, scope?: any): void;

    /** Returns the list of paths that have been modified. */
    modifiedPaths(options?: { includeChildren?: boolean }): Array<string>;

    /** The name of the model */
    modelName: string;

    /**
     * Overwrite all values in this document with the values of `obj`, except
     * for immutable properties. Behaves similarly to `set()`, except for it
     * unsets all properties that aren't in `obj`.
     */
    overwrite(obj: AnyObject): this;

    /**
     * If this document is a subdocument or populated document, returns the
     * document's parent. Returns undefined otherwise.
     */
    $parent(): Document | undefined;

    /** Populates document references. */
    populate<Paths = {}>(path: string | PopulateOptions | (string | PopulateOptions)[]): Promise<this & Paths>;
    populate<Paths = {}>(path: string | PopulateOptions | (string | PopulateOptions)[], callback: Callback<this & Paths>): void;
    populate<Paths = {}>(path: string, names: string): Promise<this & Paths>;
    populate<Paths = {}>(path: string, names: string, callback: Callback<this & Paths>): void;

    /** Gets _id(s) used during population of the given `path`. If the path was not populated, returns `undefined`. */
    populated(path: string): any;

    /** Removes this document from the db. */
    remove(options?: QueryOptions): Promise<this>;
    remove(options?: QueryOptions, cb?: Callback): void;

    /** Sends a replaceOne command with this document `_id` as the query selector. */
    replaceOne(replacement?: AnyObject, options?: QueryOptions | null, callback?: Callback): Query<any, this>;
    replaceOne(replacement?: AnyObject, options?: QueryOptions | null, callback?: Callback): Query<any, this>;

    /** Saves this document by inserting a new document into the database if [document.isNew](/docs/api.html#document_Document-isNew) is `true`, or sends an [updateOne](/docs/api.html#document_Document-updateOne) operation with just the modified paths if `isNew` is `false`. */
    save(options?: SaveOptions): Promise<this>;
    save(options?: SaveOptions, fn?: Callback<this>): void;
    save(fn?: Callback<this>): void;

    /** The document's schema. */
    schema: Schema;

    /** Sets the value of a path, or many paths. */
    set(path: string, val: any, options?: any): this;
    set(path: string, val: any, type: any, options?: any): this;
    set(value: any): this;

    /** The return value of this method is used in calls to JSON.stringify(doc). */
    toJSON(options: ToObjectOptions & { flattenMaps: false }): LeanDocument<this>;
    toJSON(options?: ToObjectOptions): FlattenMaps<LeanDocument<this>>;
    toJSON<T = FlattenMaps<DocType>>(options?: ToObjectOptions): T;

    /** Converts this document into a plain-old JavaScript object ([POJO](https://masteringjs.io/tutorials/fundamentals/pojo)). */
    toObject(options?: ToObjectOptions): LeanDocument<this>;
    toObject<T = DocType>(options?: ToObjectOptions): T;

    /** Clears the modified state on the specified path. */
    unmarkModified(path: string): void;

    /** Sends an update command with this document `_id` as the query selector. */
    update(update?: UpdateQuery<this> | UpdateWithAggregationPipeline, options?: QueryOptions | null, callback?: Callback): Query<any, this>;

    /** Sends an updateOne command with this document `_id` as the query selector. */
    updateOne(update?: UpdateQuery<this> | UpdateWithAggregationPipeline, options?: QueryOptions | null, callback?: Callback): Query<any, this>;

    /** Executes registered validation rules for this document. */
    validate(options:{ pathsToSkip?: pathsToSkip }): Promise<void>;
    validate(pathsToValidate?: pathsToValidate, options?: any): Promise<void>;
    validate(callback: CallbackWithoutResult): void;
    validate(pathsToValidate: pathsToValidate, callback: CallbackWithoutResult): void;
    validate(pathsToValidate: pathsToValidate, options: any, callback: CallbackWithoutResult): void;

    /** Executes registered validation rules (skipping asynchronous validators) for this document. */
    validateSync(options:{pathsToSkip?: pathsToSkip, [k:string]: any }): Error.ValidationError | null;
    validateSync(pathsToValidate?: Array<string>, options?: any): Error.ValidationError | null;
  }

  /** A list of paths to validate. If set, Mongoose will validate only the modified paths that are in the given list. */
  type pathsToValidate = string[] | string;
  /** A list of paths to skip. If set, Mongoose will validate every modified path that is not in this list. */
  type pathsToSkip = string[] | string;

  interface AcceptsDiscriminator {
    /** Adds a discriminator type. */
    discriminator<D>(name: string | number, schema: Schema, value?: string | number | ObjectId): Model<D>;
    discriminator<T, U>(name: string | number, schema: Schema<T, U>, value?: string | number | ObjectId): U;
  }

  type AnyKeys<T> = { [P in keyof T]?: T[P] | any };
  interface AnyObject { [k: string]: any }

  type Require_id<T> = T extends { _id?: any } ? (T & { _id: T['_id'] }) : (T & { _id: Types.ObjectId });

  export type HydratedDocument<DocType, TMethodsAndOverrides = {}, TVirtuals = {}> = DocType extends Document ? Require_id<DocType> : (Document<unknown, any, DocType> & Require_id<DocType> & TVirtuals & TMethodsAndOverrides);

  interface IndexesDiff {
    /** Indexes that would be created in mongodb. */
    toCreate: Array<any>
    /** Indexes that would be dropped in mongodb. */
    toDrop: Array<any>
  }

  interface ModifyResult<T> {
    value: Require_id<T> | null;
    lastErrorObject?: mongodb.Document;
    ok: 0 | 1;
  }

  export const Model: Model<any>;
  interface Model<T, TQueryHelpers = {}, TMethodsAndOverrides = {}, TVirtuals = {}> extends NodeJS.EventEmitter, AcceptsDiscriminator {
    new<DocType = AnyKeys<T> & AnyObject>(doc?: DocType, fields?: any | null, options?: boolean | AnyObject): HydratedDocument<T, TMethodsAndOverrides, TVirtuals>;

    aggregate<R = any>(pipeline?: PipelineStage[], options?: mongodb.AggregateOptions, callback?: Callback<R[]>): Aggregate<Array<R>>;
    aggregate<R = any>(pipeline: PipelineStage[], cb: Function): Aggregate<Array<R>>;

    /** Base Mongoose instance the model uses. */
    base: typeof mongoose;

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
    bulkWrite(writes: Array<any>, options?: mongodb.BulkWriteOptions): Promise<mongodb.BulkWriteResult>;
    bulkWrite(writes: Array<any>, options?: mongodb.BulkWriteOptions, cb?: Callback<mongodb.BulkWriteResult>): void;

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
    countDocuments(filter: FilterQuery<T>, options?: QueryOptions, callback?: Callback<number>): QueryWithHelpers<number, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

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
    createCollection<T>(options?: mongodb.CreateCollectionOptions): Promise<mongodb.Collection<T>>;
    createCollection<T>(options: mongodb.CreateCollectionOptions | null, callback: Callback<mongodb.Collection<T>>): void;

    /**
     * Similar to `ensureIndexes()`, except for it uses the [`createIndex`](http://mongodb.github.io/node-mongodb-native/2.2/api/Collection.html#createIndex)
     * function.
     */
    createIndexes(callback?: CallbackWithoutResult): Promise<void>;
    createIndexes(options?: any, callback?: CallbackWithoutResult): Promise<void>;

    /** Connection the model uses. */
    db: Connection;

    /**
     * Deletes all of the documents that match `conditions` from the collection.
     * Behaves like `remove()`, but deletes all documents that match `conditions`
     * regardless of the `single` option.
     */
    deleteMany(filter?: FilterQuery<T>, options?: QueryOptions, callback?: CallbackWithoutResult): QueryWithHelpers<mongodb.DeleteResult, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;
    deleteMany(filter: FilterQuery<T>, callback: CallbackWithoutResult): QueryWithHelpers<mongodb.DeleteResult, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;
    deleteMany(callback: CallbackWithoutResult): QueryWithHelpers<mongodb.DeleteResult, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /**
     * Deletes the first document that matches `conditions` from the collection.
     * Behaves like `remove()`, but deletes at most one document regardless of the
     * `single` option.
     */
    deleteOne(filter?: FilterQuery<T>, options?: QueryOptions, callback?: CallbackWithoutResult): QueryWithHelpers<mongodb.DeleteResult, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;
    deleteOne(filter: FilterQuery<T>, callback: CallbackWithoutResult): QueryWithHelpers<mongodb.DeleteResult, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;
    deleteOne(callback: CallbackWithoutResult): QueryWithHelpers<mongodb.DeleteResult, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /**
     * Sends `createIndex` commands to mongo for each index declared in the schema.
     * The `createIndex` commands are sent in series.
     */
    ensureIndexes(callback?: CallbackWithoutResult): Promise<void>;
    ensureIndexes(options?: any, callback?: CallbackWithoutResult): Promise<void>;

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
    findById<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(id: any, projection?: any | null, options?: QueryOptions | null, callback?: Callback<ResultDoc | null>): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    /** Finds one document. */
    findOne<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: FilterQuery<T>, projection?: any | null, options?: QueryOptions | null, callback?: Callback<ResultDoc | null>): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

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
    insertMany(docs: Array<AnyKeys<T> | AnyObject>, options: InsertManyOptions & { rawResult: true }): Promise<InsertManyResult>;
    insertMany(docs: Array<AnyKeys<T> | AnyObject>, options?: InsertManyOptions): Promise<Array<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>>;
    insertMany(doc: AnyKeys<T> | AnyObject, options: InsertManyOptions & { rawResult: true }): Promise<InsertManyResult>;
    insertMany(doc: AnyKeys<T> | AnyObject, options?: InsertManyOptions): Promise<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>[]>;
    insertMany(doc: AnyKeys<T> | AnyObject, options?: InsertManyOptions, callback?: Callback<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>[] | InsertManyResult>): void;
    insertMany(docs: Array<AnyKeys<T> | AnyObject>, options?: InsertManyOptions, callback?: Callback<Array<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>> | InsertManyResult>): void;

    /**
     * Lists the indexes currently defined in MongoDB. This may or may not be
     * the same as the indexes defined in your schema depending on whether you
     * use the [`autoIndex` option](/docs/guide.html#autoIndex) and if you
     * build indexes manually.
     */
    listIndexes(callback: Callback<Array<any>>): void;
    listIndexes(): Promise<Array<any>>;

    /** The name of the model */
    modelName: string;

    /** Populates document references. */
    populate(docs: Array<any>, options: PopulateOptions | Array<PopulateOptions> | string,
      callback?: Callback<(HydratedDocument<T, TMethodsAndOverrides, TVirtuals>)[]>): Promise<Array<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>>;
    populate(doc: any, options: PopulateOptions | Array<PopulateOptions> | string,
      callback?: Callback<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>): Promise<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>;

    /**
     * Makes the indexes in MongoDB match the indexes defined in this model's
     * schema. This function will drop any indexes that are not defined in
     * the model's schema except the `_id` index, and build any indexes that
     * are in your schema but not in MongoDB.
     */
    syncIndexes(options?: Record<string, unknown>): Promise<Array<string>>;
    syncIndexes(options: Record<string, unknown> | null, callback: Callback<Array<string>>): void;

    /**
     * Does a dry-run of Model.syncIndexes(), meaning that
     * the result of this function would be the result of
     * Model.syncIndexes().
     */
    diffIndexes(options?: Record<string, unknown>): Promise<IndexesDiff>
    diffIndexes(options: Record<string, unknown> | null, callback: (err: CallbackError, diff: IndexesDiff) => void): void

    /**
     * Starts a [MongoDB session](https://docs.mongodb.com/manual/release-notes/3.6/#client-sessions)
     * for benefits like causal consistency, [retryable writes](https://docs.mongodb.com/manual/core/retryable-writes/),
     * and [transactions](http://thecodebarbarian.com/a-node-js-perspective-on-mongodb-4-transactions.html).
     * */
    startSession(options?: mongodb.ClientSessionOptions, cb?: Callback<mongodb.ClientSession>): Promise<mongodb.ClientSession>;

    /** Casts and validates the given object against this model's schema, passing the given `context` to custom validators. */
    validate(callback?: CallbackWithoutResult): Promise<void>;
    validate(optional: any, callback?: CallbackWithoutResult): Promise<void>;
    validate(optional: any, pathsToValidate: string[], callback?: CallbackWithoutResult): Promise<void>;

    /** Watches the underlying collection for changes using [MongoDB change streams](https://docs.mongodb.com/manual/changeStreams/). */
    watch<ResultType = any>(pipeline?: Array<Record<string, unknown>>, options?: mongodb.ChangeStreamOptions): mongodb.ChangeStream<ResultType>;

    /** Adds a `$where` clause to this query */
    $where(argument: string | Function): QueryWithHelpers<Array<HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /** Registered discriminators for this model. */
    discriminators: { [name: string]: Model<any> } | undefined;

    /** Translate any aliases fields/conditions so the final query or document object is pure */
    translateAliases(raw: any): any;

    /** Creates a `distinct` query: returns the distinct values of the given `field` that match `filter`. */
    distinct(field: string, filter?: FilterQuery<T>, callback?: Callback<number>): QueryWithHelpers<Array<any>, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /** Creates a `estimatedDocumentCount` query: counts the number of documents in the collection. */
    estimatedDocumentCount(options?: QueryOptions, callback?: Callback<number>): QueryWithHelpers<number, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /**
     * Returns a document with its `_id` if at least one document exists in the database that matches
     * the given `filter`, and `null` otherwise.
     */
    exists(filter: FilterQuery<T>): QueryWithHelpers<Pick<Document<T>, '_id'> | null, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;
    exists(filter: FilterQuery<T>, callback: Callback<Pick<Document<T>, '_id'> | null>): QueryWithHelpers<Pick<Document<T>, '_id'> | null, HydratedDocument<T, TMethodsAndOverrides, TVirtuals>, TQueryHelpers, T>;

    /** Creates a `find` query: gets a list of documents that match `filter`. */
    find<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(callback?: Callback<ResultDoc[]>): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    find<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter: FilterQuery<T>, callback?: Callback<ResultDoc[]>): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    find<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter: FilterQuery<T>, projection?: any | null, options?: QueryOptions | null, callback?: Callback<ResultDoc[]>): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;

    /** Creates a `findByIdAndDelete` query, filtering by the given `_id`. */
    findByIdAndDelete<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(id?: mongodb.ObjectId | any, options?: QueryOptions | null, callback?: (err: CallbackError, doc: ResultDoc | null, res: any) => void): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    /** Creates a `findByIdAndRemove` query, filtering by the given `_id`. */
    findByIdAndRemove<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(id?: mongodb.ObjectId | any, options?: QueryOptions | null, callback?: (err: CallbackError, doc: ResultDoc | null, res: any) => void): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    /** Creates a `findOneAndUpdate` query, filtering by the given `_id`. */
    findByIdAndUpdate<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(id: mongodb.ObjectId | any, update: UpdateQuery<T>, options: QueryOptions & { rawResult: true }, callback?: (err: CallbackError, doc: any, res: any) => void): QueryWithHelpers<ModifyResult<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    findByIdAndUpdate<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(id: mongodb.ObjectId | any, update: UpdateQuery<T>, options: QueryOptions & { upsert: true } & ReturnsNewDoc, callback?: (err: CallbackError, doc: ResultDoc, res: any) => void): QueryWithHelpers<ResultDoc, ResultDoc, TQueryHelpers, T>;
    findByIdAndUpdate<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(id?: mongodb.ObjectId | any, update?: UpdateQuery<T>, options?: QueryOptions | null, callback?: (err: CallbackError, doc: ResultDoc | null, res: any) => void): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;
    findByIdAndUpdate<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(id: mongodb.ObjectId | any, update: UpdateQuery<T>, callback: (err: CallbackError, doc: ResultDoc | null, res: any) => void): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    /** Creates a `findOneAndDelete` query: atomically finds the given document, deletes it, and returns the document as it was before deletion. */
    findOneAndDelete<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: FilterQuery<T>, options?: QueryOptions | null, callback?: (err: CallbackError, doc: ResultDoc | null, res: any) => void): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    /** Creates a `findOneAndRemove` query: atomically finds the given document and deletes it. */
    findOneAndRemove<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: FilterQuery<T>, options?: QueryOptions | null, callback?: (err: CallbackError, doc: ResultDoc | null, res: any) => void): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    /** Creates a `findOneAndReplace` query: atomically finds the given document and replaces it with `replacement`. */
    findOneAndReplace<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter: FilterQuery<T>, replacement: T | AnyObject, options: QueryOptions & { upsert: true } & ReturnsNewDoc, callback?: (err: CallbackError, doc: ResultDoc, res: any) => void): QueryWithHelpers<ResultDoc, ResultDoc, TQueryHelpers, T>;
    findOneAndReplace<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: FilterQuery<T>, replacement?: T | AnyObject, options?: QueryOptions | null, callback?: (err: CallbackError, doc: ResultDoc | null, res: any) => void): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    /** Creates a `findOneAndUpdate` query: atomically find the first document that matches `filter` and apply `update`. */
    findOneAndUpdate<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter: FilterQuery<T>, update: UpdateQuery<T>, options: QueryOptions & { rawResult: true }, callback?: (err: CallbackError, doc: any, res: any) => void): QueryWithHelpers<ModifyResult<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    findOneAndUpdate<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter: FilterQuery<T>, update: UpdateQuery<T>, options: QueryOptions & { upsert: true } & ReturnsNewDoc, callback?: (err: CallbackError, doc: ResultDoc, res: any) => void): QueryWithHelpers<ResultDoc, ResultDoc, TQueryHelpers, T>;
    findOneAndUpdate<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: FilterQuery<T>, update?: UpdateQuery<T>, options?: QueryOptions | null, callback?: (err: CallbackError, doc: T | null, res: any) => void): QueryWithHelpers<ResultDoc | null, ResultDoc, TQueryHelpers, T>;

    geoSearch<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: FilterQuery<T>, options?: GeoSearchOptions, callback?: Callback<Array<ResultDoc>>): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;

    /** Executes a mapReduce command. */
    mapReduce<Key, Value>(
      o: MapReduceOptions<T, Key, Value>,
      callback?: Callback
    ): Promise<any>;

    remove<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: any, callback?: CallbackWithoutResult): QueryWithHelpers<any, ResultDoc, TQueryHelpers, T>;

    /** Creates a `replaceOne` query: finds the first document that matches `filter` and replaces it with `replacement`. */
    replaceOne<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: FilterQuery<T>, replacement?: T | AnyObject, options?: QueryOptions | null, callback?: Callback): QueryWithHelpers<any, ResultDoc, TQueryHelpers, T>;
    replaceOne<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: FilterQuery<T>, replacement?: T | AnyObject, options?: QueryOptions | null, callback?: Callback): QueryWithHelpers<any, ResultDoc, TQueryHelpers, T>;

    /** Schema the model uses. */
    schema: Schema<T>;

    /**
     * @deprecated use `updateOne` or `updateMany` instead.
     * Creates a `update` query: updates one or many documents that match `filter` with `update`, based on the `multi` option.
     */
    update<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: FilterQuery<T>, update?: UpdateQuery<T> | UpdateWithAggregationPipeline, options?: QueryOptions | null, callback?: Callback): QueryWithHelpers<UpdateWriteOpResult, ResultDoc, TQueryHelpers, T>;

    /** Creates a `updateMany` query: updates all documents that match `filter` with `update`. */
    updateMany<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: FilterQuery<T>, update?: UpdateQuery<T> | UpdateWithAggregationPipeline, options?: QueryOptions | null, callback?: Callback): QueryWithHelpers<UpdateWriteOpResult, ResultDoc, TQueryHelpers, T>;

    /** Creates a `updateOne` query: updates the first document that matches `filter` with `update`. */
    updateOne<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(filter?: FilterQuery<T>, update?: UpdateQuery<T> | UpdateWithAggregationPipeline, options?: QueryOptions | null, callback?: Callback): QueryWithHelpers<UpdateWriteOpResult, ResultDoc, TQueryHelpers, T>;

    /** Creates a Query, applies the passed conditions, and returns the Query. */
    where<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(path: string, val?: any): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    where<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(obj: object): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;
    where<ResultDoc = HydratedDocument<T, TMethodsAndOverrides, TVirtuals>>(): QueryWithHelpers<Array<ResultDoc>, ResultDoc, TQueryHelpers, T>;
  }

  type UpdateWriteOpResult = mongodb.UpdateResult;

  interface QueryOptions {
    arrayFilters?: { [key: string]: any }[];
    batchSize?: number;
    collation?: mongodb.CollationOptions;
    comment?: any;
    context?: string;
    explain?: any;
    fields?: any | string;
    hint?: any;
    /**
     * If truthy, mongoose will return the document as a plain JavaScript object rather than a mongoose document.
     */
    lean?: boolean | any;
    limit?: number;
    maxTimeMS?: number;
    maxscan?: number;
    multi?: boolean;
    multipleCastError?: boolean;
    /**
     * By default, `findOneAndUpdate()` returns the document as it was **before**
     * `update` was applied. If you set `new: true`, `findOneAndUpdate()` will
     * instead give you the object after `update` was applied.
     */
    new?: boolean;
    overwrite?: boolean;
    overwriteDiscriminatorKey?: boolean;
    populate?: string | string[] | PopulateOptions | PopulateOptions[];
    projection?: any;
    /**
     * if true, returns the raw result from the MongoDB driver
     */
    rawResult?: boolean;
    readPreference?: string | mongodb.ReadPreferenceMode;
    /**
     * An alias for the `new` option. `returnOriginal: false` is equivalent to `new: true`.
     */
    returnOriginal?: boolean;
    /**
     * Another alias for the `new` option. `returnOriginal` is deprecated so this should be used.
     */
    returnDocument?: string;
    runValidators?: boolean;
    /* Set to `true` to automatically sanitize potentially unsafe user-generated query projections */
    sanitizeProjection?: boolean;
    /**
     * Set to `true` to automatically sanitize potentially unsafe query filters by stripping out query selectors that
     * aren't explicitly allowed using `mongoose.trusted()`.
     */
    sanitizeFilter?: boolean;
    /** The session associated with this query. */
    session?: mongodb.ClientSession;
    setDefaultsOnInsert?: boolean;
    skip?: number;
    snapshot?: any;
    sort?: any;
    /** overwrites the schema's strict mode option */
    strict?: boolean | string;
    /**
     * equal to `strict` by default, may be `false`, `true`, or `'throw'`. Sets the default
     * [strictQuery](https://mongoosejs.com/docs/guide.html#strictQuery) mode for schemas.
     */
    strictQuery?: boolean | 'throw';
    tailable?: number;
    /**
     * If set to `false` and schema-level timestamps are enabled,
     * skip timestamps for this update. Note that this allows you to overwrite
     * timestamps. Does nothing if schema-level timestamps are not set.
     */
    timestamps?: boolean;
    upsert?: boolean;
    writeConcern?: any;

    [other: string]: any;
  }

  type MongooseQueryOptions = Pick<QueryOptions, 'populate' | 'lean' | 'strict' | 'sanitizeProjection' | 'sanitizeFilter'>;

  interface SaveOptions {
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

  interface WriteConcern {
    j?: boolean;
    w?: number | 'majority' | TagSet;
    wtimeout?: number;
  }

  interface TagSet {
    [k: string]: string;
  }

  interface InsertManyOptions {
    limit?: number;
    rawResult?: boolean;
    ordered?: boolean;
    lean?: boolean;
    session?: mongodb.ClientSession;
    populate?: string | string[] | PopulateOptions | PopulateOptions[];
  }

  interface InsertManyResult extends mongodb.InsertManyResult {
    mongoose?: { validationErrors?: Array<Error.CastError | Error.ValidatorError> }
  }

  interface MapReduceOptions<T, Key, Val> {
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

  interface PopulateOptions {
    /** space delimited path(s) to populate */
    path: string;
    /** fields to select */
    select?: any;
    /** query conditions to match */
    match?: any;
    /** optional model to use for population */
    model?: string | Model<any>;
    /** optional query options like sort, limit, etc */
    options?: any;
    /** deep populate */
    populate?: string | PopulateOptions | (string | PopulateOptions)[];
    /**
     * If true Mongoose will always set `path` to an array, if false Mongoose will
     * always set `path` to a document. Inferred from schema by default.
     */
    justOne?: boolean;
    /** transform function to call on every populated doc */
    transform?: (doc: any, id: any) => any;
  }

  interface ToObjectOptions {
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

  type MongooseDocumentMiddleware = 'validate' | 'save' | 'remove' | 'updateOne' | 'deleteOne' | 'init';
  type MongooseQueryMiddleware = 'count' | 'deleteMany' | 'deleteOne' | 'distinct' | 'find' | 'findOne' | 'findOneAndDelete' | 'findOneAndRemove' | 'findOneAndUpdate' | 'remove' | 'update' | 'updateOne' | 'updateMany';

  type SchemaPreOptions = { document?: boolean, query?: boolean };
  type SchemaPostOptions = { document?: boolean, query?: boolean };

  type ExtractVirtuals<M> = M extends Model<any, any, any, infer TVirtuals> ? TVirtuals : {};

  type IndexDirection = 1 | -1 | '2d' | '2dsphere' | 'geoHaystack' | 'hashed' | 'text';
  type IndexDefinition = Record<string, IndexDirection>;

  type PreMiddlewareFunction<T> = (this: T, next: (err?: CallbackError) => void) => void | Promise<void>;
  type PreSaveMiddlewareFunction<T> = (this: T, next: (err?: CallbackError) => void, opts: SaveOptions) => void | Promise<void>;
  type PostMiddlewareFunction<ThisType, ResType = any> = (this: ThisType, res: ResType, next: (err?: CallbackError) => void) => void | Promise<void>;
  type ErrorHandlingMiddlewareFunction<ThisType, ResType = any> = (this: ThisType, err: NativeError, res: ResType, next: (err?: CallbackError) => void) => void;

  class Schema<DocType = any, M = Model<DocType, any, any, any>, TInstanceMethods = any, TQueryHelpers = any> extends events.EventEmitter {
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

    /** Returns a copy of this schema */
    clone<T = this>(): T;

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
    methods: { [F in keyof TInstanceMethods]: TInstanceMethods[F] };

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
    pre<T = HydratedDocument<DocType, TInstanceMethods>>(method: MongooseDocumentMiddleware | MongooseDocumentMiddleware[] | RegExp, fn: PreMiddlewareFunction<T>): this;
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
    virtual(name: string, options?: VirtualTypeOptions): VirtualType;

    /** Object of currently defined virtuals on this schema */
    virtuals: any;

    /** Returns the virtual type with the given `name`. */
    virtualpath(name: string): VirtualType | null;
  }

  type NumberSchemaDefinition = typeof Number | 'number' | 'Number' | typeof Schema.Types.Number;
  type StringSchemaDefinition = typeof String | 'string' | 'String' | typeof Schema.Types.String;
  type BooleanSchemaDefinition = typeof Boolean | 'boolean' | 'Boolean' | typeof Schema.Types.Boolean;
  type DateSchemaDefinition = typeof NativeDate | 'date' | 'Date' | typeof Schema.Types.Date;
  type ObjectIdSchemaDefinition = 'ObjectId' | 'ObjectID' | typeof Schema.Types.ObjectId;

  type SchemaDefinitionWithBuiltInClass<T> = T extends number
    ? NumberSchemaDefinition
    : T extends string
    ? StringSchemaDefinition
    : T extends boolean
    ? BooleanSchemaDefinition
    : T extends NativeDate
    ? DateSchemaDefinition
    : (Function | string);

  type SchemaDefinitionProperty<T = undefined> = SchemaDefinitionWithBuiltInClass<T> |
    SchemaTypeOptions<T extends undefined ? any : T> |
    typeof SchemaType |
    Schema<any, any, any> |
    Schema<any, any, any>[] |
    SchemaTypeOptions<T extends undefined ? any : T>[] |
    Function[] |
    SchemaDefinition<T> |
    SchemaDefinition<T>[] |
    typeof SchemaTypes.Mixed;

  type SchemaDefinition<T = undefined> = T extends undefined
    ? { [path: string]: SchemaDefinitionProperty; }
    : { [path in keyof T]?: SchemaDefinitionProperty<T[path]>; };

  interface SchemaOptions {
    /**
     * By default, Mongoose's init() function creates all the indexes defined in your model's schema by
     * calling Model.createIndexes() after you successfully connect to MongoDB. If you want to disable
     * automatic index builds, you can set autoIndex to false.
     */
    autoIndex?: boolean;
    /**
     * If set to `true`, Mongoose will call Model.createCollection() to create the underlying collection
     * in MongoDB if autoCreate is set to true. Calling createCollection() sets the collection's default
     * collation based on the collation option and establishes the collection as a capped collection if
     * you set the capped schema option.
     */
    autoCreate?: boolean;
    /**
     * By default, mongoose buffers commands when the connection goes down until the driver manages to reconnect.
     * To disable buffering, set bufferCommands to false.
     */
    bufferCommands?: boolean;
    /**
     * If bufferCommands is on, this option sets the maximum amount of time Mongoose buffering will wait before
     * throwing an error. If not specified, Mongoose will use 10000 (10 seconds).
     */
    bufferTimeoutMS?: number;
    /**
     * Mongoose supports MongoDBs capped collections. To specify the underlying MongoDB collection be capped, set
     * the capped option to the maximum size of the collection in bytes.
     */
    capped?: boolean | number | { size?: number; max?: number; autoIndexId?: boolean; };
    /** Sets a default collation for every query and aggregation. */
    collation?: mongodb.CollationOptions;

    /** The timeseries option to use when creating the model's collection. */
    timeseries?: mongodb.TimeSeriesCollectionOptions;

    /**
     * Mongoose by default produces a collection name by passing the model name to the utils.toCollectionName
     * method. This method pluralizes the name. Set this option if you need a different name for your collection.
     */
    collection?: string;
    /**
     * When you define a [discriminator](/docs/discriminators.html), Mongoose adds a path to your
     * schema that stores which discriminator a document is an instance of. By default, Mongoose
     * adds an `__t` path, but you can set `discriminatorKey` to overwrite this default.
     */
    discriminatorKey?: string;
    /** defaults to false. */
    emitIndexErrors?: boolean;
    excludeIndexes?: any;
    /**
     * Mongoose assigns each of your schemas an id virtual getter by default which returns the document's _id field
     * cast to a string, or in the case of ObjectIds, its hexString.
     */
    id?: boolean;
    /**
     * Mongoose assigns each of your schemas an _id field by default if one is not passed into the Schema
     * constructor. The type assigned is an ObjectId to coincide with MongoDB's default behavior. If you
     * don't want an _id added to your schema at all, you may disable it using this option.
     */
    _id?: boolean;
    /**
     * Mongoose will, by default, "minimize" schemas by removing empty objects. This behavior can be
     * overridden by setting minimize option to false. It will then store empty objects.
     */
    minimize?: boolean;
    /**
     * Optimistic concurrency is a strategy to ensure the document you're updating didn't change between when you
     * loaded it using find() or findOne(), and when you update it using save(). Set to `true` to enable
     * optimistic concurrency.
     */
    optimisticConcurrency?: boolean;
    /**
     * If `plugin()` called with tags, Mongoose will only apply plugins to schemas that have
     * a matching tag in `pluginTags`
     */
    pluginTags?: string[];
    /**
     * Allows setting query#read options at the schema level, providing us a way to apply default ReadPreferences
     * to all queries derived from a model.
     */
    read?: string;
    /** Allows setting write concern at the schema level. */
    writeConcern?: WriteConcern;
    /** defaults to true. */
    safe?: boolean | { w?: number | string; wtimeout?: number; j?: boolean };
    /**
     * The shardKey option is used when we have a sharded MongoDB architecture. Each sharded collection is
     * given a shard key which must be present in all insert/update operations. We just need to set this
     * schema option to the same shard key and we'll be all set.
     */
    shardKey?: Record<string, unknown>;
    /**
     * The strict option, (enabled by default), ensures that values passed to our model constructor that were not
     * specified in our schema do not get saved to the db.
     */
    strict?: boolean | 'throw';
    /**
     * equal to `strict` by default, may be `false`, `true`, or `'throw'`. Sets the default
     * [strictQuery](https://mongoosejs.com/docs/guide.html#strictQuery) mode for schemas.
     */
    strictQuery?: boolean | 'throw';
    /** Exactly the same as the toObject option but only applies when the document's toJSON method is called. */
    toJSON?: ToObjectOptions;
    /**
     * Documents have a toObject method which converts the mongoose document into a plain JavaScript object.
     * This method accepts a few options. Instead of applying these options on a per-document basis, we may
     * declare the options at the schema level and have them applied to all of the schema's documents by
     * default.
     */
    toObject?: ToObjectOptions;
    /**
     * By default, if you have an object with key 'type' in your schema, mongoose will interpret it as a
     * type declaration. However, for applications like geoJSON, the 'type' property is important. If you want to
     * control which key mongoose uses to find type declarations, set the 'typeKey' schema option.
     */
    typeKey?: string;

    /**
     * By default, documents are automatically validated before they are saved to the database. This is to
     * prevent saving an invalid document. If you want to handle validation manually, and be able to save
     * objects which don't pass validation, you can set validateBeforeSave to false.
     */
    validateBeforeSave?: boolean;
    /**
     * The versionKey is a property set on each document when first created by Mongoose. This keys value
     * contains the internal revision of the document. The versionKey option is a string that represents
     * the path to use for versioning. The default is '__v'.
     */
    versionKey?: string | boolean;
    /**
     * By default, Mongoose will automatically select() any populated paths for you, unless you explicitly exclude them.
     */
    selectPopulatedPaths?: boolean;
    /**
     * skipVersioning allows excluding paths from versioning (i.e., the internal revision will not be
     * incremented even if these paths are updated). DO NOT do this unless you know what you're doing.
     * For subdocuments, include this on the parent document using the fully qualified path.
     */
    skipVersioning?: any;
    /**
     * Validation errors in a single nested schema are reported
     * both on the child and on the parent schema.
     * Set storeSubdocValidationError to false on the child schema
     * to make Mongoose only report the parent error.
     */
    storeSubdocValidationError?: boolean;
    /**
     * The timestamps option tells mongoose to assign createdAt and updatedAt fields to your schema. The type
     * assigned is Date. By default, the names of the fields are createdAt and updatedAt. Customize the
     * field names by setting timestamps.createdAt and timestamps.updatedAt.
     */
    timestamps?: boolean | SchemaTimestampsConfig;
  }

  interface SchemaTimestampsConfig {
    createdAt?: boolean | string;
    updatedAt?: boolean | string;
    currentTime?: () => (NativeDate | number);
  }

  type Unpacked<T> = T extends (infer U)[] ?
    U :
    T extends ReadonlyArray<infer U> ? U : T;

  type AnyArray<T> = T[] | ReadonlyArray<T>;

  export class SchemaTypeOptions<T> {
    type?:
      T extends string ? StringSchemaDefinition :
      T extends number ? NumberSchemaDefinition :
      T extends boolean ? BooleanSchemaDefinition :
      T extends NativeDate ? DateSchemaDefinition :
      T extends Map<any, any> ? SchemaDefinition<typeof Map> :
      T extends Buffer ? SchemaDefinition<typeof Buffer> :
      T extends Types.ObjectId ? ObjectIdSchemaDefinition :
      T extends Types.ObjectId[] ? AnyArray<ObjectIdSchemaDefinition> | AnyArray<SchemaTypeOptions<ObjectId>> :
      T extends object[] ? (AnyArray<Schema<any, any, any>> | AnyArray<SchemaDefinition<Unpacked<T>>> | AnyArray<SchemaTypeOptions<Unpacked<T>>>) :
      T extends string[] ? AnyArray<StringSchemaDefinition> | AnyArray<SchemaTypeOptions<string>> :
      T extends number[] ? AnyArray<NumberSchemaDefinition> | AnyArray<SchemaTypeOptions<number>> :
      T extends boolean[] ? AnyArray<BooleanSchemaDefinition> | AnyArray<SchemaTypeOptions<boolean>> :
      T extends Function[] ? AnyArray<Function | string> | AnyArray<SchemaTypeOptions<Unpacked<T>>> :
      T | typeof SchemaType | Schema<any, any, any> | SchemaDefinition<T> | Function | AnyArray<Function>;

    /** Defines a virtual with the given name that gets/sets this path. */
    alias?: string;

    /** Function or object describing how to validate this schematype. See [validation docs](https://mongoosejs.com/docs/validation.html). */
    validate?: RegExp | [RegExp, string] | Function | [Function, string] | ValidateOpts<T> | ValidateOpts<T>[];

    /** Allows overriding casting logic for this individual path. If a string, the given string overwrites Mongoose's default cast error message. */
    cast?: string;

    /**
     * If true, attach a required validator to this path, which ensures this path
     * path cannot be set to a nullish value. If a function, Mongoose calls the
     * function and only checks for nullish values if the function returns a truthy value.
     */
    required?: boolean | (() => boolean) | [boolean, string] | [() => boolean, string];

    /**
     * The default value for this path. If a function, Mongoose executes the function
     * and uses the return value as the default.
     */
    default?: T | ((this: any, doc: any) => Partial<T>);

    /**
     * The model that `populate()` should use if populating this path.
     */
    ref?: string | Model<any> | ((this: any, doc: any) => string | Model<any>);

    /**
     * Whether to include or exclude this path by default when loading documents
     * using `find()`, `findOne()`, etc.
     */
    select?: boolean | number;

    /**
     * If [truthy](https://masteringjs.io/tutorials/fundamentals/truthy), Mongoose will
     * build an index on this path when the model is compiled.
     */
    index?: boolean | number | IndexOptions | '2d' | '2dsphere' | 'hashed' | 'text';

    /**
     * If [truthy](https://masteringjs.io/tutorials/fundamentals/truthy), Mongoose
     * will build a unique index on this path when the
     * model is compiled. [The `unique` option is **not** a validator](/docs/validation.html#the-unique-option-is-not-a-validator).
     */
    unique?: boolean | number;

    /**
     * If [truthy](https://masteringjs.io/tutorials/fundamentals/truthy), Mongoose will
     * disallow changes to this path once the document is saved to the database for the first time. Read more
     * about [immutability in Mongoose here](http://thecodebarbarian.com/whats-new-in-mongoose-5-6-immutable-properties.html).
     */
    immutable?: boolean | ((this: any, doc: any) => boolean);

    /**
     * If [truthy](https://masteringjs.io/tutorials/fundamentals/truthy), Mongoose will
     * build a sparse index on this path.
     */
    sparse?: boolean | number;

    /**
     * If [truthy](https://masteringjs.io/tutorials/fundamentals/truthy), Mongoose
     * will build a text index on this path.
     */
    text?: boolean | number | any;

    /**
     * Define a transform function for this individual schema type.
     * Only called when calling `toJSON()` or `toObject()`.
     */
    transform?: (this: any, val: T) => any;

    /** defines a custom getter for this property using [`Object.defineProperty()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty). */
    get?: (value: T, doc?: this) => any;

    /** defines a custom setter for this property using [`Object.defineProperty()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty). */
    set?: (value: any, priorVal?: T, doc?: this) => any;

    /** array of allowed values for this path. Allowed for strings, numbers, and arrays of strings */
    enum?: Array<string | number | null> | ReadonlyArray<string | number | null> | { values: Array<string | number | null> | ReadonlyArray<string | number | null>, message?: string } | { [path: string]: string | number | null };

    /** The default [subtype](http://bsonspec.org/spec.html) associated with this buffer when it is stored in MongoDB. Only allowed for buffer paths */
    subtype?: number;

    /** The minimum value allowed for this path. Only allowed for numbers and dates. */
    min?: number | NativeDate | [number, string] | [NativeDate, string] | readonly [number, string] | readonly [NativeDate, string];

    /** The maximum value allowed for this path. Only allowed for numbers and dates. */
    max?: number | NativeDate | [number, string] | [NativeDate, string] | readonly [number, string] | readonly [NativeDate, string];

    /** Defines a TTL index on this path. Only allowed for dates. */
    expires?: string | number;

    /** If `true`, Mongoose will skip gathering indexes on subpaths. Only allowed for subdocuments and subdocument arrays. */
    excludeIndexes?: boolean;

    /** If set, overrides the child schema's `_id` option. Only allowed for subdocuments and subdocument arrays. */
    _id?: boolean;

    /** If set, specifies the type of this map's values. Mongoose will cast this map's values to the given type. */
    of?: Function | SchemaDefinitionProperty<any>;

    /** If true, uses Mongoose's default `_id` settings. Only allowed for ObjectIds */
    auto?: boolean;

    /** Attaches a validator that succeeds if the data string matches the given regular expression, and fails otherwise. */
    match?: RegExp | [RegExp, string] | readonly [RegExp, string];

    /** If truthy, Mongoose will add a custom setter that lowercases this string using JavaScript's built-in `String#toLowerCase()`. */
    lowercase?: boolean;

    /** If truthy, Mongoose will add a custom setter that removes leading and trailing whitespace using JavaScript's built-in `String#trim()`. */
    trim?: boolean;

    /** If truthy, Mongoose will add a custom setter that uppercases this string using JavaScript's built-in `String#toUpperCase()`. */
    uppercase?: boolean;

    /** If set, Mongoose will add a custom validator that ensures the given string's `length` is at least the given number. */
    minlength?: number | [number, string] | readonly [number, string];

    /** If set, Mongoose will add a custom validator that ensures the given string's `length` is at most the given number. */
    maxlength?: number | [number, string] | readonly [number, string];

    [other: string]: any;
  }

  export type RefType =
    | number
    | string
    | Buffer
    | undefined
    | mongoose.Types.ObjectId
    | mongoose.Types.Buffer
    | typeof mongoose.Schema.Types.Number
    | typeof mongoose.Schema.Types.String
    | typeof mongoose.Schema.Types.Buffer
    | typeof mongoose.Schema.Types.ObjectId;

  /**
   * Reference another Model
   */
  export type PopulatedDoc<
    PopulatedType,
    RawId extends RefType = (PopulatedType extends { _id?: RefType; } ? NonNullable<PopulatedType['_id']> : mongoose.Types.ObjectId) | undefined
    > = PopulatedType | RawId;

  interface IndexOptions extends mongodb.CreateIndexesOptions {
    /**
     * `expires` utilizes the `ms` module from [guille](https://github.com/guille/) allowing us to use a friendlier syntax:
     *
     * @example
     * ```js
     * const schema = new Schema({ prop1: Date });
     *
     * // expire in 24 hours
     * schema.index({ prop1: 1 }, { expires: 60*60*24 })
     *
     * // expire in 24 hours
     * schema.index({ prop1: 1 }, { expires: '24h' })
     *
     * // expire in 1.5 hours
     * schema.index({ prop1: 1 }, { expires: '1.5h' })
     *
     * // expire in 7 days
     * schema.index({ prop1: 1 }, { expires: '7d' })
     * ```
     */
    expires?: number | string;
    weights?: AnyObject;
  }

  interface ValidatorProps {
    path: string;
    value: any;
  }

  interface ValidatorMessageFn {
    (props: ValidatorProps): string;
  }

  interface ValidateFn<T> {
    (value: T): boolean;
  }

  interface LegacyAsyncValidateFn<T> {
    (value: T, done: (result: boolean) => void): void;
  }

  interface AsyncValidateFn<T> {
    (value: any): Promise<boolean>;
  }

  interface ValidateOpts<T> {
    msg?: string;
    message?: string | ValidatorMessageFn;
    type?: string;
    validator: ValidateFn<T> | LegacyAsyncValidateFn<T> | AsyncValidateFn<T>;
  }

  type InferId<T> = T extends { _id?: any } ? T['_id'] : Types.ObjectId;

  interface VirtualTypeOptions {
    /** If `ref` is not nullish, this becomes a populated virtual. */
    ref?: string | Function;

    /**  The local field to populate on if this is a populated virtual. */
    localField?: string | Function;

    /** The foreign field to populate on if this is a populated virtual. */
    foreignField?: string | Function;

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
    options?: QueryOptions & { match?: AnyObject };

    /** Additional options for plugins */
    [extra: string]: any;
  }

  class VirtualType {
    /** Applies getters to `value`. */
    applyGetters(value: any, doc: Document): any;

    /** Applies setters to `value`. */
    applySetters(value: any, doc: Document): any;

    /** Adds a custom getter to this virtual. */
    get(fn: Function): this;

    /** Adds a custom setter to this virtual. */
    set(fn: Function): this;
  }

  namespace Schema {
    namespace Types {
      class Array extends SchemaType implements AcceptsDiscriminator {
        /** This schema type's name, to defend against minifiers that mangle function names. */
        static schemaName: string;

        static options: { castNonArrays: boolean; };

        discriminator<D>(name: string | number, schema: Schema, value?: string): Model<D>;
        discriminator<T, U>(name: string | number, schema: Schema<T, U>, value?: string): U;

        /** The schematype embedded in this array */
        caster?: SchemaType;

        /**
         * Adds an enum validator if this is an array of strings or numbers. Equivalent to
         * `SchemaString.prototype.enum()` or `SchemaNumber.prototype.enum()`
         */
        enum(vals: string[] | number[]): this;
      }

      class Boolean extends SchemaType {
        /** This schema type's name, to defend against minifiers that mangle function names. */
        static schemaName: string;

        /** Configure which values get casted to `true`. */
        static convertToTrue: Set<any>;

        /** Configure which values get casted to `false`. */
        static convertToFalse: Set<any>;
      }

      class Buffer extends SchemaType {
        /** This schema type's name, to defend against minifiers that mangle function names. */
        static schemaName: string;

        /**
         * Sets the default [subtype](https://studio3t.com/whats-new/best-practices-uuid-mongodb/)
         * for this buffer. You can find a [list of allowed subtypes here](http://api.mongodb.com/python/current/api/bson/binary.html).
         */
        subtype(subtype: number): this;
      }

      class Date extends SchemaType {
        /** This schema type's name, to defend against minifiers that mangle function names. */
        static schemaName: string;

        /** Declares a TTL index (rounded to the nearest second) for _Date_ types only. */
        expires(when: number | string): this;

        /** Sets a maximum date validator. */
        max(value: NativeDate, message: string): this;

        /** Sets a minimum date validator. */
        min(value: NativeDate, message: string): this;
      }

      class Decimal128 extends SchemaType {
        /** This schema type's name, to defend against minifiers that mangle function names. */
        static schemaName: string;
      }

      class DocumentArray extends SchemaType implements AcceptsDiscriminator {
        /** This schema type's name, to defend against minifiers that mangle function names. */
        static schemaName: string;

        static options: { castNonArrays: boolean; };

        discriminator<D>(name: string | number, schema: Schema, value?: string): Model<D>;
        discriminator<T, U>(name: string | number, schema: Schema<T, U>, value?: string): U;

        /** The schema used for documents in this array */
        schema: Schema;

        /** The constructor used for subdocuments in this array */
        caster?: typeof Types.Subdocument;
      }

      class Map extends SchemaType {
        /** This schema type's name, to defend against minifiers that mangle function names. */
        static schemaName: string;
      }

      class Mixed extends SchemaType {
        /** This schema type's name, to defend against minifiers that mangle function names. */
        static schemaName: string;
      }

      class Number extends SchemaType {
        /** This schema type's name, to defend against minifiers that mangle function names. */
        static schemaName: string;

        /** Sets a enum validator */
        enum(vals: number[]): this;

        /** Sets a maximum number validator. */
        max(value: number, message: string): this;

        /** Sets a minimum number validator. */
        min(value: number, message: string): this;
      }

      class ObjectId extends SchemaType {
        /** This schema type's name, to defend against minifiers that mangle function names. */
        static schemaName: string;

        /** Adds an auto-generated ObjectId default if turnOn is true. */
        auto(turnOn: boolean): this;
      }

      class Subdocument extends SchemaType implements AcceptsDiscriminator {
        /** This schema type's name, to defend against minifiers that mangle function names. */
        static schemaName: string;

        /** The document's schema */
        schema: Schema;

        discriminator<D>(name: string | number, schema: Schema, value?: string): Model<D>;
        discriminator<T, U>(name: string | number, schema: Schema<T, U>, value?: string): U;
      }

      class String extends SchemaType {
        /** This schema type's name, to defend against minifiers that mangle function names. */
        static schemaName: string;

        /** Adds an enum validator */
        enum(vals: string[] | any): this;

        /** Adds a lowercase [setter](http://mongoosejs.com/docs/api.html#schematype_SchemaType-set). */
        lowercase(shouldApply?: boolean): this;

        /** Sets a regexp validator. */
        match(value: RegExp, message: string): this;

        /** Sets a maximum length validator. */
        maxlength(value: number, message: string): this;

        /** Sets a minimum length validator. */
        minlength(value: number, message: string): this;

        /** Adds a trim [setter](http://mongoosejs.com/docs/api.html#schematype_SchemaType-set). */
        trim(shouldTrim?: boolean): this;

        /** Adds an uppercase [setter](http://mongoosejs.com/docs/api.html#schematype_SchemaType-set). */
        uppercase(shouldApply?: boolean): this;
      }
    }
  }

  namespace Types {
    class Array<T> extends global.Array<T> {
      /** Pops the array atomically at most one time per document `save()`. */
      $pop(): T;

      /** Atomically shifts the array at most one time per document `save()`. */
      $shift(): T;

      /** Adds values to the array if not already present. */
      addToSet(...args: any[]): any[];

      isMongooseArray: true;

      /** Pushes items to the array non-atomically. */
      nonAtomicPush(...args: any[]): number;

      /** Wraps [`Array#push`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/push) with proper change tracking. */
      push(...args: any[]): number;

      /**
       * Pulls items from the array atomically. Equality is determined by casting
       * the provided value to an embedded document and comparing using
       * [the `Document.equals()` function.](./api.html#document_Document-equals)
       */
      pull(...args: any[]): this;

      /**
       * Alias of [pull](#mongoosearray_MongooseArray-pull)
       */
      remove(...args: any[]): this;

      /** Sets the casted `val` at index `i` and marks the array modified. */
      set(i: number, val: T): this;

      /** Atomically shifts the array at most one time per document `save()`. */
      shift(): T;

      /** Returns a native js Array. */
      toObject(options?: ToObjectOptions): any;
      toObject<T>(options?: ToObjectOptions): T;

      /** Wraps [`Array#unshift`](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array/unshift) with proper change tracking. */
      unshift(...args: any[]): number;
    }

    class Buffer extends global.Buffer {
      /** Sets the subtype option and marks the buffer modified. */
      subtype(subtype: number | ToObjectOptions): void;

      /** Converts this buffer to its Binary type representation. */
      toObject(subtype?: number): mongodb.Binary;
    }

    class Decimal128 extends mongodb.Decimal128 { }

    class DocumentArray<T> extends Types.Array<T extends Types.Subdocument ? T : Types.Subdocument<InferId<T>> & T> {
      /** DocumentArray constructor */
      constructor(values: any[]);

      isMongooseDocumentArray: true;

      /** Creates a subdocument casted to this schema. */
      create(obj: any): T extends Types.Subdocument ? T : Types.Subdocument<InferId<T>> & T;

      /** Searches array items for the first document with a matching _id. */
      id(id: any): (T extends Types.Subdocument ? T : Types.Subdocument<InferId<T>> & T) | null;

      push(...args: (AnyKeys<T> & AnyObject)[]): number;
    }

    class Map<V> extends global.Map<string, V> {
      /** Converts a Mongoose map into a vanilla JavaScript map. */
      toObject(options?: ToObjectOptions & { flattenMaps?: boolean }): any;
    }

    class ObjectId extends mongodb.ObjectId {
      _id: this;
    }

    class Subdocument<IdType = any> extends Document<IdType> {
      $isSingleNested: true;

      /** Returns the top level document of this sub-document. */
      ownerDocument(): Document;

      /** Returns this sub-documents parent document. */
      parent(): Document;

      /** Returns this sub-documents parent document. */
      $parent(): Document;
    }

    class ArraySubdocument<IdType = any> extends Subdocument<IdType> {
      /** Returns this sub-documents parent array. */
      parentArray(): Types.DocumentArray<unknown>;
    }
  }

  type ReturnsNewDoc = { new: true } | { returnOriginal: false } | {returnDocument: 'after'};

  type QueryWithHelpers<ResultType, DocType, THelpers = {}, RawDocType = DocType> = Query<ResultType, DocType, THelpers, RawDocType> & THelpers;

  type UnpackedIntersection<T, U> = T extends (infer V)[] ? (V & U)[] : T & U;
  type UnpackedIntersectionWithNull<T, U> = T extends null ? UnpackedIntersection<T, U> | null : UnpackedIntersection<T, U>;

  type ProjectionFields<DocType> = {[Key in keyof Omit<LeanDocument<DocType>, '__v'>]?: any} & Record<string, any>;

  class Query<ResultType, DocType, THelpers = {}, RawDocType = DocType> {
    _mongooseOptions: MongooseQueryOptions;

    /**
     * Returns a wrapper around a [mongodb driver cursor](http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html).
     * A QueryCursor exposes a Streams3 interface, as well as a `.next()` function.
     * This is equivalent to calling `.cursor()` with no arguments.
     */
    [Symbol.asyncIterator](): AsyncIterableIterator<DocType>;

    /** Executes the query */
    exec(): Promise<ResultType>;
    exec(callback?: Callback<ResultType>): void;
    // @todo: this doesn't seem right
    exec(callback?: Callback<ResultType>): Promise<ResultType> | any;

    $where(argument: string | Function): QueryWithHelpers<DocType[], DocType, THelpers, RawDocType>;

    /** Specifies an `$all` query condition. When called with one argument, the most recent path passed to `where()` is used. */
    all(val: Array<any>): this;
    all(path: string, val: Array<any>): this;

    /** Sets the allowDiskUse option for the query (ignored for < 4.4.0) */
    allowDiskUse(value: boolean): this;

    /** Specifies arguments for an `$and` condition. */
    and(array: FilterQuery<DocType>[]): this;

    /** Specifies the batchSize option. */
    batchSize(val: number): this;

    /** Specifies a `$box` condition */
    box(val: any): this;
    box(lower: number[], upper: number[]): this;

    /**
     * Casts this query to the schema of `model`.
     *
     * @param {Model} [model] the model to cast to. If not set, defaults to `this.model`
     * @param {Object} [obj] If not set, defaults to this query's conditions
     * @return {Object} the casted `obj`
     */
    cast(model?: Model<any, THelpers> | null, obj?: any): any;

    /**
     * Executes the query returning a `Promise` which will be
     * resolved with either the doc(s) or rejected with the error.
     * Like `.then()`, but only takes a rejection handler.
     */
    catch: Promise<ResultType>['catch'];

    /** Specifies a `$center` or `$centerSphere` condition. */
    circle(area: any): this;
    circle(path: string, area: any): this;

    /** Make a copy of this query so you can re-execute it. */
    clone(): this;

    /** Adds a collation to this op (MongoDB 3.4 and up) */
    collation(value: mongodb.CollationOptions): this;

    /** Specifies the `comment` option. */
    comment(val: string): this;

    /** Specifies this query as a `count` query. */
    count(callback?: Callback<number>): QueryWithHelpers<number, DocType, THelpers, RawDocType>;
    count(criteria: FilterQuery<DocType>, callback?: Callback<number>): QueryWithHelpers<number, DocType, THelpers, RawDocType>;

    /** Specifies this query as a `countDocuments` query. */
    countDocuments(callback?: Callback<number>): QueryWithHelpers<number, DocType, THelpers, RawDocType>;
    countDocuments(criteria: FilterQuery<DocType>, options?: QueryOptions, callback?: Callback<number>): QueryWithHelpers<number, DocType, THelpers, RawDocType>;

    /**
     * Returns a wrapper around a [mongodb driver cursor](http://mongodb.github.io/node-mongodb-native/2.1/api/Cursor.html).
     * A QueryCursor exposes a Streams3 interface, as well as a `.next()` function.
     */
    cursor(options?: any): QueryCursor<DocType>;

    /**
     * Declare and/or execute this query as a `deleteMany()` operation. Works like
     * remove, except it deletes _every_ document that matches `filter` in the
     * collection, regardless of the value of `single`.
     */
    deleteMany(filter?: FilterQuery<DocType>, options?: QueryOptions, callback?: Callback): QueryWithHelpers<any, DocType, THelpers, RawDocType>;
    deleteMany(filter: FilterQuery<DocType>, callback: Callback): QueryWithHelpers<any, DocType, THelpers, RawDocType>;
    deleteMany(callback: Callback): QueryWithHelpers<any, DocType, THelpers, RawDocType>;

    /**
     * Declare and/or execute this query as a `deleteOne()` operation. Works like
     * remove, except it deletes at most one document regardless of the `single`
     * option.
     */
    deleteOne(filter?: FilterQuery<DocType>, options?: QueryOptions, callback?: Callback): QueryWithHelpers<any, DocType, THelpers, RawDocType>;
    deleteOne(filter: FilterQuery<DocType>, callback: Callback): QueryWithHelpers<any, DocType, THelpers, RawDocType>;
    deleteOne(callback: Callback): QueryWithHelpers<any, DocType, THelpers, RawDocType>;

    /** Creates a `distinct` query: returns the distinct values of the given `field` that match `filter`. */
    distinct(field: string, filter?: FilterQuery<DocType>, callback?: Callback<number>): QueryWithHelpers<Array<any>, DocType, THelpers, RawDocType>;

    /** Specifies a `$elemMatch` query condition. When called with one argument, the most recent path passed to `where()` is used. */
    elemMatch(val: Function | any): this;
    elemMatch(path: string, val: Function | any): this;

    /**
     * Gets/sets the error flag on this query. If this flag is not null or
     * undefined, the `exec()` promise will reject without executing.
     */
    error(): NativeError | null;
    error(val: NativeError | null): this;

    /** Specifies the complementary comparison value for paths specified with `where()` */
    equals(val: any): this;

    /** Creates a `estimatedDocumentCount` query: counts the number of documents in the collection. */
    estimatedDocumentCount(options?: QueryOptions, callback?: Callback<number>): QueryWithHelpers<number, DocType, THelpers, RawDocType>;

    /** Specifies a `$exists` query condition. When called with one argument, the most recent path passed to `where()` is used. */
    exists(val: boolean): this;
    exists(path: string, val: boolean): this;

    /**
     * Sets the [`explain` option](https://docs.mongodb.com/manual/reference/method/cursor.explain/),
     * which makes this query return detailed execution stats instead of the actual
     * query result. This method is useful for determining what index your queries
     * use.
     */
    explain(verbose?: string): this;

    /** Creates a `find` query: gets a list of documents that match `filter`. */
    find(callback?: Callback<DocType[]>): QueryWithHelpers<Array<DocType>, DocType, THelpers, RawDocType>;
    find(filter: FilterQuery<DocType>, callback?: Callback<DocType[]>): QueryWithHelpers<Array<DocType>, DocType, THelpers, RawDocType>;
    find(filter: FilterQuery<DocType>, projection?: any | null, options?: QueryOptions | null, callback?: Callback<DocType[]>): QueryWithHelpers<Array<DocType>, DocType, THelpers, RawDocType>;

    /** Declares the query a findOne operation. When executed, the first found document is passed to the callback. */
    findOne(filter?: FilterQuery<DocType>, projection?: any | null, options?: QueryOptions | null, callback?: Callback<DocType | null>): QueryWithHelpers<DocType | null, DocType, THelpers, RawDocType>;

    /** Creates a `findOneAndDelete` query: atomically finds the given document, deletes it, and returns the document as it was before deletion. */
    findOneAndDelete(filter?: FilterQuery<DocType>, options?: QueryOptions | null, callback?: (err: CallbackError, doc: DocType | null, res: any) => void): QueryWithHelpers<DocType | null, DocType, THelpers, RawDocType>;

    /** Creates a `findOneAndRemove` query: atomically finds the given document and deletes it. */
    findOneAndRemove(filter?: FilterQuery<DocType>, options?: QueryOptions | null, callback?: (err: CallbackError, doc: DocType | null, res: any) => void): QueryWithHelpers<DocType | null, DocType, THelpers, RawDocType>;

    /** Creates a `findOneAndUpdate` query: atomically find the first document that matches `filter` and apply `update`. */
    findOneAndUpdate(
      filter: FilterQuery<DocType>,
      update: UpdateQuery<DocType>,
      options: QueryOptions & { rawResult: true },
      callback?: (err: CallbackError, doc: DocType | null, res: ModifyResult<DocType>) => void
    ): QueryWithHelpers<ModifyResult<DocType>, DocType, THelpers, RawDocType>;
    findOneAndUpdate(
      filter: FilterQuery<DocType>,
      update: UpdateQuery<DocType>,
      options: QueryOptions & { upsert: true } & ReturnsNewDoc,
      callback?: (err: CallbackError, doc: DocType, res: ModifyResult<DocType>) => void
    ): QueryWithHelpers<DocType, DocType, THelpers, RawDocType>;
    findOneAndUpdate(
      filter?: FilterQuery<DocType>,
      update?: UpdateQuery<DocType>,
      options?: QueryOptions | null,
      callback?: (err: CallbackError, doc: DocType | null, res: ModifyResult<DocType>) => void
    ): QueryWithHelpers<DocType | null, DocType, THelpers, RawDocType>;

    /** Creates a `findByIdAndDelete` query, filtering by the given `_id`. */
    findByIdAndDelete(id?: mongodb.ObjectId | any, options?: QueryOptions | null, callback?: (err: CallbackError, doc: DocType | null, res: any) => void): QueryWithHelpers<DocType | null, DocType, THelpers, RawDocType>;

    /** Creates a `findOneAndUpdate` query, filtering by the given `_id`. */
    findByIdAndUpdate(id: mongodb.ObjectId | any, update: UpdateQuery<DocType>, options: QueryOptions & { rawResult: true }, callback?: (err: CallbackError, doc: any, res?: any) => void): QueryWithHelpers<any, DocType, THelpers, RawDocType>;
    findByIdAndUpdate(id: mongodb.ObjectId | any, update: UpdateQuery<DocType>, options: QueryOptions & { upsert: true } & ReturnsNewDoc, callback?: (err: CallbackError, doc: DocType, res?: any) => void): QueryWithHelpers<DocType, DocType, THelpers, RawDocType>;
    findByIdAndUpdate(id?: mongodb.ObjectId | any, update?: UpdateQuery<DocType>, options?: QueryOptions | null, callback?: (CallbackError: any, doc: DocType | null, res?: any) => void): QueryWithHelpers<DocType | null, DocType, THelpers, RawDocType>;
    findByIdAndUpdate(id: mongodb.ObjectId | any, update: UpdateQuery<DocType>, callback: (CallbackError: any, doc: DocType | null, res?: any) => void): QueryWithHelpers<DocType | null, DocType, THelpers, RawDocType>;

    /** Specifies a `$geometry` condition */
    geometry(object: { type: string, coordinates: any[] }): this;

    /**
     * For update operations, returns the value of a path in the update's `$set`.
     * Useful for writing getters/setters that can work with both update operations
     * and `save()`.
     */
    get(path: string): any;

    /** Returns the current query filter (also known as conditions) as a POJO. */
    getFilter(): FilterQuery<DocType>;

    /** Gets query options. */
    getOptions(): QueryOptions;

    /** Gets a list of paths to be populated by this query */
    getPopulatedPaths(): Array<string>;

    /** Returns the current query filter. Equivalent to `getFilter()`. */
    getQuery(): FilterQuery<DocType>;

    /** Returns the current update operations as a JSON object. */
    getUpdate(): UpdateQuery<DocType> | UpdateWithAggregationPipeline | null;

    /** Specifies a `$gt` query condition. When called with one argument, the most recent path passed to `where()` is used. */
    gt(val: number): this;
    gt(path: string, val: number): this;

    /** Specifies a `$gte` query condition. When called with one argument, the most recent path passed to `where()` is used. */
    gte(val: number): this;
    gte(path: string, val: number): this;

    /** Sets query hints. */
    hint(val: any): this;

    /** Specifies an `$in` query condition. When called with one argument, the most recent path passed to `where()` is used. */
    in(val: Array<any>): this;
    in(path: string, val: Array<any>): this;

    /** Declares an intersects query for `geometry()`. */
    intersects(arg?: any): this;

    /** Requests acknowledgement that this operation has been persisted to MongoDB's on-disk journal. */
    j(val: boolean | null): this;

    /** Sets the lean option. */
    lean<LeanResultType = RawDocType extends Document ? LeanDocumentOrArray<ResultType> : LeanDocumentOrArrayWithRawType<ResultType, Require_id<RawDocType>>>(val?: boolean | any): QueryWithHelpers<LeanResultType, DocType, THelpers, RawDocType>;

    /** Specifies the maximum number of documents the query will return. */
    limit(val: number): this;

    /** Specifies a `$lt` query condition. When called with one argument, the most recent path passed to `where()` is used. */
    lt(val: number): this;
    lt(path: string, val: number): this;

    /** Specifies a `$lte` query condition. When called with one argument, the most recent path passed to `where()` is used. */
    lte(val: number): this;
    lte(path: string, val: number): this;

    /**
     * Runs a function `fn` and treats the return value of `fn` as the new value
     * for the query to resolve to.
     */
    transform<MappedType>(fn: (doc: ResultType) => MappedType): QueryWithHelpers<MappedType, DocType, THelpers, RawDocType>;

    /** Specifies an `$maxDistance` query condition. When called with one argument, the most recent path passed to `where()` is used. */
    maxDistance(val: number): this;
    maxDistance(path: string, val: number): this;

    /** Specifies the maxScan option. */
    maxScan(val: number): this;

    /**
     * Sets the [maxTimeMS](https://docs.mongodb.com/manual/reference/method/cursor.maxTimeMS/)
     * option. This will tell the MongoDB server to abort if the query or write op
     * has been running for more than `ms` milliseconds.
     */
    maxTimeMS(ms: number): this;

    /** Merges another Query or conditions object into this one. */
    merge(source: Query<any, any> | FilterQuery<DocType>): this;

    /** Specifies a `$mod` condition, filters documents for documents whose `path` property is a number that is equal to `remainder` modulo `divisor`. */
    mod(val: Array<number>): this;
    mod(path: string, val: Array<number>): this;

    /** The model this query was created from */
    model: typeof Model;

    /**
     * Getter/setter around the current mongoose-specific options for this query
     * Below are the current Mongoose-specific options.
     */
    mongooseOptions(val?: MongooseQueryOptions): MongooseQueryOptions;

    /** Specifies a `$ne` query condition. When called with one argument, the most recent path passed to `where()` is used. */
    ne(val: any): this;
    ne(path: string, val: any): this;

    /** Specifies a `$near` or `$nearSphere` condition */
    near(val: any): this;
    near(path: string, val: any): this;

    /** Specifies an `$nin` query condition. When called with one argument, the most recent path passed to `where()` is used. */
    nin(val: Array<any>): this;
    nin(path: string, val: Array<any>): this;

    /** Specifies arguments for an `$nor` condition. */
    nor(array: Array<FilterQuery<DocType>>): this;

    /** Specifies arguments for an `$or` condition. */
    or(array: Array<FilterQuery<DocType>>): this;

    /**
     * Make this query throw an error if no documents match the given `filter`.
     * This is handy for integrating with async/await, because `orFail()` saves you
     * an extra `if` statement to check if no document was found.
     */
    orFail(err?: NativeError | (() => NativeError)): QueryWithHelpers<NonNullable<ResultType>, DocType, THelpers, RawDocType>;

    /** Specifies a `$polygon` condition */
    polygon(...coordinatePairs: number[][]): this;
    polygon(path: string, ...coordinatePairs: number[][]): this;

    /** Specifies paths which should be populated with other documents. */
    populate<Paths = {}>(path: string | any, select?: string | any, model?: string | Model<any, THelpers>, match?: any): QueryWithHelpers<UnpackedIntersectionWithNull<ResultType, Paths>, DocType, THelpers, RawDocType>;
    populate<Paths = {}>(options: PopulateOptions | Array<PopulateOptions>): QueryWithHelpers<UnpackedIntersectionWithNull<ResultType, Paths>, DocType, THelpers, RawDocType>;

    /** Get/set the current projection (AKA fields). Pass `null` to remove the current projection. */
    projection(): ProjectionFields<DocType> | null;
    projection(fields: null): null;
    projection(fields?: ProjectionFields<DocType> | string): ProjectionFields<DocType>;

    /** Determines the MongoDB nodes from which to read. */
    read(pref: string | mongodb.ReadPreferenceMode, tags?: any[]): this;

    /** Sets the readConcern option for the query. */
    readConcern(level: string): this;

    /** Specifies a `$regex` query condition. When called with one argument, the most recent path passed to `where()` is used. */
    regex(val: string | RegExp): this;
    regex(path: string, val: string | RegExp): this;

    /**
     * Declare and/or execute this query as a remove() operation. `remove()` is
     * deprecated, you should use [`deleteOne()`](#query_Query-deleteOne)
     * or [`deleteMany()`](#query_Query-deleteMany) instead.
     */
    remove(filter?: FilterQuery<DocType>, callback?: Callback<mongodb.UpdateResult>): Query<mongodb.UpdateResult, DocType, THelpers, RawDocType>;

    /**
     * Declare and/or execute this query as a replaceOne() operation. Same as
     * `update()`, except MongoDB will replace the existing document and will
     * not accept any [atomic](https://docs.mongodb.com/manual/tutorial/model-data-for-atomic-operations/#pattern) operators (`$set`, etc.)
     */
    replaceOne(filter?: FilterQuery<DocType>, replacement?: DocType | AnyObject, options?: QueryOptions | null, callback?: Callback): QueryWithHelpers<any, DocType, THelpers, RawDocType>;
    replaceOne(filter?: FilterQuery<DocType>, replacement?: DocType | AnyObject, options?: QueryOptions | null, callback?: Callback): QueryWithHelpers<any, DocType, THelpers, RawDocType>;

    /** Specifies which document fields to include or exclude (also known as the query "projection") */
    select(arg: string | any): this;

    /** Determines if field selection has been made. */
    selected(): boolean;

    /** Determines if exclusive field selection has been made. */
    selectedExclusively(): boolean;

    /** Determines if inclusive field selection has been made. */
    selectedInclusively(): boolean;

    /**
     * Sets the [MongoDB session](https://docs.mongodb.com/manual/reference/server-sessions/)
     * associated with this query. Sessions are how you mark a query as part of a
     * [transaction](/docs/transactions.html).
     */
    session(session: mongodb.ClientSession | null): this;

    /**
     * Adds a `$set` to this query's update without changing the operation.
     * This is useful for query middleware so you can add an update regardless
     * of whether you use `updateOne()`, `updateMany()`, `findOneAndUpdate()`, etc.
     */
    set(path: string | Record<string, unknown>, value?: any): this;

    /** Sets query options. Some options only make sense for certain operations. */
    setOptions(options: QueryOptions, overwrite?: boolean): this;

    /** Sets the query conditions to the provided JSON object. */
    setQuery(val: FilterQuery<DocType> | null): void;

    setUpdate(update: UpdateQuery<DocType> | UpdateWithAggregationPipeline): void;

    /** Specifies an `$size` query condition. When called with one argument, the most recent path passed to `where()` is used. */
    size(val: number): this;
    size(path: string, val: number): this;

    /** Specifies the number of documents to skip. */
    skip(val: number): this;

    /** Specifies a `$slice` projection for an array. */
    slice(val: number | Array<number>): this;
    slice(path: string, val: number | Array<number>): this;

    /** Specifies this query as a `snapshot` query. */
    snapshot(val?: boolean): this;

    /** Sets the sort order. If an object is passed, values allowed are `asc`, `desc`, `ascending`, `descending`, `1`, and `-1`. */
    sort(arg: string | any): this;

    /** Sets the tailable option (for use with capped collections). */
    tailable(bool?: boolean, opts?: {
      numberOfRetries?: number;
      tailableRetryInterval?: number;
    }): this;

    /**
     * Executes the query returning a `Promise` which will be
     * resolved with either the doc(s) or rejected with the error.
     */
    then: Promise<ResultType>['then'];

    /** Converts this query to a customized, reusable query constructor with all arguments and options retained. */
    toConstructor(): new (...args: any[]) => QueryWithHelpers<ResultType, DocType, THelpers, RawDocType>;

    /** Declare and/or execute this query as an update() operation. */
    update(filter?: FilterQuery<DocType>, update?: UpdateQuery<DocType> | UpdateWithAggregationPipeline, options?: QueryOptions | null, callback?: Callback<UpdateWriteOpResult>): QueryWithHelpers<UpdateWriteOpResult, DocType, THelpers, RawDocType>;

    /**
     * Declare and/or execute this query as an updateMany() operation. Same as
     * `update()`, except MongoDB will update _all_ documents that match
     * `filter` (as opposed to just the first one) regardless of the value of
     * the `multi` option.
     */
    updateMany(filter?: FilterQuery<DocType>, update?: UpdateQuery<DocType> | UpdateWithAggregationPipeline, options?: QueryOptions | null, callback?: Callback<UpdateWriteOpResult>): QueryWithHelpers<UpdateWriteOpResult, DocType, THelpers, RawDocType>;

    /**
     * Declare and/or execute this query as an updateOne() operation. Same as
     * `update()`, except it does not support the `multi` or `overwrite` options.
     */
    updateOne(filter?: FilterQuery<DocType>, update?: UpdateQuery<DocType> | UpdateWithAggregationPipeline, options?: QueryOptions | null, callback?: Callback<UpdateWriteOpResult>): QueryWithHelpers<UpdateWriteOpResult, DocType, THelpers, RawDocType>;

    /**
     * Sets the specified number of `mongod` servers, or tag set of `mongod` servers,
     * that must acknowledge this write before this write is considered successful.
     */
    w(val: string | number | null): this;

    /** Specifies a path for use with chaining. */
    where(path: string, val?: any): this;
    where(obj: object): this;
    where(): this;

    /** Defines a `$within` or `$geoWithin` argument for geo-spatial queries. */
    within(val?: any): this;

    /**
     * If [`w > 1`](/docs/api.html#query_Query-w), the maximum amount of time to
     * wait for this write to propagate through the replica set before this
     * operation fails. The default is `0`, which means no timeout.
     */
    wtimeout(ms: number): this;
  }

  export type QuerySelector<T> = {
    // Comparison
    $eq?: T;
    $gt?: T;
    $gte?: T;
    $in?: [T] extends AnyArray<any> ? Unpacked<T>[] : T[];
    $lt?: T;
    $lte?: T;
    $ne?: T;
    $nin?: [T] extends AnyArray<any> ? Unpacked<T>[] : T[];
    // Logical
    $not?: T extends string ? QuerySelector<T> | RegExp : QuerySelector<T>;
    // Element
    /**
     * When `true`, `$exists` matches the documents that contain the field,
     * including documents where the field value is null.
     */
    $exists?: boolean;
    $type?: string | number;
    // Evaluation
    $expr?: any;
    $jsonSchema?: any;
    $mod?: T extends number ? [number, number] : never;
    $regex?: T extends string ? RegExp | string : never;
    $options?: T extends string ? string : never;
    // Geospatial
    // TODO: define better types for geo queries
    $geoIntersects?: { $geometry: object };
    $geoWithin?: object;
    $near?: object;
    $nearSphere?: object;
    $maxDistance?: number;
    // Array
    // TODO: define better types for $all and $elemMatch
    $all?: T extends AnyArray<any> ? any[] : never;
    $elemMatch?: T extends AnyArray<any> ? object : never;
    $size?: T extends AnyArray<any> ? number : never;
    // Bitwise
    $bitsAllClear?: number | mongodb.Binary | number[];
    $bitsAllSet?: number | mongodb.Binary | number[];
    $bitsAnyClear?: number | mongodb.Binary | number[];
    $bitsAnySet?: number | mongodb.Binary | number[];
  };

  export type RootQuerySelector<T> = {
    /** @see https://docs.mongodb.com/manual/reference/operator/query/and/#op._S_and */
    $and?: Array<FilterQuery<T>>;
    /** @see https://docs.mongodb.com/manual/reference/operator/query/nor/#op._S_nor */
    $nor?: Array<FilterQuery<T>>;
    /** @see https://docs.mongodb.com/manual/reference/operator/query/or/#op._S_or */
    $or?: Array<FilterQuery<T>>;
    /** @see https://docs.mongodb.com/manual/reference/operator/query/text */
    $text?: {
        $search: string;
        $language?: string;
        $caseSensitive?: boolean;
        $diacriticSensitive?: boolean;
    };
    /** @see https://docs.mongodb.com/manual/reference/operator/query/where/#op._S_where */
    $where?: string | Function;
    /** @see https://docs.mongodb.com/manual/reference/operator/query/comment/#op._S_comment */
    $comment?: string;
    // we could not find a proper TypeScript generic to support nested queries e.g. 'user.friends.name'
    // this will mark all unrecognized properties as any (including nested queries)
    [key: string]: any;
  };

  type ApplyBasicQueryCasting<T> = T | T[] | any;
  type Condition<T> = ApplyBasicQueryCasting<T> | QuerySelector<ApplyBasicQueryCasting<T>>;

  type _FilterQuery<T> = {
    [P in keyof T]?: Condition<T[P]>;
  } &
    RootQuerySelector<T>;

  export type FilterQuery<T> = _FilterQuery<T>;

  type AddToSetOperators<Type> = {
    $each: Type;
  };

  type SortValues = -1 | 1 | 'asc' | 'desc';

  type ArrayOperator<Type> = {
    $each: Type;
    $slice?: number;
    $position?: number;
    $sort?: SortValues | Record<string, SortValues>;
  };

  type NumericTypes = number | Decimal128 | mongodb.Double | mongodb.Int32 | mongodb.Long;

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

  type UpdateWithAggregationPipeline = UpdateAggregationStage[];
  type UpdateAggregationStage = { $addFields: any } |
    { $set: any } |
    { $project: any } |
    { $unset: any } |
    { $replaceRoot: any } |
    { $replaceWith: any };

  type __UpdateDefProperty<T> =
    [Extract<T, mongodb.ObjectId>] extends [never] ? T :
    T | string;
  type _UpdateQueryDef<T> = {
    [K in keyof T]?: __UpdateDefProperty<T[K]>;
  };

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

  type actualPrimitives = string | boolean | number | bigint | symbol | null | undefined;
  type TreatAsPrimitives = actualPrimitives |
    NativeDate | RegExp | symbol | Error | BigInt | Types.ObjectId;

  type LeanType<T> =
    0 extends (1 & T) ? T : // any
    T extends TreatAsPrimitives ? T : // primitives
    T extends Types.Subdocument ? Omit<LeanDocument<T>, '$isSingleNested' | 'ownerDocument' | 'parent'> : // subdocs
    LeanDocument<T>; // Documents and everything else

  type LeanArray<T extends unknown[]> = T extends unknown[][] ? LeanArray<T[number]>[] : LeanType<T[number]>[];

  export type _LeanDocument<T> = {
    [K in keyof T]: LeanDocumentElement<T[K]>;
  };

  // Keep this a separate type, to ensure that T is a naked type.
  // This way, the conditional type is distributive over union types.
  // This is required for PopulatedDoc.
  type LeanDocumentElement<T> =
    T extends unknown[] ? LeanArray<T> : // Array
    T extends Document ? LeanDocument<T> : // Subdocument
    T;

  export type SchemaDefinitionType<T> = T extends Document ? Omit<T, Exclude<keyof Document, '_id' | 'id' | '__v'>> : T;
  export type LeanDocument<T> = Omit<_LeanDocument<T>, Exclude<keyof Document, '_id' | 'id' | '__v'> | '$isSingleNested'>;

  export type LeanDocumentOrArray<T> = 0 extends (1 & T) ? T :
    T extends unknown[] ? LeanDocument<T[number]>[] :
    T extends Document ? LeanDocument<T> :
    T;

  export type LeanDocumentOrArrayWithRawType<T, RawDocType> = 0 extends (1 & T) ? T :
    T extends unknown[] ? RawDocType[] :
    T extends Document ? RawDocType :
    T;

  class QueryCursor<DocType> extends stream.Readable {
    [Symbol.asyncIterator](): AsyncIterableIterator<DocType>;

    /**
     * Adds a [cursor flag](http://mongodb.github.io/node-mongodb-native/2.2/api/Cursor.html#addCursorFlag).
     * Useful for setting the `noCursorTimeout` and `tailable` flags.
     */
    addCursorFlag(flag: string, value: boolean): this;

    /**
     * Marks this cursor as closed. Will stop streaming and subsequent calls to
     * `next()` will error.
     */
    close(): Promise<void>;
    close(callback: CallbackWithoutResult): void;

    /**
     * Execute `fn` for every document(s) in the cursor. If batchSize is provided
     * `fn` will be executed for each batch of documents. If `fn` returns a promise,
     * will wait for the promise to resolve before iterating on to the next one.
     * Returns a promise that resolves when done.
     */
    eachAsync(fn: (doc: DocType) => any, options?: { parallel?: number }): Promise<void>;
    eachAsync(fn: (doc: DocType[]) => any, options: { parallel?: number, batchSize: number }): Promise<void>;
    eachAsync(fn: (doc: DocType) => any, options?: { parallel?: number, batchSize?: number }, cb?: CallbackWithoutResult): void;
    eachAsync(fn: (doc: DocType[]) => any, options: { parallel?: number, batchSize: number }, cb?: CallbackWithoutResult): void;

    /**
     * Registers a transform function which subsequently maps documents retrieved
     * via the streams interface or `.next()`
     */
    map<ResultType>(fn: (res: DocType) => ResultType): QueryCursor<ResultType>;

    /**
     * Get the next document from this cursor. Will return `null` when there are
     * no documents left.
     */
    next(): Promise<DocType>;
    next(callback: Callback<DocType | null>): void;

    options: any;
  }

  class Aggregate<R> {
    /**
     * Returns an asyncIterator for use with [`for/await/of` loops](https://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js
     * You do not need to call this function explicitly, the JavaScript runtime
     * will call it for you.
     */
    [Symbol.asyncIterator](): AsyncIterableIterator<Unpacked<R>>;

    /**
     * Sets an option on this aggregation. This function will be deprecated in a
     * future release. */
    addCursorFlag(flag: string, value: boolean): this;

    /**
     * Appends a new $addFields operator to this aggregate pipeline.
     * Requires MongoDB v3.4+ to work
     */
    addFields(arg: PipelineStage.AddFields['$addFields']): this;

    /** Sets the allowDiskUse option for the aggregation query (ignored for < 2.6.0) */
    allowDiskUse(value: boolean): this;

    /** Appends new operators to this aggregate pipeline */
    append(...args: any[]): this;

    /**
     * Executes the query returning a `Promise` which will be
     * resolved with either the doc(s) or rejected with the error.
     * Like [`.then()`](#query_Query-then), but only takes a rejection handler.
     */
    catch: Promise<R>['catch'];

    /** Adds a collation. */
    collation(options: mongodb.CollationOptions): this;

    /** Appends a new $count operator to this aggregate pipeline. */
    count(countName: PipelineStage.Count['$count']): this;

    /**
     * Sets the cursor option for the aggregation query (ignored for < 2.6.0).
     */
    cursor(options?: Record<string, unknown>): AggregationCursor;

    /** Executes the aggregate pipeline on the currently bound Model. */
    exec(callback?: Callback<R>): Promise<R>;

    /** Execute the aggregation with explain */
    explain(callback?: Callback): Promise<any>;
    explain(verbosity?: string, callback?: Callback): Promise<any>;

    /** Combines multiple aggregation pipelines. */
    facet(options: PipelineStage.Facet['$facet']): this;

    /** Appends new custom $graphLookup operator(s) to this aggregate pipeline, performing a recursive search on a collection. */
    graphLookup(options: PipelineStage.GraphLookup['$graphLookup']): this;

    /** Appends new custom $group operator to this aggregate pipeline. */
    group(arg: PipelineStage.Group['$group']): this;

    /** Sets the hint option for the aggregation query (ignored for < 3.6.0) */
    hint(value: Record<string, unknown> | string): this;

    /**
     * Appends a new $limit operator to this aggregate pipeline.
     * @param num maximum number of records to pass to the next stage
     */
    limit(num: PipelineStage.Limit['$limit']): this;

    /** Appends new custom $lookup operator to this aggregate pipeline. */
    lookup(options: PipelineStage.Lookup['$lookup']): this;

    /**
     * Appends a new custom $match operator to this aggregate pipeline.
     * @param arg $match operator contents
     */
    match(arg: PipelineStage.Match['$match']): this;

    /**
     * Binds this aggregate to a model.
     * @param model the model to which the aggregate is to be bound
     */
    model(model: any): this;

    /**
     * Append a new $near operator to this aggregation pipeline
     * @param arg $near operator contents
     */
    near(arg: { near?: number[]; distanceField: string; maxDistance?: number; query?: Record<string, any>; includeLocs?: string; num?: number; uniqueDocs?: boolean }): this;

    /** Returns the current pipeline */
    pipeline(): any[];

    /** Appends a new $project operator to this aggregate pipeline. */
    project(arg: PipelineStage.Project['$project']): this;

    /** Sets the readPreference option for the aggregation query. */
    read(pref: string | mongodb.ReadPreferenceMode, tags?: any[]): this;

    /** Sets the readConcern level for the aggregation query. */
    readConcern(level: string): this;

    /** Appends a new $redact operator to this aggregate pipeline. */
    redact(expression: any, thenExpr: string | any, elseExpr: string | any): this;

    /** Appends a new $replaceRoot operator to this aggregate pipeline. */
    replaceRoot(newRoot: PipelineStage.ReplaceRoot['$replaceRoot']['newRoot'] | string): this;

    /**
     * Helper for [Atlas Text Search](https://docs.atlas.mongodb.com/reference/atlas-search/tutorial/)'s
     * `$search` stage.
     */
    search(options: PipelineStage.Search['$search']): this;

    /** Lets you set arbitrary options, for middleware or plugins. */
    option(value: Record<string, unknown>): this;

    /** Appends new custom $sample operator to this aggregate pipeline. */
    sample(size: number): this;

    /** Sets the session for this aggregation. Useful for [transactions](/docs/transactions.html). */
    session(session: mongodb.ClientSession | null): this;

    /**
     * Appends a new $skip operator to this aggregate pipeline.
     * @param num number of records to skip before next stage
     */
    skip(num: number): this;

    /** Appends a new $sort operator to this aggregate pipeline. */
    sort(arg: PipelineStage.Sort['$sort']): this;

    /** Provides promise for aggregate. */
    then: Promise<R>['then'];

    /**
     * Appends a new $sortByCount operator to this aggregate pipeline. Accepts either a string field name
     * or a pipeline object.
     */
    sortByCount(arg: string | any): this;

    /** Appends new $unionWith operator to this aggregate pipeline. */
    unionWith(options: any): this;

    /** Appends new custom $unwind operator(s) to this aggregate pipeline. */
    unwind(...args: PipelineStage.Unwind['$unwind'][]): this;
  }

  class AggregationCursor extends stream.Readable {
    /**
     * Adds a [cursor flag](http://mongodb.github.io/node-mongodb-native/2.2/api/Cursor.html#addCursorFlag).
     * Useful for setting the `noCursorTimeout` and `tailable` flags.
     */
    addCursorFlag(flag: string, value: boolean): this;

    /**
     * Marks this cursor as closed. Will stop streaming and subsequent calls to
     * `next()` will error.
     */
    close(): Promise<void>;
    close(callback: CallbackWithoutResult): void;

    /**
     * Execute `fn` for every document(s) in the cursor. If batchSize is provided
     * `fn` will be executed for each batch of documents. If `fn` returns a promise,
     * will wait for the promise to resolve before iterating on to the next one.
     * Returns a promise that resolves when done.
     */
    eachAsync(fn: (doc: any) => any, options?: { parallel?: number, batchSize?: number }): Promise<void>;
    eachAsync(fn: (doc: any) => any, options?: { parallel?: number, batchSize?: number }, cb?: CallbackWithoutResult): void;

    /**
     * Registers a transform function which subsequently maps documents retrieved
     * via the streams interface or `.next()`
     */
    map(fn: (res: any) => any): this;

    /**
     * Get the next document from this cursor. Will return `null` when there are
     * no documents left.
     */
    next(): Promise<any>;
    next(callback: Callback): void;
  }

  class SchemaType {
    /** SchemaType constructor */
    constructor(path: string, options?: AnyObject, instance?: string);

    /** Get/set the function used to cast arbitrary values to this type. */
    static cast(caster?: Function | boolean): Function;

    static checkRequired(checkRequired?: (v: any) => boolean): (v: any) => boolean;

    /** Sets a default option for this schema type. */
    static set(option: string, value: any): void;

    /** Attaches a getter for all instances of this schema type. */
    static get(getter: (value: any) => any): void;

    /** The class that Mongoose uses internally to instantiate this SchemaType's `options` property. */
    OptionsConstructor: typeof SchemaTypeOptions;

    /** Cast `val` to this schema type. Each class that inherits from schema type should implement this function. */
    cast(val: any, doc: Document<any>, init: boolean, prev?: any, options?: any): any;

    /** Sets a default value for this SchemaType. */
    default(val: any): any;

    /** Adds a getter to this schematype. */
    get(fn: Function): this;

    /**
     * Defines this path as immutable. Mongoose prevents you from changing
     * immutable paths unless the parent document has [`isNew: true`](/docs/api.html#document_Document-isNew).
     */
    immutable(bool: boolean): this;

    /** Declares the index options for this schematype. */
    index(options: any): this;

    /** String representation of what type this is, like 'ObjectID' or 'Number' */
    instance: string;

    /** True if this SchemaType has a required validator. False otherwise. */
    isRequired?: boolean;

    /** The options this SchemaType was instantiated with */
    options: AnyObject;

    /** The path to this SchemaType in a Schema. */
    path: string;

    /**
     * Set the model that this path refers to. This is the option that [populate](https://mongoosejs.com/docs/populate.html)
     * looks at to determine the foreign collection it should query.
     */
    ref(ref: string | boolean | Model<any>): this;

    /**
     * Adds a required validator to this SchemaType. The validator gets added
     * to the front of this SchemaType's validators array using unshift().
     */
    required(required: boolean, message?: string): this;

    /** The schema this SchemaType instance is part of */
    schema: Schema<any>;

    /** Sets default select() behavior for this path. */
    select(val: boolean): this;

    /** Adds a setter to this schematype. */
    set(fn: Function): this;

    /** Declares a sparse index. */
    sparse(bool: boolean): this;

    /** Declares a full text index. */
    text(bool: boolean): this;

    /** Defines a custom function for transforming this path when converting a document to JSON. */
    transform(fn: (value: any) => any): this;

    /** Declares an unique index. */
    unique(bool: boolean): this;

    /** The validators that Mongoose should run to validate properties at this SchemaType's path. */
    validators: { message?: string; type?: string; validator?: Function }[];

    /** Adds validator(s) for this document path. */
    validate(obj: RegExp | Function | any, errorMsg?: string,
      type?: string): this;
  }

  export interface SyncIndexesOptions extends mongodb.CreateIndexesOptions {
    continueOnError?: boolean
  }
  export type ConnectionSyncIndexesResult = Record<string, OneCollectionSyncIndexesResult>;
  type OneCollectionSyncIndexesResult = Array<string> & mongodb.MongoServerError;
  type Callback<T = any> = (error: CallbackError, result: T) => void;

  type CallbackWithoutResult = (error: CallbackError) => void;

  class NativeError extends global.Error { }
  type CallbackError = NativeError | null;

  class Error extends global.Error {
    constructor(msg: string);

    /** The type of error. "MongooseError" for generic errors. */
    name: string;

    static messages: any;

    static Messages: any;
  }

  namespace Error {
    export class CastError extends Error {
      name: 'CastError';
      stringValue: string;
      kind: string;
      value: any;
      path: string;
      reason?: NativeError | null;
      model?: any;

      constructor(type: string, value: any, path: string, reason?: NativeError, schemaType?: SchemaType);
    }
    export class SyncIndexesError extends Error {
      name: 'SyncIndexesError';
      errors?: Record<string, mongodb.MongoServerError>;

      constructor(type: string, value: any, path: string, reason?: NativeError, schemaType?: SchemaType);
    }

    export class DisconnectedError extends Error {
      name: 'DisconnectedError';
    }

    export class DivergentArrayError extends Error {
      name: 'DivergentArrayError';
    }

    export class MissingSchemaError extends Error {
      name: 'MissingSchemaError';
    }

    export class DocumentNotFoundError extends Error {
      name: 'DocumentNotFoundError';
      result: any;
      numAffected: number;
      filter: any;
      query: any;
    }

    export class ObjectExpectedError extends Error {
      name: 'ObjectExpectedError';
      path: string;
    }

    export class ObjectParameterError extends Error {
      name: 'ObjectParameterError';
    }

    export class OverwriteModelError extends Error {
      name: 'OverwriteModelError';
    }

    export class ParallelSaveError extends Error {
      name: 'ParallelSaveError';
    }

    export class ParallelValidateError extends Error {
      name: 'ParallelValidateError';
    }

    export class MongooseServerSelectionError extends Error {
      name: 'MongooseServerSelectionError';
    }

    export class StrictModeError extends Error {
      name: 'StrictModeError';
      isImmutableError: boolean;
      path: string;
    }

    export class ValidationError extends Error {
      name: 'ValidationError';

      errors: { [path: string]: ValidatorError | CastError | ValidationError };
      addError: (path: string, error: ValidatorError | CastError | ValidationError) => void;

      constructor(instance?: Error);
    }

    export class ValidatorError extends Error {
      name: 'ValidatorError';
      properties: {
        message: string,
        type?: string,
        path?: string,
        value?: any,
        reason?: any
      };
      kind: string;
      path: string;
      value: any;
      reason?: Error | null;

      constructor(properties: {
        message?: string,
        type?: string,
        path?: string,
        value?: any,
        reason?: any
      });
    }

    export class VersionError extends Error {
      name: 'VersionError';
      version: number;
      modifiedPaths: Array<string>;

      constructor(doc: Document, currentVersion: number, modifiedPaths: Array<string>);
    }
  }

  /* for ts-mongoose */
  class mquery {}
}

export default mongoose;
