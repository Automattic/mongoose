import mongoose from 'mongoose';

mongoose.set('useCreateIndex', true);

mongoose.get('useCreateIndex');

const m: mongoose.Mongoose = new mongoose.Mongoose();

m.set('useUnifiedTopology', true);
m.STATES.connected;

m.connect('mongodb://localhost:27017/test').then(() => {
  console.log('Connected!');
});

mongoose.Promise = Promise;