import {
  IsSchemaTypeFromBuiltinClass,
  PathEnumOrString,
  OptionalPaths,
  RequiredPaths,
  IsPathRequired
} from './inferschematype';
import { Binary, UUID } from 'mongodb';

declare module 'mongoose' {
  export type InferRawDocTypeFromSchema<TSchema extends Schema<any>> = IsItRecordAndNotAny<ObtainSchemaGeneric<TSchema, 'EnforcedDocType'>> extends true
    ? ObtainSchemaGeneric<TSchema, 'EnforcedDocType'>
    : FlattenMaps<SubdocsToPOJOs<ObtainSchemaGeneric<TSchema, 'DocType'>>>;

  export type InferRawDocTypeWithout_id<
    SchemaDefinition,
    TSchemaOptions extends Record<any, any> = DefaultSchemaOptions,
    TTransformOptions = { bufferToBinary: false }
  > = ApplySchemaOptions<{
    [
    K in keyof (RequiredPaths<SchemaDefinition, TSchemaOptions['typeKey']> &
    OptionalPaths<SchemaDefinition, TSchemaOptions['typeKey']>)
    ]: IsPathRequired<SchemaDefinition[K], TSchemaOptions['typeKey']> extends true
      ? ObtainRawDocumentPathType<SchemaDefinition[K], TSchemaOptions['typeKey'], TTransformOptions>
      : ObtainRawDocumentPathType<SchemaDefinition[K], TSchemaOptions['typeKey'], TTransformOptions> | null;
  }, TSchemaOptions>;

  export type InferRawDocType<
    SchemaDefinition,
    TSchemaOptions extends Record<any, any> = DefaultSchemaOptions,
    TTransformOptions = { bufferToBinary: false }
  > = TSchemaOptions extends { _id: false }
    ? InferRawDocTypeWithout_id<SchemaDefinition, TSchemaOptions, TTransformOptions>
    : Require_id<InferRawDocTypeWithout_id<SchemaDefinition, TSchemaOptions, TTransformOptions>>;

  /**
   * @summary Allows users to optionally choose their own type for a schema field for stronger typing.
   * Make sure to check for `any` because `T extends { __rawDocTypeHint: infer U }` will infer `unknown` if T is `any`.
   */
  type RawDocTypeHint<T> = IsAny<T> extends true ? never
    : T extends { __rawDocTypeHint: infer U } ? U: never;

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
     TTransformOptions,
     RawDocTypeHint<PathValueType>
   >;

  type neverOrAny = ' ~neverOrAny~';

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
   type ResolveRawPathType<
       PathValueType,
       Options extends SchemaTypeOptions<PathValueType> = {},
       TypeKey extends string = DefaultSchemaOptions['typeKey'],
       TTransformOptions = { bufferToBinary: false },
       TypeHint = never
     > =
       IsNotNever<TypeHint> extends true ? TypeHint
       : [PathValueType] extends [neverOrAny] ? PathValueType
     : PathValueType extends Schema<infer RawDocType, any, any, any, any, any, infer TSchemaOptions, infer DocType, any, infer TSchemaDefinition> ?
         IsItRecordAndNotAny<RawDocType> extends true ?
         RawDocType :
         string extends keyof TSchemaDefinition ?
          TSchemaOptions extends { _id: false } ?
            FlattenMaps<SubdocsToPOJOs<DocType>> :
            Require_id<FlattenMaps<SubdocsToPOJOs<DocType>>> :
          InferRawDocType<TSchemaDefinition, TSchemaOptions & Record<any, any>, TTransformOptions>
       : PathValueType extends ReadonlyArray<infer Item> ?
         IfEquals<Item, never> extends true ? any[]
         : Item extends Schema<infer RawDocType, any, any, any, any, any, infer TSchemaOptions, infer DocType, any, infer TSchemaDefinition> ?
           // If Item is a schema, infer its type.
           Array<IsItRecordAndNotAny<RawDocType> extends true ?
            RawDocType :
            string extends keyof TSchemaDefinition ?
              TSchemaOptions extends { _id: false } ?
                FlattenMaps<SubdocsToPOJOs<DocType>> :
                Require_id<FlattenMaps<SubdocsToPOJOs<DocType>>> :
              InferRawDocType<TSchemaDefinition, TSchemaOptions & Record<any, any>, TTransformOptions>>
         : TypeKey extends keyof Item ?
           Item[TypeKey] extends Function | String ?
             // If Item has a type key that's a string or a callable, it must be a scalar,
             // so we can directly obtain its path type.
             ObtainRawDocumentPathType<Item, TypeKey, TTransformOptions>[]
           : // If the type key isn't callable, then this is an array of objects, in which case
             // we need to call InferRawDocType to correctly infer its type.
             Array<InferRawDocType<Item, DefaultSchemaOptions, TTransformOptions>>
         : IsSchemaTypeFromBuiltinClass<Item> extends true ? ResolveRawPathType<Item, { enum: Options['enum'] }, TypeKey, TTransformOptions>[]
         : IsItRecordAndNotAny<Item> extends true ?
           Item extends Record<string, never> ?
             ObtainRawDocumentPathType<Item, TypeKey, TTransformOptions>[]
           : Array<InferRawDocType<Item, DefaultSchemaOptions, TTransformOptions>>
         : ObtainRawDocumentPathType<Item, TypeKey, TTransformOptions>[]
       : PathValueType extends StringSchemaDefinition ? PathEnumOrString<Options['enum']>
       : IfEquals<PathValueType, String> extends true ? PathEnumOrString<Options['enum']>
       : PathValueType extends NumberSchemaDefinition ?
         Options['enum'] extends ReadonlyArray<any> ?
           Options['enum'][number]
         : number
       : PathValueType extends DateSchemaDefinition ? NativeDate
       : PathValueType extends BufferSchemaDefinition ? (TTransformOptions extends { bufferToBinary: true } ? Binary : Buffer)
       : PathValueType extends BooleanSchemaDefinition ? boolean
       : PathValueType extends ObjectIdSchemaDefinition ? Types.ObjectId
       : PathValueType extends Decimal128SchemaDefinition ? Types.Decimal128
       : PathValueType extends BigintSchemaDefinition ? bigint
       : PathValueType extends UuidSchemaDefinition ? Types.UUID
       : PathValueType extends MapSchemaDefinition ? Record<string, ObtainRawDocumentPathType<Options['of'], TypeKey, TTransformOptions>>
       : PathValueType extends DoubleSchemaDefinition ? Types.Double
       : PathValueType extends UnionSchemaDefinition ?
         ResolveRawPathType<Options['of'] extends ReadonlyArray<infer Item> ? Item : never>
       : PathValueType extends ArrayConstructor ? any[]
       : PathValueType extends typeof Schema.Types.Mixed ? any
       : IfEquals<PathValueType, ObjectConstructor> extends true ? any
       : IfEquals<PathValueType, {}> extends true ? any
       : PathValueType extends typeof SchemaType ? PathValueType['prototype']
       : PathValueType extends Record<string, any> ? InferRawDocType<PathValueType>
       : unknown;
}
