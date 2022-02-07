/*!
 * Dependencies
 */

'use strict';

const StateMachine = require('./statemachine');
const ActiveRoster = StateMachine.ctor('require', 'modify', 'init', 'default', 'ignore');

module.exports = exports = InternalCache;

function InternalCache() {
  this.activePaths = new ActiveRoster();
  this.strictMode = undefined;
}

InternalCache.prototype.fullPath = undefined;
InternalCache.prototype.strictMode = undefined;
InternalCache.prototype.selected = undefined;
InternalCache.prototype.shardval = undefined;
InternalCache.prototype.saveError = undefined;
InternalCache.prototype.validationError = undefined;
InternalCache.prototype.adhocPaths = undefined;
InternalCache.prototype.removing = undefined;
InternalCache.prototype.inserting = undefined;
InternalCache.prototype.saving = undefined;
InternalCache.prototype.version = undefined;
InternalCache.prototype._id = undefined;
InternalCache.prototype.ownerDocument = undefined;
InternalCache.prototype.populate = undefined; // what we want to populate in this doc
InternalCache.prototype.populated = undefined;// the _ids that have been populated
InternalCache.prototype.wasPopulated = false; // if this doc was the result of a population
InternalCache.prototype.scope = undefined;

InternalCache.prototype.session = null;
InternalCache.prototype.pathsToScopes = null;
InternalCache.prototype.cachedRequired = null;
