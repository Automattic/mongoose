import { MergeType, WithTimestamps } from 'mongoose';
import { ExpectType } from './helpers';

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
