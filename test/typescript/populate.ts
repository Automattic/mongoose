import { Schema, model, Document, PopulatedDoc } from 'mongoose';

interface IChild extends Document { name?: string }

const childSchema: Schema = new Schema({ name: String });
const Child = model<IChild>('Child', childSchema);

interface IParent extends Document {
  child?: PopulatedDoc<IChild>,
  name?: string
}

const Parent = model<IParent>('Parent', new Schema({
  child: { type: 'ObjectId', ref: 'Child' },
  name: String
}));

Parent.findOne({}).populate('child').orFail().then((doc: IParent) => {
  doc.child.name.trim();
});