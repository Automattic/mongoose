import mongoose from 'mongoose';

const m: mongoose.Mongoose = new mongoose.Mongoose();

m.STATES.connected;
m.ConnectionStates.connected;

m.connect('mongodb://localhost:27017/test').then(() => {
  console.log('Connected!');
});

m.syncIndexes().then(() => console.log('Synced indexes!'));

mongoose.Promise = Promise;