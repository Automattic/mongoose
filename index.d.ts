declare module "mongoose" {
  import mongodb = require('mongodb');
  import mongoose = require('mongoose');

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

    remove(filter?: any, callback?: (err: Error | null) => void): Query<T>;
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
  }

  interface SchemaDefinition {
    [path: string]: SchemaTypeOptions<any>
  }

  interface SchemaTypeOptions<T> {
    type?: T;
  }

  interface Query<T extends Document> {
    exec(callback?: (err: Error | null, res: T) => void): Promise<T>;
  }
}