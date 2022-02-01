import { createConnection, Schema, Connection } from 'mongoose';

const conn = createConnection();

conn.model('Test', new Schema({ name: { type: String } }));

conn.openUri('mongodb://localhost:27017/test').then(() => console.log('Connected!'));

createConnection('mongodb://localhost:27017/test').asPromise().then((conn: Connection) => {
  conn.host;
});

createConnection('mongodb://localhost:27017/test').close();

conn.db.collection('Test').findOne({ name: String }).then(doc => console.log(doc));
conn.collection('Test').findOne({ name: String }).then(doc => console.log(doc));
conn.syncIndexes({ continueOnError: true }).then(result => {
  result['User'].forEach((index) => {
    index.includes('name');
  });
  result['Order'].message;
  result['Order'].code;
});
conn.syncIndexes({ continueOnError: false, background: true }).then().catch(err => {
  err.errors['Order'].code;
});