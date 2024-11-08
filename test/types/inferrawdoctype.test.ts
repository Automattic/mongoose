import { InferRawDocType } from 'mongoose';
import { expectType, expectError } from 'tsd';

function gh14839() {
  const schemaDefinition = {
    email: {
      type: String,
      trim: true,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
      type: String,
      required: true
    },
    dateOfBirth: {
      type: Date,
      required: true
    }
  };

  type UserType = InferRawDocType< typeof schemaDefinition>;
  expectType<{ email: string, password: string, dateOfBirth: Date }>({} as UserType);
}
