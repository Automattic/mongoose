declare module 'mongoose' {
  import mongodb = require('mongodb');

  export class BaseCollection<T extends mongodb.Document> extends mongodb.Collection<T> {
    /**
     * Collection constructor
     * @param name name of the collection
     * @param conn A MongooseConnection instance
     * @param opts optional collection options
     */
    constructor(name: string, conn: Connection, opts?: any);

    /*
    * Abstract methods. Some of these are already defined on the
    * mongodb.Collection interface so they've been commented out.
    */
    ensureIndex(...args: any[]): any;
    findAndModify(...args: any[]): any;
    getIndexes(...args: any[]): any;

    /** Formatter for debug print args */
    $format(arg: any, color?: boolean, shell?: boolean): string;
    /** Debug print helper */
    $print(name: string, i: string | number, args: any[], color?: boolean, shell?: boolean): void;

    /** The collection name */
    get collectionName(): string;
    /** The Connection instance */
    conn: Connection;
    /** The collection name */
    name: string;
  }

  /*
   * section drivers/node-mongodb-native/collection.js
   */
  class Collection<T extends mongodb.Document = mongodb.Document> extends BaseCollection<T> {
    /**
     * Collection constructor
     * @param name name of the collection
     * @param conn A MongooseConnection instance
     * @param opts optional collection options
     */
    constructor(name: string, conn: Connection, opts?: any);

    /** Retrieves information about this collections indexes. */
    getIndexes(): ReturnType<mongodb.Collection<T>['indexInformation']>;
  }
}
