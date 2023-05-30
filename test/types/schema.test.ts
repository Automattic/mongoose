import {
  Schema,
  Document,
  SchemaDefinition,
  SchemaTypeOptions,
  Model,
  Types,
  InferSchemaType,
  SchemaType,
  Query,
  model,
  HydratedDocument,
  ResolveSchemaOptions,
  ObtainDocumentType,
  ObtainSchemaGeneric
} from 'mongoose';
import { expectType, expectError, expectAssignable } from 'tsd';
import { ObtainDocumentPathType, ResolvePathType } from '../../types/inferschematype';

enum Genre {
  Action,
  Adventure,
  Comedy
}

interface Actor {
  name: string,
  age: number
}
const actorSchema =
  new Schema<Actor & Document, Model<Actor & Document>, Actor>({ name: { type: String }, age: { type: Number } });

interface Movie {
  title?: string,
  featuredIn?: string,
  rating?: number,
  genre?: string,
  actionIntensity?: number,
  status?: string,
  actors: Actor[]
}

const movieSchema = new Schema<Document & Movie, Model<Document & Movie>>({
  title: {
    type: String,
    index: 'text'
  },
  featuredIn: {
    type: String,
    enum: ['Favorites', null],
    default: null
  },
  rating: {
    type: Number,
    required: [true, 'Required'],
    min: [0, 'MinValue'],
    max: [5, 'MaxValue']
  },
  genre: {
    type: String,
    enum: Genre,
    required: true
  },
  actionIntensity: {
    type: Number,
    required: [
      function(this: { genre: Genre }) {
        return this.genre === Genre.Action;
      },
      'Action intensity required for action genre'
    ]
  },
  status: {
    type: String,
    enum: {
      values: ['Announced', 'Released'],
      message: 'Invalid value for `status`'
    }
  },
  actors: {
    type: [actorSchema],
    default: undefined
  }
});

movieSchema.index({ status: 1, 'actors.name': 1 });
movieSchema.index({ title: 'text' }, {
  weights: { title: 10 }
});
movieSchema.index({ rating: -1 });
movieSchema.index({ title: 1 }, { unique: true });
movieSchema.index({ tile: 'ascending' });
movieSchema.index({ tile: 'asc' });
movieSchema.index({ tile: 'descending' });
movieSchema.index({ tile: 'desc' });
movieSchema.index({ tile: 'hashed' });
movieSchema.index({ tile: 'geoHaystack' });

expectError<Parameters<typeof movieSchema['index']>[0]>({ tile: 2 }); // test invalid number
expectError<Parameters<typeof movieSchema['index']>[0]>({ tile: -2 }); // test invalid number
expectError<Parameters<typeof movieSchema['index']>[0]>({ tile: '' }); // test empty string
expectError<Parameters<typeof movieSchema['index']>[0]>({ tile: 'invalid' }); // test invalid string
expectError<Parameters<typeof movieSchema['index']>[0]>({ tile: new Date() }); // test invalid type
expectError<Parameters<typeof movieSchema['index']>[0]>({ tile: true }); // test that booleans are not allowed
expectError<Parameters<typeof movieSchema['index']>[0]>({ tile: false }); // test that booleans are not allowed

// Using `SchemaDefinition`
interface IProfile {
  age: number;
}
const ProfileSchemaDef: SchemaDefinition<IProfile> = { age: Number };
export const ProfileSchema = new Schema<IProfile, Model<IProfile>>(ProfileSchemaDef);

interface IUser {
  email: string;
  profile: IProfile;
}

const ProfileSchemaDef2: SchemaDefinition<IProfile> = {
  age: Schema.Types.Number
};

const ProfileSchema2: Schema<IProfile, Model<IProfile>> = new Schema<IProfile>(ProfileSchemaDef2);

const UserSchemaDef: SchemaDefinition<IUser> = {
  email: String,
  profile: ProfileSchema2
};

