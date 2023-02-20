import mongoose, { connect } from 'mongoose';
import { expectType } from 'tsd';

// Promise
expectType<Promise<typeof mongoose>>(connect('mongodb://127.0.0.1:27017/test'));
expectType<Promise<typeof mongoose>>(connect('mongodb://127.0.0.1:27017/test', {}));
expectType<Promise<typeof mongoose>>(connect('mongodb://127.0.0.1:27017/test', { bufferCommands: true }));
