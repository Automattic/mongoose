import { MergeType, WithTimestamps, WithLevel1NestedPaths, PopulatedDoc, Document, Types } from 'mongoose';
import { expectType, expectAssignable } from 'tsd';

type A = { a: string, c: number };
type B = { a: number, b: string };

expectType<string>({} as MergeType<B, A>['a']);
expectType<string>({} as MergeType<B, A>['b']);
expectType<number>({} as MergeType<B, A>['c']);

expectType<number>({} as MergeType<A, B>['a']);
expectType<string>({} as MergeType<A, B>['b']);
expectType<number>({} as MergeType<A, B>['c']);

type C = WithTimestamps<{ a: string; b: string }>;
expectType<string>({} as C['a']);
expectType<string>({} as C['b']);
expectType<Date>({} as C['createdAt']);
expectType<Date>({} as C['updatedAt']);

type D = WithTimestamps<
  { a: string; b: string },
  {
    createdAt: 'created';
    updatedAt: 'modified';
  }
>;
expectType<string>({} as D['a']);
expectType<string>({} as D['b']);
expectType<Date>({} as D['created']);
expectType<Date>({} as D['modified']);

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
expectAssignable<NestedPaths['refField']>({ name: 'test' } as RefSchema);
expectAssignable<NestedPaths['refField']>(new Types.ObjectId());
