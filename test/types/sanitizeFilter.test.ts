import { QueryFilter, sanitizeFilter } from 'mongoose';
import { expectType } from 'tsd';

const data = { username: 'val', pwd: { $ne: null } };
type Data = typeof data;

expectType<QueryFilter<Data>>(sanitizeFilter<typeof data>(data));
