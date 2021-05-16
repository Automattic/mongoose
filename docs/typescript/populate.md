# Populate with TypeScript

[Mongoose's TypeScript bindings](https://thecodebarbarian.com/working-with-mongoose-in-typescript.html) export a `PopulatedDoc` type that helps you define populated documents in your TypeScript definitions:

```typescript
import { Schema, model, Document, PopulatedDoc } from 'mongoose';

// `child` is either an ObjectId or a populated document
interface Parent {
  child?: PopulatedDoc<Child & Document>,
  name?: string
}
const ParentModel = model<Parent>('Parent', new Schema({
  child: { type: 'ObjectId', ref: 'Child' },
  name: String
}));

interface Child {
  name?: string;
}
const childSchema: Schema = new Schema({ name: String });
const ChildModel = model<Child>('Child', childSchema);

ParentModel.findOne({}).populate('child').orFail().then((doc: Parent) => {
  // Works
  doc.child.name.trim();
});
```

Below is a simplified implementation of the `PopulatedDoc` type. It takes 2 generic parameters: the populated document type `PopulatedType`, and the unpopulated type `RawId`.
`RawId` defaults to an ObjectId.

```typescript
type PopulatedDoc<PopulatedType, RawId = Types.ObjectId> = PopulatedType | RawId;
```

You as the developer are responsible for enforcing strong typing between populated and non-populated docs.
Below is an example.

```typescript
ParentModel.findOne({}).populate('child').orFail().then((doc: Parent) => {
  // `doc` doesn't have type information that `child` is populated
  useChildDoc(doc.child);
});

// You can use a function signature to make type checking more strict.
function useChildDoc(child: Child): void {
  console.log(child.name.trim());
}
```