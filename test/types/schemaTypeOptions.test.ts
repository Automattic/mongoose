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
import { expectError, expectType } from 'tsd';

(new SchemaTypeOptions<boolean>()) instanceof SchemaTypeOptions;

expectType<BooleanSchemaDefinition | undefined>(new SchemaTypeOptions<boolean>().type);
expectType<NumberSchemaDefinition | undefined>(new SchemaTypeOptions<number>().type);
expectType<DateSchemaDefinition | undefined>(new SchemaTypeOptions<Date>().type);
expectType<StringSchemaDefinition | undefined>(new SchemaTypeOptions<string>().type);
expectType<SchemaDefinition<typeof Map> | undefined>(new SchemaTypeOptions<Map<any, any>>().type);
expectType<SchemaDefinition<typeof Buffer> | undefined>(new SchemaTypeOptions<Buffer>().type);
expectType<ObjectIdSchemaDefinition | undefined>(new SchemaTypeOptions<Types.ObjectId>().type);
expectType<AnyArray<ObjectIdSchemaDefinition> | AnyArray<SchemaTypeOptions<ObjectId>> | undefined>(new SchemaTypeOptions<Types.ObjectId[]>().type);
expectType<(AnyArray<Schema<any, any, any>> | AnyArray<SchemaDefinition<Unpacked<object[]>>> | AnyArray<SchemaTypeOptions<Unpacked<object[]>>>) | undefined>(new SchemaTypeOptions<object[]>().type);
expectType<AnyArray<StringSchemaDefinition> | AnyArray<SchemaTypeOptions<string>> | undefined>(new SchemaTypeOptions<string[]>().type);
expectType<AnyArray<NumberSchemaDefinition> | AnyArray<SchemaTypeOptions<number>> | undefined>(new SchemaTypeOptions<number[]>().type);
expectType<AnyArray<BooleanSchemaDefinition> | AnyArray<SchemaTypeOptions<boolean>> | undefined>(new SchemaTypeOptions<boolean[]>().type);
expectType<(Function | typeof SchemaType | Schema<any, any, any> | SchemaDefinition<Function> | Function | AnyArray<Function>) | undefined>(new SchemaTypeOptions<Function>().type);

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

  expectError<SchemaTypeOptions<string>['index']>(''); // test empty string value
  expectError<SchemaTypeOptions<string>['index']>('invalid'); // test invalid string value
  expectError<SchemaTypeOptions<string>['index']>(0); // test invalid number
  expectError<SchemaTypeOptions<string>['index']>(2); // test invalid number
  expectError<SchemaTypeOptions<string>['index']>(-2); // test invalid number
  expectError<SchemaTypeOptions<string>['index']>(new Date()); // test invalid type
}
