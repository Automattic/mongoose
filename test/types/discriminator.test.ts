import mongoose, { Document, Model, Schema, SchemaDefinition, SchemaOptions, Types, model } from 'mongoose';

const schema: Schema = new Schema({ name: { type: 'String' } });

interface IBaseTest extends Document {
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

function test(): void {
  enum CardType {
    Artifact = 'artifact',
    Creature = 'creature',
    Enchantment = 'enchantment',
    Land = 'land',
  }

  interface CardDb extends Document {
    _id: Types.ObjectId;
    type: CardType;
  }

  interface LandDb extends CardDb {
    type: CardType.Land;
  }

  const cardDbBaseSchemaDefinition: SchemaDefinition = {
    type: { type: String, required: true }
  };

  const cardDbSchemaOptions: SchemaOptions = { discriminatorKey: 'type' };

  const cardDbSchema: Schema = new Schema(
    cardDbBaseSchemaDefinition,
    cardDbSchemaOptions
  );

  const cardDbModel: Model<CardDb> = mongoose.model<CardDb>(
    'Card',
    cardDbSchema,
    'card'
  );

  const landDbAdditionalPropertiesSchemaDefinition: SchemaDefinition = {};

  const landDbSchema: Schema = new Schema(
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
