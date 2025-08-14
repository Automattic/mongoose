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

// force lazily evaluated properties to be checked
type ValueOf<T> = T extends unknown ? T[keyof T] : never;

bench('InferRawDocType (basic)', () => {
  type UserType = InferRawDocType<typeof schemaDefinition>;
  // force lazily evaluated properties to be checked
  type Value = ValueOf<UserType>;
  // original 506
}).types([320, 'instantiations']);

bench('InferRawDocType (mixed)', () => {
  type T = InferRawDocType<{
    foo: typeof Schema.Types.Mixed;
    bar: {};
    baz: ObjectConstructor;
  }>;
  // force lazily evaluated properties to be checked
  type Value = ValueOf<T>;
  // original 1620
}).types([535, 'instantiations']);

bench('InferRawDocType (nested)', () => {
  type T = InferRawDocType<{
    foo: {
      1: {
        2: {
          type: String;
        };
      };
    };
    bar: {
      3: {
        4: {
          type: 'string';
        };
      };
    };
    baz: {
      5: {
        6: {
          type: 'String';
        };
      };
    };
  }>;

  type Value = ValueOf<ValueOf<ValueOf<T>>>;
}).types([2097, 'instantiations']);
