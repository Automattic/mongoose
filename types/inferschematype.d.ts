import { Schema, InferSchemaType, SchemaType, SchemaTypeOptions } from 'mongoose';

declare module 'mongoose' {
  type ObtainDocumentType<DocDefinition, DocType = any> =
    DoesDocTypeExist<DocType> extends true ? DocType : {
      [K in keyof (RequiredPaths<DocDefinition> &
        OptionalPaths<DocDefinition>)]: ObtainDocumentPathType<DocDefinition[K]>;
    };

  type InferSchemaType<SchemaType> = SchemaType extends Schema<infer DocType, any, any, any, infer DocDefinition>
    ? DoesDocTypeExist<DocType> extends true ? DocType : DocDefinition
    : unknown;

  type ObtainSchemaGeneric<TSchema, name extends 'DocType' | 'M' | 'TInstanceMethods' | 'TQueryHelpers' | 'DocDefinition' | 'StaticsMethods'> =
    TSchema extends Schema<infer DocType, infer M, infer TInstanceMethods, infer TQueryHelpers, infer DocDefinition, infer StaticsMethods>
    ? { DocType: DocType, M: M, TInstanceMethods: TInstanceMethods, TQueryHelpers: TQueryHelpers, DocDefinition: DocDefinition, StaticsMethods: StaticsMethods }[name]
    : never;
}

type DoesDocTypeExist<DocType> = keyof DocType extends string ? true : false;

type RequiredPathBaseType = { required: true | [true, string | undefined] }

type PathWithTypePropertyBaseType = { type: any }

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

type ObtainDocumentPathType<PathValueType> = PathValueType extends Schema<any>
  ? InferSchemaType<PathValueType>
  : ResolvePathType<
    PathValueType extends PathWithTypePropertyBaseType ? PathValueType['type'] : PathValueType,
    PathValueType extends PathWithTypePropertyBaseType ? Omit<PathValueType, 'type'> : {}
  >;

type ResolvePathType<PathValueType, Options extends SchemaTypeOptions<PathValueType> = {}> =
PathValueType extends (infer Item)[] ? ResolvePathType<Item>[] :
PathValueType extends StringConstructor | 'string' | 'String' | typeof Schema.Types.String ? string :
PathValueType extends NumberConstructor | 'number' | 'Number' | typeof Schema.Types.Number ? number :
PathValueType extends DateConstructor | 'date' | 'Date' | typeof Schema.Types.Date ? Date :
PathValueType extends BufferConstructor | 'buffer' | 'Buffer' | typeof Schema.Types.Buffer ? Buffer :
PathValueType extends BooleanConstructor | 'boolean' | 'Boolean' | typeof Schema.Types.Boolean ? boolean :
PathValueType extends 'objectId' | 'ObjectId' | typeof Schema.Types.ObjectId ? Schema.Types.ObjectId :
PathValueType extends ObjectConstructor | typeof Schema.Types.Mixed ? Schema.Types.Mixed :
keyof PathValueType extends never ? Schema.Types.Mixed :
PathValueType extends MapConstructor ? Map<string, ResolvePathType<Options['of']>> :
PathValueType extends typeof SchemaType ? PathValueType['prototype'] :
PathValueType