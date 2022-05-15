# Populate with TypeScript

[Mongoose's TypeScript bindings](https://thecodebarbarian.com/working-with-mongoose-in-typescript.html) add a generic parameter `Paths` to the `populate()`:

```typescript
import { Schema, model, Document, Types } from 'mongoose';

// `Parent` represents the object as it is stored in MongoDB
interface Parent {
  child?: Types.ObjectId,
  name?: string
}
const ParentModel = model<Parent>('Parent', new Schema({
  child: { type: Schema.Types.ObjectId, ref: 'Child' },
  name: String
}));

interface Child {
  name: string;
}
const childSchema: Schema = new Schema({ name: String });
const ChildModel = model<Child>('Child', childSchema);

// Populate with `Paths` generic `{ child: Child }` to override `child` path
ParentModel.findOne({}).populate<{ child: Child }>('child').orFail().then(doc => {
  // Works
  const t: string = doc.child.name;
});
```

An alternative approach is to define a `PopulatedParent` interface and use `Pick<>` to pull the properties you're populating.

```ts
import { Schema, model, Document, Types } from 'mongoose';

// `Parent` represents the object as it is stored in MongoDB
interface Parent {
  child?: Types.ObjectId,
  name?: string
}
interface Child {
  name: string;
}
interface PopulatedParent {
  child: Child | null;
}
const ParentModel = model<Parent>('Parent', new Schema({
  child: { type: Schema.Types.ObjectId, ref: 'Child' },
  name: String
}));
const childSchema: Schema = new Schema({ name: String });
const ChildModel = model<Child>('Child', childSchema);

// Populate with `Paths` generic `{ child: Child }` to override `child` path
ParentModel.findOne({}).populate<Pick<PopulatedParent, 'child'>>('child').orFail().then(doc => {
  // Works
  const t: string = doc.child.name;
});
```

## Using `PopulatedDoc`

Mongoose also exports a `PopulatedDoc` type that helps you define populated documents in your document interface:

```ts
import { Schema, model, Document, PopulatedDoc } from 'mongoose';

// `child` is either an ObjectId or a populated document
interface Parent {
  child?: PopulatedDoc<Document<ObjectId> & Child>,
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
  const child = doc.child;
  if (child == null || child instanceof ObjectId) {
    throw new Error('should be populated');
  } else {
    // Works
    doc.child.name.trim();
  }
});
```

However, we recommend using the `.populate<{ child: Child }>` syntax from the first section instead of `PopulatedDoc`.
Here's two reasons why:

1. You still need to add an extra check to check if `child instanceof ObjectId`. Otherwise, the TypeScript compiler will fail with `Property name does not exist on type ObjectId`. So using `PopulatedDoc<>` means you need an extra check everywhere you use `doc.child`.
2. In the `Parent` interface, `child` is a hydrated document, which makes it slow difficult for Mongoose to infer the type of `child` when you use `lean()` or `toObject()`.