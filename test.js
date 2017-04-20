var mongoose = require('./index');

var Schema = mongoose.Schema;
var TestSchema = new Schema({
  foo: { type: String, alias: 'Fap' },
  bar: {
    baz: { type: String, alias: 'Fap' },
    kar: { type: String }
  }
});

var Test = mongoose.model('Test', TestSchema);
var t = new Test({
  foo: 'hey',
  bar: {
    baz: 'sup'
  }
});

console.log(t.Fap);