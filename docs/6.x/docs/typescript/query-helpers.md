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
import { HydratedDocument, Model, Query, Schema, model } from 'mongoose';

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
const ProjectModel = model<Project, ProjectModelType>('Project', schema);

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
