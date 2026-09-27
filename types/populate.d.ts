declare module 'mongoose' {

  /**
   * Reference another Model
   */
  type PopulatedDoc<
    PopulatedType,
    RawId extends RefType = (PopulatedType extends { _id?: RefType; } ? NonNullable<PopulatedType['_id']> : Types.ObjectId) | undefined
  > = PopulatedType | RawId;

  const mongoosePopulatedDocumentMarker: unique symbol;

  type ExtractDocumentObjectType<T> = T extends infer ObjectType & Document ? FlatRecord<ObjectType> : T;

  type PopulatePathToRawDocType<T> =
    T extends Types.DocumentArray<any, infer ItemType>
      ? PopulatePathToRawDocType<ItemType>[]
      : T extends Array<infer ItemType>
        ? PopulatePathToRawDocType<ItemType>[]
        : T extends Document
          ? SubdocsToPOJOs<ExtractDocumentObjectType<T>>
          : T extends Record<string, any>
            ? { [K in keyof T]: PopulatePathToRawDocType<T[K]> }
            : T;

  type PopulatedPathsDocumentType<RawDocType, Paths> = UnpackedIntersection<RawDocType, PopulatePathToRawDocType<Paths>>;

  type PopulatedDocumentMarker<
    PopulatedRawDocType,
    DepopulatedRawDocType,
  > = {
    [mongoosePopulatedDocumentMarker]?: {
      populated: PopulatedRawDocType,
      depopulated: DepopulatedRawDocType
    }
  };

  type ResolvePopulatedRawDocType<
    ThisType,
    FallbackRawDocType,
    O = never
  > = ThisType extends PopulatedDocumentMarker<infer PopulatedRawDocType, infer DepopulatedRawDocType>
    ? O extends { depopulate: true }
      ? DepopulatedRawDocType
      : PopulatedRawDocType
    : FallbackRawDocType;

  type PopulateDocumentResult<
    Doc,
    Paths,
    PopulatedRawDocType,
    DepopulatedRawDocType = PopulatedRawDocType
  > = MergeType<Doc, Paths> & PopulatedDocumentMarker<PopulatedRawDocType, DepopulatedRawDocType>;

  interface PopulateOptions {
    /** space delimited path(s) to populate */
    path: string;
    /** fields to select */
    select?: any;
    /** query conditions to match */
    match?: any;
    /** optional model to use for population */
    model?: string | Model<any, any, any, any>;
    /** by default, Mongoose removes null and undefined values from populated arrays. Use this option to make `populate()` retain `null` and `undefined` array entries. */
    retainNullValues?: boolean;
    /** if true, Mongoose will call any getters defined on the `localField`. By default, Mongoose gets the raw value of `localField`. */
    getters?: boolean;
    /** if true, Mongoose will clone populated docs before assigning them, so docs that are populated onto multiple parents don't share 1 copy. */
    clone?: boolean;
    /** By default, Mongoose throws a cast error if `localField` and `foreignField` schemas don't line up. If you enable this option, Mongoose will instead filter out any `localField` properties that cannot be casted to `foreignField`'s schema type. */
    skipInvalidIds?: boolean;
    /** optional query options like sort, limit, etc */
    options?: QueryOptions;
    /** correct limit on populated array */
    perDocumentLimit?: number;
    /** optional boolean, set to `false` to allow populating paths that aren't in the schema */
    strictPopulate?: boolean;
    /** deep populate */
    populate?: string | PopulateOptions | (string | PopulateOptions)[];
    /**
     * If true Mongoose will always set `path` to a document, or `null` if no document was found.
     * If false Mongoose will always set `path` to an array, which will be empty if no documents are found.
     * Inferred from schema by default.
     */
    justOne?: boolean;
    /** transform function to call on every populated doc */
    transform?: (doc: any, id: any) => any;
    /** Overwrite the schema-level local field to populate on if this is a populated virtual. */
    localField?: string;
    /** Overwrite the schema-level foreign field to populate on if this is a populated virtual. */
    foreignField?: string;
    /** Set to `false` to prevent Mongoose from repopulating paths that are already populated */
    forceRepopulate?: boolean;
    /**
     * Set to `true` to execute any populate queries one at a time, as opposed to in parallel.
     * We recommend setting this option to `true` if using transactions, especially if also populating multiple paths or paths with multiple models.
     * MongoDB server does **not** support multiple operations in parallel on a single transaction.
     */
    ordered?: boolean;
  }

  interface PopulateOption {
    populate?: string | string[] | PopulateOptions | PopulateOptions[];
  }

  /** Populate options whose literal paths and model types can be inferred. */
  interface InferredPopulateOptions extends Omit<PopulateOptions, 'populate'> {
    populate?: string | InferredPopulateOptions | readonly (string | InferredPopulateOptions)[];
  }

  type PopulateSelectionTokens<S extends string, Tokens extends string = never> =
    S extends `${infer Head}\r${infer Tail}` ? PopulateSelectionTokens<`${Head} ${Tail}`, Tokens> :
    S extends `${infer Head}\n${infer Tail}` ? PopulateSelectionTokens<`${Head} ${Tail}`, Tokens> :
    S extends `${infer Head}\t${infer Tail}` ? PopulateSelectionTokens<`${Head} ${Tail}`, Tokens> :
    S extends `${infer Head} ${infer Tail}` ? PopulateSelectionTokens<Tail, Tokens | Head> : Tokens | S;

  type PopulateStringProjection<S extends string> = {
    [K in PopulateSelectionTokens<S> as K extends '' ? never : K extends `-${infer Path}` ? Path : K]:
      K extends `-${string}` ? 0 : 1;
  };

  type PopulateProjection<O> = O extends { select: infer S }
    ? S extends string
      ? string extends S ? {} : S extends `${string}+${string}` ? {} : PopulateStringProjection<S>
      : S extends readonly string[]
        ? string extends S[number] ? {} : Extract<S[number], `+${string}`> extends never ? PopulateStringProjection<S[number]> : {}
        : S extends Record<string, unknown> ? S : {}
    : {};

  type PopulateIsLean<O, Lean extends boolean | 'toObject'> = Lean extends 'toObject' ? 'toObject' :
    O extends { options: { lean: infer LocalLean } }
      ? LocalLean extends false ? false : LocalLean extends true | LeanOptions ? true : Lean
      : Lean;

  type PopulateProjectionKeys<P, Value> = {
    [K in keyof P]-?: P[K] extends Value ? K : never
  }[keyof P] & string;

  type PopulateChildPaths<Paths extends string, Key extends string> =
    Paths extends `${Key}.${infer Child}` ? Child : never;

  type PopulatePickPaths<T, Paths extends string> =
    T extends null | undefined ? T :
    T extends (infer Item)[] ? PopulatePickPaths<Item, Paths>[] : {
      [K in keyof T as K extends string ? Extract<Paths, K | `${K}.${string}`> extends never ? never : K : never]:
        K extends Paths ? T[K] : K extends string ? PopulatePickPaths<T[K], PopulateChildPaths<Paths, K>> : never
    };

  type PopulateOmitPaths<T, Paths extends string> =
    T extends null | undefined ? T :
    T extends (infer Item)[] ? PopulateOmitPaths<Item, Paths>[] : {
      [K in keyof T as K extends Paths ? never : K]:
        K extends string ? PopulateChildPaths<Paths, K> extends never ? T[K] : PopulateOmitPaths<T[K], PopulateChildPaths<Paths, K>> : T[K]
    };

  type PopulateApplyProjection<T, P> =
    P extends Record<string, 0 | 1 | boolean>
      ? keyof P extends never ? T :
        PopulateProjectionKeys<P, 1 | true> extends never
          ? PopulateOmitPaths<T, PopulateProjectionKeys<P, 0 | false>>
          : Exclude<PopulateProjectionKeys<P, 1 | true>, '_id'> extends never
            ? PopulateProjectionKeys<P, 0 | false> extends never
              ? PopulatePickPaths<T, '_id'>
              : PopulateOmitPaths<T, PopulateProjectionKeys<P, 0 | false>>
            : PopulatePickPaths<T, PopulateProjectionKeys<P, 1 | true> | (P extends { _id: 0 | false } ? never : '_id')>
      : ApplyProjection<T, P>;

  type PopulateNestedPaths<O> = O extends readonly unknown[] ? PopulateNestedPaths<O[number]> :
    O extends { path: infer Path extends string } ? string extends Path ? never : Path :
    O extends string ? string extends O ? never : O : never;

  // Mongoose includes nested populated fields in an inclusion projection unless
  // the caller explicitly excludes them (selectPopulatedPaths defaults to true).
  type PopulateNestedProjection<O, P = PopulateProjection<O>> =
    PopulateProjectionKeys<P, 1 | true> extends never ? P :
    P & { [K in Exclude<PopulateNestedPaths<O extends { populate: infer Nested } ? Nested : never>, PopulateProjectionKeys<P, 0 | false>>]: 1 };

  type PopulateModelValue<O, Lean extends boolean | 'toObject', Depth extends unknown[]> =
    O extends { transform: (...args: any[]) => infer Transformed } ? Transformed :
    // Inspect two model methods rather than comparing the complete recursive
    // Model/Query interfaces, which can exceed TypeScript's instantiation limit.
    O extends { model: { castObject: (...args: any[]) => infer Raw; hydrate: (...args: any[]) => infer Hydrated } }
      ? PopulateInferredType<Require_id<Raw>, O extends { populate: infer Nested } ? Nested : never, PopulateIsLean<O, Lean>, Depth> extends infer PopulatedRaw
        ? PopulateIsLean<O, Lean> extends infer Mode
          ? Mode extends false
            ? PopulateDocumentResult<
                Omit<Hydrated, keyof Require_id<Raw>>,
                PopulateApplyProjection<PopulatedRaw, PopulateNestedProjection<O>>,
                PopulateApplyProjection<PopulateInferredType<Require_id<Raw>, O extends { populate: infer Nested } ? Nested : never, 'toObject', Depth>, PopulateNestedProjection<O>>,
                Raw
              >
            : PopulateApplyProjection<PopulatedRaw, PopulateNestedProjection<O>>
          : never
        : never
      : never;

  type PopulateReferenceValue<T, O, Lean extends boolean | 'toObject', Depth extends unknown[]> =
    O extends { justOne: infer One }
      ? One extends true ? PopulateModelValue<O, Lean, Depth> | null :
        One extends false ? PopulateArrayValue<O, Lean, Depth> : PopulateDefaultReferenceValue<T, O, Lean, Depth>
      : PopulateDefaultReferenceValue<T, O, Lean, Depth>;

  type PopulateDefaultReferenceValue<T, O, Lean extends boolean | 'toObject', Depth extends unknown[]> =
    NonNullable<T> extends readonly unknown[]
      ? PopulateArrayValue<O, Lean, Depth> | Extract<T, null | undefined>
      : PopulateModelValue<O, Lean, Depth> | null | Extract<T, undefined>;

  type PopulateArrayValue<O, Lean extends boolean | 'toObject', Depth extends unknown[]> =
    (PopulateModelValue<O, Lean, Depth> | (O extends { retainNullValues: infer Retain } ? true extends Retain ? null | undefined : never : never))[];

  // Map existing keys to preserve optional and readonly modifiers. Traverse
  // arrays without exposing document methods as possible populate paths.
  type PopulateAtPath<T, Path extends string, O, Lean extends boolean | 'toObject', Depth extends unknown[]> =
    T extends null | undefined ? T :
    T extends { isMongooseDocumentArray: true }
      ? T extends Types.DocumentArray<infer Item, infer Hydrated>
        ? Types.DocumentArray<PopulateAtPath<Item, Path, O, Lean, Depth>, Extract<PopulateAtPath<Hydrated, Path, O, Lean, Depth>, Types.Subdocument<any, any, any>>>
        : T :
    T extends readonly (infer Item)[]
      ? T extends Item[] ? PopulateAtPath<Item, Path, O, Lean, Depth>[] : readonly PopulateAtPath<Item, Path, O, Lean, Depth>[] :
    Path extends `${infer Head}.${infer Tail}`
      ? { [K in keyof T]: K extends Head ? PopulateAtPath<T[K], Tail, O, Lean, Depth> : T[K] }
      : { [K in keyof T]: K extends Path ? PopulateReferenceValue<T[K], O, Lean, Depth> : T[K] };

  type PopulateOneInferredType<T, O, Lean extends boolean | 'toObject', Depth extends unknown[]> =
    O extends { path: infer Path extends string; model: { castObject: (...args: any[]) => any } }
      ? string extends Path ? T : Path extends `${string} ${string}` ? T : PopulateAtPath<T, Path, O, Lean, Depth>
      : T;

  type PopulateInferredType<T, Options, Lean extends boolean | 'toObject', Depth extends unknown[] = []> =
    IsAny<T> extends true ? T : IsAny<Options> extends true ? T :
    Depth['length'] extends 10 ? T :
    [Options] extends [never] ? T :
    Options extends readonly [infer Head, ...infer Tail]
      ? PopulateInferredType<PopulateOneInferredType<T, Head, Lean, [...Depth, unknown]>, Tail, Lean, Depth>
      : Options extends readonly unknown[]
        // A widened array can contain a runtime-dependent set of paths.
        ? T
        : PopulateOneInferredType<T, Options, Lean, [...Depth, unknown]>;

  type PopulateInferredQueryResult<Result, Raw, Options> =
    Result extends null | undefined ? Result :
    Result extends (infer Item)[] ? PopulateInferredQueryResult<Item, Raw, Options>[] :
    Result extends Document
      ? PopulateDocumentResult<
        Omit<Result, typeof mongoosePopulatedDocumentMarker>,
        Omit<PopulateInferredType<Result, Options, false>, typeof mongoosePopulatedDocumentMarker>,
        PopulateInferredType<ResolvePopulatedRawDocType<Result, Raw>, Options, 'toObject'>,
        ResolvePopulatedRawDocType<Result, Raw, { depopulate: true }>
      >
      : PopulateInferredType<Result, Options, true>;
}
