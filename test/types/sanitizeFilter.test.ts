import { QueryFilter, sanitizeFilter } from 'mongoose';
import { expect } from 'tstyche';

const data = { username: 'val', pwd: { $ne: null } };
type Data = typeof data;

expect(sanitizeFilter<typeof data>(data)).type.toBe<QueryFilter<Data>>();
