import mongoose, { Document, Model, Schema, SchemaDefinition, SchemaOptions, Types, model } from 'mongoose';
import { expectType } from 'tsd';

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
  expectType<string>(doc.field1);
  expectType<number | null | undefined>(doc.field2);
  expectType<number | null | undefined>(doc.getField2());
  expectType<string | null | undefined>(doc.field3);
  expectType<string | null | undefined>(doc.getField3());
}

async function gh15600() {
  // Base model with custom static method
  const baseSchema = new Schema(
    { name: String },
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
  expectType<string | null | undefined>(baseRes!.name);

  // Discriminator model inheriting base static methods
  const discriminatorSchema = new Schema({ extra: String });
  const DiscriminatorModel = BaseModel.discriminator('Discriminator', discriminatorSchema);

  const res = await DiscriminatorModel.findByName('test');
  expectType<string | null | undefined>(res!.name);
}
