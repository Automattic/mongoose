declare module 'mongoose' {
  import mongodb = require('mongodb');

  type ClientSessionOptions = mongodb.ClientSessionOptions;
  type ClientSession = mongodb.ClientSession;

  /**
   * _Requires MongoDB >= 3.6.0._ Starts a [MongoDB session](https://docs.mongodb.com/manual/release-notes/3.6/#client-sessions)
   * for benefits like causal consistency, [retryable writes](https://docs.mongodb.com/manual/core/retryable-writes/),
   * and [transactions](http://thecodebarbarian.com/a-node-js-perspective-on-mongodb-4-transactions.html).
   */
  function startSession(options: ClientSessionOptions | undefined | null, callback: Callback<ClientSession>): void;
  function startSession(callback: Callback<ClientSession>): void;
  function startSession(options?: ClientSessionOptions): Promise<ClientSession>;

  interface SessionOperation {
    /** Sets the session. Useful for [transactions](/docs/transactions.html). */
    session(session: mongodb.ClientSession | null): this;
  }

  interface SessionStarter {

    /**
     * Starts a [MongoDB session](https://docs.mongodb.com/manual/release-notes/3.6/#client-sessions)
     * for benefits like causal consistency, [retryable writes](https://docs.mongodb.com/manual/core/retryable-writes/),
     * and [transactions](http://thecodebarbarian.com/a-node-js-perspective-on-mongodb-4-transactions.html).
     */
    startSession(options: ClientSessionOptions | undefined | null, callback: Callback<ClientSession>): void;
    startSession(callback: Callback<ClientSession>): void;
    startSession(options?: ClientSessionOptions): Promise<ClientSession>;
  }

  interface SessionOption {
    session?: ClientSession | null;
  }
}
