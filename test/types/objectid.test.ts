import { Types } from 'mongoose';

const oid = new Types.ObjectId();
oid.toHexString();
oid._id;

(new Types.ObjectId()).toHexString();
