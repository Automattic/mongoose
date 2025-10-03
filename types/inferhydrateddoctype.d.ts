import {
  IsPathRequired,
  IsSchemaTypeFromBuiltinClass,
  RequiredPaths,
  OptionalPaths,
  PathEnumOrString
} from './inferschematype';
import { UUID } from 'mongodb';

declare module 'mongoose' {
  export type InferHydratedDocTypeFromSchema<TSchema extends Schema<any>> = ObtainSchemaGeneric<TSchema, 'THydratedDocumentType'>;

  /**
   * Given a schema definition, returns the hydrated document type from the schema definition.
   */
  export type InferHydratedDocType<
    DocDefinition,
    TSchemaOptions extends Record<any, any> = DefaultSchemaOptions
  > = Require_id<ApplySchemaOptions<{
    [
    K in keyof (RequiredPaths<DocDefinition, TSchemaOptions['typeKey']> &
    OptionalPaths<DocDefinition, TSchemaOptions['typeKey']>)
    ]: IsPathRequired<DocDefinition[K], TSchemaOptions['typeKey']> extends true
      ? ObtainHydratedDocumentPathType<DocDefinition[K], TSchemaOptions['typeKey']>
      : ObtainHydratedDocumentPathType<DocDefinition[K], TSchemaOptions['typeKey']> | null;
  }, TSchemaOptions>>;

  /**
   * @summary Obtains schema Path type.
   * @description Obtains Path type by separating path type from other options and calling {@link ResolveHydratedPathType}
   * @param {PathValueType} PathValueType Document definition path type.
   * @param {TypeKey} TypeKey A generic refers to document definition.
   */
  type ObtainHydratedDocumentPathType<
    PathValueType,
    TypeKey extends string = DefaultTypeKey
  > = ResolveHydratedPathType<
    TypeKey extends keyof PathValueType
      ? TypeKey extends keyof PathValueType[TypeKey]
        ? PathValueType
        : PathValueType[TypeKey]
      : PathValueType,
    TypeKey extends keyof PathValueType
      ? TypeKey extends keyof PathValueType[TypeKey]
        ? {}
        : Omit<PathValueType, TypeKey>
      : {},
    TypeKey,
    HydratedDocTypeHint<PathValueType>
  >;

  /**
   * @summary Allows users to optionally choose their own type for a schema field for stronger typing.
   */
  type HydratedDocTypeHint<T> = T extends { __hydratedDocTypeHint: infer U } ? U: never;

