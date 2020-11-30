import { Schema, model, Document } from 'mongoose';

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