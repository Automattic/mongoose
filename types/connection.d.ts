import events = require('events');

declare module 'mongoose' {

  /**
     * Connection ready state
     *
     * - 0 = disconnected
     * - 1 = connected
     * - 2 = connecting
     * - 3 = disconnecting
     * - 99 = uninitialized
     */
  export enum ConnectionStates {
    disconnected = 0,
    connected = 1,
    connecting = 2,
    disconnecting = 3,
    uninitialized = 99,
  }

  /** Expose connection states for user-land */
  export const STATES: typeof ConnectionStates;

  interface ConnectOptions extends MongoDBMongoClientOptions {
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
    close(force: boolean, callback: CallbackWithoutResult): void;
    close(callback: CallbackWithoutResult): void;
    close(force?: boolean): Promise<void>;

    /** Retrieves a collection, creating it if not cached. */
    collection<T extends AnyObject = AnyObject>(name: string, options?: MongoDBCreateCollectionOptions): Collection<T>;

    /** A hash of the collections associated with this connection */
    readonly collections: { [index: string]: Collection };

    /** A hash of the global options that are associated with this connection */
    readonly config: any;

    /** The mongodb.Db instance, set when the connection is opened */
    readonly db: MongoDBDb;

    /**
       * Helper for `createCollection()`. Will explicitly create the given collection
       * with specified options. Used to create [capped collections](https://docs.mongodb.com/manual/core/capped-collections/)
       * and [views](https://docs.mongodb.com/manual/core/views/) from mongoose.
       */
    createCollection<T extends AnyObject = AnyObject>(name: string, options: MongoDBCreateCollectionOptions, callback: Callback<MongoDBCollection<T>>): void;
    createCollection<T extends AnyObject = AnyObject>(name: string, callback: Callback<MongoDBCollection<T>>): void;
    createCollection<T extends AnyObject = AnyObject>(name: string, options?: MongoDBCreateCollectionOptions): Promise<MongoDBCollection<T>>;

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
    dropCollection(collection: string, callback: CallbackWithoutResult): void;
    dropCollection(collection: string): Promise<void>;

    /**
       * Helper for `dropDatabase()`. Deletes the given database, including all
       * collections, documents, and indexes.
       */
    dropDatabase(callback: CallbackWithoutResult): void;
    dropDatabase(): Promise<void>;

    /** Gets the value of the option `key`. */
    get(key: string): any;

    /**
       * Returns the [MongoDB driver `MongoClient`](http://mongodb.github.io/node-mongodb-native/3.5/api/MongoClient.html) instance
       * that this connection uses to talk to MongoDB.
       */
    getClient(): MongoDBMongoClient;

    /**
       * The host name portion of the URI. If multiple hosts, such as a replica set,
       * this will contain the first host name in the URI
       */
    readonly host: string;

    /**
       * A number identifier for this connection. Used for debugging when
       * you have [multiple connections](/docs/connections.html#multiple_connections).
       */
    readonly id: number;

    /**
       * A [POJO](https://masteringjs.io/tutorials/fundamentals/pojo) containing
       * a map from model names to models. Contains all models that have been
       * added to this connection using [`Connection#model()`](/docs/api/connection.html#connection_Connection-model).
       */
    readonly models: Readonly<{ [index: string]: Model<any> }>;

    /** Defines or retrieves a model. */
    model<T, U, TQueryHelpers = {}>(
      name: string,
      schema?: Schema<T, U, TQueryHelpers>,
      collection?: string,
      options?: CompileModelOptions
    ): U;
    model<T>(name: string, schema?: Schema<T>, collection?: string, options?: CompileModelOptions): Model<T>;

    /** Returns an array of model names created on this connection. */
    modelNames(): Array<string>;

    /** The name of the database this connection points to. */
    readonly name: string;

    /** Opens the connection with a URI using `MongoClient.connect()`. */
    openUri(uri: string, options: ConnectOptions, callback: Callback<Connection>): Connection;
    openUri(uri: string, callback: Callback<Connection>): Connection;
    openUri(uri: string, options?: ConnectOptions): Promise<Connection>;

    /** The password specified in the URI */
    readonly pass: string;

    /**
       * The port portion of the URI. If multiple hosts, such as a replica set,
       * this will contain the port from the first host name in the URI.
       */
    readonly port: number;

    /** Declares a plugin executed on all schemas you pass to `conn.model()` */
    plugin<S extends Schema = Schema, O = AnyObject>(fn: (schema: S, opts?: any) => void, opts?: O): Connection;

    /** The plugins that will be applied to all models created on this connection. */
    plugins: Array<any>;

    /**
       * Connection ready state
       *
       * - 0 = disconnected
       * - 1 = connected
       * - 2 = connecting
       * - 3 = disconnecting
       * - 99 = uninitialized
       */
    readonly readyState: ConnectionStates;

    /** Sets the value of the option `key`. */
    set(key: string, value: any): any;

    /**
       * Set the [MongoDB driver `MongoClient`](http://mongodb.github.io/node-mongodb-native/3.5/api/MongoClient.html) instance
       * that this connection uses to talk to MongoDB. This is useful if you already have a MongoClient instance, and want to
       * reuse it.
       */
    setClient(client: MongoDBMongoClient): this;

    /**
       * _Requires MongoDB >= 3.6.0._ Starts a [MongoDB session](https://docs.mongodb.com/manual/release-notes/3.6/#client-sessions)
       * for benefits like causal consistency, [retryable writes](https://docs.mongodb.com/manual/core/retryable-writes/),
       * and [transactions](http://thecodebarbarian.com/a-node-js-perspective-on-mongodb-4-transactions.html).
       */
    startSession(options: MongoDBClientSessionOptions | undefined | null, callback: Callback<MongoDBClientSession>): void;
    startSession(callback: Callback<MongoDBClientSession>): void;
    startSession(options?: MongoDBClientSessionOptions): Promise<MongoDBClientSession>;

    /**
       * Makes the indexes in MongoDB match the indexes defined in every model's
       * schema. This function will drop any indexes that are not defined in
       * the model's schema except the `_id` index, and build any indexes that
       * are in your schema but not in MongoDB.
       */
    syncIndexes(options: SyncIndexesOptions | undefined | null, callback: Callback<ConnectionSyncIndexesResult>): void;
    syncIndexes(options?: SyncIndexesOptions): Promise<ConnectionSyncIndexesResult>;

    /**
       * _Requires MongoDB >= 3.6.0._ Executes the wrapped async function
       * in a transaction. Mongoose will commit the transaction if the
       * async function executes successfully and attempt to retry if
       * there was a retryable error.
       */
    transaction<U = any>(fn: (session: MongoDBClientSession) => Promise<U>): Promise<U>;

    /** Switches to a different database using the same connection pool. */
    useDb(name: string, options?: { useCache?: boolean, noListener?: boolean }): Connection;

    /** The username specified in the URI */
    readonly user: string;

    /** Watches the entire underlying database for changes. Similar to [`Model.watch()`](/docs/api/model.html#model_Model.watch). */
    watch<ResultType = any>(pipeline?: Array<any>, options?: MongoDBChangeStreamOptions): MongoDBChangeStream<ResultType>;
  }

}