async function gh9857() {
  interface User {
    name: number;
    active: boolean;
    points: number;
  }

  type UserDocument = Document<User>;
  type UserSchemaDefinition = SchemaDefinition<User>;
  type UserModel = Model<UserDocument>;

  let u: UserSchemaDefinition;
  expectError(u = {
    name: { type: String },
    active: { type: Boolean },
    points: Number
  });
}

function gh10261() {
  interface ValuesEntity {
    values: string[];
  }

  const type: ReadonlyArray<typeof String> = [String];
  const colorEntitySchemaDefinition: SchemaDefinition<ValuesEntity> = {
    values: {
      type: type,
      required: true
    }
  };
}

function gh10287() {
  interface SubSchema {
    testProp: string;
  }

  const subSchema = new Schema<Document & SubSchema, Model<Document & SubSchema>, SubSchema>({
    testProp: Schema.Types.String
  });

  interface MainSchema {
    subProp: SubSchema
  }

  const mainSchema1 = new Schema<Document & MainSchema, Model<Document & MainSchema>, MainSchema>({
    subProp: subSchema
  });

  const mainSchema2 = new Schema<Document & MainSchema, Model<Document & MainSchema>, MainSchema>({
    subProp: {
      type: subSchema
    }
  });
}

function gh10370() {
  const movieSchema = new Schema<Document & Movie, Model<Document & Movie>, Movie>({
    actors: {
      type: [actorSchema]
    }
  });
}

function gh10409() {
  interface Something {
    field: Date;
  }
  const someSchema = new Schema<Something, Model<Something>, Something>({
    field: { type: Date }
  });
}

function gh10605() {
  interface ITest {
    arrayField?: string[];
    object: {
      value: number
    };
  }
  const schema = new Schema<ITest>({
    arrayField: [String],
    object: {
      type: {
        value: {
          type: Number
        }
      }
    }
  });
}

function gh10605_2() {
  interface ITestSchema {
    someObject: Array<{ id: string }>
  }

  const testSchema = new Schema<ITestSchema>({
    someObject: { type: [{ id: String }] }
  });
}

function gh10731() {
  interface IProduct {
    keywords: string[];
  }

  const productSchema = new Schema<IProduct>({
    keywords: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
          required: true
        }
      ],
      required: true
    }
  });
}

function gh10789() {
  interface IAddress {
    city: string;
    state: string;
    country: string;
  }

  interface IUser {
    name: string;
    addresses: IAddress[];
  }

  const addressSchema = new Schema<IAddress>({
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    }
  });

  const userSchema = new Schema<IUser>({
    name: {
      type: String,
      required: true
    },
    addresses: {
      type: [
        {
          type: addressSchema,
          required: true
        }
      ],
      required: true
    }
  });
}

function gh11439() {
  type Book = {
    collection: string
  };

  const bookSchema = new Schema<Book>({
    collection: String
  }, {
    suppressReservedKeysWarning: true
  });
}

function gh11448() {
  interface IUser {
    name: string;
    age: number;
  }

  const userSchema = new Schema<IUser>({ name: String, age: Number });

  userSchema.pick<Pick<IUser, 'age'>>(['age']);
}

function gh11435(): void {
  interface User {
    ids: Types.Array<Types.ObjectId>;
  }

  const schema = new Schema<User>({
    ids: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Something' }],
      default: []
    }
  });
}

// timeSeries
new Schema({}, { expires: '5 seconds' });
expectError(new Schema({}, { expireAfterSeconds: '5 seconds' }));
new Schema({}, { expireAfterSeconds: 5 });

function gh10900(): void {
  type TMenuStatus = Record<string, 'EXPANDED' | 'COLLAPSED'>[];

  interface IUserProp {
    menuStatus: TMenuStatus;
  }

  const patientSchema = new Schema<IUserProp>({
    menuStatus: { type: Schema.Types.Mixed, default: {} }
  });
}

