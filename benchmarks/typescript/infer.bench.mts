import { bench } from "@ark/attest";
import type { InferRawDocType } from "mongoose";

bench.baseline(() => {
  const baselineDefinition = {
    foo: {
      type: Boolean,
    },
    bar: {
      type: Number,
      required: true,
    },
  };
  type BaselineType = InferRawDocType<typeof baselineDefinition>;
});

const schemaDefinition = {
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  dateOfBirth: {
    type: Date,
  },
};

bench("InferRawDocType", () => {
  type UserType = InferRawDocType<typeof schemaDefinition>;
  // original 165
}).types([98, "instantiations"]);
