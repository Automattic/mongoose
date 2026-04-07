import mongoose, { InferRawDocType, type InferRawDocTypeWithout_id, type ResolveTimestamps, type Schema, type Types, FlattenMaps } from 'mongoose';
import { expect } from 'tstyche';

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

  expect<InferRawDocTypeWithout_id<typeof schemaDefinition>>().type.toBe<{
    email: string,
    password: string,
    dateOfBirth: Date
  }>();
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

  expect<InferRawDocType<typeof schemaDefinition>>().type.toBe<{
    email: string,
    password: string,
    dateOfBirth: Date,
    _id: Types.ObjectId }>();
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

  expect<InferRawDocType<typeof schemaDefinition>>().type.toBe<{
    name: string;
    dateOfBirth?: number | null | undefined,
    _id: Types.ObjectId
  }>();
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

  expect<InferRawDocType<typeof schemaDefinition, SchemaOptionsWithTimestamps<true>>>().type.toBe<{
    name: string;
    dateOfBirth?: number | null | undefined;
    createdAt: NativeDate; updatedAt: NativeDate;
    _id: Types.ObjectId }
  >();

  type Resolved = ResolveTimestamps<
    { foo: true },
    {
      timestamps: {
        createdAt: 'bar';
      };
    }
  >;

  expect<Resolved>().type.toBe<{ foo: true; bar: NativeDate }>();
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

  expect<Actual>().type.toBe<{
    lowercaseString?: string | null | undefined;
    uppercaseString?: string | null | undefined;
    stringConstructor?: string | null | undefined;
    schemaConstructor?: string | null | undefined;
    stringInstance?: string | null | undefined;
    schemaInstance?: string | null | undefined;
    _id: Types.ObjectId
  }>();
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

  expect<Actual>().type.toBe<{
    numberString?: number | null | undefined;
    // these should not fallback to Boolean, which has no methods
    objectIdConstructor?: Types.ObjectId | null | undefined;
    objectIdInstance?: Types.ObjectId | null | undefined;
    _id: Types.ObjectId
  }>();
}

function HandlesAny() {
  expect<InferRawDocType<any>>().type.toBe<{ [x: PropertyKey]: any; _id: unknown }>();
  expect<InferRawDocType<Record<string, any>>>().type.toBe<{ [x: string]: any; _id: unknown }>();
}

function gh15699() {
  const schema = { unTypedArray: [] } as const;

  expect<InferRawDocType<typeof schema>['unTypedArray']>().type.toBe<any[] | null | undefined>();
}

function gh13772RawType() {
  const childSchema = new mongoose.Schema({ name: String });

  const parentSchemaDef = {
    children: [childSchema],
    child: childSchema
  };

  expect<InferRawDocType<typeof parentSchemaDef>>().type.toBe<{
    children:(FlattenMaps<{ name?: string | null | undefined }> & { _id: Types.ObjectId })[];
    child?: (FlattenMaps<{ name?: string | null | undefined }> & { _id: Types.ObjectId }) | null | undefined;
    _id: Types.ObjectId }>();
}

function gh13772WithIdFalse() {
  const childSchema = new mongoose.Schema({ name: String }, { _id: false });

  const parentSchemaDef = {
    children: [childSchema],
    child: childSchema
  };

  expect<InferRawDocType<typeof parentSchemaDef>>().type.toBe<{
    children: FlattenMaps<{ name?: string | null | undefined }>[];
    child?: FlattenMaps<{ name?: string | null | undefined }> | null | undefined;
    _id: Types.ObjectId }>();
}

function gh13772WithSchemaCreate() {
  const childSchema = mongoose.Schema.create({ name: String });

  const parentSchemaDef = {
    children: [childSchema],
    child: childSchema
  };

  expect<InferRawDocType<typeof parentSchemaDef>>().type.toBe<{
    children:({ name?: string | null | undefined; _id: Types.ObjectId })[];
    child?: ({ name?: string | null | undefined; _id: Types.ObjectId }) | null | undefined;
    _id: Types.ObjectId }>();
}

function gh13772WithSchemaCreateIdFalse() {
  const childSchema = mongoose.Schema.create({ name: String }, { _id: false });

  const parentSchemaDef = {
    children: [childSchema],
    child: childSchema
  };

  // Schema.create with _id: false - child subdocs should not have _id
  expect<InferRawDocType<typeof parentSchemaDef>>().type.toBe<{
    children: { name?: string | null | undefined }[];
    child?: { name?: string | null | undefined } | null | undefined;
    _id: Types.ObjectId }>();
}

