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
  HydratedDocument,
  SchemaOptions
} from 'mongoose';
import { expectType, expectError, expectAssignable } from 'tsd';

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

// Using `SchemaDefinition`
interface IProfile {
  age: number;
}
interface ProfileDoc extends Document, IProfile { }
const ProfileSchemaDef: SchemaDefinition<IProfile> = { age: Number };
export const ProfileSchema = new Schema<ProfileDoc, Model<ProfileDoc>, ProfileDoc>(ProfileSchemaDef);

interface IUser {
  email: string;
  profile: ProfileDoc;
}

interface UserDoc extends Document, IUser { }

const ProfileSchemaDef2: SchemaDefinition<IProfile> = {
  age: Schema.Types.Number
};

const ProfileSchema2: Schema<ProfileDoc, Model<ProfileDoc>> = new Schema<ProfileDoc>(ProfileSchemaDef2);

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
  interface ITestSchema extends Document {
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
    supressReservedKeysWarning: true
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
        expectType<Model<AutoTypedSchemaType['schema']>>(this);
        return 'Returned from staticFn' as const;
      }
    },
    methods: {
      instanceFn() {
        expectType<HydratedDocument<AutoTypedSchemaType['schema']>>(this);
        return 'Returned from DocumentInstanceFn' as const;
      }
    },
    query: {
      byUserName(userName) {
        expectAssignable<Query<unknown, AutoTypedSchemaType['schema']>>(this);
        return this.where({ userName });
      }
    }
  });

  type InferredSchemaType = InferSchemaType<typeof AutoTypedSchema>;

  expectType<AutoTypedSchemaType['schema']>({} as InferredSchemaType);

  expectError<AutoTypedSchemaType['schema'] & { doesNotExist: boolean; }>({} as InferredSchemaType);

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
const discriminatedSchema = batchSchema.discriminator('event', eventSchema);

expectType<Schema<Omit<{ name: string }, 'message'> & { message: string }>>(discriminatedSchema);

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
  const baseSchemaOptions: SchemaOptions = {
    versionKey: false
  };

  const BaseSchema = new Schema({
    name: String
  }, baseSchemaOptions);

  type BaseSchemaType = InferSchemaType<typeof BaseSchema>;

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
