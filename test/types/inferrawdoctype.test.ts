import mongoose, { InferRawDocType, type InferRawDocTypeWithout_id, type ResolveTimestamps, type Schema, type Types, FlattenMaps } from 'mongoose';
import { ExpectType } from './util/assertions';

function inferPojoType() {
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

  type UserType = InferRawDocTypeWithout_id<typeof schemaDefinition>;
  ExpectType<{ email: string, password: string, dateOfBirth: Date }>({} as UserType);
}
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

  type UserType = InferRawDocType< typeof schemaDefinition>;
  ExpectType<{ email: string, password: string, dateOfBirth: Date } & { _id: Types.ObjectId }>({} as UserType);
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
  ExpectType<{ name: string; dateOfBirth?: number | null | undefined } & { _id: Types.ObjectId }>({} as UserType);
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
  type ExpectedUserType = {
    name: string;
    dateOfBirth?: number | null | undefined;
  } & { createdAt: NativeDate; updatedAt: NativeDate; } & { _id: Types.ObjectId };
  ExpectType<ExpectedUserType>({} as UserType);

  type Resolved = ResolveTimestamps<
    { foo: true },
    {
      timestamps: {
        createdAt: 'bar';
      };
    }
  >;

  ExpectType<Resolved>(
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

  type ExpectedActualType = {
    lowercaseString?: string | null | undefined;
    uppercaseString?: string | null | undefined;
    stringConstructor?: string | null | undefined;
    schemaConstructor?: string | null | undefined;
    stringInstance?: string | null | undefined;
    schemaInstance?: string | null | undefined;
  } & { _id: Types.ObjectId };
  ExpectType<ExpectedActualType>({} as Actual);
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

  type ExpectedActualType = {
    numberString?: number | null | undefined;
    // these should not fallback to Boolean, which has no methods
    objectIdConstructor?: Types.ObjectId | null | undefined;
    objectIdInstance?: Types.ObjectId | null | undefined;
  } & { _id: Types.ObjectId };
  ExpectType<ExpectedActualType>({} as Actual);
}

function HandlesAny() {
  type ActualShallow = InferRawDocType<any>;
  ExpectType<{ [x: PropertyKey]: any } & { _id: unknown }>({} as ActualShallow);
  type ActualNested = InferRawDocType<Record<string, any>>;
  ExpectType<{ [x: string]: any } & { _id: unknown }>({} as ActualNested);
}

function gh15699() {
  const schema = { unTypedArray: [] } as const;

  type TSchema = InferRawDocType<typeof schema>;
  ExpectType<any[] | null | undefined>({} as unknown as TSchema['unTypedArray']);
}

function gh13772RawType() {
  const childSchema = new mongoose.Schema({ name: String });

  const parentSchemaDef = {
    children: [childSchema],
    child: childSchema
  };

  type RawParentDoc = InferRawDocType<typeof parentSchemaDef>;

  ExpectType<{
    children:(FlattenMaps<{ name?: string | null | undefined }> & { _id: Types.ObjectId })[];
    child?: (FlattenMaps<{ name?: string | null | undefined }> & { _id: Types.ObjectId }) | null | undefined;
      } & { _id: Types.ObjectId }>({} as RawParentDoc);
}

function gh13772WithIdFalse() {
  const childSchema = new mongoose.Schema({ name: String }, { _id: false });

  const parentSchemaDef = {
    children: [childSchema],
    child: childSchema
  };

  type RawParentDoc = InferRawDocType<typeof parentSchemaDef>;

  ExpectType<{
    children: FlattenMaps<{ name?: string | null | undefined }>[];
    child?: FlattenMaps<{ name?: string | null | undefined }> | null | undefined;
  } & { _id: Types.ObjectId }>({} as RawParentDoc);
}

function gh13772WithSchemaCreate() {
  const childSchema = mongoose.Schema.create({ name: String });

  const parentSchemaDef = {
    children: [childSchema],
    child: childSchema
  };

  type RawParentDoc = InferRawDocType<typeof parentSchemaDef>;

  ExpectType<{
    children:({ name?: string | null | undefined } & { _id: Types.ObjectId })[];
    child?: ({ name?: string | null | undefined } & { _id: Types.ObjectId }) | null | undefined;
      } & { _id: Types.ObjectId }>({} as RawParentDoc);
}

function gh13772WithSchemaCreateIdFalse() {
  const childSchema = mongoose.Schema.create({ name: String }, { _id: false });

  const parentSchemaDef = {
    children: [childSchema],
    child: childSchema
  };

  type RawParentDoc = InferRawDocType<typeof parentSchemaDef>;

  // Schema.create with _id: false - child subdocs should not have _id
  ExpectType<{
    children: { name?: string | null | undefined }[];
    child?: { name?: string | null | undefined } | null | undefined;
  } & { _id: Types.ObjectId }>({} as RawParentDoc);
}

function gh13772WithExplicitDocType() {
  type ChildDocType = { name?: string | null };
  const childSchema = new mongoose.Schema<ChildDocType>({ name: String });

  const parentSchemaDef = {
    children: [childSchema],
    child: childSchema
  };

  type RawParentDoc = InferRawDocType<typeof parentSchemaDef>;

  // Explicit DocType is used directly as RawDocType
  ExpectType<{
    children: ChildDocType[];
    child?: ChildDocType | null | undefined;
  } & { _id: Types.ObjectId }>({} as RawParentDoc);
}