export function autoTypedSchema() {
  // Test auto schema type obtaining with all possible path types.

  class Int8 extends SchemaType {
    constructor(key, options) {
      super(key, options, 'Int8');
    }
    cast(val) {
      let _val = Number(val);
      if (isNaN(_val)) {
        throw new Error('Int8: ' + val + ' is not a number');
      }
      _val = Math.round(_val);
      if (_val < -0x80 || _val > 0x7F) {
        throw new Error('Int8: ' + val +
          ' is outside of the range of valid 8-bit ints');
      }
      return _val;
    }
  }

  type TestSchemaType = {
    string1?: string;
    string2?: string;
    string3?: string;
    string4?: string;
    string5: string;
    number1?: number;
    number2?: number;
    number3?: number;
    number4?: number;
    number5: number;
    date1?: Date;
    date2?: Date;
    date3?: Date;
    date4?: Date;
    date5: Date;
    buffer1?: Buffer;
    buffer2?: Buffer;
    buffer3?: Buffer;
    buffer4?: Buffer;
    boolean1?: boolean;
    boolean2?: boolean;
    boolean3?: boolean;
    boolean4?: boolean;
    boolean5: boolean;
    mixed1?: any;
    mixed2?: any;
    mixed3?: any;
    objectId1?: Types.ObjectId;
    objectId2?: Types.ObjectId;
    objectId3?: Types.ObjectId;
    customSchema?: Int8;
    map1?: Map<string, string>;
    map2?: Map<string, number>;
    array1: string[];
    array2: any[];
    array3: any[];
    array4: any[];
    array5: any[];
    array6: string[];
    array7?: string[];
    array8?: string[];
    decimal1?: Types.Decimal128;
    decimal2?: Types.Decimal128;
    decimal3?: Types.Decimal128;
  };

  const TestSchema = new Schema({
    string1: String,
    string2: 'String',
    string3: 'string',
    string4: Schema.Types.String,
    string5: { type: String, default: 'ABCD' },
    number1: Number,
    number2: 'Number',
    number3: 'number',
    number4: Schema.Types.Number,
    number5: { type: Number, default: 10 },
    date1: Date,
    date2: 'Date',
    date3: 'date',
    date4: Schema.Types.Date,
    date5: { type: Date, default: new Date() },
    buffer1: Buffer,
    buffer2: 'Buffer',
    buffer3: 'buffer',
    buffer4: Schema.Types.Buffer,
    boolean1: Boolean,
    boolean2: 'Boolean',
    boolean3: 'boolean',
    boolean4: Schema.Types.Boolean,
    boolean5: { type: Boolean, default: true },
    mixed1: Object,
    mixed2: {},
    mixed3: Schema.Types.Mixed,
    objectId1: Schema.Types.ObjectId,
    objectId2: 'ObjectId',
    objectId3: 'ObjectID',
    customSchema: Int8,
    map1: { type: Map, of: String },
    map2: { type: Map, of: Number },
    array1: [String],
    array2: Array,
    array3: [Schema.Types.Mixed],
    array4: [{}],
    array5: [],
    array6: { type: [String] },
    array7: { type: [String], default: undefined },
    array8: { type: [String], default: () => undefined },
    decimal1: Schema.Types.Decimal128,
    decimal2: 'Decimal128',
    decimal3: 'decimal128'
  });

  type InferredTestSchemaType = InferSchemaType<typeof TestSchema>;

  expectType<TestSchemaType>({} as InferredTestSchemaType);

  const SchemaWithCustomTypeKey = new Schema({
    name: {
      customTypeKey: String,
      required: true
    }
  }, {
    typeKey: 'customTypeKey'
  });

  expectType<string>({} as InferSchemaType<typeof SchemaWithCustomTypeKey>['name']);

  const AutoTypedSchema = new Schema({
    userName: {
      type: String,
      required: [true, 'userName is required']
    },
    description: String,
    nested: new Schema({
      age: {
        type: Number,
        required: true
      },
      hobby: {
        type: String,
        required: false
      }
    }),
    favoritDrink: {
      type: String,
      enum: ['Coffee', 'Tea']
    },
    favoritColorMode: {
      type: String,
      enum: {
        values: ['dark', 'light'],
        message: '{VALUE} is not supported'
      },
      required: true
    },
    friendID: {
      type: Schema.Types.ObjectId
    },
    nestedArray: {
      type: [
        new Schema({
          date: { type: Date, required: true },
          messages: Number
        })
      ]
    }
  }, {
    statics: {
      staticFn() {
        expectType<Model<InferSchemaType<typeof AutoTypedSchema>>>(this);
        return 'Returned from staticFn' as const;
      }
    },
    methods: {
      instanceFn() {
        expectType<HydratedDocument<InferSchemaType<typeof AutoTypedSchema>>>(this);
        return 'Returned from DocumentInstanceFn' as const;
      }
    },
    query: {
      byUserName(userName) {
        expectAssignable<Query<unknown, InferSchemaType<typeof AutoTypedSchema>>>(this);
        return this.where({ userName });
      }
    }
  });

  return AutoTypedSchema;
}

