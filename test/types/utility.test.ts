import { MergeType } from 'mongoose';
import { expectType } from 'tsd';

type A = { a: string, c: number };
type B = { a: number, b: string };

expectType<string>({} as MergeType<B, A>['a']);
expectType<string>({} as MergeType<B, A>['b']);
expectType<number>({} as MergeType<B, A>['c']);

expectType<number>({} as MergeType<A, B>['a']);
expectType<string>({} as MergeType<A, B>['b']);
expectType<number>({} as MergeType<A, B>['c']);
