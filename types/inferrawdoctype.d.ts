import {
  IsPathRequired,
  IsSchemaTypeFromBuiltinClass,
  RequiredPaths,
  OptionalPaths,
  PathWithTypePropertyBaseType,
  PathEnumOrString
} from './inferschematype';
import { Binary, UUID } from 'mongodb';

declare module 'mongoose' {
  export type InferRawDocType<
    SchemaDefinition,
    TSchemaOptions extends Record<any, any> = DefaultSchemaOptions,
    TTransformOptions = { bufferToBinary: false }
  > = Require_id<ApplySchemaOptions<{
    [
    K in keyof (RequiredPaths<SchemaDefinition, TSchemaOptions['typeKey']> &
    OptionalPaths<SchemaDefinition, TSchemaOptions['typeKey']>)
    ]: IsPathRequired<SchemaDefinition[K], TSchemaOptions['typeKey']> extends true
      ? ObtainRawDocumentPathType<SchemaDefinition[K], TSchemaOptions['typeKey'], TTransformOptions>
      : ObtainRawDocumentPathType<SchemaDefinition[K], TSchemaOptions['typeKey'], TTransformOptions> | null;
  }, TSchemaOptions>>;

  /**
   * @summary Allows users to optionally choose their own type for a schema field for stronger typing.
   */
  type RawDocTypeHint<T> = T extends { __rawDocTypeHint: infer U } ? U: never;

  /**
   * @summary Obtains schema Path type.
   * @description Obtains Path type by separating path type from other options and calling {@link ResolveRawPathType}
   * @param {PathValueType} PathValueType Document definition path type.
   * @param {TypeKey} TypeKey A generic refers to document definition.
   */
  type ObtainRawDocumentPathType<
    PathValueType,
    TypeKey extends string = DefaultTypeKey,
    TTransformOptions = { bufferToBinary: false }
  > = ResolveRawPathType<
    PathValueType extends PathWithTypePropertyBaseType<TypeKey>
      ? PathValueType[TypeKey] extends PathWithTypePropertyBaseType<TypeKey>
        ? PathValueType
        : PathValueType[TypeKey]
      : PathValueType,
    PathValueType extends PathWithTypePropertyBaseType<TypeKey>
      ? PathValueType[TypeKey] extends PathWithTypePropertyBaseType<TypeKey>
        ? {}
        : Omit<PathValueType, TypeKey>
      : {},
    TypeKey,
    TTransformOptions,
    RawDocTypeHint<PathValueType>
  >;

