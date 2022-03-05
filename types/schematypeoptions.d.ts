declare module 'mongoose' {

  interface ValidatorProps<T> {
    path: string;
    value: T;
  }

  interface ValidatorMessageFn<T> {
    (props: ValidatorProps<T>): string;
  }

  interface ValidateFn<T> {
    (value: T): boolean;
  }

  interface LegacyAsyncValidateFn<T> {
    (value: T, callback: (result: boolean) => void): void;
  }

  interface AsyncValidateFn<T> {
    (value: T): Promise<boolean>;
  }

  interface ValidateOpts<T> {
    msg?: string;
    message?: string | ValidatorMessageFn<T>;
    type?: string;
    validator: ValidateFn<T> | LegacyAsyncValidateFn<T> | AsyncValidateFn<T>;
  }

  type SchemaValidator<T> = RegExp | [RegExp, string] | Function | [Function, string] | ValidateOpts<T> | ValidateOpts<T>[];

  export class SchemaTypeOptionsClass implements
    StringSchemaTypeOptions,
    NumberSchemaTypeOptions,
    ObjectIdSchemaTypeOptions,
    DateSchemaTypeOptions,
    MapSchemaTypeOptions,
    BufferSchemaTypeOptions,
    BasicSchemaTypeOptions<any> {
  }

  export type SchemaTypeOptions<T> =
    T extends string ? StringSchemaTypeOptions | BasicSchemaTypeOptions<T>
    : T extends number ? NumberSchemaTypeOptions | BasicSchemaTypeOptions<T>
    : T extends Buffer ? BufferSchemaTypeOptions | BasicSchemaTypeOptions<T>
    : T extends Types.ObjectId ? ObjectIdSchemaTypeOptions | BasicSchemaTypeOptions<T>
    : T extends NativeDate ? DateSchemaTypeOptions | BasicSchemaTypeOptions<T>
    : T extends string[] ? StringSchemaTypeOptions | BasicSchemaTypeOptions<T>
    : T extends number[] ? NumberSchemaTypeOptions | BasicSchemaTypeOptions<T>
    : T extends Types.ObjectId[] ? ObjectIdSchemaTypeOptions | BasicSchemaTypeOptions<T>
    : T extends NativeDate[] ? DateSchemaTypeOptions | BasicSchemaTypeOptions<T>
    : T extends Map<any, any> ? MapSchemaTypeOptions | BasicSchemaTypeOptions<T>
    : BasicSchemaTypeOptions<T>;

  export interface BasicSchemaTypeOptions<T> {
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
    validate?: SchemaValidator<T> | AnyArray<SchemaValidator<T>>;

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
     * Define a transform function for this individual schema type.
     * Only called when calling `toJSON()` or `toObject()`.
     */
    transform?: (this: any, val: T) => any;

    /** defines a custom getter for this property using [`Object.defineProperty()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty). */
    get?: (value: T, doc?: this) => any;

    /** defines a custom setter for this property using [`Object.defineProperty()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty). */
    set?: (value?: any, priorVal?: T, doc?: this) => T;

    /** If `true`, Mongoose will skip gathering indexes on subpaths. Only allowed for subdocuments and subdocument arrays. */
    excludeIndexes?: boolean;

    /** If set, overrides the child schema's `_id` option. Only allowed for subdocuments and subdocument arrays. */
    _id?: boolean;
  }

  export interface EnumOption<T> {
    /** array of allowed values for this path. Allowed for strings, numbers, and arrays of strings */
    enum?: Array<T | null> | ReadonlyArray<T | null> | { values: Array<T | null> | ReadonlyArray<T | null>, message?: string } | { [path: string]: T | null };
  }

  export interface ObjectIdSchemaTypeOptions {
    /** If true, uses Mongoose's default `_id` settings. Only allowed for ObjectIds */
    auto?: boolean;
  }

  export interface MapSchemaTypeOptions {
    /** If set, specifies the type of this map's values. Mongoose will cast this map's values to the given type. */
    of?: Function | SchemaDefinitionProperty<any>;
  }

  export interface BufferSchemaTypeOptions {
    /** The default [subtype](http://bsonspec.org/spec.html) associated with this buffer when it is stored in MongoDB. Only allowed for buffer paths */
    subtype?: 0x0 | 0x1 | 0x2 | 0x3 | 0x4 | 0x5 | 0x6 | 0x80;
  }

  export interface DateSchemaTypeOptions {
    /** Defines a TTL index on this path. Only allowed for dates. */
    expires?: string | number;

    /** The minimum value allowed for this path. Only allowed for numbers and dates. */
    min?: number | NativeDate | [number, string] | [NativeDate, string] | readonly [number, string] | readonly [NativeDate, string];

    /** The maximum value allowed for this path. Only allowed for numbers and dates. */
    max?: number | NativeDate | [number, string] | [NativeDate, string] | readonly [number, string] | readonly [NativeDate, string];
  }

  export interface NumberSchemaTypeOptions extends
    EnumOption<number> {

    /** The minimum value allowed for this path. Only allowed for numbers and dates. */
    min?: number | [number, string] | readonly [number, string];

    /** The maximum value allowed for this path. Only allowed for numbers and dates. */
    max?: number | [number, string] | readonly [number, string];
  }

  export interface StringSchemaTypeOptions extends
    EnumOption<string> {

    /**
     * If [truthy](https://masteringjs.io/tutorials/fundamentals/truthy), Mongoose
     * will build a text index on this path.
     */
    text?: boolean | number | any;

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
  }
}
