import mongoose, { connect } from 'mongoose';
import { ExpectType } from './util/assertions';

// Promise
ExpectType<Promise<typeof mongoose>>(connect('mongodb://127.0.0.1:27017/test'));
ExpectType<Promise<typeof mongoose>>(connect('mongodb://127.0.0.1:27017/test', {}));
ExpectType<Promise<typeof mongoose>>(connect('mongodb://127.0.0.1:27017/test', { bufferCommands: true }));
