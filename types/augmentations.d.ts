// this import is required so that types get merged instead of completely overwritten
import 'mongodb';

declare module 'mongodb' {
  interface ObjectId {
    /** Mongoose automatically adds a conveniency "_id" getter on the base ObjectId class */
    _id: this;
  }
}
