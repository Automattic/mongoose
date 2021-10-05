import * as mongoose from 'mongoose';

Object.values(mongoose.models).forEach(model => {
  model.modelName;
  model.findOne();
});

mongoose.pluralize(null);

function gh10746() {
  type A = string extends Function ? never : string;

  let testVar: A;
  testVar = 'A string';
  testVar = 'B string';
}