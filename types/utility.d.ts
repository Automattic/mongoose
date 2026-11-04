declare module 'mongoose' {
  import mongodb = require('mongodb');

  type IsNonDefiningProjection<Value, Key, Projection> = Value extends { $slice: any } | { $meta: any }
    ? true
    : Key extends '_id'
      ? Value extends 0 | false
        ? false
        // Including `_id` only defines inclusion when no other key defines the mode.
        : Exclude<Projection[Exclude<keyof Projection, '_id'>], { $slice: any } | { $meta: any }> extends never ? false : true
      : false;
  type ProjectionPath<Key> = Key extends `${infer Parent}.$` ? Parent : Key;
  type ProjectionRoot<Key> = Key extends `${infer Root}.${string}` ? Root : Key;
  type ProjectionSubpath<Key, Root extends string> = Key extends `${Root}.${infer Rest}` ? Rest : never;
  // Values MongoDB treats as scalars: an inclusion path into a scalar removes it from the result, an exclusion
  // path leaves it as is. `Error` is left out because plain objects with `name` and `message` also match it.
  type ProjectionScalar = Exclude<TreatAsPrimitives, Error> | mongodb.BSON.BSONValue;
  // Values with subpaths we can't narrow, because rebuilding them as plain objects would lose their methods.
  type ProjectionOpaque = Map<any, any> | Types.Array<any> | Document;
  type PickProjectedPaths<T, Keys> = IfAny<
    T,
    { [K in ProjectionRoot<Keys> & string]: any },
    // Intersecting with `keyof T` rather than filtering `keyof T` so projected paths on index signatures are kept.
    NarrowProjectedPaths<Pick<T, ProjectionRoot<Keys> & keyof T>, Keys>
  >;
  type NarrowProjectedPaths<T, Keys> = {
    [K in keyof T as [Exclude<NarrowProjectedPath<T, K, Keys>, undefined>] extends [never] ? never : K]: NarrowProjectedPath<T, K, Keys>
  };
  type NarrowProjectedPath<T, K extends keyof T, Keys> = K extends Keys
    ? T[K]
    : PickNestedProjectedPaths<T[K], ProjectionSubpath<Keys, K & string>>;
  // `undefined` means this value won't be in the result. MongoDB filters these out of arrays instead.
  type PickNestedProjectedPaths<T, Keys> = IfAny<
    T,
    T,
    T extends ProjectionScalar
      ? undefined
      : T extends Types.DocumentArray<infer Raw, infer Hydrated>
        ? IfAny<Raw, T, ProjectedDocumentArray<Raw, Hydrated, PickProjectedPaths<Raw, Keys>>>
        : T extends ProjectionOpaque
          ? T
          : T extends Array<infer Item>
            ? NonNullable<PickNestedProjectedPaths<Item, Keys>>[]
            : T extends AnyObject
              ? EmptyIfNoKeys<PickProjectedPaths<T, Keys>>
              : T
  >;
  // Only for nested paths: top-level results are intersected with `_id`, which `Record<string, never>` would make `never`.
  type EmptyIfNoKeys<T> = [keyof T] extends [never] ? Record<string, never> : T;
  // Swaps the raw paths on the hydrated subdocument for the narrowed ones, which keeps document methods and any custom
  // methods. `_id` stays because `Types.Subdocument` requires it.
  type ProjectedDocumentArray<Raw, Hydrated, Narrowed, Item = Omit<Hydrated, Exclude<keyof Raw, '_id'>> & Narrowed> =
    Item extends Types.Subdocument<any, any, any> ? Types.DocumentArray<Narrowed, Item> : Types.DocumentArray<Narrowed>;
  type OmitProjectedPaths<T, Keys> = IfAny<
    T,
    Omit<T, Extract<Keys, keyof T>>,
    // A non-literal key could be any path, so we can't tell which paths the projection removes.
    string extends Keys
      ? T
      : {
        [K in keyof T as K extends Keys ? never : K]: K extends ProjectionRoot<Keys>
          ? OmitNestedProjectedPaths<T[K], ProjectionSubpath<Keys, K & string>>
          : T[K]
      }
  >;
  type OmitNestedProjectedPaths<T, Keys> = IfAny<
    T,
    T,
    T extends Types.DocumentArray<infer Raw, infer Hydrated>
      ? IfAny<Raw, T, ProjectedDocumentArray<Raw, Hydrated, OmitProjectedPaths<Raw, Keys>>>
      : T extends ProjectionScalar | ProjectionOpaque
        ? T
        : T extends Array<infer Item>
          ? OmitNestedProjectedPaths<Item, Keys>[]
          : T extends AnyObject
            ? Extract<ProjectionRoot<Keys>, keyof T> extends never ? T : OmitProjectedPaths<T, Keys>
            : T
  >;
  type DefiningProjectionKeys<Projection> = {
    [Key in keyof Projection]-?: Key extends string
      ? IsNonDefiningProjection<Projection[Key], Key, Projection> extends true ? never : ProjectionPath<Key>
      : never
  }[keyof Projection];
  // `$slice` doesn't set the mode, but in an inclusion projection the sliced path is part of the result.
  type SliceProjectionKeys<Projection> = {
    [Key in keyof Projection]-?: Key extends string
      ? Projection[Key] extends { $slice: any } ? ProjectionPath<Key> : never
      : never
  }[keyof Projection];
  type DefiningProjectionValues<Projection> = {
    [Key in keyof Projection]-?: IsNonDefiningProjection<Projection[Key], Key, Projection> extends true ? never : Projection[Key]
  }[keyof Projection];

  export type ApplyProjection<T, Projection> = Projection extends string
    ? T
    : Projection extends AnyObject
      ? [DefiningProjectionKeys<Projection>] extends [never]
        ? T
        : Exclude<DefiningProjectionValues<Projection>, 0 | false | undefined> extends never
          ? OmitProjectedPaths<T, DefiningProjectionKeys<Projection>>
          : PickProjectedPaths<T, DefiningProjectionKeys<Projection> | SliceProjectionKeys<Projection>> &
            (Projection extends { _id?: infer Id }
              ? Id extends 0 | false
                ? unknown
                : Pick<T, Extract<'_id', keyof T>>
              : Pick<T, Extract<'_id', keyof T>>)
      : T;

  export type ProjectedHydratedDocument<RawDocType, Projection, TInstanceMethods = {}, TQueryHelpers = {}, TVirtuals = {}> =
    Projection extends { _id?: infer Id }
      ? Id extends 0 | false
        ? Omit<HydratedDocument<ApplyProjection<RawDocType, Projection>, TInstanceMethods, TQueryHelpers, TVirtuals>, '_id'>
        : HydratedDocument<ApplyProjection<RawDocType, Projection>, TInstanceMethods, TQueryHelpers, TVirtuals>
      : HydratedDocument<ApplyProjection<RawDocType, Projection>, TInstanceMethods, TQueryHelpers, TVirtuals>;

  type IfAny<IFTYPE, THENTYPE, ELSETYPE = IFTYPE> = 0 extends 1 & IFTYPE
    ? THENTYPE
    : ELSETYPE;
  type IsUnknown<T> = unknown extends T ? true : false;

  type IsNotNever<T> = [T] extends [never] ? false : true;
  type IsAny<T> = 0 extends 1 & T ? true : false;

  type WithLevel1NestedPaths<T, K extends keyof T = keyof T> = IsItRecordAndNotAny<T> extends true ? {
    [P in K | NestedPaths<Required<T>, K>]: P extends K
      // Handle top-level paths
      // First, drill into documents so we don't end up surfacing `$assertPopulated`, etc.
      ? Extract<NonNullable<T[P]>, Document> extends never
        // If not a document, then return the type. Otherwise, get the DocType.
        ? NonNullable<T[P]>
        : Extract<NonNullable<T[P]>, Document> extends Document<any, any, infer DocType, any>
          ? DocType | Exclude<NonNullable<T[P]>, Document>
          : never
      // Handle nested paths
      : P extends `${infer Key}.${infer Rest}`
        ? Key extends keyof T
          ? NonNullable<T[Key]> extends (infer U)[]
            ? NonNullable<T[Key]> extends Types.DocumentArray<infer TRawDocType>
              ? Rest extends keyof NonNullable<TRawDocType>
                ? NonNullable<TRawDocType>[Rest]
                : never
            : Rest extends keyof NonNullable<U>
              ? NonNullable<U>[Rest]
              : never
            : Rest extends keyof NonNullable<T[Key]>
              ? NonNullable<T[Key]>[Rest]
              : never
          : never
        : never;
  } : T;

  type HasStringIndex<T> =
    string extends Extract<keyof T, string> ? true : false;

  type SafeObjectKeys<T> =
    HasStringIndex<T> extends true ? never : Extract<keyof T, string>;

  type NestedPaths<T, K extends keyof T> =
    K extends string
      ? T[K] extends TreatAsPrimitives
        ? never
        : Extract<NonNullable<T[K]>, Document> extends never
          ? NonNullable<T[K]> extends Array<infer U>
            ? NonNullable<T[K]> extends Types.DocumentArray<infer TRawDocType>
              ? SafeObjectKeys<NonNullable<TRawDocType>> extends never
                ? never
                : `${K}.${SafeObjectKeys<NonNullable<TRawDocType>>}`
              : NonNullable<U> extends Record<string, any>
                ? SafeObjectKeys<NonNullable<U>> extends never
                  ? never
                  : `${K}.${SafeObjectKeys<NonNullable<U>>}`
                : never
            : NonNullable<T[K]> extends object
              ? SafeObjectKeys<NonNullable<T[K]>> extends never
                ? never
                : `${K}.${SafeObjectKeys<NonNullable<T[K]>>}`
              : never
          : Extract<NonNullable<T[K]>, Document> extends Document<any, any, infer DocType, any>
            ? DocType extends object
              ? SafeObjectKeys<NonNullable<DocType>> extends never
                ? never
                : `${K}.${SafeObjectKeys<NonNullable<DocType>>}`
              : never
            : never
      : never;

  type WithoutUndefined<T> = T extends undefined ? never : T;

  /**
   * @summary Removes keys from a type
   * @description It helps to exclude keys from a type
   * @param {T} T A generic type to be checked.
   * @param {K} K Keys from T that are to be excluded from the generic type
   * @returns T with the keys in K excluded
   */
  type ExcludeKeys<T, K extends keyof T> = {
    [P in keyof T as P extends K ? never : P]: T[P];
  };

  type Unpacked<T> = T extends (infer U)[]
    ? U
    : T extends ReadonlyArray<infer U>
    ? U
    : T;

  type DeepPartial<T> =
    T extends TreatAsPrimitives ? T :
    T extends Array<infer U> ? DeepPartial<U>[] :
    T extends Record<string, any> ? { [K in keyof T]?: DeepPartial<T[K]> } :
    T;

  type UnpackedIntersection<T, U> = T extends null
    ? null
    : T extends (infer A)[]
    ? (A extends any ? (Omit<A, keyof U> & U) : never)[]
    : keyof U extends never
    ? T
    : T extends any ? (Omit<T, keyof U> & U) : never;

  type MergeTypeKeys<T> = T extends unknown ? keyof T : never;

  type MergeType<A, B> = [B] extends [object]
    ? [MergeTypeKeys<B>] extends [never]
      ? A
      : A extends unknown ? Omit<A, keyof B> & B : never
    : A extends unknown ? Omit<A, keyof B> & B : never;

  /**
   * @summary Converts Unions to one record "object".
   * @description It makes intellisense dialog box easier to read as a single object instead of showing that in multiple object unions.
   * @param {T} T The type to be converted.
   */
  type FlatRecord<T> = { [K in keyof T]: T[K] };

  /** Force an operation like `{ a: 0 } & { b: 1 }` to be computed so that it displays `{ a: 0; b: 1 }`. */
  export type Show<t> = { [k in keyof t]: t[k] } & unknown;

  /**
   * @summary Checks if a type is "Record" or "any".
   * @description It Helps to check if user has provided schema type "EnforcedDocType"
   * @param {T} T A generic type to be checked.
   * @returns true if {@link T} is Record OR false if {@link T} is of any type.
   */
  type IsItRecordAndNotAny<T> = IfEquals<
    T,
    any,
    false,
    T extends Record<any, any> ? true : false
  >;

  /**
   * @summary Checks if two types are identical.
   * @param {T} T The first type to be compared with {@link U}.
   * @param {U} U The second type to be compared with {@link T}.
   * @param {Y} Y A type to be returned if {@link T} &  {@link U} are identical.
   * @param {N} N A type to be returned if {@link T} &  {@link U} are not identical.
   */
  type IfEquals<T, U, Y = true, N = false> = (<G>() => G extends T
    ? 1
    : 0) extends <G>() => G extends U ? 1 : 0
    ? Y
    : N;

  /**
   * @summary Extracts 'this' parameter from a function, if it exists. Otherwise, returns fallback.
   * @param {T} T Function type to extract 'this' parameter from.
   * @param {F} F Fallback type to return if 'this' parameter does not exist.
   */
  type ThisParameter<T, F> = T extends { (this: infer This, ...args: never): void } ? This : F;

  /**
   * @summary Decorates all functions in an object with 'this' parameter.
   * @param {T} T Object with functions as values to add 'D' parameter to as 'this'. {@link D}
   * @param {D} D The type to be added as 'this' parameter to all functions in {@link T}.
   */
  type AddThisParameter<T, D> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer R
      ? IsUnknown<ThisParameter<T[K], unknown>> extends true
        ? (this: D, ...args: A) => R
        : T[K]
      : T[K];
  };

  type OmitThisParameterIfFunction<T> = T extends (...args: any[]) => any ? OmitThisParameter<T> : T;

  // Strip explicit `this` parameter from methods in schema type options. The `this` parameter
  // is just for type-checking the function body. Keeping the explicit 'this' typing can cause
  // compiler errors on the method calls, so remove it for the hydrated document definition.
  type HydratedDocumentOverrides<T> = {
    [K in keyof T]: OmitThisParameterIfFunction<T[K]>;
  };

  /**
   * @summary Adds timestamp fields to a type
   * @description Adds createdAt and updatedAt fields of type Date, or custom timestamp fields if specified
   * @param {T} T The type to add timestamp fields to
   * @param {P} P Optional SchemaTimestampsConfig or boolean to customize timestamp field names
   * @returns T with timestamp fields added
   */
  export type WithTimestamps<
    T,
    P extends SchemaTimestampsConfig | boolean = true
  > = ResolveTimestamps<T, { timestamps: P }>;
}
