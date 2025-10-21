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
    IsNotNever<TypeHint> extends true ? TypeHint
    : PathValueType extends Schema<any, any, any, any, any, any, any, any, infer THydratedDocumentType> ?
      THydratedDocumentType :
        PathValueType extends AnyArray<infer Item> ?
          IfEquals<Item, never, any[], Item extends Schema<infer EmbeddedRawDocType, any, any, any, any, any, any, any, infer EmbeddedHydratedDocType extends AnyObject, infer TSchemaDefition> ?
            IsItRecordAndNotAny<EmbeddedRawDocType> extends true ?
              Types.DocumentArray<EmbeddedRawDocType, Types.Subdocument<EmbeddedHydratedDocType['_id'], unknown, EmbeddedHydratedDocType> & EmbeddedHydratedDocType> :
              Types.DocumentArray<InferRawDocType<TSchemaDefition>, Types.Subdocument<InferHydratedDocType<TSchemaDefition>['_id'], unknown, InferHydratedDocType<TSchemaDefition>> & InferHydratedDocType<TSchemaDefition>> :
            Item extends Record<TypeKey, any> ?
              Item[TypeKey] extends Function | String ?
                Types.Array<ObtainHydratedDocumentPathType<Item, TypeKey>> :
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
          >
    : PathValueType extends StringSchemaDefinition ? PathEnumOrString<Options['enum']>
    : IfEquals<PathValueType, String> extends true ? PathEnumOrString<Options['enum']>
    : PathValueType extends NumberSchemaDefinition ? Options['enum'] extends ReadonlyArray<any> ? Options['enum'][number] : number
    : PathValueType extends DateSchemaDefinition ? NativeDate
    : PathValueType extends BufferSchemaDefinition ? Buffer
    : PathValueType extends BooleanSchemaDefinition ? boolean
    : PathValueType extends ObjectIdSchemaDefinition ? Types.ObjectId
    : PathValueType extends Decimal128SchemaDefinition ? Types.Decimal128
    : PathValueType extends BigintSchemaDefinition ? bigint
    : PathValueType extends UuidSchemaDefinition ? UUID
    : PathValueType extends DoubleSchemaDefinition ? Types.Double
    : PathValueType extends typeof Schema.Types.Mixed ? any
    : PathValueType extends MapSchemaDefinition ? Map<string, ObtainHydratedDocumentPathType<Options['of']>>
    : IfEquals<PathValueType, ObjectConstructor> extends true ? any
    : PathValueType extends typeof SchemaType ? PathValueType['prototype']
    : PathValueType extends ArrayConstructor ? Types.Array<any>
    : PathValueType extends Record<string, any> ? InferHydratedDocType<PathValueType, { typeKey: TypeKey }>
    : unknown;
}
