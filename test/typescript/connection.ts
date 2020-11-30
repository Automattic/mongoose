import { createConnection, Schema, Connection } from 'mongoose';

const conn = createConnection();

conn.model('Test', new Schema({ name: { type: String } }));

conn.openUri('mongodb://localhost:27017/test').then(() => console.log('Connected!'));

createConnection('mongodb://localhost:27017/test', { useNewUrlParser: true }).then((conn: Connection) => {
  conn.host;
});