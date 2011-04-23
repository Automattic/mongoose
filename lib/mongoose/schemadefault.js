
/**
 * Module dependencies.
 */

var Schema = require('./schema')

/**
 * Default model for querying the system.profiles
 * collection (it only exists when profiling is
 * enabled.
 */

exports['system.profile'] = new Schema({
    ts: Date
  , info: String
  , millis: Number
});
