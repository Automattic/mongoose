import mongoose, { connect } from 'mongoose';
import { expectType } from 'tsd';
import { Expect, Equal } from './helpers';

// Promise
let p = connect('mongodb://127.0.0.1:27017/test');
Expect<Equal<typeof p, Promise<typeof mongoose>>>();
p = connect('mongodb://127.0.0.1:27017/test', {});
Expect<Equal<typeof p, Promise<typeof mongoose>>>();
p = connect('mongodb://127.0.0.1:27017/test', { bufferCommands: true });
Expect<Equal<typeof p, Promise<typeof mongoose>>>();
