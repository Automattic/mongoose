import { connect } from 'mongoose';

// Promise
connect('mongodb://localhost:27017/test', {
  useFindAndModify: true,
  useCreateIndex: true
}).then(mongoose => console.log(mongoose.connect));

// Callback
connect('mongodb://localhost:27017/test', {}, (err: Error | null) => {
  console.log(err);
});
