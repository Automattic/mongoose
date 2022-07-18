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

ProjectModel.find().where('stars').gt(1000).byName('mongoose').exec();
