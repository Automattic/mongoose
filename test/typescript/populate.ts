import { Schema, model, Document, PopulatedDoc } from 'mongoose';

interface Child {
  name: string;
}

const childSchema: Schema = new Schema({ name: String });
const ChildModel = model<Child>('Child', childSchema);

interface Parent {
  child?: PopulatedDoc<Child & Document>,
  name?: string
}

const ParentModel = model<Parent>('Parent', new Schema({
  child: { type: 'ObjectId', ref: 'Child' },
  name: String
}));

ParentModel.findOne({}).populate('child').orFail().then((doc: Parent) => {
  useChildDoc(doc.child);
});

function useChildDoc(child: Child): void {
  console.log(child.name.trim());
}