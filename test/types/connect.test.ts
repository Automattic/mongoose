import mongoose, { connect } from 'mongoose';
import { expect } from 'tstyche';

expect(connect('mongodb://127.0.0.1:27017/test')).type.toBe<Promise<typeof mongoose>>();
expect(connect('mongodb://127.0.0.1:27017/test', {})).type.toBe<Promise<typeof mongoose>>();
expect(connect('mongodb://127.0.0.1:27017/test', { bufferCommands: true })).type.toBe<Promise<typeof mongoose>>();
