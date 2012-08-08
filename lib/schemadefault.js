
/*!
 * Module dependencies.
 */

var Schema = require('./schema')

/**
 * Default model for querying the system.profiles collection.
 *
 * @property system.profile
 * @receiver exports
 * @api private
 */

exports['system.profile'] = new Schema({
    ts: Date
  , info: String // deprecated
  , millis: Number
  , op: String
  , ns: String
  , query: Schema.Types.Mixed
  , updateobj: Schema.Types.Mixed
  , ntoreturn: Number
  , nreturned: Number
  , nscanned: Number
  , responseLength: Number
  , client: String
  , user: String
  , idhack: Boolean
  , scanAndOrder: Boolean
  , keyUpdates: Number
  , cursorid: Number
}, { noVirtualId: true, noId: true });
