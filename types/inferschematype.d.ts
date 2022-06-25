import { Schema, InferSchemaType, SchemaType, SchemaTypeOptions, TypeKeyBaseType } from 'mongoose';

declare module 'mongoose' {
  /**
   * @summary Obtains document schema type.
   * @description Obtains document schema type from document Definition OR returns enforced schema type if it's provided.
   * @param {DocDefinition} DocDefinition A generic equals to the type of document definition "provided in as first parameter in Schema constructor".
   * @param {EnforcedDocType} EnforcedDocType A generic type enforced by user "provided before schema constructor".
   * @param {TypeKey} TypeKey A generic of literal string type.
   */
  type ObtainDocumentType<DocDefinition, EnforcedDocType = any, TypeKey extends TypeKeyBaseType = DefaultTypeKey> =
    IsItRecordAndNotAny<EnforcedDocType> extends true ? EnforcedDocType : {
      [K in keyof (RequiredPaths<DocDefinition> &
      OptionalPaths<DocDefinition>)]: ObtainDocumentPathType<DocDefinition[K], TypeKey>;
    };

  /**
   * @summary Obtains document schema type from Schema instance.
   * @param {SchemaType} SchemaType A generic of schema type instance.
   * @example
   * const userSchema = new Schema({userName:String});
   * type UserType = InferSchemaType<typeof userSchema>;
   * // result
   * type UserType = {userName?: string}
   */
  type InferSchemaType<SchemaType> = ObtainSchemaGeneric<SchemaType, 'DocType'> ;

  /**
   * @summary Obtains schema Generic type by using generic alias.
   * @param {TSchema} TSchema A generic of schema type instance.
   * @param {alias} alias Targeted generic alias.
   */
  type ObtainSchemaGeneric<TSchema, alias extends 'EnforcedDocType' | 'M' | 'TInstanceMethods' | 'TQueryHelpers' | 'TVirtuals' | 'TStaticMethods' | 'TPathTypeKey' | 'DocType'> =
    TSchema extends Schema<infer EnforcedDocType, infer M, infer TInstanceMethods, infer TQueryHelpers, infer TVirtuals, infer TStaticMethods, infer TPathTypeKey, infer DocType>
      ? {
        EnforcedDocType: EnforcedDocType;
        M: M;
        TInstanceMethods: TInstanceMethods;
        TQueryHelpers: TQueryHelpers;
        TVirtuals: TVirtuals;
        TStaticMethods: TStaticMethods;
        TPathTypeKey: TPathTypeKey;
        DocType: DocType;
      }[alias]
      : unknown;
}
/**
 * @summary Checks if a type is "Record" or "any".
 * @description It Helps to check if user has provided schema type "EnforcedDocType"
 * @param {T} T A generic type to be checked.
 * @returns true if {@link T} is Record OR false if {@link T} is of any type.
 */
type IsItRecordAndNotAny<T> = IfEquals<T, any, false, T extends Record<any, any> ? true : false>;

/**
 * @summary Checks if two types are identical.
 * @param {T} T The first type to be compared with {@link U}.
 * @param {U} U The seconde type to be compared with {@link T}.
 * @param {Y} Y A type to be returned if {@link T} &  {@link U} are identical.
 * @param {N} N A type to be returned if {@link T} &  {@link U} are not identical.
 */
type IfEquals<T, U, Y = true, N = false> =
    (<G>() => G extends T ? 1 : 0) extends
    (<G>() => G extends U ? 1 : 0) ? Y : N;

/**
 * @summary Required path base type.
 * @description It helps to check whereas if a path is required OR optional.
 */
type RequiredPathBaseType = { required: true | [true, string | undefined] };

/**
 * @summary Path base type defined by using TypeKey
 * @description It helps to check if a path is defined by TypeKey OR not.
 * @param {TypeKey} TypeKey A literal string refers to path type property key.
 */
type PathWithTypePropertyBaseType<TypeKey extends TypeKeyBaseType> = { [k in TypeKey]: any };

