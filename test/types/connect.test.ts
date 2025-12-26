import mongoose, { connect } from 'mongoose';
import { expectType } from 'tsd';
import { ExpectType } from './helpers';

// Promise
ExpectType<Promise<typeof mongoose>>()(connect('mongodb://127.0.0.1:27017/test'));
ExpectType<Promise<typeof mongoose>>()(connect('mongodb://127.0.0.1:27017/test', {}));
ExpectType<Promise<typeof mongoose>>()(connect('mongodb://127.0.0.1:27017/test', { bufferCommands: true }));