function gh13772WithExplicitDocTypeIdFalse() {
  type ChildDocType = { name?: string | null };
  const childSchema = new mongoose.Schema<ChildDocType>({ name: String }, { _id: false });

  const parentSchemaDef = {
    children: [childSchema],
    child: childSchema
  };

  type RawParentDoc = InferRawDocType<typeof parentSchemaDef>;

  // Explicit DocType is used directly as RawDocType
  ExpectType<{
    children: ChildDocType[];
    child?: ChildDocType | null | undefined;
  } & { _id: Types.ObjectId }>({} as RawParentDoc);
}

function gh15988() {
  // Test nested path (no type key) - should NOT have _id
  const locationSchemaDef = {
    name: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: {
        type: Number,
        required: true
      },
      longitude: {
        type: Number,
        required: true
      }
    }
  } as const;

  type Location = InferRawDocType<typeof locationSchemaDef>;

  // Nested paths should not have _id added
  expectType<{
    name: string;
    coordinates?: { latitude: number; longitude: number } | null | undefined;
  } & { _id: Types.ObjectId }>({} as Location);

  // Test subdocument (has type key with object value) - should have _id
  const schemaDef2 = {
    name: {
      type: String,
      required: true
    },
    data: {
      type: {
        role: String
      },
      default: {}
    }
  } as const;

  type Doc2 = InferRawDocType<typeof schemaDef2>;

  // Subdocuments (defined with type: {...}) should have _id added
  expectType<{
    name: string;
    data: { role?: string | null | undefined } & { _id: Types.ObjectId };
  } & { _id: Types.ObjectId }>({} as Doc2);

  // Test subdocument with _id: false - should NOT have _id
  const schemaDef3 = {
    name: {
      type: String,
      required: true
    },
    coordinates: {
      type: {
        latitude: {
          type: Number,
          required: true
        },
        longitude: {
          type: Number,
          required: true
        }
      },
      required: true,
      _id: false
    }
  } as const;

  type Doc3 = InferRawDocType<typeof schemaDef3>;

  // Subdocuments with _id: false should not have _id added
  expectType<{
    name: string;
    coordinates: { latitude: number; longitude: number };
  } & { _id: Types.ObjectId }>({} as Doc3);

  // Test subdocument (has type key with object value) with no options - should have _id
  const schemaDef4 = {
    name: {
      type: String,
      required: true
    },
    data: {
      type: {
        role: String
      }
    }
  } as const;

  type Doc4 = InferRawDocType<typeof schemaDef4>;

  // Subdocuments (defined with type: {...}) should have _id added, but optional since no `required` or `default`
  expectType<{
    name: string;
    data?:({ role?: string | null | undefined } & { _id: Types.ObjectId }) | null | undefined;
      } & { _id: Types.ObjectId }>({} as Doc4);

  // Test 1: Array of subdocuments - should have _id
  const schemaDef5 = {
    users: [{
      name: { type: String, required: true },
      email: String
    }]
  } as const;

  type Doc5 = InferRawDocType<typeof schemaDef5>;

  // Arrays of subdocuments should have _id added to each element
  expectType<{
    users?: Array<{ name: string; email?: string | null | undefined } & { _id: Types.ObjectId }> | null | undefined;
  } & { _id: Types.ObjectId }>({} as Doc5);

  // Test 2: Array of nested paths (no type key in array element) - should have _id (arrays are always subdocs)
  const schemaDef6 = {
    locations: [{
      latitude: Number,
      longitude: Number
    }]
  } as const;

  type Doc6 = InferRawDocType<typeof schemaDef6>;

  // Arrays of objects are subdocuments, so they get _id
  expectType<{
    locations?: Array<{ latitude?: number | null | undefined; longitude?: number | null | undefined } & { _id: Types.ObjectId }> | null | undefined;
  } & { _id: Types.ObjectId }>({} as Doc6);

  // Test 3: Custom typeKey - nested path should not have _id
  const schemaDef7 = {
    name: {
      $type: String,
      required: true
    },
    coordinates: {
      latitude: {
        $type: Number,
        required: true
      },
      longitude: {
        $type: Number,
        required: true
      }
    }
  } as const;

  type Doc7 = InferRawDocType<typeof schemaDef7, { typeKey: '$type' }>;

  // With custom typeKey, nested paths (no $type key) should still not have _id
  expectType<{
    name: string;
    coordinates?: { latitude: number; longitude: number } | null | undefined;
  } & { _id: Types.ObjectId }>({} as Doc7);

  // Test 4: Custom typeKey - subdocument should have _id
  const schemaDef8 = {
    name: {
      $type: String,
      required: true
    },
    data: {
      $type: {
        role: String
      },
      default: {}
    }
  } as const;

  type Doc8 = InferRawDocType<typeof schemaDef8, { typeKey: '$type' }>;

  // With custom typeKey, subdocuments (with $type key) should have _id
  expectType<{
    name: string;
    data: { role?: string | null | undefined } & { _id: Types.ObjectId };
  } & { _id: Types.ObjectId }>({} as Doc8);
}
