import * as mongoose from 'mongoose';

Object.values(mongoose.models).forEach(model => {
  model.modelName;
  model.findOne();
});

mongoose.pluralize(null);
