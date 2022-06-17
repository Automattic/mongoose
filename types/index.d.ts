/// <reference path="./aggregate.d.ts" />
/// <reference path="./callback.d.ts" />
/// <reference path="./collection.d.ts" />
/// <reference path="./connection.d.ts" />
/// <reference path="./cursor.d.ts" />
/// <reference path="./document.d.ts" />
/// <reference path="./error.d.ts" />
/// <reference path="./expressions.d.ts" />
/// <reference path="./helpers.d.ts" />
/// <reference path="./middlewares.d.ts" />
/// <reference path="./indizes.d.ts" />
/// <reference path="./models.d.ts" />
/// <reference path="./mongooseoptions.d.ts" />
/// <reference path="./pipelinestage.d.ts" />
/// <reference path="./populate.d.ts" />
/// <reference path="./query.d.ts" />
/// <reference path="./schemaoptions.d.ts" />
/// <reference path="./schematypes.d.ts" />
/// <reference path="./session.d.ts" />
/// <reference path="./types.d.ts" />
/// <reference path="./utility.d.ts" />
/// <reference path="./validation.d.ts" />
/// <reference path="./inferschematype.d.ts" />

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

  export function model<TSchema extends Schema = any>(
    name: string,
    schema?: TSchema,
    collection?: string,
    options?: CompileModelOptions
  ): Model<InferSchemaType<TSchema>, ObtainSchemaGeneric<TSchema, 'TQueryHelpers'>, ObtainSchemaGeneric<TSchema, 'TInstanceMethods'>, {}, TSchema> & ObtainSchemaGeneric<TSchema, 'TStaticMethods'>;

  export function model<T>(name: string, schema?: Schema<T, any, any> | Schema<T & Document, any, any>, collection?: string, options?: CompileModelOptions): Model<T>;

  export function model<T, U, TQueryHelpers = {}>(
    name: string,
    schema?: Schema<T, any, TQueryHelpers>,
    collection?: string,
    options?: CompileModelOptions
  ): U;

  /** Returns an array of model names created on this instance of Mongoose. */
  export function modelNames(): Array<string>;

  /**
   * Overwrites the current driver used by this Mongoose instance. A driver is a
   * Mongoose-specific interface that defines functions like `find()`.
   */
  export function setDriver(driver: any): Mongoose;

  /** The node-mongodb-native driver Mongoose uses. */
  export const mongo: typeof mongodb;

  /** Declares a global plugin executed on all Schemas. */
  export function plugin(fn: (schema: Schema, opts?: any) => void, opts?: any): Mongoose;

  /** Getter/setter around function for pluralizing collection names. */
  export function pluralize(fn?: ((str: string) => string) | null): ((str: string) => string) | null;

  /** Sets mongoose options */
  export function set<K extends keyof MongooseOptions>(key: K, value: MongooseOptions[K]): Mongoose;

  /** The Mongoose version */
  export const version: string;

  export type AnyKeys<T> = { [P in keyof T]?: T[P] | any };
  export interface AnyObject {
    [k: string]: any
  }

  export type Require_id<T> = T extends { _id?: infer U }
    ? U extends any
      ? (T & { _id: Types.ObjectId })
      : T & Required<{ _id: U }>
    : T & { _id: Types.ObjectId };

  export type RequireOnlyTypedId<T> = T extends { _id?: infer U; }
    ? Required<{ _id: U }>
    : { _id: Types.ObjectId };

  export type HydratedDocument<DocType, TMethodsAndOverrides = {}, TVirtuals = {}> = DocType extends Document ? Require_id<DocType> : (Document<unknown, any, DocType> & Require_id<DocType> & TVirtuals & TMethodsAndOverrides);

  export interface TagSet {
    [k: string]: string;
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

  export type DiscriminatorModel<M, T> = T extends Model<infer T1, infer T2, infer T3, infer T4>
    ?
    M extends Model<infer M1, infer M2, infer M3, infer M4>
      ? Model<Omit<M1, keyof T1> & T1, M2 | T2, M3 | T3, M4 | T4>
      : M
    : M;

  export type DiscriminatorSchema<DocType, M, TInstanceMethods, TQueryHelpers, TVirtuals, T> = T extends Schema<infer T1, infer T2, infer T3, infer T4, infer T5>
    ? Schema<Omit<DocType, keyof T1> & T1, DiscriminatorModel<T2, M>, T3 | TInstanceMethods, T4 | TQueryHelpers, T5 | TVirtuals>
    : Schema<DocType, M, TInstanceMethods, TQueryHelpers, TVirtuals>;

  export class Schema<EnforcedDocType = any, M = Model<EnforcedDocType, any, any, any>, TInstanceMethods = {}, TQueryHelpers = {}, TVirtuals = any,
    TStaticMethods = {},
    TPathTypeKey extends TypeKeyBaseType = DefaultTypeKey,
    DocType extends ObtainDocumentType<DocType, EnforcedDocType, TPathTypeKey> = ObtainDocumentType<any, EnforcedDocType, TPathTypeKey>>
    extends events.EventEmitter {
    /**
     * Create a new schema
     */
    constructor(definition?: SchemaDefinition<SchemaDefinitionType<EnforcedDocType>> | DocType, options?: SchemaOptions<TPathTypeKey, DocType, TInstanceMethods, TQueryHelpers, TStaticMethods>);

    /** Adds key path / schema type pairs to this schema. */
    add(obj: SchemaDefinition<SchemaDefinitionType<EnforcedDocType>> | Schema, prefix?: string): this;

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

    discriminator<T extends Schema = Schema>(name: string, schema: T): DiscriminatorSchema<DocType, M, TInstanceMethods, TQueryHelpers, TVirtuals, T>;

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
    obj: SchemaDefinition<SchemaDefinitionType<EnforcedDocType>>;

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
    post<T = HydratedDocument<DocType, TInstanceMethods>>(method: MongooseDocumentMiddleware | MongooseDocumentMiddleware[] | RegExp, fn: PostMiddlewareFunction<T, T>): this;
    post<T = HydratedDocument<DocType, TInstanceMethods>>(method: MongooseDocumentMiddleware | MongooseDocumentMiddleware[] | RegExp, options: SchemaPostOptions, fn: PostMiddlewareFunction<T, T>): this;
    post<T extends Query<any, any>>(method: MongooseQueryMiddleware | MongooseQueryMiddleware[] | string | RegExp, fn: PostMiddlewareFunction<T, T>): this;
    post<T extends Query<any, any>>(method: MongooseQueryMiddleware | MongooseQueryMiddleware[] | string | RegExp, options: SchemaPostOptions, fn: PostMiddlewareFunction<T, T>): this;
    post<T extends Aggregate<any>>(method: 'aggregate' | RegExp, fn: PostMiddlewareFunction<T, Array<AggregateExtract<T>>>): this;
    post<T extends Aggregate<any>>(method: 'aggregate' | RegExp, options: SchemaPostOptions, fn: PostMiddlewareFunction<T, Array<AggregateExtract<T>>>): this;
    post<T = M>(method: 'insertMany' | RegExp, fn: PostMiddlewareFunction<T, T>): this;
    post<T = M>(method: 'insertMany' | RegExp, options: SchemaPostOptions, fn: PostMiddlewareFunction<T, T>): this;

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
