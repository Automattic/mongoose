# Query Helpers in TypeScript

[Query helpers](http://thecodebarbarian.com/mongoose-custom-query-methods.html) let you define custom helper methods on Mongoose queries.
Query helpers make queries more semantic using chaining syntax.

The following is an example of how query helpers work in JavaScript.

```javascript
ProjectSchema.query.byName = function(name) {
  return this.find({ name: name });
};
const Project = mongoose.model('Project', ProjectSchema);

// Works. Any Project query, whether it be `find()`, `findOne()`,
// `findOneAndUpdate()`, `delete()`, etc. now has a `byName()` helper
Project.find().where('stars').gt(1000).byName('mongoose');
```

## Manually Typed Query Helpers

In TypeScript, you can define query helpers using a separate query helpers interface.
Mongoose's `Model` takes 3 generic parameters:

1. The `DocType`
2. a `TQueryHelpers` type
3. a `TMethods` type

The 2nd generic parameter, `TQueryHelpers`, should be an interface that contains a function signature for each of your query helpers.
Below is an example of creating a `ProjectModel` with a `byName` query helper.

```typescript
import { HydratedDocument, Model, QueryWithHelpers, Schema, model, connect } from 'mongoose';

interface Project {
  name?: string;
  stars?: number;
}

interface ProjectQueryHelpers {
  byName(name: string): QueryWithHelpers<
    HydratedDocument<Project>[],
    HydratedDocument<Project>,
    ProjectQueryHelpers
  >
}

type ProjectModelType = Model<Project, ProjectQueryHelpers>;

const ProjectSchema = new Schema<
  Project,
  Model<Project, ProjectQueryHelpers>,
  {},
  ProjectQueryHelpers
>({
  name: String,
  stars: Number
});

ProjectSchema.query.byName = function byName(
  this: QueryWithHelpers<any, HydratedDocument<Project>, ProjectQueryHelpers>,
  name: string
) {
  return this.find({ name: name });
};

// 2nd param to `model()` is the Model class to return.
const ProjectModel = model<Project, ProjectModelType>('Project', ProjectSchema);

run().catch(err => console.log(err));

async function run(): Promise<void> {
  await connect('mongodb://127.0.0.1:27017/test');

  // Equivalent to `ProjectModel.find({ stars: { $gt: 1000 }, name: 'mongoose' })`
  await ProjectModel.find().where('stars').gt(1000).byName('mongoose');
}
```

## Auto Typed Query Helpers

Mongoose does support auto typed Query Helpers that it are supplied in schema options.
Query Helpers functions can be defined as following:

```typescript
import { Schema, model } from 'mongoose';

const ProjectSchema = new Schema({
  name: String,
  stars: Number
}, {
  query: {
    byName(name: string) {
      return this.find({ name });
    }
  }
});

const ProjectModel = model('Project', ProjectSchema);

// Equivalent to `ProjectModel.find({ stars: { $gt: 1000 }, name: 'mongoose' })`
await ProjectModel.find().where('stars').gt(1000).byName('mongoose');
```

## Using Query Helper Overrides For Different Query Shapes

Sometimes you want a query helper to return a different type depending on whether the query is "lean" or not.
For example, suppose you want a `toMap()` query helper that converts the results of a query into a `Map` keyed by `_id`.
If you call `.lean()`, you want the map values to be plain objects; otherwise, you want hydrated documents.

To achieve this, you can use TypeScript function overloads on your query helper based on the value of `this`.
Here's an example of how to type a `toMap()` query helper so that it returns the correct type for both lean and non-lean queries:

```typescript
import { Model, HydratedDocument, QueryWithHelpers, Schema, model, Types } from 'mongoose';

// Query helper interface with overloads for lean and non-lean queries
export interface ToMapQueryHelpers<RawDocType, HydratedDocType> {
  // For non-lean queries: returns Map<string, HydratedDocType>
  toMap(this: QueryWithHelpers<HydratedDocType[], HydratedDocType>): QueryWithHelpers<Map<string, HydratedDocType>, HydratedDocType>;
  // For lean queries: returns Map<string, RawDocType>
  toMap(this: QueryWithHelpers<RawDocType[], HydratedDocType>): QueryWithHelpers<Map<string, RawDocType>, HydratedDocType>;
}

// Query helpers definition. Will be used in schema options
const query: ToMapQueryHelpers<IUser, UserHydratedDocument> = {
  // Chainable query helper that converts an array of documents to
  // a map of document _id (as a string) to the document
  toMap() {
    return this.transform((docs) => {
      // The `if` statements are type gymnastics to help TypeScript
      // handle the `IUser[] | UserHydratedDocument[]` union. Not necessary
      // for runtime correctness.
      if (docs.length === 0) return new Map();
      if (docs[0] instanceof Document) return new Map(docs.map(doc => [doc._id.toString(), doc]));
      return new Map(docs.map(doc => [doc._id.toString(), doc]));
    });
  }
};

export interface IUser {
  _id: Types.ObjectId;
  name: string;
}

export type UserHydratedDocument = HydratedDocument<IUser>;

export type UserModelType = Model<
  IUser,
  ToMapQueryHelpers<IUser, UserHydratedDocument>
>;

const userSchema = new Schema({ name: String }, { query });
const User = model<IUser, UserModelType>('User', userSchema);

async function run() {
  // Non-lean: Map<string, UserHydratedDocument>
  const hydratedMap = await User.find().toMap();
  // hydratedMap.get('someId') is a hydrated document

  // Lean: Map<string, IUser>
  const leanMap = await User.find().lean().toMap();
  // leanMap.get('someId') is a plain object

  // The following will fail at compile time, as expected, because `toMap()` shouldn't work with single documents or numbers
  // await User.findOne().toMap();
  // await User.countDocuments().toMap();
}
```

With this approach, TypeScript will infer the correct return type for `.toMap()` depending on whether you use `.lean()` or not. This ensures type safety and prevents accidental misuse of the query helper on queries that don't return arrays of documents.