function gh13772WithExplicitDocType() {
  type ChildDocType = { name?: string | null };
  const childSchema = new mongoose.Schema<ChildDocType>({ name: String });

  const parentSchemaDef = {
    children: [childSchema],
    child: childSchema
  };

  // Explicit DocType is used directly as RawDocType
  expect<InferRawDocType<typeof parentSchemaDef>>().type.toBe<{
    children: ChildDocType[];
    child?: ChildDocType | null | undefined;
    _id: Types.ObjectId }>();
}

function gh13772WithExplicitDocTypeIdFalse() {
  type ChildDocType = { name?: string | null };
  const childSchema = new mongoose.Schema<ChildDocType>({ name: String }, { _id: false });

  const parentSchemaDef = {
    children: [childSchema],
    child: childSchema
  };

  // Explicit DocType is used directly as RawDocType
  expect<InferRawDocType<typeof parentSchemaDef>>().type.toBe<{
    children: ChildDocType[];
    child?: ChildDocType | null | undefined;
    _id: Types.ObjectId }>();
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

  // Nested paths should not have _id added
  expect<InferRawDocType<typeof locationSchemaDef>>().type.toBe<{
    name: string;
    coordinates?: { latitude: number; longitude: number } | null | undefined;
    _id: Types.ObjectId }>();

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

  // Subdocuments (defined with type: {...}) should have _id added
  expect<InferRawDocType<typeof schemaDef2>>().type.toBe<{
    name: string;
    data: { role?: string | null | undefined; _id: Types.ObjectId };
    _id: Types.ObjectId }>();

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

  // Subdocuments with _id: false should not have _id added
  expect<InferRawDocType<typeof schemaDef3>>().type.toBe<{
    name: string;
    coordinates: { latitude: number; longitude: number };
    _id: Types.ObjectId }>();

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

  // Subdocuments (defined with type: {...}) should have _id added, but optional since no `required` or `default`
  expect<InferRawDocType<typeof schemaDef4>>().type.toBe<{
    name: string;
    data?:({ role?: string | null | undefined; _id: Types.ObjectId }) | null | undefined;
    _id: Types.ObjectId }>();

  // Test 1: Array of subdocuments - should have _id
  const schemaDef5 = {
    users: [{
      name: { type: String, required: true },
      email: String
    }]
  } as const;

  // Arrays of subdocuments should have _id added to each element
  expect<InferRawDocType<typeof schemaDef5>>().type.toBe<{
    users?: Array<{ name: string; email?: string | null | undefined; _id: Types.ObjectId }> | null | undefined;
    _id: Types.ObjectId }>();

  // Test 2: Array of nested paths (no type key in array element) - should have _id (arrays are always subdocs)
  const schemaDef6 = {
    locations: [{
      latitude: Number,
      longitude: Number
    }]
  } as const;

  // Arrays of objects are subdocuments, so they get _id
  expect<InferRawDocType<typeof schemaDef6>>().type.toBe<{
    locations?: Array<{ latitude?: number | null | undefined; longitude?: number | null | undefined; _id: Types.ObjectId }> | null | undefined;
    _id: Types.ObjectId }>();

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

  // With custom typeKey, nested paths (no $type key) should still not have _id
  expect<InferRawDocType<typeof schemaDef7, { typeKey: '$type' }>>().type.toBe<{
    name: string;
    coordinates?: { latitude: number; longitude: number } | null | undefined;
    _id: Types.ObjectId }>();

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

  // With custom typeKey, subdocuments (with $type key) should have _id
  expect<InferRawDocType<typeof schemaDef8, { typeKey: '$type' }>>().type.toBe<{
    name: string;
    data: { role?: string | null | undefined; _id: Types.ObjectId };
    _id: Types.ObjectId }>();
}

async function gh16053() {
  const schemaDefinition = new mongoose.Schema({
    email: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true
    },
    dateOfBirth: {
      type: Date,
      required: true
    }
  });

  const TestModel = mongoose.model('Test', schemaDefinition);
  type TestType = mongoose.InferRawDocTypeFromSchema<typeof schemaDefinition>;

  async function queryById(id: string) {
    TestModel.findById(id).lean().then(result => {
      if (result) {
        expect(result).type.toBe<FlattenMaps<TestType> & { _id: Types.ObjectId, __v: number }>();
        console.log(result._id);
      }
    });
  }
}
