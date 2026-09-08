declare module 'mongoose' {
  import mongodb = require('mongodb');

  /**
   * Makes the indexes in MongoDB match the indexes defined in every model's
   * schema. This function will drop any indexes that are not defined in
   * the model's schema except the `_id` index, and build any indexes that
   * are in your schema but not in MongoDB.
   */
  function syncIndexes(options?: SyncIndexesOptions): Promise<ConnectionSyncIndexesResult>;

  interface IndexManager {
    /* Deletes all indexes that aren't defined in this model's schema. Used by `syncIndexes()`. Returns list of dropped index names. */
    cleanIndexes(options?: { toDrop?: string[], hideIndexes?: boolean }): Promise<string[]>;

    /**
     * Similar to `ensureIndexes()`, except for it uses the [`createIndex`](https://mongodb.github.io/node-mongodb-native/7.0/classes/Collection.html#createIndex)
     * function.
     */
    createIndexes(options?: mongodb.CreateIndexesOptions): Promise<void>;

    /**
     * Does a dry-run of Model.syncIndexes(), meaning that
     * the result of this function would be the result of
     * Model.syncIndexes().
     */
    diffIndexes(options?: Record<string, unknown>): Promise<IndexesDiff>

    /**
     * Sends `createIndex` commands to mongo for each index declared in the schema.
     * The `createIndex` commands are sent in series.
     */
    ensureIndexes(options?: mongodb.CreateIndexesOptions): Promise<void>;

    /**
     * Lists the indexes currently defined in MongoDB. This may or may not be
     * the same as the indexes defined in your schema depending on whether you
     * use the [`autoIndex` option](/docs/guide.html#autoIndex) and if you
     * build indexes manually.
     */
    listIndexes(): Promise<Array<any>>;

    /**
     * Makes the indexes in MongoDB match the indexes defined in this model's
     * schema. This function will drop any indexes that are not defined in
     * the model's schema except the `_id` index, and build any indexes that
     * are in your schema but not in MongoDB.
     */
    syncIndexes(options?: SyncIndexesOptions): Promise<Array<string>>;
  }

  interface IndexesDiff {
    /** Indexes that would be created in mongodb. */
    toCreate: Array<any>
    /** Indexes that would be dropped in mongodb. */
    toDrop: Array<any>
  }

  type IndexDirection = 1 | -1 | '2d' | '2dsphere' | 'geoHaystack' | 'hashed' | 'text' | 'ascending' | 'asc' | 'descending' | 'desc';
  type IndexDefinition = Record<string, IndexDirection>;

  interface SyncIndexesOptions extends mongodb.CreateIndexesOptions {
    continueOnError?: boolean;
    hideIndexes?: boolean;
  }
  type ConnectionSyncIndexesResult = Record<string, OneCollectionSyncIndexesResult>;
  type OneCollectionSyncIndexesResult = Array<string> & mongodb.MongoServerError;

  type IndexOptions = Omit<mongodb.CreateIndexesOptions, 'expires' | 'weights' | 'unique'> & {
    /**
     * `expires` utilizes the `ms` module from [vercel](https://github.com/vercel/ms) allowing us to use a friendlier syntax:
     *
     * @example
     * ```js
     * const schema = new Schema({ prop1: Date });
     *
     * // expire in 24 hours
     * schema.index({ prop1: 1 }, { expires: 60*60*24 })
     *
     * // expire in 24 hours
     * schema.index({ prop1: 1 }, { expires: '24h' })
     *
     * // expire in 1.5 hours
     * schema.index({ prop1: 1 }, { expires: '1.5h' })
     *
     * // expire in 7 days
     * schema.index({ prop1: 1 }, { expires: '7d' })
     * ```
     */
    expires?: number | string;
    weights?: Record<string, number>;

    unique?: boolean | [true, string]
  };

  type SearchIndexDescription = mongodb.SearchIndexDescription;

  type SearchIndexStatus = 'BUILDING' | 'DELETING' | 'DOES_NOT_EXIST' | 'FAILED' | 'PENDING' | 'READY' | 'STALE';

  type SearchIndexSynonymMappingStatus = 'BUILDING' | 'FAILED' | 'READY';

  /** The status of one synonym mapping on one search node. */
  interface SearchIndexSynonymMappingDetail {
    /** The build state of the synonym mapping. */
    status: SearchIndexSynonymMappingStatus;
    /** Whether the synonym mapping can serve queries. */
    queryable: boolean;
    /** The error that made the synonym mapping fail, only returned when its status is `FAILED`. */
    message?: string;
  }

  /** The status of one index generation, active or staged, on one search node. */
  interface SearchIndexGenerationDetail {
    /** The build state of this index generation. */
    status: SearchIndexStatus;
    /** Whether this index generation is ready to serve queries. */
    queryable: boolean;
    /** When the definition this generation builds with was created, and its version number. */
    definitionVersion: { version: number, createdAt: NativeDate };
    /** The definition this generation builds with. */
    definition: AnyObject;
    /** The status of this generation's synonym mappings, only returned when the index defines any. */
    synonymMappingStatus?: SearchIndexSynonymMappingStatus;
    /** The status of each of this generation's synonym mappings, keyed by mapping name. */
    synonymMappingStatusDetail?: Array<Record<string, SearchIndexSynonymMappingDetail>>;
  }

  /** The status of the index on one search node (`mongot`). */
  interface SearchIndexStatusDetail {
    /** The hostname of the search node, in the form `<replSetName>.<server.name>.<server.id>`. */
    hostname: string;
    /** The build state of the index on this search node. */
    status: SearchIndexStatus;
    /** Whether the index is ready to serve queries on this search node. */
    queryable: boolean;
    /** The active index on this search node. */
    mainIndex: SearchIndexGenerationDetail;
    /** The index being built in the background, only returned while an existing index is being updated. */
    stagedIndex?: SearchIndexGenerationDetail;
  }

  /**
   * A single entry of the [`$listSearchIndexes`](https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSearchIndexes/)
   * output, as returned by `Model.listSearchIndexes()`.
   */
  interface SearchIndexInfo {
    /** The index's unique identifier, a hex string rather than an ObjectId. */
    id: string;
    /** The name of the index. */
    name: string;
    /** The type of the index. Only returned for Atlas deployments. */
    type?: 'search' | 'vectorSearch';
    /** The build state of the index. */
    status: SearchIndexStatus;
    /** Whether the index is ready to serve queries. */
    queryable: boolean;
    /** The version number of the most recent definition. */
    latestVersion?: number;
    /** When the most recent definition was created, and its version number. */
    latestDefinitionVersion?: { version: number, createdAt: NativeDate };
    /** The most recent definition of the index. */
    latestDefinition: AnyObject;
    /** The status of the index on each individual search node. */
    statusDetail?: SearchIndexStatusDetail[];
    /** The status of the index's synonym mappings, only returned when the index defines any. */
    synonymMappingStatus?: SearchIndexSynonymMappingStatus;
    /** The status of each synonym mapping on each search node, keyed by mapping name. */
    synonymMappingStatusDetail?: Array<Record<string, SearchIndexSynonymMappingDetail>>;
  }
}