export type AutoTypedSchemaType = {
  schema: {
    userName: string;
    description?: string;
    nested?: {
      age: number;
      hobby?: string
    },
    favoritDrink?: 'Tea' | 'Coffee',
    favoritColorMode: 'dark' | 'light'
    friendID?: Types.ObjectId;
    nestedArray: Types.DocumentArray<{
      date: Date;
      messages?: number;
    }>
  }
  , statics: {
    staticFn: () => 'Returned from staticFn'
  },
  methods: {
    instanceFn: () => 'Returned from DocumentInstanceFn'
  }
};

// discriminator
const eventSchema = new Schema<{ message: string }>({ message: String }, { discriminatorKey: 'kind' });
const batchSchema = new Schema<{ name: string }>({ name: String }, { discriminatorKey: 'kind' });
batchSchema.discriminator('event', eventSchema);

// discriminator statics
const eventSchema2 = new Schema({ message: String }, { discriminatorKey: 'kind', statics: { static1: function() {
  return 0;
} } });
const batchSchema2 = new Schema({ name: String }, { discriminatorKey: 'kind', statics: { static2: function() {
  return 1;
} } });
batchSchema2.discriminator('event', eventSchema2);

function gh11828() {
  interface IUser {
    name: string;
    age: number;
    bornAt: Date;
    isActive: boolean;
  }

  const t: SchemaTypeOptions<boolean> = {
    type: Boolean,
    default() {
      return this.name === 'Hafez';
    }
  };

  new Schema<IUser>({
    name: { type: String, default: () => 'Hafez' },
    age: { type: Number, default: () => 27 },
    bornAt: { type: Date, default: () => new Date() },
    isActive: {
      type: Boolean,
      default(): boolean {
        return this.name === 'Hafez';
      }
    }
  });
}

function gh11997() {
  interface IUser {
    name: string;
  }

  const userSchema = new Schema<IUser>({
    name: { type: String, default: () => 'Hafez' }
  });
  userSchema.index({ name: 1 }, { weights: { name: 1 } });
}

function gh12003() {
  const baseSchemaOptions = {
    versionKey: false
  };

  const BaseSchema = new Schema({
    name: String
  }, baseSchemaOptions);

  type BaseSchemaType = InferSchemaType<typeof BaseSchema>;

  type TSchemaOptions = ResolveSchemaOptions<ObtainSchemaGeneric<typeof BaseSchema, 'TSchemaOptions'>>;
  expectType<'type'>({} as TSchemaOptions['typeKey']);

  expectType<{ name?: string }>({} as BaseSchemaType);
}

function gh11987() {
  interface IUser {
    name: string;
    email: string;
    organization: Types.ObjectId;
  }

  const userSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true },
    organization: { type: Schema.Types.ObjectId, ref: 'Organization' }
  });

  expectType<SchemaType<string>>(userSchema.path<'name'>('name'));
  expectError(userSchema.path<'foo'>('name'));
  expectType<SchemaTypeOptions<string>>(userSchema.path<'name'>('name').OptionsConstructor);
}

