import { Schema, InferSchemaType, SchemaType, SchemaTypeOptions, TypeKeyBaseType } from 'mongoose';

declare module 'mongoose' {

  type ObtainDocumentType<DocDefinition, EnforcedDocType = any, typeKey extends TypeKeyBaseType = DefaultTypeKey> =
    DoesDocTypeExist<EnforcedDocType> extends true ? EnforcedDocType : {
      [K in keyof (RequiredPaths<DocDefinition> &
        OptionalPaths<DocDefinition>)]: ObtainDocumentPathType<DocDefinition[K], typeKey>;
    };

  type InferSchemaType<SchemaType> = SchemaType extends Schema<infer DocType>
    ? DoesDocTypeExist<DocType> extends true ? DocType : ObtainSchemaGeneric<SchemaType, 'DocType'>
    : unknown;

  type ObtainSchemaGeneric<TSchema, name extends 'EnforcedDocType' | 'M' | 'TInstanceMethods' | 'TQueryHelpers' | 'PathTypeKey' |'DocType' | 'StaticMethods'> =
    TSchema extends Schema<infer EnforcedDocType, infer M, infer TInstanceMethods, infer TQueryHelpers, infer PathTypeKey, infer DocType, infer StaticMethods>
    ? { EnforcedDocType: EnforcedDocType, M: M, TInstanceMethods: TInstanceMethods, TQueryHelpers: TQueryHelpers, PathTypeKey:PathTypeKey, DocType: DocType, StaticMethods: StaticMethods }[name]
    : never;
}

type DoesDocTypeExist<DocType> = keyof DocType extends string ? true : false;

type RequiredPathBaseType = { required: true | [true, string | undefined] }

type PathWithTypePropertyBaseType<TypeKey extends TypeKeyBaseType > = { [k in TypeKey]: any }

type RequiredPathKeys<T> = {
  [K in keyof T]: T[K] extends RequiredPathBaseType ? K : never;
}[keyof T];

type RequiredPaths<T> = {
  [K in RequiredPathKeys<T>]: T[K];
};

type OptionalPathKeys<T> = {
  [K in keyof T]: T[K] extends RequiredPathBaseType ? never : K;
}[keyof T];

type OptionalPaths<T> = {
  [K in OptionalPathKeys<T>]?: T[K];
};

type ObtainDocumentPathType<PathValueType, typeKey extends TypeKeyBaseType> = PathValueType extends Schema<any>
  ? InferSchemaType<PathValueType>
  : ResolvePathType<
    PathValueType extends PathWithTypePropertyBaseType<typeKey> ? PathValueType[typeKey] : PathValueType,
    PathValueType extends PathWithTypePropertyBaseType<typeKey> ? Omit<PathValueType, typeKey> : {}
  >;

type PathEnumOrString<T> = T extends (infer E)[] ? E : T extends { values: any } ? PathEnumOrString<T['values']> : string;

type ResolvePathType<PathValueType, Options extends SchemaTypeOptions<PathValueType> = {}> =
PathValueType extends (infer Item)[] ? ResolvePathType<Item>[] :
PathValueType extends StringConstructor | 'string' | 'String' | typeof Schema.Types.String ? PathEnumOrString<Options['enum']> :
PathValueType extends NumberConstructor | 'number' | 'Number' | typeof Schema.Types.Number ? number :
PathValueType extends DateConstructor | 'date' | 'Date' | typeof Schema.Types.Date ? Date :
PathValueType extends BufferConstructor | 'buffer' | 'Buffer' | typeof Schema.Types.Buffer ? Buffer :
PathValueType extends BooleanConstructor | 'boolean' | 'Boolean' | typeof Schema.Types.Boolean ? boolean :
PathValueType extends 'objectId' | 'ObjectId' | typeof Schema.Types.ObjectId ? Schema.Types.ObjectId :
PathValueType extends ObjectConstructor | typeof Schema.Types.Mixed ? Schema.Types.Mixed :
keyof PathValueType extends never ? Schema.Types.Mixed :
PathValueType extends MapConstructor ? Map<string, ResolvePathType<Options['of']>> :
PathValueType extends typeof SchemaType ? PathValueType['prototype'] :
unknown