export type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;

export declare function Expect<T extends true>(): void;

export declare const ExpectType: <Expected>() =>
  <Actual>(value: Equal<Actual, Expected> extends true ? Actual : never) => void;

export declare const ExpectAssignable: <Expected>() =>
  <Actual extends Expected>(value: Actual) => void;

export declare const ExpectNotType: <Expected>() =>
  <Actual>(value: Equal<Actual, Expected> extends false ? Actual : never) => void;
