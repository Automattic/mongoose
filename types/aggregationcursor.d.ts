
import stream = require('stream');

declare module 'mongoose' {
  class AggregationCursor extends stream.Readable {
    /**
     * Adds a [cursor flag](http://mongodb.github.io/node-mongodb-native/2.2/api/Cursor.html#addCursorFlag).
     * Useful for setting the `noCursorTimeout` and `tailable` flags.
     */
    addCursorFlag(flag: string, value: boolean): this;

    /**
     * Marks this cursor as closed. Will stop streaming and subsequent calls to
     * `next()` will error.
     */
    close(): Promise<void>;
    close(callback: CallbackWithoutResult): void;

    /**
     * Execute `fn` for every document(s) in the cursor. If batchSize is provided
     * `fn` will be executed for each batch of documents. If `fn` returns a promise,
     * will wait for the promise to resolve before iterating on to the next one.
     * Returns a promise that resolves when done.
     */
    eachAsync(fn: (doc: any) => any, options?: { parallel?: number, batchSize?: number }): Promise<void>;
    eachAsync(fn: (doc: any) => any, options?: { parallel?: number, batchSize?: number }, cb?: CallbackWithoutResult): void;

    /**
     * Registers a transform function which subsequently maps documents retrieved
     * via the streams interface or `.next()`
     */
    map(fn: (res: any) => any): this;

    /**
     * Get the next document from this cursor. Will return `null` when there are
     * no documents left.
     */
    next(): Promise<any>;
    next(callback: Callback): void;
  }
}