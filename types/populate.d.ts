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
    model?: string | Model<any>;
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
}
