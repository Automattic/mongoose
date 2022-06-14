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
import { expectType } from 'tsd';

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
