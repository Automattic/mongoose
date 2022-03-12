import mongodb = require('mongodb');

declare module 'mongoose' {

  /** A list of paths to skip. If set, Mongoose will validate every modified path that is not in this list. */
  type pathsToSkip = string[] | string;

  class Document<T = any, TQueryHelpers = any, DocType = any> {
    constructor(doc?: any);

    /** This documents _id. */
    _id?: T;

    /** This documents __v. */
    __v?: any;

    /* Get all subdocs (by bfs) */
    $getAllSubdocs(): Document[];

    /** Don't run validation on this path or persist changes to this path. */
    $ignore(path: string): void;

    /** Checks if a path is set to its default. */
    $isDefault(path: string): boolean;

    /** Getter/setter, determines whether the document was removed or not. */
    $isDeleted(val?: boolean): boolean;

    /** Returns an array of all populated documents associated with the query */
    $getPopulatedDocs(): Document[];

    /**
     * Returns true if the given path is nullish or only contains empty objects.
     * Useful for determining whether this subdoc will get stripped out by the
     * [minimize option](/docs/guide.html#minimize).
     */
    $isEmpty(path: string): boolean;

    /** Checks if a path is invalid */
    $isValid(path: string): boolean;

    /**
     * Empty object that you can use for storing properties on the document. This
     * is handy for passing data to middleware without conflicting with Mongoose
     * internals.
     */
    $locals: Record<string, unknown>;

    /** Marks a path as valid, removing existing validation errors. */
    $markValid(path: string): void;

    /**
     * A string containing the current operation that Mongoose is executing
     * on this document. Can be `null`, `'save'`, `'validate'`, or `'remove'`.
     */
    $op: 'save' | 'validate' | 'remove' | null;

    /**
     * Getter/setter around the session associated with this document. Used to
     * automatically set `session` if you `save()` a doc that you got from a
     * query with an associated session.
     */
    $session(session?: mongodb.ClientSession | null): mongodb.ClientSession | null;

    /** Alias for `set()`, used internally to avoid conflicts */
    $set(path: string, val: any, type: any, options?: any): this;
    $set(path: string, val: any, options?: any): this;
    $set(value: any): this;

    /** Set this property to add additional query filters when Mongoose saves this document and `isNew` is false. */
    $where: Record<string, unknown>;

    /** If this is a discriminator model, `baseModelName` is the name of the base model. */
    baseModelName?: string;

    /** Collection the model uses. */
    collection: Collection;

    /** Connection the model uses. */
    db: Connection;

    /** Removes this document from the db. */
    delete(options: QueryOptions, callback: Callback): void;
    delete(callback: Callback): void;
    delete(options?: QueryOptions): QueryWithHelpers<any, this, TQueryHelpers>;

    /** Removes this document from the db. */
    deleteOne(options: QueryOptions, callback: Callback): void;
    deleteOne(callback: Callback): void;
    deleteOne(options?: QueryOptions): QueryWithHelpers<any, this, TQueryHelpers>;

    /**
     * Takes a populated field and returns it to its unpopulated state. If called with
     * no arguments, then all populated fields are returned to their unpopulated state.
     */
    depopulate(path?: string | string[]): this;

    /**
     * Returns the list of paths that have been directly modified. A direct
     * modified path is a path that you explicitly set, whether via `doc.foo = 'bar'`,
     * `Object.assign(doc, { foo: 'bar' })`, or `doc.set('foo', 'bar')`.
     */
    directModifiedPaths(): Array<string>;

    /**
     * Returns true if this document is equal to another document.
     *
     * Documents are considered equal when they have matching `_id`s, unless neither
     * document has an `_id`, in which case this function falls back to using
     * `deepEqual()`.
     */
    equals(doc: Document<T>): boolean;

    /** Returns the current validation errors. */
    errors?: Error.ValidationError;

    /** Returns the value of a path. */
    get(path: string, type?: any, options?: any): any;

    /**
     * Returns the changes that happened to the document
     * in the format that will be sent to MongoDB.
     */
    getChanges(): UpdateQuery<this>;

    /** The string version of this documents _id. */
    id?: any;

    /** Signal that we desire an increment of this documents version. */
    increment(): this;

    /**
    * Initializes the document without setters or marking anything modified.
    * Called internally after a document is returned from mongodb. Normally,
    * you do **not** need to call this function on your own.
    */
    init(obj: AnyObject, opts?: AnyObject, callback?: Callback<this>): this;

    /** Marks a path as invalid, causing validation to fail. */
    invalidate(path: string, errorMsg: string | NativeError, value?: any, kind?: string): NativeError | null;

    /** Returns true if `path` was directly set and modified, else false. */
    isDirectModified(path: string): boolean;

