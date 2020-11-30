import { connect } from 'mongoose';

// Promise
connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true }).
  then(mongoose => console.log(mongoose.connect));

// Callback
connect('mongodb://localhost:27017/test', { useNewUrlParser: true, useUnifiedTopology: true }, (err: Error) => {
  console.log(err.stack);
});