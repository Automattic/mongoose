export declare function Expect<T extends true>(): void;

export declare const ExpectType: <Expected>(value: Expected) => void;

export declare const ExpectAssignable: <Expected>() =>
  <Actual extends Expected>(value: Actual) => void;
