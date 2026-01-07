import { ExpectAssignable, ExpectType } from './helpers';
import { MergeType, WithTimestamps, WithLevel1NestedPaths, PopulatedDoc, Document, Types } from 'mongoose';

type A = { a: string, c: number };
type B = { a: number, b: string };

ExpectType<string>()({} as MergeType<B, A>['a']);
ExpectType<string>()({} as MergeType<B, A>['b']);
ExpectType<number>()({} as MergeType<B, A>['c']);

ExpectType<number>()({} as MergeType<A, B>['a']);
ExpectType<string>()({} as MergeType<A, B>['b']);
ExpectType<number>()({} as MergeType<A, B>['c']);

type C = WithTimestamps<{ a: string; b: string }>;
ExpectType<string>()({} as C['a']);
ExpectType<string>()({} as C['b']);
ExpectType<Date>()({} as C['createdAt']);
ExpectType<Date>()({} as C['updatedAt']);

type D = WithTimestamps<
  { a: string; b: string },
  {
    createdAt: 'created';
    updatedAt: 'modified';
  }
>;
ExpectType<string>()({} as D['a']);
ExpectType<string>()({} as D['b']);
ExpectType<Date>()({} as D['created']);
ExpectType<Date>()({} as D['modified']);

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
ExpectAssignable<NestedPaths['refField']>()({ name: 'test' } as RefSchema);
ExpectAssignable<NestedPaths['refField']>()(new Types.ObjectId());
