import { bench } from '@ark/attest';
import type { Schema, InferRawDocType } from 'mongoose';

bench.baseline(() => {
  const baselineDefinition = {
    foo: {
      type: String
    },
    bar: {
      type: Number
    },
    dob: {
      type: Date,
      required: true
    }
  };
  type BaselineType = InferRawDocType<typeof baselineDefinition>;
  // force lazily evaluated properties to be checked
  type Foo = BaselineType[keyof BaselineType];
});

const schemaDefinition = {
  email: {
    type: String,
    required: true
  },
  id: {
    type: Number,
    required: true
  },
  dateOfBirth: {
    type: Date
  }
};

bench('InferRawDocType', () => {
  type UserType = InferRawDocType<typeof schemaDefinition>;
  // force lazily evaluated properties to be checked
  type Value = UserType[keyof UserType];
  // original 506
}).types([314, 'instantiations']);

bench('InferRawDocType (mixed)', () => {
  type T = InferRawDocType<{
    foo: typeof Schema.Types.Mixed;
    bar: {};
    baz: ObjectConstructor;
  }>;
  // force lazily evaluated properties to be checked
  type Value = T[keyof T];
}).types([617, 'instantiations']);
