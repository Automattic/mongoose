declare module 'mongoose' {
  import { Readable } from 'stream';

  type CursorFlag =
    | 'tailable'
    | 'oplogReplay'
    | 'noCursorTimeout'
    | 'awaitData'
    | 'partial';

  interface EachAsyncOptions {
    parallel?: number;
    batchSize?: number;
    continueOnError?: boolean;
    signal?: AbortSignal;
  }

  /**
   * Mongoose Cursor
   */
  class Cursor<
    DocType = unknown,
    Options extends Record<string, any> = Record<string, never>,
    NextResultType = DocType | null
  > extends Readable {
    /**
     * Async iterator support
     */
    [Symbol.asyncIterator](): AsyncIterator<DocType>;

    /**
     * Explicit async cleanup (Node 20+)
     */
    [Symbol.asyncDispose](): Promise<void>;

    /**
     * Add a MongoDB cursor flag
     */
    addCursorFlag(flag: CursorFlag, value: boolean): this;

    /**
     * Close the cursor
     */
    close(): Promise<void>;

    /**
     * Destroy the cursor immediately
     */
    destroy(error?: Error): this;

    /**
     * Reset cursor to initial state
     */
    rewind(): this;

    /**
     * Iterate documents one by one
     */
    eachAsync(
      fn: (doc: DocType, index: number) => unknown | Promise<unknown>,
      options?: EachAsyncOptions
    ): Promise<void>;

    /**
     * Iterate documents in batches
     */
    eachAsync(
      fn: (docs: DocType[], index: number) => unknown | Promise<unknown>,
      options: EachAsyncOptions & { batchSize: number }
    ): Promise<void>;

    /**
     * Transform cursor results
     */
    map<ResultType>(
      fn: (doc: DocType) => ResultType
    ): Cursor<ResultType, Options>;

    /**
     * Fetch next document
     */
    next(): Promise<NextResultType>;

    /**
     * Cursor options (read-only)
     */
    readonly options: Options;
  }
}
