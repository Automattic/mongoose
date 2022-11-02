import {
  Schema,
  InferSchemaType,
  SchemaType,
  SchemaTypeOptions,
  TypeKeyBaseType,
  Types,
  NumberSchemaDefinition,
  StringSchemaDefinition,
  BooleanSchemaDefinition,
  DateSchemaDefinition,
  ObtainDocumentType,
  DefaultTypeKey,
  ObjectIdSchemaDefinition,
  IfEquals
} from 'mongoose';

declare module 'mongoose' {
  /**
   * @summary Obtains document schema type.
   * @description Obtains document schema type from document Definition OR returns enforced schema type if it's provided.
   * @param {DocDefinition} DocDefinition A generic equals to the type of document definition "provided in as first parameter in Schema constructor".
   * @param {EnforcedDocType} EnforcedDocType A generic type enforced by user "provided before schema constructor".
   * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
   */
   type ObtainDocumentType<DocDefinition, EnforcedDocType = any, TypeKey extends TypeKeyBaseType = DefaultTypeKey> =
   IsItRecordAndNotAny<EnforcedDocType> extends true ? EnforcedDocType : {
     [K in keyof (RequiredPaths<DocDefinition, TypeKey> &
     OptionalPaths<DocDefinition, TypeKey>)]: ObtainDocumentPathType<DocDefinition[K], TypeKey>;
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
  type InferSchemaType<TSchema> = ObtainSchemaGeneric<TSchema, 'DocType'>;

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

type IsPathDefaultUndefined<PathType> = PathType extends { default: undefined } ?
  true :
  PathType extends { default: (...args: any[]) => undefined } ?
    true :
    false;

/**
 * @summary Checks if a document path is required or optional.
 * @param {P} P Document path.
 * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
 */
type IsPathRequired<P, TypeKey extends TypeKeyBaseType = DefaultTypeKey> =
  P extends { required: true | [true, string | undefined] } | ArrayConstructor | any[]
    ? true
    : P extends (Record<TypeKey, ArrayConstructor | any[]>)
      ? IsPathDefaultUndefined<P> extends true
        ? false
        : true
      : P extends (Record<TypeKey, any>)
        ? P extends { default: any }
          ? IfEquals<P['default'], undefined, false, true>
          : false
        : false;

/**
 * @summary Path base type defined by using TypeKey
 * @description It helps to check if a path is defined by TypeKey OR not.
 * @param {TypeKey} TypeKey A literal string refers to path type property key.
 */
type PathWithTypePropertyBaseType<TypeKey extends TypeKeyBaseType = DefaultTypeKey> = { [k in TypeKey]: any };

/**
 * @summary A Utility to obtain schema's required path keys.
 * @param {T} T A generic refers to document definition.
 * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
 * @returns required paths keys of document definition.
 */
type RequiredPathKeys<T, TypeKey extends TypeKeyBaseType = DefaultTypeKey> = {
  [K in keyof T]: IsPathRequired<T[K], TypeKey> extends true ? IfEquals<T[K], any, never, K> : never;
}[keyof T];

/**
 * @summary A Utility to obtain schema's required paths.
 * @param {T} T A generic refers to document definition.
 * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
 * @returns a record contains required paths with the corresponding type.
 */
type RequiredPaths<T, TypeKey extends TypeKeyBaseType = DefaultTypeKey> = {
  [K in RequiredPathKeys<T, TypeKey>]: T[K];
};

/**
 * @summary A Utility to obtain schema's optional path keys.
 * @param {T} T A generic refers to document definition.
 * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
 * @returns optional paths keys of document definition.
 */
type OptionalPathKeys<T, TypeKey extends TypeKeyBaseType = DefaultTypeKey> = {
  [K in keyof T]: IsPathRequired<T[K], TypeKey> extends true ? never : K;
}[keyof T];

/**
 * @summary A Utility to obtain schema's optional paths.
 * @param {T} T A generic refers to document definition.
 * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
 * @returns a record contains optional paths with the corresponding type.
 */
type OptionalPaths<T, TypeKey extends TypeKeyBaseType = DefaultTypeKey> = {
  [K in OptionalPathKeys<T, TypeKey>]?: T[K];
};

/**
 * @summary Obtains schema Path type.
 * @description Obtains Path type by calling {@link ResolvePathType} OR by calling {@link InferSchemaType} if path of schema type.
 * @param {PathValueType} PathValueType Document definition path type.
 * @param {TypeKey} TypeKey A generic refers to document definition.
 */
type ObtainDocumentPathType<PathValueType, TypeKey extends TypeKeyBaseType = DefaultTypeKey> = PathValueType extends Schema<any>
  ? InferSchemaType<PathValueType>
  : ResolvePathType<
  PathValueType extends PathWithTypePropertyBaseType<TypeKey> ? PathValueType[TypeKey] : PathValueType,
  PathValueType extends PathWithTypePropertyBaseType<TypeKey> ? Omit<PathValueType, TypeKey> : {},
  TypeKey
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
 * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
 * @returns Number, "Number" or "number" will be resolved to number type.
 */
type ResolvePathType<PathValueType, Options extends SchemaTypeOptions<PathValueType> = {}, TypeKey extends TypeKeyBaseType = DefaultTypeKey> =
  PathValueType extends Schema ? InferSchemaType<PathValueType> :
    PathValueType extends (infer Item)[] ? IfEquals<Item, never, any[], Item extends Schema ? Types.DocumentArray<ObtainDocumentPathType<Item, TypeKey>> : ObtainDocumentPathType<Item, TypeKey>[]> :
      PathValueType extends StringSchemaDefinition ? PathEnumOrString<Options['enum']> :
        IfEquals<PathValueType, Schema.Types.String> extends true ? PathEnumOrString<Options['enum']> :
          IfEquals<PathValueType, String> extends true ? PathEnumOrString<Options['enum']> :
            PathValueType extends NumberSchemaDefinition ? Options['enum'] extends ReadonlyArray<any> ? Options['enum'][number] : number :
              IfEquals<PathValueType, Schema.Types.Number> extends true ? number :
                PathValueType extends DateSchemaDefinition ? Date :
                  IfEquals<PathValueType, Schema.Types.Date> extends true ? Date :
                    PathValueType extends typeof Buffer | 'buffer' | 'Buffer' | typeof Schema.Types.Buffer ? Buffer :
                      PathValueType extends BooleanSchemaDefinition ? boolean :
                        IfEquals<PathValueType, Schema.Types.Boolean> extends true ? boolean :
                          PathValueType extends ObjectIdSchemaDefinition ? Types.ObjectId :
                            IfEquals<PathValueType, Types.ObjectId> extends true ? Types.ObjectId :
                              IfEquals<PathValueType, Schema.Types.ObjectId> extends true ? Types.ObjectId :
                                PathValueType extends 'decimal128' | 'Decimal128' | typeof Schema.Types.Decimal128 ? Types.Decimal128 :
                                  IfEquals<PathValueType, Schema.Types.Decimal128> extends true ? Types.Decimal128 :
                                    IfEquals<PathValueType, Types.Decimal128> extends true ? Types.Decimal128 :
                                      PathValueType extends MapConstructor ? Map<string, ResolvePathType<Options['of']>> :
                                        PathValueType extends ArrayConstructor ? any[] :
                                          PathValueType extends typeof Schema.Types.Mixed ? any:
                                            IfEquals<PathValueType, ObjectConstructor> extends true ? any:
                                              IfEquals<PathValueType, {}> extends true ? any:
                                                PathValueType extends typeof SchemaType ? PathValueType['prototype'] :
                                                  PathValueType extends Record<string, any> ? ObtainDocumentType<PathValueType, any, TypeKey> :
                                                    unknown;
