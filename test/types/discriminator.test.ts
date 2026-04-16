import mongoose, { Model, Schema, SchemaOptions, Types, model, HydratedDocFromModel, InferSchemaType } from 'mongoose';
import { expect } from 'tstyche';

const schema = new Schema({ name: { type: 'String' } });

interface IBaseTest {
  name?: string;
}

interface IDiscriminatorTest extends IBaseTest {
  email?: string;
}

const Base = model<IBaseTest>('Test', schema);
const Disc = Base.discriminator<IDiscriminatorTest>('Test2', new Schema({ email: { type: String } }));

const doc: IDiscriminatorTest = new Disc({ name: 'foo', email: 'hi' });

doc.name = 'bar';
doc.email = 'hello';

const Disc2 = Base.discriminator<IDiscriminatorTest>(
  'Disc2',
  new Schema({ email: { type: String } }),
  { value: 'test', mergeHooks: false, mergePlugins: false }
);

function test(): void {
  enum CardType {
    Artifact = 'artifact',
    Creature = 'creature',
    Enchantment = 'enchantment',
    Land = 'land',
  }

  interface CardDb {
    _id: Types.ObjectId;
    type: CardType;
  }

  interface LandDb extends CardDb {
    type: CardType.Land;
  }

  const cardDbBaseSchemaDefinition = {
    type: { type: String, required: true }
  };

  const cardDbSchemaOptions: SchemaOptions = { discriminatorKey: 'type' };

  const cardDbSchema = new Schema(
    cardDbBaseSchemaDefinition,
    cardDbSchemaOptions
  );

  const cardDbModel: Model<CardDb> = mongoose.model<CardDb>(
    'Card',
    cardDbSchema,
    'card'
  );

  const landDbAdditionalPropertiesSchemaDefinition = {};

  const landDbSchema = new Schema(
    landDbAdditionalPropertiesSchemaDefinition
  );

  const landDbModel: Model<LandDb> = cardDbModel.discriminator<LandDb>(
    'Land',
    landDbSchema,
    CardType.Land
  );

  const sampleLandDb: LandDb = new landDbModel({
    type: CardType.Land
  });

  const sampleCardDb: CardDb = sampleLandDb;
}

function gh15535() {
  const ParentSchema = new Schema({
    field1: {
      type: String,
      required: true
    },
    field2: Number
  }, {
    discriminatorKey: 'field1',
    methods: {
      getField2() {
        return this.field2;
      }
    }
  });

  const ParentModel = mongoose.model('Parent', ParentSchema);

  const ChildSchema = new Schema({
    field3: String
  }, {
    methods: {
      getField3() {
        return this.field3;
      }
    }
  });


  const ChildModel = ParentModel.discriminator('child', ChildSchema);

  const doc = new ChildModel({});
  expect(doc.field1).type.toBe<string>();
  expect(doc.field2).type.toBe<number | null | undefined>();
  expect(doc.getField2()).type.toBe<number | null | undefined>();
  expect(doc.field3).type.toBe<string | null | undefined>();
  expect(doc.getField3()).type.toBe<string | null | undefined>();
}

async function gh15600() {
  // Base model with custom static method
  const baseSchema = new Schema(
    { __t: String, name: String },
    {
      statics: {
        findByName(name: string) {
          return this.findOne({ name });
        }
      }
    }
  );
  const BaseModel = model('Base', baseSchema);

  const baseRes = await BaseModel.findByName('test');
  expect(baseRes?.name).type.toBe<string | null | undefined>();

  // Discriminator model inheriting base static methods
  const discriminatorSchema = new Schema({ extra: String });
  const DiscriminatorModel = BaseModel.discriminator('Discriminator', discriminatorSchema);

  const res = await DiscriminatorModel.findByName('test');
  expect(res?.name).type.toBe<string | null | undefined>();

  const doc = await BaseModel.create(
    { __t: 'Discriminator', name: 'test', extra: 'test' } as InferSchemaType<typeof baseSchema>
  ) as HydratedDocFromModel<typeof DiscriminatorModel>;
  expect(doc.extra).type.toBe<string | null | undefined>();
}
