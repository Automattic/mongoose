import mongoose from 'mongoose';

const m: mongoose.Mongoose = new mongoose.Mongoose();

m.STATES.connected;

m.connect('mongodb://localhost:27017/test').then(() => {
  console.log('Connected!');
});

mongoose.Promise = Promise;