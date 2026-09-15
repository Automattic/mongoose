import mongoose, { Model } from 'mongoose';

interface User {
  name?: string;
}

const modelWithVirtuals: Model<User, {}, {}, { id: string }> = mongoose.model(
  'TypeScriptMatrix',
  new mongoose.Schema<User>({ name: String })
);

const populateOptions: mongoose.PopulateOptions = {
  path: 'friend',
  model: modelWithVirtuals
};
const schemaTypeOptions: mongoose.SchemaTypeOptions<mongoose.Types.ObjectId> = {
  ref: modelWithVirtuals
};

declare const document: mongoose.Document;
document.populate('friend', undefined, modelWithVirtuals);

mongoose.model('TypeScriptMatrixAggregate').aggregate().model(modelWithVirtuals);
new mongoose.SchemaType('friend').ref(modelWithVirtuals);

void populateOptions;
void schemaTypeOptions;