  /**
   * Same as inferSchemaType, except:
   *
   * 1. Replace `Types.DocumentArray` and `Types.Array` with vanilla `Array`
   * 2. Replace `ObtainDocumentPathType` with `ObtainRawDocumentPathType`
   * 3. Replace `ResolvePathType` with `ResolveRawPathType`
   *
   * @summary Resolve path type by returning the corresponding type.
   * @param {PathValueType} PathValueType Document definition path type.
   * @param {Options} Options Document definition path options except path type.
   * @param {TypeKey} TypeKey A generic of literal string type."Refers to the property used for path type definition".
   * @returns Number, "Number" or "number" will be resolved to number type.
   */
  type ResolveRawPathType<PathValueType, Options extends SchemaTypeOptions<PathValueType> = {}, TypeKey extends string = DefaultSchemaOptions['typeKey'], TTransformOptions = { bufferToBinary: false }, TypeHint = never> =
  IfEquals<TypeHint, never,
    PathValueType extends Schema<infer RawDocType, any, any, any, any, any, any, any, any, infer TSchemaDefinition> ?
      IsItRecordAndNotAny<RawDocType> extends true ? RawDocType : InferRawDocType<TSchemaDefinition, DefaultSchemaOptions, TTransformOptions> :
      PathValueType extends (infer Item)[] ?
        IfEquals<Item, never, any[], Item extends Schema<infer RawDocType, any, any, any, any, any, any, any, any, infer TSchemaDefinition> ?
          // If Item is a schema, infer its type.
          Array<IsItRecordAndNotAny<RawDocType> extends true ? RawDocType : InferRawDocType<TSchemaDefinition, DefaultSchemaOptions, TTransformOptions>> :
          Item extends Record<TypeKey, any> ?
            Item[TypeKey] extends Function | String ?
              // If Item has a type key that's a string or a callable, it must be a scalar,
              // so we can directly obtain its path type.
              ObtainRawDocumentPathType<Item, TypeKey, TTransformOptions>[] :
              // If the type key isn't callable, then this is an array of objects, in which case
              // we need to call InferRawDocType to correctly infer its type.
              Array<InferRawDocType<Item, DefaultSchemaOptions, TTransformOptions>> :
            IsSchemaTypeFromBuiltinClass<Item> extends true ?
              ObtainRawDocumentPathType<Item, TypeKey, TTransformOptions>[] :
              IsItRecordAndNotAny<Item> extends true ?
                Item extends Record<string, never> ?
                  ObtainRawDocumentPathType<Item, TypeKey, TTransformOptions>[] :
                  Array<InferRawDocType<Item, DefaultSchemaOptions, TTransformOptions>> :
                ObtainRawDocumentPathType<Item, TypeKey, TTransformOptions>[]
        >:
        PathValueType extends ReadonlyArray<infer Item> ?
          IfEquals<Item, never, any[], Item extends Schema<infer RawDocType, any, any, any, any, any, any, any, any, infer TSchemaDefinition> ?
            Array<IsItRecordAndNotAny<RawDocType> extends true ? RawDocType : InferRawDocType<TSchemaDefinition, DefaultSchemaOptions, TTransformOptions>> :
            Item extends Record<TypeKey, any> ?
              Item[TypeKey] extends Function | String ?
                ObtainRawDocumentPathType<Item, TypeKey, TTransformOptions>[] :
                InferRawDocType<Item, DefaultSchemaOptions, TTransformOptions>[]:
              IsSchemaTypeFromBuiltinClass<Item> extends true ?
                ObtainRawDocumentPathType<Item, TypeKey, TTransformOptions>[] :
                IsItRecordAndNotAny<Item> extends true ?
                  Item extends Record<string, never> ?
                    ObtainRawDocumentPathType<Item, TypeKey, TTransformOptions>[] :
                    Array<InferRawDocType<Item, DefaultSchemaOptions, TTransformOptions>> :
                  ObtainRawDocumentPathType<Item, TypeKey, TTransformOptions>[]
          >:
          PathValueType extends StringSchemaDefinition ? PathEnumOrString<Options['enum']> :
            IfEquals<PathValueType, Schema.Types.String> extends true ? PathEnumOrString<Options['enum']> :
              IfEquals<PathValueType, String> extends true ? PathEnumOrString<Options['enum']> :
                PathValueType extends NumberSchemaDefinition ? Options['enum'] extends ReadonlyArray<any> ? Options['enum'][number] : number :
                  IfEquals<PathValueType, Schema.Types.Number> extends true ? number :
                    PathValueType extends DateSchemaDefinition ? NativeDate :
                      IfEquals<PathValueType, Schema.Types.Date> extends true ? NativeDate :
                        PathValueType extends typeof Buffer | 'buffer' | 'Buffer' | typeof Schema.Types.Buffer ? TTransformOptions extends { bufferToBinary: true } ? Binary : Buffer :
                          PathValueType extends BooleanSchemaDefinition ? boolean :
                            IfEquals<PathValueType, Schema.Types.Boolean> extends true ? boolean :
                              PathValueType extends ObjectIdSchemaDefinition ? Types.ObjectId :
                                IfEquals<PathValueType, Types.ObjectId> extends true ? Types.ObjectId :
                                  IfEquals<PathValueType, Schema.Types.ObjectId> extends true ? Types.ObjectId :
                                    PathValueType extends 'decimal128' | 'Decimal128' | typeof Schema.Types.Decimal128 ? Types.Decimal128 :
                                      IfEquals<PathValueType, Schema.Types.Decimal128> extends true ? Types.Decimal128 :
                                        IfEquals<PathValueType, Types.Decimal128> extends true ? Types.Decimal128 :
                                          IfEquals<PathValueType, Schema.Types.BigInt> extends true ? bigint :
                                            IfEquals<PathValueType, BigInt> extends true ? bigint :
                                              PathValueType extends 'bigint' | 'BigInt' | typeof Schema.Types.BigInt | typeof BigInt ? bigint :
                                                PathValueType extends 'uuid' | 'UUID' | typeof Schema.Types.UUID ? UUID :
                                                  PathValueType extends 'double' | 'Double' | typeof Schema.Types.Double ? Types.Double :
                                                    IfEquals<PathValueType, Schema.Types.UUID> extends true ? UUID :
                                                      PathValueType extends MapConstructor | 'Map' ? Record<string, ResolveRawPathType<Options['of']> | undefined> :
                                                        IfEquals<PathValueType, typeof Schema.Types.Map> extends true ? Record<string, ResolveRawPathType<Options['of']> | undefined> :
                                                          PathValueType extends ArrayConstructor ? any[] :
                                                            PathValueType extends typeof Schema.Types.Mixed ? any:
                                                              IfEquals<PathValueType, ObjectConstructor> extends true ? any:
                                                                IfEquals<PathValueType, {}> extends true ? any:
                                                                  PathValueType extends typeof SchemaType ? PathValueType['prototype'] :
                                                                    PathValueType extends Record<string, any> ? InferRawDocType<PathValueType, { typeKey: TypeKey }, TTransformOptions> :
                                                                      unknown,
  TypeHint>;
}
