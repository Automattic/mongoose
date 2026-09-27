# Populate with TypeScript

## Inferring populated types from a model

When you pass a model to `Query#populate()` with a literal `path`, Mongoose
infers the populated document type without an explicit generic parameter:

```typescript
import { model, Schema, Types } from 'mongoose';

interface Parent {
  child: Types.ObjectId;
}
interface Child {
  name: string;
  age: number;
}

const ParentModel = model<Parent>('Parent', new Schema<Parent>({
  child: { type: Schema.Types.ObjectId, ref: 'Child' }
}));
const ChildModel = model<Child>('Child', new Schema<Child>({
  name: String,
  age: Number
}));

const parent = await ParentModel.findOne().populate({
  path: 'child',
  model: ChildModel,
  select: 'name'
}).lean();

parent?.child?.name; // string | undefined
// parent?.child?.age; // TypeScript error: age was not selected
```

Single references include `null` because the referenced document might not
exist, even when the reference path is required. Array references remain
arrays. Without `lean()`, populated documents have document methods; with
`lean()` before or after `populate()`, they are plain objects. A population's
explicit `options: { lean: false }` keeps that reference hydrated, even when
the parent query is lean. Calling `lean(false)` on the query also preserves
inference for hydrated populated references.

Inference also supports dotted paths, nested `populate` options, literal
arrays of options, `justOne`, `retainNullValues`, and populate-level lean
options. For example:

```typescript
const order = await Order.findOne().populate({
  path: 'route',
  model: Route,
  populate: [{ path: 'from.currency', model: Currency, select: 'symbol' }]
}).lean();

order?.route?.from.currency?.symbol; // string | undefined
```

Literal inclusion and exclusion selections support dotted fields and the
default inclusion of `_id`. With the default `selectPopulatedPaths: true`,
nested populated paths are included in a parent's inclusion projection unless
explicitly excluded. Dynamic selection strings and `+field` selections do not
narrow the referenced model's fields. Keep separately declared options literal
using `as const` when you want inference.

Inference requires the actual model, rather than a model name or a schema's
string `ref`. Widened paths, runtime-sized arrays of populate options, and
space-separated populate paths keep the existing result type. Nested
population inference is bounded to 10 levels to limit compiler work. For
virtual paths absent from the document interface, map wildcard paths (`$*`),
schema-level projection overrides such as `selectPopulatedPaths: false`, or
other population options that change the result beyond these rules, use an
explicit `Paths` generic as described below. Document interfaces must accurately
describe the stored fields; inference does not validate the relationship
between a path and the model passed at runtime.

## Explicit populated types

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
const childSchema = new Schema({ name: String });
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
const childSchema = new Schema({ name: String });
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
const childSchema = new Schema({ name: String });
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
2. In the `Parent` interface, `child` is a hydrated document, which makes it difficult for Mongoose to infer the type of `child` when you use `lean()` or `toObject()`.
