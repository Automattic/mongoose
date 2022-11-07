declare module 'mongoose' {
  type IfAny<IFTYPE, THENTYPE, ELSETYPE = IFTYPE> = 0 extends (1 & IFTYPE) ? THENTYPE : ELSETYPE;

  type Unpacked<T> = T extends (infer U)[] ?
    U :
    T extends ReadonlyArray<infer U> ? U : T;

  type UnpackedIntersection<T, U> = T extends null ? null : T extends (infer A)[]
    ? (Omit<A, keyof U> & U)[]
    : keyof U extends never
      ? T
      : Omit<T, keyof U> & U;

  type MergeType<A, B> = Omit<A, keyof B> & B;

  /**
   * @summary Converts Unions to one record "object".
   * @description It makes intellisense dialog box easier to read as a single object instead of showing that in multiple object unions.
   * @param {T} T The type to be converted.
   */
   type FlatRecord<T> = { [K in keyof T]: T[K] };

   /**
 * @summary Checks if a type is "Record" or "any".
 * @description It Helps to check if user has provided schema type "EnforcedDocType"
 * @param {T} T A generic type to be checked.
 * @returns true if {@link T} is Record OR false if {@link T} is of any type.
 */
type IsItRecordAndNotAny<T> = IfEquals<T, any, false, T extends Record<any, any> ? true : false>;

/**
 * @summary Checks if two types are identical.
 * @param {T} T The first type to be compared with {@link U}.
 * @param {U} U The seconde type to be compared with {@link T}.
 * @param {Y} Y A type to be returned if {@link T} &  {@link U} are identical.
 * @param {N} N A type to be returned if {@link T} &  {@link U} are not identical.
 */
type IfEquals<T, U, Y = true, N = false> =
    (<G>() => G extends T ? 1 : 0) extends
    (<G>() => G extends U ? 1 : 0) ? Y : N;

}
