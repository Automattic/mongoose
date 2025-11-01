import { InferRawDocType, type InferSchemaType, type ResolveTimestamps, type Schema, type Types } from 'mongoose';
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
    }
  };

  type UserType = InferRawDocType<typeof schemaDefinition>;
  expectType<{ email: string; password: string; dateOfBirth: Date }>({} as UserType);
}

function optionality() {
  const schemaDefinition = {
    name: {
      type: String,
      required: true
    },
    dateOfBirth: {
      type: Number
    }
  };

  type UserType = InferRawDocType<typeof schemaDefinition>;
  expectType<{ name: string; dateOfBirth?: number | null | undefined }>({} as UserType);
}

type SchemaOptionsWithTimestamps<t> = {
  typeKey: 'type';
  id: true;
  _id: true;
  timestamps: t;
  versionKey: '__v';
};

function Timestamps() {
  const schemaDefinition = {
    name: {
      type: String,
      required: true
    },
    dateOfBirth: {
      type: Number
    }
  };

  type UserType = InferRawDocType<typeof schemaDefinition, SchemaOptionsWithTimestamps<true>>;
  expectType<{
    name: string;
    dateOfBirth?: number | null | undefined;
    createdAt: NativeDate;
    updatedAt: NativeDate;
  }>({} as UserType);

  type Resolved = ResolveTimestamps<
    { foo: true },
    {
      timestamps: {
        createdAt: 'bar';
      };
    }
  >;

  expectType<Resolved>(
    {} as {
      foo: true;
      bar: NativeDate;
    }
  );
}

function DefinitionTypes() {
  type Actual = InferRawDocType<{
    lowercaseString: 'string';
    uppercaseString: 'String';
    stringConstructor: typeof String;
    schemaConstructor: typeof Schema.Types.String;
    stringInstance: String;
    schemaInstance: Schema.Types.String;
  }>;

  expectType<{
    lowercaseString?: string | null | undefined;
    uppercaseString?: string | null | undefined;
    stringConstructor?: string | null | undefined;
    schemaConstructor?: string | null | undefined;
    stringInstance?: string | null | undefined;
    schemaInstance?: string | null | undefined;
  }>({} as Actual);
}

function MoreDefinitionTypes() {
  type Actual = InferRawDocType<{
    // ensure string literals are not inferred as string
    numberString: 'number';
    // ensure a schema constructor with methods is not assignable to an empty one
    objectIdConstructor: typeof Schema.Types.ObjectId;
    // ensure a schema instance with methods is not assignable to an empty one
    objectIdInstance: Schema.Types.ObjectId;
  }>;

  expectType<{
    numberString?: number | null | undefined;
    // these should not fallback to Boolean, which has no methods
    objectIdConstructor?: Types.ObjectId | null | undefined;
    objectIdInstance?: Types.ObjectId | null | undefined;
  }>({} as Actual);
}

function HandlesAny() {
  type ActualShallow = InferRawDocType<any>;
  expectType<{ [x: PropertyKey]: any }>({} as ActualShallow);
  type ActualNested = InferRawDocType<Record<string, any>>;
  expectType<{ [x: string]: any }>({} as ActualNested);
}

function gh15699() {
  const schema = { unTypedArray: [] } as const;

  type TSchema = InferRawDocType<typeof schema>;
  expectType<any[] | null | undefined>({} as unknown as TSchema['unTypedArray']);
}
