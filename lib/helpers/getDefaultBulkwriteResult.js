'use strict';

function getDefaultBulkwriteResult() {
  return {
    ok: 1,
    nInserted: 0,
    nUpserted: 0,
    nMatched: 0,
    nModified: 0,
    nRemoved: 0,
    upserted: [],
    writeErrors: [],
    insertedIds: [],
    writeConcernErrors: []
  };
}

module.exports = getDefaultBulkwriteResult;
