// Pinned to a stricter tsconfig (`exactOptionalPropertyTypes: true`,
// `skipLibCheck: false`) via the tsconfig.json in this directory. tstyche
// uses tsserver's project service to pick up the nearest tsconfig per file,
// so this test ensures mongoose's own .d.ts files type-check cleanly under
// these settings.
import mongoose, { InferSchemaType } from 'mongoose';
import { expect } from 'tstyche';

interface IUser {
  name: string;
  email: string;
  createdAt: Date;
}

const userSchema = new mongoose.Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

mongoose.model<IUser>('User', userSchema);

expect<InferSchemaType<typeof userSchema>>().type.toBe<IUser>();
