import { FilterQuery, sanitizeFilter } from 'mongoose';
import { expectType } from 'tsd';

const data = { username: 'val', pwd: { $ne: null } };
type Data = typeof data;

expectType<FilterQuery<Data>>(sanitizeFilter<typeof data>(data));
