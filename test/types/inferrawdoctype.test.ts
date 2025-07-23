import { InferRawDocType } from "mongoose";
import { expectType, expectError } from "tsd";

function gh14839() {
  const schemaDefinition = {
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
  };

  type UserType = InferRawDocType<typeof schemaDefinition>;
  expectType<{ email: string; password: string; dateOfBirth: Date }>(
    {} as UserType
  );
}

function optionality() {
  const schemaDefinition = {
    name: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Number,
    },
  };

  type UserType = InferRawDocType<typeof schemaDefinition>;
  expectType<{ name: string; dateOfBirth?: number | null | undefined }>(
    {} as UserType
  );
}

type SchemaOptionsWithTimestamps<t> = {
  typeKey: "type";
  id: true;
  _id: true;
  timestamps: t;
  versionKey: "__v";
};

function Timestamps() {
  const schemaDefinition = {
    name: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Number,
    },
  };

  type UserType = InferRawDocType<
    typeof schemaDefinition,
    SchemaOptionsWithTimestamps<true>
  >;
  expectType<{
    name: string;
    dateOfBirth?: number | null | undefined;
    createdAt: NativeDate;
    updatedAt: NativeDate;
  }>({} as UserType);
}
