declare module 'mongoose' {
  export type InferRawDocType<
    DocDefinition,
    TSchemaOptions extends Record<any, any> = DefaultSchemaOptions
  > = {
    [
      K in keyof (RequiredPaths<DocDefinition, TSchemaOptions['typeKey']> &
      OptionalPaths<DocDefinition, TSchemaOptions['typeKey']>)
    ]: ObtainRawDocumentPathType<DocDefinition[K], TSchemaOptions['typeKey']>;
  };

/**
 * @summary Obtains schema Path type.
 * @description Obtains Path type by separating path type from other options and calling {@link ResolvePathType}
 * @param {PathValueType} PathValueType Document definition path type.
 * @param {TypeKey} TypeKey A generic refers to document definition.
 */
type ObtainRawDocumentPathType<
  PathValueType,
  TypeKey extends string = DefaultTypeKey
> = ResolveRawPathType<
  PathValueType extends PathWithTypePropertyBaseType<TypeKey> ? PathValueType[TypeKey] : PathValueType,
  PathValueType extends PathWithTypePropertyBaseType<TypeKey> ? Omit<PathValueType, TypeKey> : {},
  TypeKey
>;

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
type IsPathRequired<P, TypeKey extends string = DefaultTypeKey> =
  P extends { required: true | [true, string | undefined] | { isRequired: true } } | ArrayConstructor | any[]
    ? true
    : P extends { required: boolean }
      ? P extends { required: false }
        ? false
        : true
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
type PathWithTypePropertyBaseType<TypeKey extends string = DefaultTypeKey> = { [k in TypeKey]: any };

/**
 * @summary A Utility to obtain schema's required path keys.
 * @param {T} T A generic refers to document definition.
 * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
 * @returns required paths keys of document definition.
 */
type RequiredPathKeys<T, TypeKey extends string = DefaultTypeKey> = {
  [K in keyof T]: IsPathRequired<T[K], TypeKey> extends true ? IfEquals<T[K], any, never, K> : never;
}[keyof T];

/**
 * @summary A Utility to obtain schema's required paths.
 * @param {T} T A generic refers to document definition.
 * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
 * @returns a record contains required paths with the corresponding type.
 */
type RequiredPaths<T, TypeKey extends string = DefaultTypeKey> = {
  [K in RequiredPathKeys<T, TypeKey>]: T[K];
};

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
 * @param {T} T A generic refers to string path enums.
 * @returns Path enum values type as literal strings or string.
 */
type PathEnumOrString<T extends SchemaTypeOptions<string>['enum']> = T extends ReadonlyArray<infer E> ? E : T extends { values: any } ? PathEnumOrString<T['values']> : string;

/**
 * @summary A Utility to obtain schema's optional paths.
 * @param {T} T A generic refers to document definition.
 * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
 * @returns a record contains optional paths with the corresponding type.
 */
type OptionalPaths<T, TypeKey extends string = DefaultTypeKey> = {
  [K in OptionalPathKeys<T, TypeKey>]?: T[K];
};

/**
 * @summary Resolve path type by returning the corresponding type.
 * @param {PathValueType} PathValueType Document definition path type.
 * @param {Options} Options Document definition path options except path type.
 * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
 * @returns Number, "Number" or "number" will be resolved to number type.
 */
type ResolveRawPathType<PathValueType, Options extends SchemaTypeOptions<PathValueType> = {}, TypeKey extends string = DefaultSchemaOptions['typeKey']> =
  PathValueType extends Schema ? InferRawDocType<PathValueType> :
    PathValueType extends (infer Item)[] ?
      IfEquals<Item, never, any[], Item extends Schema ?
        // If Item is a schema, infer its type.
        Array<InferRawDocType<Item>> :
        Item extends Record<TypeKey, any>?
          Item[TypeKey] extends Function | String ?
            // If Item has a type key that's a string or a callable, it must be a scalar,
            // so we can directly obtain its path type.
            ObtainRawDocumentPathType<Item, TypeKey>[] :
            // If the type key isn't callable, then this is an array of objects, in which case
            // we need to call ObtainDocumentType to correctly infer its type.
            InferRawDocType<Item>[]:
          ObtainRawDocumentPathType<Item, TypeKey>[]
      >:
      PathValueType extends ReadonlyArray<infer Item> ?
        IfEquals<Item, never, any[], Item extends Schema ?
          Array<InferRawDocType<Item>> :
          Item extends Record<TypeKey, any> ?
            Item[TypeKey] extends Function | String ?
            ObtainRawDocumentPathType<Item, TypeKey>[] :
              InferRawDocType<Item>[]:
              ObtainRawDocumentPathType<Item, TypeKey>[]
        >:
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
                                        IfEquals<PathValueType, Schema.Types.BigInt> extends true ? bigint :
                                          PathValueType extends 'bigint' | 'BigInt' | typeof Schema.Types.BigInt ? bigint :
                                            PathValueType extends 'uuid' | 'UUID' | typeof Schema.Types.UUID ? Buffer :
                                              IfEquals<PathValueType, Schema.Types.UUID> extends true ? Buffer :
                                                PathValueType extends MapConstructor ? Map<string, ResolveRawPathType<Options['of']>> :
                                                  IfEquals<PathValueType, typeof Schema.Types.Map> extends true ? Map<string, ResolveRawPathType<Options['of']>> :
                                                    PathValueType extends ArrayConstructor ? any[] :
                                                      PathValueType extends typeof Schema.Types.Mixed ? any:
                                                        IfEquals<PathValueType, ObjectConstructor> extends true ? any:
                                                          IfEquals<PathValueType, {}> extends true ? any:
                                                            PathValueType extends typeof SchemaType ? PathValueType['prototype'] :
                                                              PathValueType extends Record<string, any> ? ObtainDocumentType<PathValueType, any, { typeKey: TypeKey }> :
                                                                unknown;
}