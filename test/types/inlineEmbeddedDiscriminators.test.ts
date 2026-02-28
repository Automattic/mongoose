import { model, Schema } from 'mongoose';
import { ExpectType } from './util/assertions';

const shapeSchema = new Schema({ name: String }, { discriminatorKey: 'kind' });
const circleSchema = new Schema({ radius: Number });
const squareSchema = new Schema({ side: Number });

const schema = new Schema({
  shape: {
    type: shapeSchema,
    discriminators: {
      Circle: circleSchema,
      Square: squareSchema
    }
  }
});

const TestModel = model('InlineEmbeddedDiscriminatorTypeInferenceTest', schema);
const doc = new TestModel({ shape: { __t: 'Circle', radius: 5 } });

if (doc.shape?.__t === 'Circle') {
  ExpectType<number | null | undefined>(doc.shape.radius);
}

if (doc.shape?.__t === 'Square') {
  ExpectType<number | null | undefined>(doc.shape.side);
}
