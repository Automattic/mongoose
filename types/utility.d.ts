declare module 'mongoose' {

  type Unpacked<T> = T extends (infer U)[] ?
    U :
    T extends ReadonlyArray<infer U> ? U : T;

  type UnpackedIntersection<T, U> = T extends null ? null : T extends (infer A)[]
    ? (Omit<A, keyof U> & U)[]
    : keyof U extends never
      ? T
      : Omit<T, keyof U> & U;

  type MergeType<A extends Record<number | string, any>, B extends Record<number | string, any>> = Omit<A, keyof B> & B;

}
