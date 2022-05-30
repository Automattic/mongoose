declare module 'mongoose' {
  import mongodb = require('mongodb');

  interface AggregateOptions extends
    SessionOption {
    /**
     * If true, the MongoDB server will use the hard drive to store data during this aggregation.
     */
    allowDiskUse?: boolean;
    /**
     * Applicable only if you specify the $out or $merge aggregation stages.
     *
     * Enables db.collection.aggregate() to bypass document validation during the operation. This lets you insert documents that do not meet the validation requirements.
     */
    bypassDocumentValidation?: boolean;
    /**
     * The BSON-serializer will check if keys are valid
     */
    collation?: mongodb.CollationOptions;
    /**
     * Users can specify an arbitrary string to help trace the operation through the database profiler, currentOp, and logs.
     */
    comment?: string;
    /**
     *  Specifies the initial batch size for the cursor. The value of the cursor field is a document with the field batchSize.
     */
    cursor?: { batchSize?: number; };
    /**
     * Specifies to return the information on the processing of the pipeline. See Return Information on Aggregation Pipeline Operation for an example.
     *
     * Not available in multi-document transactions.
     */
    explain?: mongodb.ExplainVerbosityLike;
    /**
     * The index to use for the aggregation. The index is on the initial collection/view against which the aggregation is run.
     */
    hint?: string | AnyObject;
    /**
     * Specifies a document with a list of variables. This allows you to improve command readability by separating the variables from the query text.
     */
    let?: AnyObject;
    /**
     * Specifies a time limit in milliseconds for processing operations on a cursor. If you do not specify a value for maxTimeMS, operations will not time out. A value of 0 explicitly specifies the default unbounded behavior.
     *
     * @see https://docs.mongodb.com/manual/reference/operator/meta/maxTimeMS/
     */
    maxTimeMS?: number;
    /**
     * Return BSON filled buffers from operations.
     */
    raw?: boolean;
    /**
     * Specifies the read concern.
     */
    readConcern?: mongodb.ReadConcernLike;
    /**
     * The preferred read preference.
     */
    readPreference?: mongodb.ReadPreferenceLike;
    /**
     * Specifies the write concern.
     */
    writeConcern?: mongodb.WriteConcern;
    [key: string]: any;
  }

  class Aggregate<R> implements SessionOperation {
    /**
     * Returns an asyncIterator for use with [`for/await/of` loops](https://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js
     * You do not need to call this function explicitly, the JavaScript runtime
     * will call it for you.
     */
    [Symbol.asyncIterator](): AsyncIterableIterator<Unpacked<R>>;

    options: AggregateOptions;

    /**
     * Sets an option on this aggregation. This function will be deprecated in a
     * future release.
     *
     * @deprecated
     */
    addCursorFlag(flag: CursorFlag, value: boolean): this;

    /**
     * Appends a new $addFields operator to this aggregate pipeline.
     * Requires MongoDB v3.4+ to work
     */
    addFields(arg: PipelineStage.AddFields['$addFields']): this;

    /** Sets the allowDiskUse option for the aggregation query (ignored for < 2.6.0) */
    allowDiskUse(value: boolean): this;

    /** Appends new operators to this aggregate pipeline */
    append(...args: PipelineStage[]): this;

    /**
     * Executes the query returning a `Promise` which will be
     * resolved with either the doc(s) or rejected with the error.
     * Like [`.then()`](#query_Query-then), but only takes a rejection handler.
     */
    catch: Promise<R>['catch'];

    /** Set the collation. */
    collation(options: mongodb.CollationOptions): this;

    /** Appends a new $count operator to this aggregate pipeline. */
    count(fieldName: PipelineStage.Count['$count']): this;

    /**
     * Sets the cursor option for the aggregation query (ignored for < 2.6.0).
     */
    cursor<DocType = any>(options?: Record<string, unknown>): Cursor<DocType>;

    /** Executes the aggregate pipeline on the currently bound Model. */
    exec(callback: Callback<R>): void;
    exec(): Promise<R>;

    /** Execute the aggregation with explain */
    explain(verbosity: mongodb.ExplainVerbosityLike, callback: Callback<AnyObject>): void;
    explain(verbosity: mongodb.ExplainVerbosityLike): Promise<AnyObject>;
    explain(callback: Callback<AnyObject>): void;
    explain(): Promise<AnyObject>;

    /** Combines multiple aggregation pipelines. */
    facet(options: PipelineStage.Facet['$facet']): this;

    /** Appends new custom $graphLookup operator(s) to this aggregate pipeline, performing a recursive search on a collection. */
    graphLookup(options: PipelineStage.GraphLookup['$graphLookup']): this;

    /** Appends new custom $group operator to this aggregate pipeline. */
    group(arg: PipelineStage.Group['$group']): this;

    /** Sets the hint option for the aggregation query (ignored for < 3.6.0) */
    hint(value: Record<string, unknown> | string): this;

    /**
     * Appends a new $limit operator to this aggregate pipeline.
     * @param num maximum number of records to pass to the next stage
     */
    limit(num: PipelineStage.Limit['$limit']): this;

    /** Appends new custom $lookup operator to this aggregate pipeline. */
    lookup(options: PipelineStage.Lookup['$lookup']): this;

    /**
     * Appends a new custom $match operator to this aggregate pipeline.
     * @param arg $match operator contents
     */
    match(arg: PipelineStage.Match['$match']): this;

    /**
     * Binds this aggregate to a model.
     * @param model the model to which the aggregate is to be bound
     */
    model(model: Model<any>): this;

    /**
     * Append a new $near operator to this aggregation pipeline
     * @param arg $near operator contents
     */
    near(arg: { near?: number[]; distanceField: string; maxDistance?: number; query?: Record<string, any>; includeLocs?: string; num?: number; uniqueDocs?: boolean }): this;

    /** Returns the current pipeline */
    pipeline(): PipelineStage[];

    /** Appends a new $project operator to this aggregate pipeline. */
    project(arg: PipelineStage.Project['$project']): this;

    /** Sets the readPreference option for the aggregation query. */
    read(pref: mongodb.ReadPreferenceLike): this;

    /** Sets the readConcern level for the aggregation query. */
    readConcern(level: string): this;

    /** Appends a new $redact operator to this aggregate pipeline. */
    redact(expression: PipelineStage.Redact['$redact'], thenExpr: '$$DESCEND' | '$$PRUNE' | '$$KEEP' | AnyObject, elseExpr: '$$DESCEND' | '$$PRUNE' | '$$KEEP' | AnyObject): this;

    /** Appends a new $replaceRoot operator to this aggregate pipeline. */
    replaceRoot(newRoot: PipelineStage.ReplaceRoot['$replaceRoot']['newRoot'] | string): this;

    /**
     * Helper for [Atlas Text Search](https://docs.atlas.mongodb.com/reference/atlas-search/tutorial/)'s
     * `$search` stage.
     */
    search(options: PipelineStage.Search['$search']): this;

    /** Lets you set arbitrary options, for middlewares or plugins. */
    option(value: AggregateOptions): this;

    /** Appends new custom $sample operator to this aggregate pipeline. */
    sample(arg: PipelineStage.Sample['$sample']['size']): this;

    /** Sets the session for this aggregation. Useful for [transactions](/docs/transactions.html). */
    session(session: mongodb.ClientSession | null): this;

    /**
     * Appends a new $skip operator to this aggregate pipeline.
     * @param num number of records to skip before next stage
     */
    skip(num: PipelineStage.Skip['$skip']): this;

    /** Appends a new $sort operator to this aggregate pipeline. */
    sort(arg: string | Record<string, SortValues> | PipelineStage.Sort['$sort']): this;

    /** Provides promise for aggregate. */
    then: Promise<R>['then'];

    /**
     * Appends a new $sortByCount operator to this aggregate pipeline. Accepts either a string field name
     * or a pipeline object.
     */
    sortByCount(arg: string | PipelineStage.SortByCount['$sortByCount']): this;

    /** Appends new $unionWith operator to this aggregate pipeline. */
    unionWith(options: PipelineStage.UnionWith['$unionWith']): this;

    /** Appends new custom $unwind operator(s) to this aggregate pipeline. */
    unwind(...args: PipelineStage.Unwind['$unwind'][]): this;
  }
}