function gh12030() {
  const Schema1 = new Schema({
    users: [
      {
        username: { type: String }
      }
    ]
  });

  type A = ResolvePathType<[
    {
      username: { type: String }
    }
  ]>;
  expectType<{
    username?: string
  }[]>({} as A);

  type B = ObtainDocumentType<{
    users: [
      {
        username: { type: String }
      }
    ]
  }>;
  expectType<{
    users: {
      username?: string
    }[];
  }>({} as B);

  expectType<{
    users: {
      username?: string
    }[];
  }>({} as InferSchemaType<typeof Schema1>);

  const Schema2 = new Schema({
    createdAt: { type: Date, default: Date.now }
  });

  expectType<{ createdAt: Date }>({} as InferSchemaType<typeof Schema2>);

  const Schema3 = new Schema({
    users: [
      new Schema({
        username: { type: String },
        credit: { type: Number, default: 0 }
      })
    ]
  });

  expectType<{
    users: Types.DocumentArray<{
      credit: number;
      username?: string;
    }>;
  }>({} as InferSchemaType<typeof Schema3>);


  const Schema4 = new Schema({
    data: { type: { role: String }, default: {} }
  });

  expectType<{ data: { role?: string } }>({} as InferSchemaType<typeof Schema4>);

  const Schema5 = new Schema({
    data: { type: { role: Object }, default: {} }
  });

  expectType<{ data: { role?: any } }>({} as InferSchemaType<typeof Schema5>);

  const Schema6 = new Schema({
    track: {
      backupCount: {
        type: Number,
        default: 0
      },
      count: {
        type: Number,
        default: 0
      }
    }
  });

  expectType<{
    track?: {
      backupCount: number;
      count: number;
    };
  }>({} as InferSchemaType<typeof Schema6>);

}

function pluginOptions() {
  interface SomePluginOptions {
    option1?: string;
    option2: number;
  }

  function pluginFunction(schema: Schema<any>, options: SomePluginOptions) {
    return; // empty function, to satisfy lint option
  }

  const schema = new Schema({});
  expectType<Schema<any>>(schema.plugin(pluginFunction)); // test that chaining would be possible

  // could not add strict tests that the parameters are inferred correctly, because i dont know how this would be done in tsd

  // test basic inferrence
  expectError(schema.plugin(pluginFunction, {})); // should error because "option2" is not optional
  schema.plugin(pluginFunction, { option2: 0 });
  schema.plugin(pluginFunction, { option1: 'string', option2: 1 });
  expectError(schema.plugin(pluginFunction, { option1: 'string' })); // should error because "option2" is not optional
  expectError(schema.plugin(pluginFunction, { option2: 'string' })); // should error because "option2" type is "number"
  expectError(schema.plugin(pluginFunction, { option1: 0 })); // should error because "option1" type is "string"

  // test plugins without options defined
  function pluginFunction2(schema: Schema<any>) {
    return; // empty function, to satisfy lint option
  }
  schema.plugin(pluginFunction2);
  expectError(schema.plugin(pluginFunction2, {})); // should error because no options argument is defined

  // test overwriting options
  schema.plugin<any, SomePluginOptions>(pluginFunction2, { option2: 0 });
  expectError(schema.plugin<any, SomePluginOptions>(pluginFunction2, {})); // should error because "option2" is not optional
}

function gh12205() {
  const campaignSchema = new Schema(
    {
      client: {
        type: new Types.ObjectId(),
        required: true
      }
    }
  );

  const Campaign = model('Campaign', campaignSchema);
  const doc = new Campaign();
  expectType<Types.ObjectId>(doc.client);

  type ICampaign = InferSchemaType<typeof campaignSchema>;
  expectType<{ client: Types.ObjectId }>({} as ICampaign);

  type A = ObtainDocumentType<{ client: { type: Schema.Types.ObjectId, required: true } }>;
  expectType<{ client: Types.ObjectId }>({} as A);

  type Foo = ObtainDocumentPathType<{ type: Schema.Types.ObjectId, required: true }, 'type'>;
  expectType<Types.ObjectId>({} as Foo);

  type Bar = ResolvePathType<Schema.Types.ObjectId, { required: true }>;
  expectType<Types.ObjectId>({} as Bar);

  /* type Baz = Schema.Types.ObjectId extends typeof Schema.Types.ObjectId ? string : number;
  expectType<string>({} as Baz); */
}


