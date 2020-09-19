import { connect, Schema, model, Model } from 'mongoose';

// Schema definitions

function createBasicSchemaDefinition(): void {
  const schema: Schema = new Schema({ name: { type: 'String' } });

  interface ITest extends Model<ITest> {
    name?: string;
  }

  const Test = model<ITest>('Test', schema);

  const doc: ITest = new Test({ name: 'foo' });
  doc.name = 'bar';
}

function schemaGettersSetters(): void {
  const schema: Schema = new Schema({
    name: {
      type: 'String',
      get: (v: string) => v.toUpperCase(),
      set: (v: string) => v.toUpperCase(),
      cast: 'Invalid name'
    }
  });
}

function schemaFunctionsUsingThis(): void {
  const schema: Schema = new Schema({
    firstName: { type: String },
    email: {
      type: String,
      default: function() {
        return this.firstName + '@gmail.com';
      },
      immutable: doc => {
        return !!doc.firstName;
      }
    }
  });
}