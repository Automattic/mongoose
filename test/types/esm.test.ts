import * as mongoose from 'mongoose';
import mongooseESM from 'mongoose';
import * as mongooseDefault from 'mongoose';
import { expect } from 'tstyche';

expect(mongooseESM).type.toBe(mongoose);
expect(mongooseDefault).type.toBe(mongoose);
