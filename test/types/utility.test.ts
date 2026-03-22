import { MergeType, WithTimestamps, WithLevel1NestedPaths, PopulatedDoc, Document, Types } from 'mongoose';
import { expect } from 'tstyche';

type A = { a: string, c: number };
type B = { a: number, b: string };

expect<MergeType<B, A>['a']>().type.toBe<string>();
expect<MergeType<B, A>['b']>().type.toBe<string>();
expect<MergeType<B, A>['c']>().type.toBe<number>();

expect<MergeType<A, B>['a']>().type.toBe<number>();
expect<MergeType<A, B>['b']>().type.toBe<string>();
expect<MergeType<A, B>['c']>().type.toBe<number>();

type C = WithTimestamps<{ a: string; b: string }>;
expect<C['a']>().type.toBe<string>();
expect<C['b']>().type.toBe<string>();
expect<C['createdAt']>().type.toBe<Date>();
expect<C['updatedAt']>().type.toBe<Date>();

type D = WithTimestamps<
  { a: string; b: string },
  {
    createdAt: 'created';
    updatedAt: 'modified';
  }
>;
expect<D['a']>().type.toBe<string>();
expect<D['b']>().type.toBe<string>();
expect<D['created']>().type.toBe<Date>();
expect<D['modified']>().type.toBe<Date>();

// Test WithLevel1NestedPaths preserves non-Document parts of PopulatedDoc union types
interface RefSchema {
  name: string;
}

interface SchemaWithPopulatedRef {
  refField: PopulatedDoc<Document<Types.ObjectId, {}, RefSchema> & RefSchema, Types.ObjectId>;
}

type NestedPaths = WithLevel1NestedPaths<SchemaWithPopulatedRef>;

// The refField type should be a union that includes RefSchema and ObjectId
// This ensures that PopulatedDoc fields can be queried with both the populated document and the raw ID
expect<NestedPaths['refField']>().type.toBe<RefSchema | Types.ObjectId>();
