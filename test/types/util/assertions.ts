import { expectTypeOf } from 'expect-type';

export declare function Expect<T extends true>(): void;

export const ExpectType = <Expected>(value: unknown): void => {
  expectTypeOf(value).toEqualTypeOf<Expected>();
};

export const ExpectAssignable = <Expected>() =>
  <Actual>(value: Actual): void => {
    expectTypeOf(value).toMatchTypeOf<Expected>();
  };