    /** Checks if `path` was explicitly selected. If no projection, always returns true. */
    isDirectSelected(path: string): boolean;

    /** Checks if `path` is in the `init` state, that is, it was set by `Document#init()` and not modified since. */
    isInit(path: string): boolean;

    /**
     * Returns true if any of the given paths are modified, else false. If no arguments, returns `true` if any path
     * in this document is modified.
     */
    isModified(path?: string | Array<string>): boolean;

    /** Boolean flag specifying if the document is new. */
    isNew: boolean;

    /** Checks if `path` was selected in the source query which initialized this document. */
    isSelected(path: string): boolean;

    /** Marks the path as having pending changes to write to the db. */
    markModified(path: string, scope?: any): void;

    /** Returns the list of paths that have been modified. */
    modifiedPaths(options?: { includeChildren?: boolean }): Array<string>;

    /** The name of the model */
    modelName: string;

    /**
     * Overwrite all values in this document with the values of `obj`, except
     * for immutable properties. Behaves similarly to `set()`, except for it
     * unsets all properties that aren't in `obj`.
     */
    overwrite(obj: AnyObject): this;

    /**
     * If this document is a subdocument or populated document, returns the
     * document's parent. Returns undefined otherwise.
     */
    $parent(): Document | undefined;

    /** Populates document references. */
    populate<Paths = {}>(path: string | PopulateOptions | (string | PopulateOptions)[], callback: Callback<this & Paths>): void;
    populate<Paths = {}>(path: string, names: string, callback: Callback<this & Paths>): void;
    populate<Paths = {}>(path: string, names: string): Promise<this & Paths>;
    populate<Paths = {}>(path: string | PopulateOptions | (string | PopulateOptions)[]): Promise<this & Paths>;

    /** Gets _id(s) used during population of the given `path`. If the path was not populated, returns `undefined`. */
    populated(path: string): any;

    /** Removes this document from the db. */
    remove(options: QueryOptions, callback: Callback): void;
    remove(callback: Callback): void;
    remove(options?: QueryOptions): Promise<this>;

    /** Sends a replaceOne command with this document `_id` as the query selector. */
    replaceOne(replacement?: AnyObject, options?: QueryOptions | null, callback?: Callback): Query<any, this>;

    /** Saves this document by inserting a new document into the database if [document.isNew](/docs/api.html#document_Document-isNew) is `true`, or sends an [updateOne](/docs/api.html#document_Document-updateOne) operation with just the modified paths if `isNew` is `false`. */
    save(options: SaveOptions, callback: Callback<this>): void;
    save(callback: Callback<this>): void;
    save(options?: SaveOptions): Promise<this>;

    /** The document's schema. */
    schema: Schema;

    /** Sets the value of a path, or many paths. */
    set(path: string, val: any, type: any, options?: any): this;
    set(path: string, val: any, options?: any): this;
    set(value: any): this;

    /** The return value of this method is used in calls to JSON.stringify(doc). */
    toJSON(options: ToObjectOptions & { flattenMaps: false }): LeanDocument<this>;
    toJSON(options?: ToObjectOptions): FlattenMaps<LeanDocument<this>>;
    toJSON<T = FlattenMaps<DocType>>(options?: ToObjectOptions): T;

    /** Converts this document into a plain-old JavaScript object ([POJO](https://masteringjs.io/tutorials/fundamentals/pojo)). */
    toObject(options?: ToObjectOptions): LeanDocument<this>;
    toObject<T = DocType>(options?: ToObjectOptions): T;

    /** Clears the modified state on the specified path. */
    unmarkModified(path: string): void;

    /** Sends an update command with this document `_id` as the query selector. */
    update(update?: UpdateQuery<this> | UpdateWithAggregationPipeline, options?: QueryOptions | null, callback?: Callback): Query<any, this>;

    /** Sends an updateOne command with this document `_id` as the query selector. */
    updateOne(update?: UpdateQuery<this> | UpdateWithAggregationPipeline, options?: QueryOptions | null, callback?: Callback): Query<any, this>;

    /** Executes registered validation rules for this document. */
    validate(pathsToValidate: pathsToValidate, options: AnyObject, callback: CallbackWithoutResult): void;
    validate(pathsToValidate: pathsToValidate, callback: CallbackWithoutResult): void;
    validate(callback: CallbackWithoutResult): void;
    validate(pathsToValidate?: pathsToValidate, options?: AnyObject): Promise<void>;
    validate(options: { pathsToSkip?: pathsToSkip }): Promise<void>;

    /** Executes registered validation rules (skipping asynchronous validators) for this document. */
    validateSync(options: { pathsToSkip?: pathsToSkip, [k: string]: any }): Error.ValidationError | null;
    validateSync(pathsToValidate?: Array<string>, options?: AnyObject): Error.ValidationError | null;
  }
}