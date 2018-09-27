'use strict';

/*!
 * ignore
 */

const get = require('lodash.get');

module.exports = applyTimestampsToUpdate;

/*!
 * ignore
 */

function applyTimestampsToUpdate(now, createdAt, updatedAt, currentUpdate, options) {
  const updates = currentUpdate;
  let _updates = updates;
  const overwrite = get(options, 'overwrite', false);
  const timestamps = get(options, 'timestamps', true);

  // Support skipping timestamps at the query level, see gh-6980
  if (!timestamps) {
    return currentUpdate;
  }

  if (overwrite) {
    if (currentUpdate && currentUpdate.$set) {
      currentUpdate = currentUpdate.$set;
      updates.$set = {};
      _updates = updates.$set;
    }
    if (updatedAt && !currentUpdate[updatedAt]) {
      _updates[updatedAt] = now;
    }
    if (createdAt && !currentUpdate[createdAt]) {
      _updates[createdAt] = now;
    }
    return updates;
  }
  updates.$set = updates.$set || {};
  currentUpdate = currentUpdate || {};

  if (updatedAt &&
      (!currentUpdate.$currentDate || !currentUpdate.$currentDate[updatedAt])) {
    updates.$set[updatedAt] = now;
  }

  if (createdAt) {
    if (currentUpdate[createdAt]) {
      delete currentUpdate[createdAt];
    }
    if (currentUpdate.$set && currentUpdate.$set[createdAt]) {
      delete currentUpdate.$set[createdAt];
    }

    updates.$setOnInsert = updates.$setOnInsert || {};
    updates.$setOnInsert[createdAt] = now;
  }

  if (Object.keys(updates.$set).length === 0) {
    delete updates.$set;
  }

  return updates;
}