  /**
   * Same as inferSchemaType, except:
   *
   * 1. Replace `Types.DocumentArray` and `Types.Array` with vanilla `Array`
   * 2. Replace `ObtainDocumentPathType` with `ObtainHydratedDocumentPathType`
   * 3. Replace `ResolvePathType` with `ResolveHydratedPathType`
   *
   * @summary Resolve path type by returning the corresponding type.
   * @param {PathValueType} PathValueType Document definition path type.
   * @param {Options} Options Document definition path options except path type.
   * @param {TypeKey} TypeKey A generic of literal string type. Refers to the property used for path type definition.
   * @returns Type
   */
  type ResolveHydratedPathType<PathValueType, Options extends SchemaTypeOptions<PathValueType> = {}, TypeKey extends string = DefaultSchemaOptions['typeKey'], TypeHint = never> =
  IfEquals<TypeHint, never,
    PathValueType extends Schema<any, any, any, any, any, any, any, any, infer THydratedDocumentType> ?
      THydratedDocumentType :
      PathValueType extends (infer Item)[] ?
        IfEquals<Item, never, any[], Item extends Schema<infer EmbeddedRawDocType, any, any, any, any, any, any, any, infer EmbeddedHydratedDocType extends AnyObject, infer TSchemaDefition> ?
          // If Item is a schema, infer its type.
          IsItRecordAndNotAny<EmbeddedRawDocType> extends true ?
            Types.DocumentArray<EmbeddedRawDocType, Types.Subdocument<EmbeddedHydratedDocType['_id'], unknown, EmbeddedHydratedDocType> & EmbeddedHydratedDocType> :
            Types.DocumentArray<InferRawDocType<TSchemaDefition>, Types.Subdocument<InferHydratedDocType<TSchemaDefition>['_id'], unknown, InferHydratedDocType<TSchemaDefition>> & InferHydratedDocType<TSchemaDefition>> :
          Item extends Record<TypeKey, any> ?
            Item[TypeKey] extends Function | String ?
              // If Item has a type key that's a string or a callable, it must be a scalar,
              // so we can directly obtain its path type.
              Types.Array<ResolveHydratedPathType<Item, { enum: Options['enum'] }, TypeKey>> :
              // If the type key isn't callable, then this is an array of objects, in which case
              // we need to call InferHydratedDocType to correctly infer its type.
              Types.DocumentArray<
                InferRawDocType<Item>,
                Types.Subdocument<InferHydratedDocType<Item>['_id'], unknown, InferHydratedDocType<Item>> & InferHydratedDocType<Item>
              > :
            IsSchemaTypeFromBuiltinClass<Item> extends true ?
              Types.Array<ResolveHydratedPathType<Item, { enum: Options['enum'] }, TypeKey>> :
              IsItRecordAndNotAny<Item> extends true ?
                Item extends Record<string, never> ?
                  Types.Array<ObtainHydratedDocumentPathType<Item, TypeKey>> :
                  Types.DocumentArray<
                    InferRawDocType<Item>,
                    Types.Subdocument<InferHydratedDocType<Item>['_id'], unknown, InferHydratedDocType<Item>> & InferHydratedDocType<Item>
                  > :
                Types.Array<ObtainHydratedDocumentPathType<Item, TypeKey>>
        > :
        PathValueType extends ReadonlyArray<infer Item> ?
          IfEquals<Item, never, any[], Item extends Schema<infer EmbeddedRawDocType, any, any, any, any, any, any, any, infer EmbeddedHydratedDocType extends AnyObject, infer TSchemaDefition> ?
            IsItRecordAndNotAny<EmbeddedRawDocType> extends true ?
              Types.DocumentArray<EmbeddedRawDocType, Types.Subdocument<EmbeddedHydratedDocType['_id'], unknown, EmbeddedHydratedDocType> & EmbeddedHydratedDocType> :
              Types.DocumentArray<InferRawDocType<TSchemaDefition>, Types.Subdocument<InferHydratedDocType<TSchemaDefition>['_id'], unknown, InferHydratedDocType<TSchemaDefition>> & InferHydratedDocType<TSchemaDefition>> :
            Item extends Record<TypeKey, any> ?
              Item[TypeKey] extends Function | String ?
                Types.Array<ResolveHydratedPathType<Item, { enum: Options['enum'] }, TypeKey>> :
                Types.DocumentArray<
                  InferRawDocType<Item>,
                  Types.Subdocument<InferHydratedDocType<Item>['_id'], unknown, InferHydratedDocType<Item>> & InferHydratedDocType<Item>
                >:
              IsSchemaTypeFromBuiltinClass<Item> extends true ?
                Types.Array<ResolveHydratedPathType<Item, { enum: Options['enum'] }, TypeKey>> :
                IsItRecordAndNotAny<Item> extends true ?
                  Item extends Record<string, never> ?
                    Types.Array<ObtainHydratedDocumentPathType<Item, TypeKey>> :
                    Types.DocumentArray<
                      InferRawDocType<Item>,
                      Types.Subdocument<InferHydratedDocType<Item>['_id'], unknown, InferHydratedDocType<Item>> & InferHydratedDocType<Item>
                    > :
                  Types.Array<ObtainHydratedDocumentPathType<Item, TypeKey>>
          > :
          PathValueType extends StringSchemaDefinition ? PathEnumOrString<Options['enum']> :
            IfEquals<PathValueType, Schema.Types.String> extends true ? PathEnumOrString<Options['enum']> :
              IfEquals<PathValueType, String> extends true ? PathEnumOrString<Options['enum']> :
                PathValueType extends NumberSchemaDefinition ? Options['enum'] extends ReadonlyArray<any> ? Options['enum'][number] : number :
                  IfEquals<PathValueType, Schema.Types.Number> extends true ? number :
                    PathValueType extends DateSchemaDefinition ? NativeDate :
                      IfEquals<PathValueType, Schema.Types.Date> extends true ? NativeDate :
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
                                            IfEquals<PathValueType, BigInt> extends true ? bigint :
                                              PathValueType extends 'bigint' | 'BigInt' | typeof Schema.Types.BigInt | typeof BigInt ? bigint :
                                                PathValueType extends 'uuid' | 'UUID' | typeof Schema.Types.UUID ? UUID :
                                                  PathValueType extends 'double' | 'Double' | typeof Schema.Types.Double ? Types.Double :
                                                    IfEquals<PathValueType, Schema.Types.UUID> extends true ? Buffer :
                                                      PathValueType extends MapConstructor | 'Map' ? Map<string, ResolveHydratedPathType<Options['of']>> :
                                                        IfEquals<PathValueType, typeof Schema.Types.Map> extends true ? Map<string, ResolveHydratedPathType<Options['of']>> :
                                                          PathValueType extends ArrayConstructor ? any[] :
                                                            PathValueType extends typeof Schema.Types.Mixed ? any:
                                                              IfEquals<PathValueType, ObjectConstructor> extends true ? any:
                                                                IfEquals<PathValueType, {}> extends true ? any:
                                                                  PathValueType extends typeof SchemaType ? PathValueType['prototype'] :
                                                                    PathValueType extends Record<string, any> ? InferHydratedDocType<PathValueType, { typeKey: TypeKey }> :
                                                                      unknown,
  TypeHint>;
}
