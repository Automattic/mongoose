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
import { ExpectType } from './util/assertions';

(new SchemaTypeOptions<boolean>()) instanceof SchemaTypeOptions;

ExpectType<BooleanSchemaDefinition | undefined>(new SchemaTypeOptions<boolean>().type);
ExpectType<NumberSchemaDefinition | undefined>(new SchemaTypeOptions<number>().type);
ExpectType<DateSchemaDefinition | undefined>(new SchemaTypeOptions<Date>().type);
ExpectType<StringSchemaDefinition | undefined>(new SchemaTypeOptions<string>().type);
ExpectType<SchemaDefinition<typeof Map> | undefined>(new SchemaTypeOptions<Map<any, any>>().type);
ExpectType<SchemaDefinition<typeof Buffer> | undefined>(new SchemaTypeOptions<Buffer>().type);
ExpectType<ObjectIdSchemaDefinition | undefined>(new SchemaTypeOptions<Types.ObjectId>().type);
ExpectType<AnyArray<ObjectIdSchemaDefinition> | AnyArray<SchemaTypeOptions<ObjectId>> | undefined>(new SchemaTypeOptions<Types.ObjectId[]>().type);
ExpectType<AnyArray<Schema<any, any, any>> | AnyArray<SchemaDefinition<Unpacked<object[]>>> | AnyArray<SchemaTypeOptions<Unpacked<object[]>>> | undefined>(new SchemaTypeOptions<object[]>().type);
ExpectType<AnyArray<StringSchemaDefinition> | AnyArray<SchemaTypeOptions<string>> | undefined>(new SchemaTypeOptions<string[]>().type);
ExpectType<AnyArray<NumberSchemaDefinition> | AnyArray<SchemaTypeOptions<number>> | undefined>(new SchemaTypeOptions<number[]>().type);
ExpectType<AnyArray<BooleanSchemaDefinition> | AnyArray<SchemaTypeOptions<boolean>> | undefined>(new SchemaTypeOptions<boolean[]>().type);
ExpectType<Function | typeof SchemaType | Schema<any, any, any> | SchemaDefinition<Function> | Function | AnyArray<Function> | undefined>(new SchemaTypeOptions<Function>().type);

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
  ExpectType<Record<string, any> | undefined>(SchemaType.defaultOptions);
  ExpectType<Record<string, any>>(Schema.Types.String.defaultOptions);
  ExpectType<Record<string, any>>(Schema.Types.Boolean.defaultOptions);
  ExpectType<Record<string, any>>(Schema.Types.Array.defaultOptions);
  ExpectType<Record<string, any>>(Schema.Types.Buffer.defaultOptions);
  ExpectType<Record<string, any>>(Schema.Types.Date.defaultOptions);
  ExpectType<Record<string, any>>(Schema.Types.Decimal128.defaultOptions);
  ExpectType<Record<string, any>>(Schema.Types.Int32.defaultOptions);
  ExpectType<Record<string, any>>(Schema.Types.DocumentArray.defaultOptions);
  ExpectType<Record<string, any>>(Schema.Types.Map.defaultOptions);
  ExpectType<Record<string, any>>(Schema.Types.Mixed.defaultOptions);
  ExpectType<Record<string, any>>(Schema.Types.Number.defaultOptions);
  ExpectType<Record<string, any>>(Schema.Types.ObjectId.defaultOptions);
  ExpectType<Record<string, any>>(Schema.Types.Double.defaultOptions);
  ExpectType<Record<string, any>>(Schema.Types.Subdocument.defaultOptions);
  ExpectType<Record<string, any>>(Schema.Types.UUID.defaultOptions);
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
