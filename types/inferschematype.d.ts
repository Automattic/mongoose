import {
  AnyArray,
  BooleanSchemaDefinition,
  BigintSchemaDefinition,
  BufferSchemaDefinition,
  DateSchemaDefinition,
  Decimal128SchemaDefinition,
  DefaultSchemaOptions,
  DefaultTypeKey,
  DoubleSchemaDefinition,
  IfEquals,
  InferSchemaType,
  IsItRecordAndNotAny,
  MapSchemaDefinition,
  NumberSchemaDefinition,
  ObjectIdSchemaDefinition,
  ObtainDocumentType,
  Schema,
  SchemaType,
  SchemaTypeOptions,
  StringSchemaDefinition,
  Types,
  UnionSchemaDefinition,
  UuidSchemaDefinition
} from 'mongoose';

declare module 'mongoose' {
  /**
   * @summary Obtains document schema type.
   * @description Obtains document schema type from document Definition OR returns enforced schema type if it's provided.
   * @param {DocDefinition} DocDefinition A generic equals to the type of document definition "provided in as first parameter in Schema constructor".
   * @param {EnforcedDocType} EnforcedDocType A generic type enforced by user "provided before schema constructor".
   * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
   */
  type ObtainDocumentType<
    DocDefinition,
    EnforcedDocType = any,
    TSchemaOptions extends Record<any, any> = DefaultSchemaOptions
  > =
    IsItRecordAndNotAny<EnforcedDocType> extends true ? EnforcedDocType
    : {
        [K in keyof (RequiredPaths<DocDefinition, TSchemaOptions['typeKey']> &
          OptionalPaths<DocDefinition, TSchemaOptions['typeKey']>)]: IsPathRequired<
          DocDefinition[K],
          TSchemaOptions['typeKey']
        > extends true ?
          ObtainDocumentPathType<DocDefinition[K], TSchemaOptions['typeKey']>
        : ObtainDocumentPathType<DocDefinition[K], TSchemaOptions['typeKey']> | null;
      };

  /**
   * @summary Obtains document schema type from Schema instance.
   * @param {Schema} TSchema `typeof` a schema instance.
   * @example
   * const userSchema = new Schema({userName:String});
   * type UserType = InferSchemaType<typeof userSchema>;
   * // result
   * type UserType = {userName?: string}
   */
  export type InferSchemaType<TSchema> = IfAny<TSchema, any, ObtainSchemaGeneric<TSchema, 'DocType'>>;

  /**
   * @summary Obtains schema Generic type by using generic alias.
   * @param {TSchema} TSchema A generic of schema type instance.
   * @param {alias} alias Targeted generic alias.
   */
  type ObtainSchemaGeneric<
    TSchema,
    alias extends
      | 'EnforcedDocType'
      | 'M'
      | 'TInstanceMethods'
      | 'TQueryHelpers'
      | 'TVirtuals'
      | 'TStaticMethods'
      | 'TSchemaOptions'
      | 'DocType'
      | 'THydratedDocumentType'
  > =
    TSchema extends (
      Schema<
        infer EnforcedDocType,
        infer M,
        infer TInstanceMethods,
        infer TQueryHelpers,
        infer TVirtuals,
        infer TStaticMethods,
        infer TSchemaOptions,
        infer DocType,
        infer THydratedDocumentType
      >
    ) ?
      {
        EnforcedDocType: EnforcedDocType;
        M: M;
        TInstanceMethods: TInstanceMethods;
        TQueryHelpers: TQueryHelpers;
        TVirtuals: TVirtuals;
        TStaticMethods: TStaticMethods;
        TSchemaOptions: TSchemaOptions;
        DocType: DocType;
        THydratedDocumentType: THydratedDocumentType;
      }[alias]
    : unknown;

  type ResolveSchemaOptions<T> = MergeType<DefaultSchemaOptions, T>;

  type ApplySchemaOptions<T, O = DefaultSchemaOptions> = ResolveTimestamps<T, O>;

  type DefaultTimestampProps = {
    createdAt: NativeDate;
    updatedAt: NativeDate;
  };

