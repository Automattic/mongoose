import { BSON } from 'mongodb';
import {
  AnyArray,
  Schema,
  SchemaDefinition,
  SchemaType,
  SchemaTypeOptions,
  Types,
  ObjectId,
  Unpacked,

  BooleanSchemaDefinition,
  DateSchemaDefinition,
  NumberSchemaDefinition,
  ObjectIdSchemaDefinition,
  StringSchemaDefinition
} from 'mongoose';
import { expect } from 'tstyche';

(new SchemaTypeOptions<boolean>()) instanceof SchemaTypeOptions;

expect(new SchemaTypeOptions<boolean>().type).type.toBe<BooleanSchemaDefinition | undefined>();
expect(new SchemaTypeOptions<number>().type).type.toBe<NumberSchemaDefinition | undefined>();
expect(new SchemaTypeOptions<Date>().type).type.toBe<DateSchemaDefinition | undefined>();
expect(new SchemaTypeOptions<string>().type).type.toBe<StringSchemaDefinition | undefined>();
expect(new SchemaTypeOptions<Map<any, any>>().type).type.toBe<SchemaDefinition<typeof Map> | undefined>();
expect(new SchemaTypeOptions<Buffer>().type).type.toBe<SchemaDefinition<typeof Buffer> | undefined>();
expect(new SchemaTypeOptions<Types.ObjectId>().type).type.toBe<ObjectIdSchemaDefinition | undefined>();
expect(new SchemaTypeOptions<Types.ObjectId[]>().type).type.toBe<AnyArray<ObjectIdSchemaDefinition> | AnyArray<SchemaTypeOptions<ObjectId>> | undefined>();
expect(new SchemaTypeOptions<object[]>().type).type.toBe<AnyArray<Schema<any, any, any>> | AnyArray<SchemaDefinition<Unpacked<object[]>>> | AnyArray<SchemaTypeOptions<Unpacked<object[]>>> | undefined>();
expect(new SchemaTypeOptions<string[]>().type).type.toBe<AnyArray<StringSchemaDefinition> | AnyArray<SchemaTypeOptions<string>> | undefined>();
expect(new SchemaTypeOptions<number[]>().type).type.toBe<AnyArray<NumberSchemaDefinition> | AnyArray<SchemaTypeOptions<number>> | undefined>();
expect(new SchemaTypeOptions<boolean[]>().type).type.toBe<AnyArray<BooleanSchemaDefinition> | AnyArray<SchemaTypeOptions<boolean>> | undefined>();
expect(new SchemaTypeOptions<Function>().type).type.toBe<Function | typeof SchemaType | Schema<any, any, any> | SchemaDefinition<Function> | Function | AnyArray<Function> | undefined>();

function index() {
  new SchemaTypeOptions<string>().index = true;
  new SchemaTypeOptions<string>().index = false;
  new SchemaTypeOptions<string>().index = 1;
  new SchemaTypeOptions<string>().index = -1;
  new SchemaTypeOptions<string>().index = 'text';
  new SchemaTypeOptions<string>().index = '2d';
  new SchemaTypeOptions<string>().index = 'geoHaystack';
  new SchemaTypeOptions<string>().index = 'hashed';
  new SchemaTypeOptions<string>().index = 'ascending';
  new SchemaTypeOptions<string>().index = 'asc';
  new SchemaTypeOptions<string>().index = 'descending';
  new SchemaTypeOptions<string>().index = 'desc';

  // @ts-expect-error  Type '""' is not assignable to type 'boolean | IndexDirection | IndexOptions | undefined'.
  new SchemaTypeOptions<string>().index = '';
  // @ts-expect-error  Type '"invalid"' is not assignable to type 'boolean | IndexDirection | IndexOptions | undefined'.
  new SchemaTypeOptions<string>().index = 'invalid';
  // @ts-expect-error  Type '0' is not assignable to type 'boolean | IndexDirection | IndexOptions | undefined'.
  new SchemaTypeOptions<string>().index = 0;
  // @ts-expect-error  Type '2' is not assignable to type 'boolean | IndexDirection | IndexOptions | undefined'.
  new SchemaTypeOptions<string>().index = 2;
  // @ts-expect-error  Type '-2' is not assignable to type 'boolean | IndexDirection | IndexOptions | undefined'.
  new SchemaTypeOptions<string>().index = -2;
  // @ts-expect-error  Type 'Date' is not assignable to type 'boolean | IndexDirection | IndexOptions | undefined'.
  new SchemaTypeOptions<string>().index = new Date();
}