/**
 * @summary A Utility to obtain schema's required path keys.
 * @param {T} T A generic refers to document definition.
 * @returns required paths keys of document definition.
 */
type RequiredPathKeys<T> = {
  [K in keyof T]: T[K] extends RequiredPathBaseType ? IfEquals<T[K], any, never, K> : never;
}[keyof T];

/**
 * @summary A Utility to obtain schema's required paths.
 * @param {T} T A generic refers to document definition.
 * @returns a record contains required paths with the corresponding type.
 */
type RequiredPaths<T> = {
  [K in RequiredPathKeys<T>]: T[K];
};

/**
 * @summary A Utility to obtain schema's optional path keys.
 * @param {T} T A generic refers to document definition.
 * @returns optional paths keys of document definition.
 */
type OptionalPathKeys<T> = {
  [K in keyof T]: T[K] extends RequiredPathBaseType ? never : K;
}[keyof T];

/**
 * @summary A Utility to obtain schema's optional paths.
 * @param {T} T A generic refers to document definition.
 * @returns a record contains optional paths with the corresponding type.
 */
type OptionalPaths<T> = {
  [K in OptionalPathKeys<T>]?: T[K];
};

/**
 * @summary Obtains schema Path type.
 * @description Obtains Path type by calling {@link ResolvePathType} OR by calling {@link InferSchemaType} if path of schema type.
 * @param {PathValueType} PathValueType Document definition path type.
 * @param {TypeKey} TypeKey A generic refers to document definition.
 */
type ObtainDocumentPathType<PathValueType, TypeKey extends TypeKeyBaseType> = PathValueType extends Schema<any>
  ? InferSchemaType<PathValueType>
  : ResolvePathType<
  PathValueType extends PathWithTypePropertyBaseType<TypeKey> ? PathValueType[TypeKey] : PathValueType,
  PathValueType extends PathWithTypePropertyBaseType<TypeKey> ? Omit<PathValueType, TypeKey> : {}
  >;

/**
 * @param {T} T A generic refers to string path enums.
 * @returns Path enum values type as literal strings or string.
 */
type PathEnumOrString<T extends SchemaTypeOptions<string>['enum']> = T extends (infer E)[] ? E : T extends { values: any } ? PathEnumOrString<T['values']> : string;

/**
 * @summary Resolve path type by returning the corresponding type.
 * @param {PathValueType} PathValueType Document definition path type.
 * @param {Options} Options Document definition path options except path type.
 * @returns Number, "Number" or "number" will be resolved to string type.
 */
type ResolvePathType<PathValueType, Options extends SchemaTypeOptions<PathValueType> = {}> =
  PathValueType extends (infer Item)[] ? IfEquals<Item, never, any, ResolvePathType<Item>>[] :
    PathValueType extends StringConstructor | 'string' | 'String' | typeof Schema.Types.String ? PathEnumOrString<Options['enum']> :
      PathValueType extends NumberConstructor | 'number' | 'Number' | typeof Schema.Types.Number ? number :
        PathValueType extends DateConstructor | 'date' | 'Date' | typeof Schema.Types.Date ? Date :
          PathValueType extends typeof Buffer | 'buffer' | 'Buffer' | typeof Schema.Types.Buffer ? Buffer :
            PathValueType extends BooleanConstructor | 'boolean' | 'Boolean' | typeof Schema.Types.Boolean ? boolean :
              PathValueType extends 'objectId' | 'ObjectId' | typeof Schema.Types.ObjectId ? Schema.Types.ObjectId :
                PathValueType extends 'decimal128' | 'Decimal128' | typeof Schema.Types.Decimal128 ? Schema.Types.Decimal128 :
                  PathValueType extends MapConstructor ? Map<string, ResolvePathType<Options['of']>> :
                    PathValueType extends ArrayConstructor ? any[] :
                      PathValueType extends typeof Schema.Types.Mixed ? any:
                        IfEquals<PathValueType, ObjectConstructor> extends true ? any:
                          IfEquals<PathValueType, {}> extends true ? any:
                            PathValueType extends typeof SchemaType ? PathValueType['prototype'] :
                              unknown;