  type ResolveTimestamps<T, O> =
    O extends { timestamps?: false } ? T
    : O extends { timestamps: infer TimestampOptions } ?
      TimestampOptions extends true ? T & DefaultTimestampProps
      : TimestampOptions extends SchemaTimestampsConfig ?
        Show<
          T & {
            [K in keyof TimestampOptions & keyof DefaultTimestampProps as TimestampOptions[K] extends true ? K
            : TimestampOptions[K] & string]: NativeDate;
          }
        >
      : T
    : T;
}

type IsPathDefaultUndefined<PathType> =
  PathType extends { default: undefined } ? true
  : PathType extends { default: (...args: any[]) => undefined } ? true
  : false;

type RequiredPropertyDefinition =
  | {
      required: true | string | [true, string | undefined] | { isRequired: true };
    }
  | ArrayConstructor
  | any[];

/**
 * @summary Checks if a document path is required or optional.
 * @param {P} P Document path.
 * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
 */
type IsPathRequired<P, TypeKey extends string = DefaultTypeKey> =
  P extends RequiredPropertyDefinition ? true
  : P extends { required: boolean } ?
    P extends { required: false } ?
      false
    : true
  : P extends Record<TypeKey, ArrayConstructor | any[]> ?
    IsPathDefaultUndefined<P> extends true ?
      false
    : true
  : P extends Record<TypeKey, any> ?
    P extends { default: any } ?
      IfEquals<P['default'], undefined, false, true>
    : false
  : false;

/**
 * @summary A Utility to obtain schema's required path keys.
 * @param {T} T A generic refers to document definition.
 * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
 * @returns required paths keys of document definition.
 */
type RequiredPathKeys<T, TypeKey extends string = DefaultTypeKey> = Exclude<keyof T, OptionalPathKeys<T, TypeKey>>;

/**
 * @summary A Utility to obtain schema's required paths.
 * @param {T} T A generic refers to document definition.
 * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
 * @returns a record contains required paths with the corresponding type.
 */
type RequiredPaths<T, TypeKey extends string = DefaultTypeKey> = Pick<
  { -readonly [K in keyof T]: T[K] },
  RequiredPathKeys<T, TypeKey>
>;

/**
 * @summary A Utility to obtain schema's optional path keys.
 * @param {T} T A generic refers to document definition.
 * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
 * @returns optional paths keys of document definition.
 */
type OptionalPathKeys<T, TypeKey extends string = DefaultTypeKey> = {
  [K in keyof T]: IsPathRequired<T[K], TypeKey> extends true ? never : K;
}[keyof T];

/**
 * @summary A Utility to obtain schema's optional paths.
 * @param {T} T A generic refers to document definition.
 * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
 * @returns a record contains optional paths with the corresponding type.
 */
type OptionalPaths<T, TypeKey extends string = DefaultTypeKey> = Pick<
  { -readonly [K in keyof T]?: T[K] },
  OptionalPathKeys<T, TypeKey>
>;

/**
 * @summary Allows users to optionally choose their own type for a schema field for stronger typing.
 */
type TypeHint<T> = T extends { __typehint: infer U } ? U : never;

/**
 * @summary Obtains schema Path type.
 * @description Obtains Path type by separating path type from other options and calling {@link ResolvePathType}
 * @param {PathValueType} PathValueType Document definition path type.
 * @param {TypeKey} TypeKey A generic refers to document definition.
 */
type ObtainDocumentPathType<PathValueType, TypeKey extends string = DefaultTypeKey> = ResolvePathType<
  TypeKey extends keyof PathValueType ?
    TypeKey extends keyof PathValueType[TypeKey] ?
      PathValueType
    : PathValueType[TypeKey]
  : PathValueType,
  TypeKey extends keyof PathValueType ?
    TypeKey extends keyof PathValueType[TypeKey] ?
      {}
    : Omit<PathValueType, TypeKey>
  : {},
  TypeKey,
  TypeHint<PathValueType>
>;

/**
 * @param {T} T A generic refers to string path enums.
 * @returns Path enum values type as literal strings or string.
 */
type PathEnumOrString<T extends SchemaTypeOptions<string>['enum']> =
  T extends ReadonlyArray<infer E> ? E
  : T extends { values: any } ? PathEnumOrString<T['values']>
  : T extends Record<string, infer V> ? V
  : string;

