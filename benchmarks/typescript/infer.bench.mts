import { bench } from "@ark/attest";
import type { InferRawDocType } from "mongoose";

const schemaDefinition = {
  email: {
    type: String,
    trim: true,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  dateOfBirth: {
    type: Date,
    required: true,
  },
};

bench("InferRawDocType", () => {
  type UserType = InferRawDocType<typeof schemaDefinition>;
}).types([471, "instantiations"]);
