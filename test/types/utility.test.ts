import { MergeType, WithTimestamps } from 'mongoose';
import { expectType } from 'tsd';

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