function gh12450() {
  const ObjectIdSchema = new Schema({
    user: { type: Schema.Types.ObjectId }
  });

  expectType<{
    user?: Types.ObjectId;
  }>({} as InferSchemaType<typeof ObjectIdSchema>);

  const Schema2 = new Schema({
    createdAt: { type: Date, required: true },
    decimalValue: { type: Schema.Types.Decimal128, required: true }
  });

  expectType<{ createdAt: Date, decimalValue: Types.Decimal128 }>({} as InferSchemaType<typeof Schema2>);

  const Schema3 = new Schema({
    createdAt: { type: Date, required: true },
    decimalValue: { type: Schema.Types.Decimal128 }
  });

  expectType<{ createdAt: Date, decimalValue?: Types.Decimal128 }>({} as InferSchemaType<typeof Schema3>);

  const Schema4 = new Schema({
    createdAt: { type: Date },
    decimalValue: { type: Schema.Types.Decimal128 }
  });

  expectType<{ createdAt?: Date, decimalValue?: Types.Decimal128 }>({} as InferSchemaType<typeof Schema4>);
}

function gh12242() {
  const dbExample = new Schema(
    {
      active: { type: Number, enum: [0, 1] as const, required: true }
    }
  );

  type Example = InferSchemaType<typeof dbExample>;
  expectType<0 | 1>({} as Example['active']);
}

function testInferTimestamps() {
  const schema = new Schema({
    name: String
  }, { timestamps: true });

  type WithTimestamps = InferSchemaType<typeof schema>;
  // For some reason, expectType<{ createdAt: Date, updatedAt: Date, name?: string }> throws
  // an error "Parameter type { createdAt: Date; updatedAt: Date; name?: string | undefined; }
  // is not identical to argument type { createdAt: NativeDate; updatedAt: NativeDate; } &
  // { name?: string | undefined; }"
  expectType<{ createdAt: Date, updatedAt: Date } & { name?: string }>({} as WithTimestamps);

  const schema2 = new Schema({
    name: String
  }, {
    timestamps: true,
    methods: { myName(): string | undefined {
      return this.name;
    } }
  });

  type WithTimestamps2 = InferSchemaType<typeof schema2>;
  // For some reason, expectType<{ createdAt: Date, updatedAt: Date, name?: string }> throws
  // an error "Parameter type { createdAt: Date; updatedAt: Date; name?: string | undefined; }
  // is not identical to argument type { createdAt: NativeDate; updatedAt: NativeDate; } &
  // { name?: string | undefined; }"
  expectType<{ name?: string }>({} as WithTimestamps2);
}

function gh12431() {
  const testSchema = new Schema({
    testDate: { type: Date },
    testDecimal: { type: Schema.Types.Decimal128 }
  });

  type Example = InferSchemaType<typeof testSchema>;
  expectType<{ testDate?: Date, testDecimal?: Types.Decimal128 }>({} as Example);
}

async function gh12593() {
  const testSchema = new Schema({ x: { type: Schema.Types.UUID } });

  type Example = InferSchemaType<typeof testSchema>;
  expectType<{ x?: Buffer }>({} as Example);

  const Test = model('Test', testSchema);

  const doc = await Test.findOne({ x: '4709e6d9-61fd-435e-b594-d748eb196d8f' }).orFail();
  expectType<Buffer | undefined>(doc.x);

  const doc2 = new Test({ x: '4709e6d9-61fd-435e-b594-d748eb196d8f' });
  expectType<Buffer | undefined>(doc2.x);

  const doc3 = await Test.findOne({}).orFail().lean();
  expectType<Buffer | undefined>(doc3.x);

  const arrSchema = new Schema({ arr: [{ type: Schema.Types.UUID }] });

  type ExampleArr = InferSchemaType<typeof arrSchema>;
  expectType<{ arr: Buffer[] }>({} as ExampleArr);
}

function gh12562() {
  const emailRegExp = /@/;
  const userSchema = new Schema(
    {
      email: {
        type: String,
        trim: true,
        validate: {
          validator: (value: string) => emailRegExp.test(value),
          message: 'Email is not valid'
        },
        index: { // uncomment the index object and for me trim was throwing an error
          partialFilterExpression: {
            email: {
              $exists: true,
              $ne: null
            }
          }
        },
        select: false
      }
    }
  );
}

