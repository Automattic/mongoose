import { Schema, model, Document, connection, Collection } from 'mongoose';

const schema: Schema = new Schema({ name: { type: 'String' } });

interface ITest {
  name?: string;
  age?: number;
}

const Test = model('Test', schema);

Test.collection.collectionName;
Test.collection.findOne({});
Test.collection.findOneAndDelete({});
Test.collection.ensureIndex();
Test.collection.findAndModify();
Test.collection.getIndexes();

const coll: Collection<ITest> = connection.collection<ITest>('test');