function defaultOptions() {
  // property "defaultOptions" may not be defined on the base "SchemaType", but is explicitly defined on all mongoose provided Schema.Types
  // https://github.com/Automattic/mongoose/blob/5528a6428bb08091c03d868e249c2e5a30144a71/lib/schematype.js#L55
  expect(SchemaType.defaultOptions).type.toBe<Record<string, any> | undefined>();
  expect(Schema.Types.String.defaultOptions).type.toBe<Record<string, any>>();
  expect(Schema.Types.Boolean.defaultOptions).type.toBe<Record<string, any>>();
  expect(Schema.Types.Array.defaultOptions).type.toBe<Record<string, any>>();
  expect(Schema.Types.Buffer.defaultOptions).type.toBe<Record<string, any>>();
  expect(Schema.Types.Date.defaultOptions).type.toBe<Record<string, any>>();
  expect(Schema.Types.Decimal128.defaultOptions).type.toBe<Record<string, any>>();
  expect(Schema.Types.Int32.defaultOptions).type.toBe<Record<string, any>>();
  expect(Schema.Types.DocumentArray.defaultOptions).type.toBe<Record<string, any>>();
  expect(Schema.Types.Map.defaultOptions).type.toBe<Record<string, any>>();
  expect(Schema.Types.Mixed.defaultOptions).type.toBe<Record<string, any>>();
  expect(Schema.Types.Number.defaultOptions).type.toBe<Record<string, any>>();
  expect(Schema.Types.ObjectId.defaultOptions).type.toBe<Record<string, any>>();
  expect(Schema.Types.Double.defaultOptions).type.toBe<Record<string, any>>();
  expect(Schema.Types.Subdocument.defaultOptions).type.toBe<Record<string, any>>();
  expect(Schema.Types.UUID.defaultOptions).type.toBe<Record<string, any>>();
}

function encrypt() {
  const uuid = new BSON.UUID();
  const binary = new BSON.Binary();

  new SchemaTypeOptions<string>()['encrypt'] = { keyId: uuid, algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic' };
  new SchemaTypeOptions<string>()['encrypt'] = { keyId: uuid, algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random' };
  new SchemaTypeOptions<string>()['encrypt'] = { keyId: uuid, algorithm: undefined };
  new SchemaTypeOptions<string>()['encrypt'] = { keyId: [uuid], algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Random' };

  // qe + valid queries
  new SchemaTypeOptions<string>()['encrypt'] = { keyId: uuid, queries: 'equality' };
  new SchemaTypeOptions<string>()['encrypt'] = { keyId: uuid, queries: 'range' };
  new SchemaTypeOptions<string>()['encrypt'] = { keyId: uuid, queries: undefined };

  // @ts-expect-error  Type '{}' is not assignable to type 'EncryptSchemaTypeOptions | undefined'.
  new SchemaTypeOptions<string>()['encrypt'] = {};

  new SchemaTypeOptions<string>()['encrypt'] = {
    // @ts-expect-error  Type 'string' is not assignable to type '[Binary]'.
    keyId: 'fakeId'
  };

  // @ts-expect-error  Property 'keyId' is missing in type '{ queries: "equality"; }'
  new SchemaTypeOptions<string>()['encrypt'] = { queries: 'equality' };
  // @ts-expect-error  Property 'keyId' is missing in type '{ algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic"; }'
  new SchemaTypeOptions<string>()['encrypt'] = {
    algorithm: 'AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic'
  };

  new SchemaTypeOptions<string>()['encrypt'] = {
    // @ts-expect-error  Type 'UUID' is not assignable to type '[Binary]'.
    keyId: uuid,
    // @ts-expect-error  Type '"SHA_FAKE_ALG"' is not assignable to type '"AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic" | "AEAD_AES_256_CBC_HMAC_SHA_512-Random"'.
    algorithm: 'SHA_FAKE_ALG'
  };

  new SchemaTypeOptions<string>()['encrypt'] = {
    keyId: uuid,
    // @ts-expect-error  Type '"fakeQueryOption"' is not assignable to type '"equality" | "range" | undefined'.
    queries: 'fakeQueryOption'
  };

  new SchemaTypeOptions<string>()['encrypt'] = {
    // @ts-expect-error  Type 'UUID' is not assignable to type '[Binary]'.
    keyId: uuid,
    invalidKey: 'fakeKeyOption'
  };
}
