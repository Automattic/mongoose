import { Schema, model } from 'mongoose';

const schema1 = new Schema({
  name: { type: String, required: true }
}, {
  versionKey: false,
  statics: {
    testMe() {
      return this.findOne({ name: 'test' });
    }
  }
});

const TestModel1 = model('TestModel1', schema1);
TestModel1.testMe();
