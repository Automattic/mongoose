import { Schema, InferSchemaType } from 'mongoose';

declare module 'mongoose' {
  type ObtainDocumentType<DocDefinition, DocType = any> =
    DoesDocTypeExist<DocType> extends true ? DocType : {
      [K in keyof (RequiredProperties<DocDefinition> &
        OptionalProperties<DocDefinition>)]: ObtainDocumentPropertyType<DocDefinition[K]>;
    };

  type InferSchemaType<SchemaType> = SchemaType extends Schema<infer DocType, any, any, any, infer DocDefinition>
    ? DoesDocTypeExist<DocType> extends true ? DocType : DocDefinition
    : unknown;

  type ObtainSchemaGeneric<TSchema, name extends 'DocType' | 'M' | 'TInstanceMethods' | 'TQueryHelpers' | 'DocDefinition' | 'StaticsMethods'> =
    TSchema extends Schema<infer DocType, infer M, infer TInstanceMethods, infer TQueryHelpers, infer DocDefinition, infer StaticsMethods>
    ? { DocType: DocType, M: M, TInstanceMethods: TInstanceMethods, TQueryHelpers: TQueryHelpers, DocDefinition: DocDefinition, StaticsMethods: StaticsMethods }[name]
    : never;
}

type RequiredPropertyKeys<T> = {
  [K in keyof T]: T[K] extends { required: true | [true, string | undefined] } ? K : never;
}[keyof T];

type RequiredProperties<T> = {
  [K in RequiredPropertyKeys<T>]: T[K];
};

type OptionalPropertyKeys<T> = {
  [K in keyof T]: T[K] extends { required: true | [true, string | undefined] } ? never : K;
}[keyof T];

type OptionalProperties<T> = {
  [K in OptionalPropertyKeys<T>]?: T[K];
};

type ResolvePropertyType<PropertyValue> = PropertyValue extends (
  ...args: any
) => any
  ? ReturnType<PropertyValue>
  : PropertyValue;

type ObtainDocumentPropertyType<PropertyValue> = PropertyValue extends Schema<any>
  ? InferSchemaType<PropertyValue>
  : ResolvePropertyType<PropertyValue extends { type: any }
    ? ResolvePropertyType<PropertyValue['type']>
    : PropertyValue
>;

type DoesDocTypeExist<DocType> = keyof DocType extends string ? true : false;