function gh12590() {
  const UserSchema = new Schema({
    _password: String
  });

  type User = InferSchemaType<typeof UserSchema>;

  const path = UserSchema.path('hashed_password');
  expectType<SchemaType<any, HydratedDocument<User>>>(path);

  UserSchema.path('hashed_password').validate(function(v) {
    expectType<HydratedDocument<User>>(this);
    if (this._password && this._password.length < 8) {
      this.invalidate('password', 'Password must be at least 8 characters.');
    }
  });

}

function gh12611() {
  const reusableFields = {
    description: { type: String, required: true },
    skills: { type: [Schema.Types.ObjectId], ref: 'Skill', default: [] }
  } as const;

  const firstSchema = new Schema({
    ...reusableFields,
    anotherField: String
  });

  type Props = InferSchemaType<typeof firstSchema>;
  expectType<{
    description: string;
    skills: Types.ObjectId[];
    anotherField?: string;
  }>({} as Props);
}

function gh12782() {
  const schemaObj = { test: { type: String, required: true } };
  const schema = new Schema(schemaObj);
  type Props = InferSchemaType<typeof schema>;
  expectType<{
    test: string
  }>({} as Props);
}

function gh12816() {
  const schema = new Schema({}, { overwriteModels: true });
}

function gh12869() {
  const dbExampleConst = new Schema(
    {
      active: { type: String, enum: ['foo', 'bar'] as const, required: true }
    }
  );

  type ExampleConst = InferSchemaType<typeof dbExampleConst>;
  expectType<'foo' | 'bar'>({} as ExampleConst['active']);

  const dbExample = new Schema(
    {
      active: { type: String, enum: ['foo', 'bar'], required: true }
    }
  );

  type Example = InferSchemaType<typeof dbExample>;
  expectType<'foo' | 'bar'>({} as Example['active']);
}

function gh12882() {
  // Array of strings
  const arrString = new Schema({
    fooArray: {
      type: [{
        type: String,
        required: true
      }],
      required: true
    }
  });
  type tArrString = InferSchemaType<typeof arrString>;
  // Array of numbers using string definition
  const arrNum = new Schema({
    fooArray: {
      type: [{
        type: 'Number',
        required: true
      }],
      required: true
    }
  });
  type tArrNum = InferSchemaType<typeof arrNum>;
  expectType<{
    fooArray: number[]
  }>({} as tArrNum);
  // Array of object with key named "type"
  const arrType = new Schema({
    fooArray: {
      type: [{
        type: {
          type: String,
          required: true
        },
        foo: {
          type: Number,
          required: true
        }
      }],
      required: true
    }
  });
  type tArrType = InferSchemaType<typeof arrType>;
  expectType<{
    fooArray: {
      type: string;
      foo: number;
    }[]
  }>({} as tArrType);
  // Readonly array of strings
  const rArrString = new Schema({
    fooArray: {
      type: [{
        type: String,
        required: true
      }] as const,
      required: true
    }
  });
  type rTArrString = InferSchemaType<typeof rArrString>;
  expectType<{
    fooArray: string[]
  }>({} as rTArrString);
  // Readonly array of numbers using string definition
  const rArrNum = new Schema({
    fooArray: {
      type: [{
        type: 'Number',
        required: true
      }] as const,
      required: true
    }
  });
  type rTArrNum = InferSchemaType<typeof rArrNum>;
  expectType<{
    fooArray: number[]
  }>({} as rTArrNum);
  // Readonly array of object with key named "type"
  const rArrType = new Schema({
    fooArray: {
      type: [{
        type: {
          type: String,
          required: true
        },
        foo: {
          type: Number,
          required: true
        }
      }] as const,
      required: true
    }
  });
  type rTArrType = InferSchemaType<typeof rArrType>;
  expectType<{
    fooArray: {
      type: string;
      foo: number;
    }[]
  }>({} as rTArrType);
}