type IsSchemaTypeFromBuiltinClass<T> =
  T extends typeof String ? true
  : T extends typeof Number ? true
  : T extends typeof Boolean ? true
  : T extends typeof Buffer ? true
  : T extends typeof Schema.Types.ObjectId ? true
  : T extends typeof Schema.Types.UUID ? true
  : T extends typeof Schema.Types.Decimal128 ? true
  : T extends typeof Schema.Types.Int32 ? true
  : T extends typeof Schema.Types.String ? true
  : T extends typeof Schema.Types.Number ? true
  : T extends typeof Schema.Types.Date ? true
  : T extends typeof Schema.Types.Double ? true
  : T extends typeof Schema.Types.Boolean ? true
  : T extends Types.ObjectId ? true
  : T extends Types.Decimal128 ? true
  : T extends NativeDate ? true
  : T extends typeof Schema.Types.Mixed ? true
  : unknown extends Buffer ? false
  : T extends Buffer ? true
  : false;

/**
 * @summary Resolve path type by returning the corresponding type.
 * @param {PathValueType} PathValueType Document definition path type.
 * @param {Options} Options Document definition path options except path type.
 * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
 * @returns Number, "Number" or "number" will be resolved to number type.
 */
type ResolvePathType<
  PathValueType,
  Options extends SchemaTypeOptions<PathValueType> = {},
  TypeKey extends string = DefaultSchemaOptions['typeKey'],
  TypeHint = never
> = IfEquals<
  TypeHint,
  never,
  PathValueType extends Schema ? InferSchemaType<PathValueType>
  : PathValueType extends AnyArray<infer Item> ?
    IfEquals<Item, never> extends true
      ? any[]
      : Item extends Schema ?
        // If Item is a schema, infer its type.
        Types.DocumentArray<InferSchemaType<Item>>
      : Item extends Record<TypeKey, any> ?
        Item[TypeKey] extends Function | String ?
          // If Item has a type key that's a string or a callable, it must be a scalar,
          // so we can directly obtain its path type.
          ObtainDocumentPathType<Item, TypeKey>[]
        : // If the type key isn't callable, then this is an array of objects, in which case
          // we need to call ObtainDocumentType to correctly infer its type.
          Types.DocumentArray<ObtainDocumentType<Item, any, { typeKey: TypeKey }>>
      : IsSchemaTypeFromBuiltinClass<Item> extends true ? ResolvePathType<Item, { enum: Options['enum'] }, TypeKey>[]
      : IsItRecordAndNotAny<Item> extends true ?
        Item extends Record<string, never> ?
          ObtainDocumentPathType<Item, TypeKey>[]
        : Types.DocumentArray<ObtainDocumentType<Item, any, { typeKey: TypeKey }>>
      : ObtainDocumentPathType<Item, TypeKey>[]
  : PathValueType extends StringSchemaDefinition ? PathEnumOrString<Options['enum']>
  : IfEquals<PathValueType, String> extends true ? PathEnumOrString<Options['enum']>
  : PathValueType extends NumberSchemaDefinition ?
    Options['enum'] extends ReadonlyArray<any> ?
      Options['enum'][number]
    : number
  : PathValueType extends DateSchemaDefinition ? NativeDate
  : PathValueType extends BufferSchemaDefinition ? Buffer
  : PathValueType extends BooleanSchemaDefinition ? boolean
  : PathValueType extends ObjectIdSchemaDefinition ? Types.ObjectId
  : PathValueType extends Decimal128SchemaDefinition ? Types.Decimal128
  : PathValueType extends BigintSchemaDefinition ? bigint
  : PathValueType extends UuidSchemaDefinition ? Buffer
  : PathValueType extends DoubleSchemaDefinition ? Types.Double
  : PathValueType extends MapSchemaDefinition ? Map<string, ObtainDocumentPathType<Options['of']>>
  : PathValueType extends UnionSchemaDefinition ?
    Options['of'] extends AnyArray<infer U> ? ResolvePathType<U>
    : never
  : PathValueType extends ArrayConstructor ? any[]
  : PathValueType extends typeof Schema.Types.Mixed ? any
  : IfEquals<PathValueType, ObjectConstructor> extends true ? any
  : IfEquals<PathValueType, {}> extends true ? any
  : PathValueType extends typeof SchemaType ? PathValueType['prototype']
  : PathValueType extends Record<string, any> ?
    ObtainDocumentType<
      PathValueType,
      any,
      {
        typeKey: TypeKey;
      }
    >
  : unknown,
  TypeHint
>;
