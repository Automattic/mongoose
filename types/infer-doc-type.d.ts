import { Schema } from 'mongoose';

type RequiredPropertyKeys<T> = {
  [K in keyof T]: T[K] extends { required: any } ? K : never;
}[keyof T];

type RequiredProperties<T> = {
  [K in RequiredPropertyKeys<T>]: T[K];
};

type OptionalPropertyKeys<T> = {
  [K in keyof T]: T[K] extends { required: any } ? never : K;
}[keyof T];

type OptionalProperties<T> = {
  [K in OptionalPropertyKeys<T>]?: T[K];
};

type ResolvePropertyType<PropertyValue> = PropertyValue extends (
  ...args: any
) => any
  ? ReturnType<PropertyValue>
  : PropertyValue;

export type ObtainDocumentPropertyType<PropertyValue> = ResolvePropertyType<
  PropertyValue extends { type: any }
    ? ResolvePropertyType<PropertyValue['type']>
    : PropertyValue
>;

export type ObtainDocumentType<T> = {
  [K in keyof (RequiredProperties<T> &
    OptionalProperties<T>)]: ObtainDocumentPropertyType<T[K]>;
};

export type InferSchemaType<SchemaType = {}> = SchemaType extends Schema<
	infer DocType
>
	? ObtainDocumentType<DocType>
	: unknown;

