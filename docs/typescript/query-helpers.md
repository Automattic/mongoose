# Query Helpers in TypeScript

[Query helpers](http://thecodebarbarian.com/mongoose-custom-query-methods.html) let you define custom helper methods on Mongoose queries.
Query helpers make queries more semantic using chaining syntax.

```javascript
ProjectSchema.query.byName = function(name) {
  return this.find({ name: name });
};
var Project = mongoose.model('Project', ProjectSchema);

// Works. Any Project query, whether it be `find()`, `findOne()`,
// `findOneAndUpdate()`, `delete()`, etc. now has a `byName()` helper
Project.find().where('stars').gt(1000).byName('mongoose');
```

In TypeScript, Mongoose's `Model` takes 3 generic parameters:

1. The `DocType`
2. a `TQueryHelpers` type
3. a `TMethods` type

The 2nd generic parameter, `TQueryHelpers`, should be an interface that contains a function signature for each of your query helpers.
Below is an example of creating a `ProjectModel` with a `byName` query helper.

```typescript
import { Document, Model, Query, Schema, connect, model } from 'mongoose';

interface Project {
  name: string;
  stars: number;
}

const schema = new Schema<Project>({
  name: { type: String, required: true },
  stars: { type: Number, required: true }
});
// Query helpers should return `Query<any, Document<DocType>> & ProjectQueryHelpers`
// to enable chaining.
interface ProjectQueryHelpers {
  byName(name: string): Query<any, Document<Project>> & ProjectQueryHelpers;
}
schema.query.byName = function(name): Query<any, Document<Project>> & ProjectQueryHelpers {
  return this.find({ name: name });
};

// 2nd param to `model()` is the Model class to return.
const ProjectModel = model<Project, Model<Project, ProjectQueryHelpers>>('Project', schema);

run().catch(err => console.log(err));

async function run(): Promise<void> {
  await connect('mongodb://localhost:27017/test');
  
  // Equivalent to `ProjectModel.find({ stars: { $gt: 1000 }, name: 'mongoose' })`
  await ProjectModel.find().where('stars').gt(1000).byName('mongoose');
}
```