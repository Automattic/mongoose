import { QueryFilter, sanitizeFilter } from 'mongoose';
import { ExpectType } from './util/assertions';

const data = { username: 'val', pwd: { $ne: null } };
type Data = typeof data;

ExpectType<QueryFilter<Data>>(sanitizeFilter<typeof data>(data));
