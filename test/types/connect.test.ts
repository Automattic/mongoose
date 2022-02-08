import mongoose, { connect } from 'mongoose';
import { expectType } from 'tsd';

// Promise
expectType<Promise<typeof mongoose>>(connect('mongodb://localhost:27017/test'));
expectType<Promise<typeof mongoose>>(connect('mongodb://localhost:27017/test', {}));
expectType<Promise<typeof mongoose>>(connect('mongodb://localhost:27017/test', { bufferCommands: true }));

// Callback
expectType<void>(connect('mongodb://localhost:27017/test', (err: Error | null) => {}));
expectType<void>(connect('mongodb://localhost:27017/test', {}, (err: Error | null) => {}));
expectType<void>(connect('mongodb://localhost:27017/test', { bufferCommands: true }, (err: Error | null) => {}));
