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

In TypeScript, Mongoose does support manually typed and automatically typed Query Helpers.

1- Manually typed:
Mongoose's `Model` takes 3 generic parameters:

1. The `DocType`
2. a `TQueryHelpers` type
3. a `TMethods` type

The 2nd generic parameter, `TQueryHelpers`, should be an interface that contains a function signature for each of your query helpers.
Below is an example of creating a `ProjectModel` with a `byName` query helper.

```typescript
import { HydratedDocument, Model, Query, Schema, model } from 'mongoose';

interface Project {
  name: string;
  stars: number;
}

type ProjectModelType = Model<Project, ProjectQueryHelpers>;
// Query helpers should return `Query<any, Document<DocType>> & ProjectQueryHelpers`
// to enable chaining.
type ProjectModelQuery = Query<any, HydratedDocument<Project>, ProjectQueryHelpers> & ProjectQueryHelpers;
interface ProjectQueryHelpers {
  byName(this: ProjectModelQuery, name: string): ProjectModelQuery;
}

const schema = new Schema<Project, ProjectModelType, {}, ProjectQueryHelpers>({
  name: { type: String, required: true },
  stars: { type: Number, required: true }
});
schema.query.byName = function(name: string): ProjectModelQuery {
  return this.find({ name: name });
};

// 2nd param to `model()` is the Model class to return.
const ProjectModel = model<Project, ProjectModelType>('Project', schema);

run().catch(err => console.log(err));

async function run(): Promise<void> {
  await connect('mongodb://localhost:27017/test');
  
  // Equivalent to `ProjectModel.find({ stars: { $gt: 1000 }, name: 'mongoose' })`
  await ProjectModel.find().where('stars').gt(1000).byName('mongoose');
}
```

2- Automatically typed:
Mongoose does support auto typed Query Helpers that it are supplied in schema options.
Query Helpers functions can be defined as following:

```typescript
import { Schema, model } from 'mongoose';

  const schema = new Schema({
    name: { type: String, required: true },
    stars: { type: Number, required: true }
  }, {
    query: {
      byName(name) {
        return this.find({ name: name });
      }
    }
  });

  const ProjectModel = model(
    'Project',
    schema
  );

  // Equivalent to `ProjectModel.find({ stars: { $gt: 1000 }, name: 'mongoose' })`
  await ProjectModel.find().where('stars').gt(1000).byName('mongoose');
}
```