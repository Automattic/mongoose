import { Schema, model, Document, PopulatedDoc } from 'mongoose';
// Use the mongodb ObjectId to make instanceof calls possible
import { ObjectId } from 'mongodb';

interface Child {
  name: string;
}

const childSchema: Schema = new Schema({ name: String });
const ChildModel = model<Child>('Child', childSchema);

interface Parent {
  child?: PopulatedDoc<Child & Document<ObjectId>>,
  name?: string
}

const ParentModel = model<Parent>('Parent', new Schema({
  child: { type: 'ObjectId', ref: 'Child' },
  name: String
}));

ParentModel.findOne({}).populate('child').orFail().then((doc: Parent & Document) => {
  const child = doc.child;
  if (child == null || child instanceof ObjectId) {
    throw new Error('should be populated');
  } else {
    useChildDoc(child);
  }
  const lean = doc.toObject();
  const leanChild = lean.child;
  if (leanChild == null || leanChild instanceof ObjectId) {
    throw new Error('should be populated');
  } else {
    const name = leanChild.name;
    leanChild.save();
  }
});

function useChildDoc(child: Child): void {
  console.log(child.name.trim());
}