import { InferRawDocType, Schema, AutoInferredSchema } from 'mongoose';
import { expectType, expectError } from 'tsd';

function gh14839() {
  const schemaDefinition = {
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    dateOfBirth: {
      type: Date,
      required: true
    },
    subdoc: new AutoInferredSchema({
      name: { type: String, required: true }
    }),
    docArr: [new AutoInferredSchema({ test: { type: String, required: true } })]
  };

  type UserType = InferRawDocType<typeof schemaDefinition>;
  expectType<{
    email: string,
    password: string,
    dateOfBirth: Date,
    subdoc?: { name: string } | null,
    docArr: { test: string }[]
  }>({} as UserType);
}

function gh14954() {
  const schemaDefinition = {
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    dateOfBirth: {
      type: Date,
      required: true
    },
    subdoc: new AutoInferredSchema({
      name: { type: String, required: true },
      l2: new AutoInferredSchema({
        myProp: { type: Number, required: true }
      })
    }),
    docArr: [new AutoInferredSchema({ test: { type: String, required: true } })]
  };

  type UserType = InferRawDocType<typeof schemaDefinition>;
  expectType<{
    email: string,
    password: string,
    dateOfBirth: Date,
    subdoc?: { name: string, l2?: { myProp: number } | null } | null,
    docArr: { test: string }[]
  }>({} as UserType);
}
