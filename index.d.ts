declare module "mongoose" {
  import mongodb = require('mongodb');
  import mongoose = require('mongoose');

  /** Opens Mongoose's default connection to MongoDB, see [connections docs](https://mongoosejs.com/docs/connections.html) */
  export function connect(uri: string, options: ConnectOptions, callback: (err: Error) => void): void;
  export function connect(uri: string, callback: (err: Error) => void): void;
  export function connect(uri: string, options?: ConnectOptions): Promise<Mongoose>;

  export function model<T extends Document>(name: string, schema?: Schema, collection?: string, skipInit?: boolean): Model<T>;

  type Mongoose = typeof mongoose;

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
    /** True by default. Set to `false` to make `findOneAndUpdate()` and `findOneAndRemove()` use native `findOneAndUpdate()` rather than `findAndModify()`. */
    useFindAndModify?: boolean;
    /** Set to `true` to make Mongoose automatically call `createCollection()` on every model created on this connection. */
    autoCreate?: boolean;
  }

  class Document {}

  export var Model: Model<any>;
  interface Model<T extends Document> {
    new(doc?: any): T;

    /** Saves this document by inserting a new document into the database if [document.isNew](/docs/api.html#document_Document-isNew) is `true`, or sends an [updateOne](/docs/api.html#document_Document-updateOne) operation with just the modified paths if `isNew` is `false`. */
    save(options?: SaveOptions): Promise<this>;
    save(options?: SaveOptions, fn?: (err: Error | null, doc: this) => void): void;
    save(fn?: (err: Error | null, doc: this) => void): void;

    /** Base Mongoose instance the model uses. */
    base: typeof mongoose;

    /**
     * If this is a discriminator model, `baseModelName` is the name of
     * the base model.
     */
    baseModelName: string | undefined;

    /** Registered discriminators for this model. */
    discriminators: { [name: string]: Model<any> } | undefined;

    /** Translate any aliases fields/conditions so the final query or document object is pure */
    translateAliases(raw: any): any;

    /** Creates a `count` query: counts the number of documents that match `filter`. */
    count(callback?: (err: any, count: number) => void): Query<number, T>;
    count(filter: FilterQuery<T>, callback?: (err: any, count: number) => void): Query<number, T>;

    /** Creates a `countDocuments` query: counts the number of documents that match `filter`. */
    countDocuments(callback?: (err: any, count: number) => void): Query<number, T>;
    countDocuments(filter: FilterQuery<T>, callback?: (err: any, count: number) => void): Query<number, T>;

    /** Creates a `estimatedDocumentCount` query: counts the number of documents in the collection. */
    estimatedDocumentCount(options?: QueryOptions, callback?: (err: any, count: number) => void): Query<number, T>;

    /** Creates a `distinct` query: returns the distinct values of the given `field` that match `filter`. */
    distinct(field: string, filter?: FilterQuery<T>, callback?: (err: any, count: number) => void): Query<Array<any>, T>;

    /** Creates a `find` query: gets a list of documents that match `filter`. */
    find(callback?: (err: any, count: number) => void): Query<Array<T>, T>;
    find(filter: FilterQuery<T>, callback?: (err: any, count: number) => void): Query<Array<T>, T>;
    find(filter: FilterQuery<T>, projection?: any | null, options?: QueryOptions | null, callback?: (err: any, count: number) => void): Query<Array<T>, T>;

    remove(filter?: any, callback?: (err: Error | null) => void): Query<any, T>;
  }

  interface QueryOptions {
    tailable?: number;
    sort?: any;
    limit?: number;
    skip?: number;
    maxscan?: number;
    batchSize?: number;
    comment?: any;
    snapshot?: any;
    readPreference?: mongodb.ReadPreferenceMode;
    hint?: any;
    upsert?: boolean;
    writeConcern?: any;
    timestamps?: boolean;
    omitUndefined?: boolean;
    overwriteDiscriminatorKey?: boolean;
    lean?: boolean | any;
    populate?: string;
    projection?: any;
    maxTimeMS?: number;
    useFindAndModify?: boolean;
    rawResult?: boolean;
    collation?: mongodb.CollationDocument;
    session?: mongodb.ClientSession;
    explain?: any;
  }

  interface SaveOptions {
    checkKeys?: boolean;
    validateBeforeSave?: boolean;
    validateModifiedOnly?: boolean;
    timestamps?: boolean;
    j?: boolean;
    w?: number | string;
    wtimeout?: number;
  }

  class Schema {
    /**
     * Create a new schema
     */
    constructor(definition?: SchemaDefinition);

    /** Adds key path / schema type pairs to this schema. */
    add(obj: SchemaDefinition | Schema, prefix?: string): this;
  }

  interface SchemaDefinition {
    [path: string]: SchemaTypeOptions<any> | Function | string | Schema | Array<Schema> | Array<SchemaTypeOptions<any>>;
  }

  interface SchemaTypeOptions<T> {
    type?: T;

    /** Defines a virtual with the given name that gets/sets this path. */
    alias?: string;

    /** Function or object describing how to validate this schematype. See [validation docs](https://mongoosejs.com/docs/validation.html). */
    validate?: RegExp | [RegExp, string] | Function;

    /** Allows overriding casting logic for this individual path. If a string, the given string overwrites Mongoose's default cast error message. */
    cast?: string;

    /**
     * If true, attach a required validator to this path, which ensures this path
     * path cannot be set to a nullish value. If a function, Mongoose calls the
     * function and only checks for nullish values if the function returns a truthy value.
     */
    required?: boolean | (() => boolean);

    /**
     * The default value for this path. If a function, Mongoose executes the function
     * and uses the return value as the default.
     */
    default?: T | ((this: any, doc: any) => T);

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
    index?: boolean | number | IndexOptions;

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
    get?: (value: T, schematype?: this) => any;

    /** defines a custom setter for this property using [`Object.defineProperty()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty). */
    set?: (value: T, schematype?: this) => any;

    /** array of allowed values for this path. Allowed for strings, numbers, and arrays of strings */
    enum?: Array<string | number>

    /** The default [subtype](http://bsonspec.org/spec.html) associated with this buffer when it is stored in MongoDB. Only allowed for buffer paths */
    subtype?: number

    /** The minimum value allowed for this path. Only allowed for numbers and dates. */
    min?: number | Date;

    /** The maximum value allowed for this path. Only allowed for numbers and dates. */
    max?: number | Date;

    /** Defines a TTL index on this path. Only allowed for dates. */
    expires?: Date;

    /** If `true`, Mongoose will skip gathering indexes on subpaths. Only allowed for subdocuments and subdocument arrays. */
    excludeIndexes?: boolean;

    /** If set, overrides the child schema's `_id` option. Only allowed for subdocuments and subdocument arrays. */
    _id?: boolean;

    /** If set, specifies the type of this map's values. Mongoose will cast this map's values to the given type. */
    of?: Function | SchemaTypeOptions<any>;

    /** If true, uses Mongoose's default `_id` settings. Only allowed for ObjectIds */
    auto?: boolean;

    /** Attaches a validator that succeeds if the data string matches the given regular expression, and fails otherwise. */
    match?: RegExp;

    /** If truthy, Mongoose will add a custom setter that lowercases this string using JavaScript's built-in `String#toLowerCase()`. */
    lowercase?: boolean;

    /** If truthy, Mongoose will add a custom setter that removes leading and trailing whitespace using JavaScript's built-in `String#trim()`. */
    trim?: boolean;

    /** If truthy, Mongoose will add a custom setter that uppercases this string using JavaScript's built-in `String#toUpperCase()`. */
    uppercase?: boolean;

    /** If set, Mongoose will add a custom validator that ensures the given string's `length` is at least the given number. */
    minlength?: number;

    /** If set, Mongoose will add a custom validator that ensures the given string's `length` is at most the given number. */
    maxlength?: number;
  }

  interface IndexOptions {
    background?: boolean,
    expires?: number | string
    sparse?: boolean,
    type?: string,
    unique?: boolean
  }

  interface Query<T, DocType extends Document> {
    exec(): Promise<T>;
    exec(callback?: (err: Error | null, res: T) => void): void;

    /** Specifies this query as a `count` query. */
    count(callback?: (err: any, count: number) => void): Query<number, DocType>;
    count(criteria: FilterQuery<DocType>, callback?: (err: any, count: number) => void): Query<number, DocType>;

    /** Specifies this query as a `countDocuments` query. */
    countDocuments(callback?: (err: any, count: number) => void): Query<number, DocType>;
    countDocuments(criteria: FilterQuery<DocType>, callback?: (err: any, count: number) => void): Query<number, DocType>;

    /** Creates a `distinct` query: returns the distinct values of the given `field` that match `filter`. */
    distinct(field: string, filter?: FilterQuery<T>, callback?: (err: any, count: number) => void): Query<Array<any>, T>;

    /** Creates a `estimatedDocumentCount` query: counts the number of documents in the collection. */
    estimatedDocumentCount(options?: QueryOptions, callback?: (err: any, count: number) => void): Query<number, T>;    
  }

  export type FilterQuery<T> = {
    [P in keyof T]?: P extends '_id'
      ? [Extract<T[P], mongodb.ObjectId>] extends [never]
        ? mongodb.Condition<T[P]>
        : mongodb.Condition<T[P] | string | { _id: mongodb.ObjectId }>
      : [Extract<T[P], mongodb.ObjectId>] extends [never]
      ? mongodb.Condition<T[P]>
      : mongodb.Condition<T[P] | string>;
  } &
    mongodb.RootQuerySelector<T>;
}