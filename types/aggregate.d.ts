import mongodb = require('mongodb');

declare module 'mongoose' {

  class Aggregate<R> {
    /**
     * Returns an asyncIterator for use with [`for/await/of` loops](https://thecodebarbarian.com/getting-started-with-async-iterators-in-node-js
     * You do not need to call this function explicitly, the JavaScript runtime
     * will call it for you.
     */
    [Symbol.asyncIterator](): AsyncIterableIterator<Unpacked<R>>;

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
    explain(verbosity: mongodb.ExplainVerbosity, callback: Callback<AnyObject>): void;
    explain(verbosity: mongodb.ExplainVerbosity): Promise<AnyObject>;
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
    read(pref: string | mongodb.ReadPreferenceMode): this;

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
    option(value: Record<string, unknown>): this;

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
