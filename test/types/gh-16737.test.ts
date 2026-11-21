import mongoose, { type HydratedDocFromModel, type Model, Schema, type Types } from 'mongoose';
import { expect } from 'tstyche';

// gh-16737: a model whose `TVirtuals` is `{ id: string }` (the default
// inferred by `mongoose.model()`) must be assignable to `Model<any>`,
// whatever the check order. The `statics` index signature used to be
// contravariant in `TModelType` because of its `this` parameter, so the
// relation failed when the model was compared structurally. The
// `historySchema` line below is the check-order trigger from the issue:
// it must stay above the model, otherwise the relation may pass even
// without the fix.
export const historySchema = new Schema<{ updatedAt: Date }>({ updatedAt: Date }, { _id: false });

const sentFileSchema = new Schema({
  agency: { type: Schema.Types.ObjectId, required: true }
});

export const SentFileModel = mongoose.model('SentFile', sentFileSchema);

expect(SentFileModel).type.toBeAssignableTo<Model<any>>();

type Hydrated = HydratedDocFromModel<typeof SentFileModel>;
declare const hydrated: Hydrated;
expect(hydrated.agency).type.toBe<Types.ObjectId>();
