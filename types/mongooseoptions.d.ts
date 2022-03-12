import stream = require('stream');

declare module 'mongoose' {

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
}